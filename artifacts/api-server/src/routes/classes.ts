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
import { isStaff, isAdmin, forbidden, type AppLocals } from "../middlewares/rbac";
import { logAudit } from "../lib/audit";

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
  // NOTE: `teacherId` isn't declared in ListClassesResponseItem, so the zod
  // parse below silently strips it. Re-attach it after parsing — mobile's
  // class management screens need it to know who's currently assigned.
  const parsed = ListClassesResponse.parse(rows);
  res.json(parsed.map((p, i) => ({ ...p, teacherId: rows[i]?.teacherId ?? null })));
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
  logAudit(res.locals as AppLocals, "class.create", "class", cls.id, { name: cls.name, year: cls.year, term: cls.term });
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
  res.json({ ...GetClassResponse.parse(row), teacherId: row.teacherId ?? null });
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
  logAudit(res.locals as AppLocals, "class.update", "class", params.data.id, { changes: parsed.data });
  const [row] = await db
    .select(CLASS_SELECT)
    .from(classesTable)
    .leftJoin(studentsTable, eq(studentsTable.classId, classesTable.id))
    .where(eq(classesTable.id, params.data.id))
    .groupBy(classesTable.id);
  res.json({ ...UpdateClassResponse.parse(row), teacherId: row.teacherId ?? null });
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
  logAudit(res.locals as AppLocals, "class.delete", "class", params.data.id, { name: deleted.name });
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
  let classTeacherName: string | null = null;

  if (userId !== null && userId !== undefined) {
    // Verify the user exists, and capture their name so classTeacherName
    // (the plain display column several screens read directly, including
    // the mobile classes list) stays in sync with the real assignment
    // instead of going stale the moment teacherId changes.
    const [userRow] = await db.select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, String(userId)));
    if (!userRow) { res.status(404).json({ error: "User not found" }); return; }
    classTeacherName = [userRow.firstName, userRow.lastName].filter(Boolean).join(" ") || userRow.email || null;
  }

  const [updated] = await db
    .update(classesTable)
    .set({ teacherId: userId ?? null, classTeacherName })
    .where(eq(classesTable.id, classId))
    .returning();

  if (!updated) { res.status(404).json({ error: "Class not found" }); return; }
  logAudit(res.locals as AppLocals, "class.assign_teacher", "class", classId, { teacherId: userId ?? null, teacherName: classTeacherName });
  res.json({ ok: true, classId, teacherId: updated.teacherId ?? null, classTeacherName: updated.classTeacherName ?? null });
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
      isActive: usersTable.isActive,
    })
    .from(usersTable)
    .orderBy(usersTable.firstName, usersTable.lastName);
  res.json(rows);
});

/**
 * PATCH /api/users/:id/role
 * Set a user's role. Admin only — deliberately stricter than the isStaff()
 * check used elsewhere. Granting/revoking admin, principal, or deputy access
 * is the single most sensitive action in the system, so it is NOT available
 * to principal/deputy accounts, and an admin cannot change their own role
 * (self-promotion / accidental self-demotion guard — a second admin, or a
 * direct DB update, is required to change the first admin's role).
 * Body: { role: "teacher" | "admin" | "principal" | "deputy" }
 */
router.patch("/users/:id/role", async (req, res): Promise<void> => {
  const locals = res.locals as AppLocals;
  if (!isAdmin(locals)) {
    forbidden(res, "Only an admin can change a user's role."); return;
  }
  const { id } = req.params;
  if (id === locals.user.id) {
    forbidden(res, "You cannot change your own role. Ask another admin to do this."); return;
  }
  const { role } = req.body;
  const validRoles = ["teacher", "admin", "principal", "deputy"];
  if (!validRoles.includes(role)) {
    res.status(400).json({ error: `role must be one of: ${validRoles.join(", ")}` }); return;
  }
  const [before] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, id));
  const [updated] = await db
    .update(usersTable)
    .set({ role, updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id, role: usersTable.role });
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  logAudit(res.locals as AppLocals, "user.role_change", "user", id, { previousRole: before?.role ?? null, newRole: role });
  res.json({ ok: true, id: updated.id, role: updated.role });
});

/**
 * PATCH /api/users/:id/status
 * Deactivate or reactivate a user. Admin only, same rules as role changes:
 * not available to principal/deputy, and an admin cannot deactivate their
 * own account (a second admin must do it, so nobody can accidentally or
 * maliciously lock everyone out).
 *
 * This is deliberately NOT a delete. A teacher's id is referenced by their
 * past classes, scores they entered, signatures on report cards, and
 * messages they sent — deleting the row would orphan or corrupt all of
 * that history. Deactivating blocks the account at the auth layer (see
 * middlewares/auth.ts) without touching any historical record.
 * Body: { isActive: boolean }
 */
router.patch("/users/:id/status", async (req, res): Promise<void> => {
  const locals = res.locals as AppLocals;
  if (!isAdmin(locals)) {
    forbidden(res, "Only an admin can deactivate or reactivate a user."); return;
  }
  const { id } = req.params;
  if (id === locals.user.id) {
    forbidden(res, "You cannot deactivate your own account. Ask another admin to do this."); return;
  }
  const { isActive } = req.body;
  if (typeof isActive !== "boolean") {
    res.status(400).json({ error: "isActive must be true or false" }); return;
  }
  const [updated] = await db
    .update(usersTable)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id, isActive: usersTable.isActive, firstName: usersTable.firstName, lastName: usersTable.lastName });
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  logAudit(locals, isActive ? "user.reactivate" : "user.deactivate", "user", id, { name: [updated.firstName, updated.lastName].filter(Boolean).join(" ") });
  res.json({ ok: true, id: updated.id, isActive: updated.isActive });
});

export default router;
