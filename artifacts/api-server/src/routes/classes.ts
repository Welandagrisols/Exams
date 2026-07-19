import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, classesTable, studentsTable, usersTable } from "@workspace/db";
import {
  ListClassesResponse,
  CreateClassBody,
  GetClassParams,
  GetClassResponse,
  UpdateClassParams,
  UpdateClassBody,
  UpdateClassResponse,
  DeleteClassParams,
} from "@workspace/api-zod";
import { isStaff, forbidden, type AppLocals } from "../middlewares/rbac";

const router: IRouter = Router();

const CLASS_SELECT = {
  id: classesTable.id,
  name: classesTable.name,
  year: classesTable.year,
  term: classesTable.term,
  classTeacherName: classesTable.classTeacherName,
  teacherId: classesTable.teacherId,
  studentCount: sql<number>`cast(count(${studentsTable.id}) as int)`,
} as const;

router.get("/classes", async (_req, res): Promise<void> => {
  const rows = await db
    .select(CLASS_SELECT)
    .from(classesTable)
    .leftJoin(studentsTable, eq(studentsTable.classId, classesTable.id))
    .groupBy(classesTable.id)
    .orderBy(classesTable.year, classesTable.name);
  res.json(ListClassesResponse.parse(rows));
});

router.post("/classes", async (req, res): Promise<void> => {
  if (!isStaff(res.locals as AppLocals)) {
    forbidden(res, "Only admin, principal, or deputy can create classes."); return;
  }
  const parsed = CreateClassBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [cls] = await db.insert(classesTable).values(parsed.data).returning();
  res.status(201).json(GetClassResponse.parse({ ...cls, studentCount: 0 }));
});

router.get("/classes/:id", async (req, res): Promise<void> => {
  const params = GetClassParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select(CLASS_SELECT)
    .from(classesTable)
    .leftJoin(studentsTable, eq(studentsTable.classId, classesTable.id))
    .where(eq(classesTable.id, params.data.id))
    .groupBy(classesTable.id);
  if (!row) {
    res.status(404).json({ error: "Class not found" });
    return;
  }
  res.json(GetClassResponse.parse(row));
});

router.patch("/classes/:id", async (req, res): Promise<void> => {
  if (!isStaff(res.locals as AppLocals)) {
    forbidden(res, "Only admin, principal, or deputy can edit classes."); return;
  }
  const params = UpdateClassParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateClassBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db.update(classesTable).set(parsed.data).where(eq(classesTable.id, params.data.id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Class not found" });
    return;
  }
  const [row] = await db
    .select(CLASS_SELECT)
    .from(classesTable)
    .leftJoin(studentsTable, eq(studentsTable.classId, classesTable.id))
    .where(eq(classesTable.id, params.data.id))
    .groupBy(classesTable.id);
  res.json(UpdateClassResponse.parse(row));
});

router.delete("/classes/:id", async (req, res): Promise<void> => {
  if (!isStaff(res.locals as AppLocals)) {
    forbidden(res, "Only admin, principal, or deputy can delete classes."); return;
  }
  const params = DeleteClassParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db.delete(classesTable).where(eq(classesTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Class not found" });
    return;
  }
  res.sendStatus(204);
});

/**
 * PATCH /api/classes/:id/teacher
 * Assign a teacher (by userId) to a class. Staff only.
 * Body: { userId: string }
 * Set userId to null to unassign the current teacher.
 */
router.patch("/classes/:id/teacher", async (req, res): Promise<void> => {
  if (!isStaff(res.locals as AppLocals)) {
    forbidden(res, "Only admin, principal, or deputy can assign teachers."); return;
  }
  const classId = parseInt(req.params.id);
  if (isNaN(classId)) { res.status(400).json({ error: "Invalid class id" }); return; }

  const { userId } = req.body;

  if (userId !== null && userId !== undefined) {
    // Verify the user exists
    const [userRow] = await db.select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, String(userId)));
    if (!userRow) { res.status(404).json({ error: "User not found" }); return; }
  }

  const [updated] = await db
    .update(classesTable)
    .set({ teacherId: userId ?? null })
    .where(eq(classesTable.id, classId))
    .returning();

  if (!updated) { res.status(404).json({ error: "Class not found" }); return; }
  res.json({ ok: true, classId, teacherId: updated.teacherId ?? null });
});

/**
 * GET /api/users
 * List all users with their roles — for admin UI (assign teachers, set roles).
 * Staff only.
 */
router.get("/users", async (_req, res): Promise<void> => {
  if (!isStaff(res.locals as AppLocals)) {
    forbidden(res, "Only admin, principal, or deputy can list users."); return;
  }
  const rows = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      role: usersTable.role,
      profileImageUrl: usersTable.profileImageUrl,
    })
    .from(usersTable)
    .orderBy(usersTable.firstName, usersTable.lastName);
  res.json(rows);
});

/**
 * PATCH /api/users/:id/role
 * Set a user's role. Staff only.
 * Body: { role: "teacher" | "admin" | "principal" | "deputy" }
 */
router.patch("/users/:id/role", async (req, res): Promise<void> => {
  if (!isStaff(res.locals as AppLocals)) {
    forbidden(res, "Only admin, principal, or deputy can change roles."); return;
  }
  const { id } = req.params;
  const { role } = req.body;
  const validRoles = ["teacher", "admin", "principal", "deputy"];
  if (!validRoles.includes(role)) {
    res.status(400).json({ error: `role must be one of: ${validRoles.join(", ")}` }); return;
  }
  const [updated] = await db
    .update(usersTable)
    .set({ role, updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id, role: usersTable.role });
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ ok: true, id: updated.id, role: updated.role });
});

export default router;
