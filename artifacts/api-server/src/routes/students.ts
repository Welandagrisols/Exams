import { Router, type IRouter } from "express";
import { eq, and, gte } from "drizzle-orm";
import multer from "multer";
import { db, studentsTable, classesTable } from "@workspace/db";
import { canEditClass, isStaff, forbidden, type AppLocals } from "../middlewares/rbac";
import {
  ListStudentsQueryParams,
  CreateStudentBody,
  GetStudentParams,
  UpdateStudentParams,
  UpdateStudentBody,
  DeleteStudentParams,
} from "@workspace/api-zod";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const STUDENT_SELECT = {
  id: studentsTable.id,
  name: studentsTable.name,
  admissionNo: studentsTable.admissionNo,
  classId: studentsTable.classId,
  className: classesTable.name,
  gender: studentsTable.gender,
  dateOfBirth: studentsTable.dateOfBirth,
  parentName: studentsTable.parentName,
  parentPhone: studentsTable.parentPhone,
  parentEmail: studentsTable.parentEmail,
  nationality: studentsTable.nationality,
  notes: studentsTable.notes,
  photoUrl: studentsTable.photoUrl,
  feeBalance: studentsTable.feeBalance,
} as const;

const router: IRouter = Router();

router.get("/students", async (req, res): Promise<void> => {
  const query = ListStudentsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const rows = await db
    .select(STUDENT_SELECT)
    .from(studentsTable)
    .leftJoin(classesTable, eq(classesTable.id, studentsTable.classId))
    .where(query.data.classId != null ? eq(studentsTable.classId, query.data.classId) : undefined)
    .orderBy(studentsTable.name);
  res.json(rows);
});

router.post("/students", async (req, res): Promise<void> => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  // RBAC: class teacher or staff only
  if (!canEditClass(parsed.data.classId, res.locals as AppLocals)) {
    forbidden(res, "Only the class teacher can add students to this class."); return;
  }
  const [student] = await db.insert(studentsTable).values(parsed.data).returning();
  const [row] = await db
    .select(STUDENT_SELECT)
    .from(studentsTable)
    .leftJoin(classesTable, eq(classesTable.id, studentsTable.classId))
    .where(eq(studentsTable.id, student.id));
  res.status(201).json(row);
});

router.post("/students/fee-balances/bulk", async (req, res): Promise<void> => {
  const { updates, classId } = req.body;
  if (!Array.isArray(updates) || updates.length === 0) {
    res.status(400).json({ error: "updates array is required" });
    return;
  }
  // RBAC: class teacher (classId required) or staff
  if (classId != null && !canEditClass(parseInt(classId), res.locals as AppLocals)) {
    forbidden(res, "Only the class teacher can update fee balances for this class."); return;
  }
  if (classId == null && !isStaff(res.locals as AppLocals)) {
    forbidden(res, "Provide classId or use a staff account to update fee balances."); return;
  }

  // When classId is provided, pre-fetch the set of student IDs that actually
  // belong to that class so we can reject cross-class writes in the loop below.
  let allowedStudentIds: Set<number> | null = null;
  if (classId != null) {
    const classStudents = await db
      .select({ id: studentsTable.id })
      .from(studentsTable)
      .where(eq(studentsTable.classId, parseInt(classId)));
    allowedStudentIds = new Set(classStudents.map((s) => s.id));
  }

  let updated = 0;
  for (const entry of updates) {
    const studentId = parseInt(entry?.studentId);
    const feeBalance = entry?.feeBalance;
    if (isNaN(studentId) || feeBalance == null || isNaN(parseFloat(feeBalance))) continue;
    // Silently skip any student that doesn't belong to the authorised class
    if (allowedStudentIds && !allowedStudentIds.has(studentId)) continue;

    const [row] = await db
      .update(studentsTable)
      .set({ feeBalance: String(feeBalance) })
      .where(eq(studentsTable.id, studentId))
      .returning({ id: studentsTable.id });
    if (row) updated++;
  }

  res.json({ updated });
});

router.get("/students/fee-reminders", async (req, res): Promise<void> => {
  const minBalance = parseFloat(req.query.minBalance as string);
  if (isNaN(minBalance)) {
    res.status(400).json({ error: "minBalance query param is required" });
    return;
  }
  const classId = req.query.classId ? parseInt(req.query.classId as string) : undefined;
  if (req.query.classId && isNaN(classId as number)) {
    res.status(400).json({ error: "Invalid classId" });
    return;
  }

  const rows = await db
    .select({
      id: studentsTable.id,
      name: studentsTable.name,
      admissionNo: studentsTable.admissionNo,
      classId: studentsTable.classId,
      className: classesTable.name,
      feeBalance: studentsTable.feeBalance,
      parentName: studentsTable.parentName,
      parentPhone: studentsTable.parentPhone,
      parentEmail: studentsTable.parentEmail,
    })
    .from(studentsTable)
    .leftJoin(classesTable, eq(classesTable.id, studentsTable.classId))
    .where(
      classId
        ? and(gte(studentsTable.feeBalance, String(minBalance)), eq(studentsTable.classId, classId))
        : gte(studentsTable.feeBalance, String(minBalance))
    )
    .orderBy(studentsTable.name);

  res.json(rows);
});

router.get("/students/:id", async (req, res): Promise<void> => {
  const params = GetStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select(STUDENT_SELECT)
    .from(studentsTable)
    .leftJoin(classesTable, eq(classesTable.id, studentsTable.classId))
    .where(eq(studentsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  res.json(row);
});

router.patch("/students/:id", async (req, res): Promise<void> => {
  const params = UpdateStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  // RBAC: fetch student's class, then check
  const [_studForRbac] = await db.select({ classId: studentsTable.classId }).from(studentsTable).where(eq(studentsTable.id, params.data.id));
  if (!_studForRbac || !canEditClass(_studForRbac.classId, res.locals as AppLocals)) {
    forbidden(res, "Only the class teacher can edit students in this class."); return;
  }
  const [updated] = await db.update(studentsTable).set(parsed.data).where(eq(studentsTable.id, params.data.id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  const [row] = await db
    .select(STUDENT_SELECT)
    .from(studentsTable)
    .leftJoin(classesTable, eq(classesTable.id, studentsTable.classId))
    .where(eq(studentsTable.id, params.data.id));
  res.json(row);
});

router.delete("/students/:id", async (req, res): Promise<void> => {
  const params = DeleteStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  // RBAC: fetch student's class, then check
  const [_studDel] = await db.select({ classId: studentsTable.classId }).from(studentsTable).where(eq(studentsTable.id, params.data.id));
  if (!_studDel || !canEditClass(_studDel.classId, res.locals as AppLocals)) {
    forbidden(res, "Only the class teacher can remove students from this class."); return;
  }
  const [deleted] = await db.delete(studentsTable).where(eq(studentsTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/students/:id/photo", upload.single("photo"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid student id" }); return; }
  if (!req.file) { res.status(400).json({ error: "Photo file is required" }); return; }

  // RBAC: fetch student's class, then check
  const [_studPhoto] = await db.select({ classId: studentsTable.classId }).from(studentsTable).where(eq(studentsTable.id, id));
  if (!_studPhoto || !canEditClass(_studPhoto.classId, res.locals as AppLocals)) {
    forbidden(res, "Only the class teacher can update photos for students in this class."); return;
  }

  const base64 = req.file.buffer.toString("base64");
  const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

  const [updated] = await db
    .update(studentsTable)
    .set({ photoUrl: dataUrl })
    .where(eq(studentsTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Student not found" }); return; }
  res.json({ photoUrl: dataUrl });
});

router.delete("/students/:id/photo", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid student id" }); return; }

  // RBAC: fetch student's class, then check
  const [_studDelPhoto] = await db.select({ classId: studentsTable.classId }).from(studentsTable).where(eq(studentsTable.id, id));
  if (!_studDelPhoto || !canEditClass(_studDelPhoto.classId, res.locals as AppLocals)) {
    forbidden(res, "Only the class teacher can remove photos for students in this class."); return;
  }

  const [updated] = await db.update(studentsTable).set({ photoUrl: null }).where(eq(studentsTable.id, id)).returning({ id: studentsTable.id });
  if (!updated) { res.status(404).json({ error: "Student not found" }); return; }
  res.json({ photoUrl: null });
});

export default router;
