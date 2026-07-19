import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, examsTable, classesTable } from "@workspace/db";
import { canEditClass, isStaff, forbidden, type AppLocals } from "../middlewares/rbac";
import {
  ListExamsQueryParams,
  ListExamsResponse,
  CreateExamBody,
  GetExamParams,
  GetExamResponse,
  UpdateExamParams,
  UpdateExamBody,
  UpdateExamResponse,
  DeleteExamParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function examWithClass(id: number) {
  const [row] = await db
    .select({
      id: examsTable.id,
      name: examsTable.name,
      classId: examsTable.classId,
      className: classesTable.name,
      year: examsTable.year,
      term: examsTable.term,
      openingDate: examsTable.openingDate,
      closingDate: examsTable.closingDate,
      status: examsTable.status,
    })
    .from(examsTable)
    .leftJoin(classesTable, eq(classesTable.id, examsTable.classId))
    .where(eq(examsTable.id, id));
  return row;
}

router.get("/exams", async (req, res): Promise<void> => {
  const query = ListExamsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const rows = await db
    .select({
      id: examsTable.id,
      name: examsTable.name,
      classId: examsTable.classId,
      className: classesTable.name,
      year: examsTable.year,
      term: examsTable.term,
      openingDate: examsTable.openingDate,
      closingDate: examsTable.closingDate,
      status: examsTable.status,
    })
    .from(examsTable)
    .leftJoin(classesTable, eq(classesTable.id, examsTable.classId))
    .where(query.data.classId != null ? eq(examsTable.classId, query.data.classId) : undefined)
    .orderBy(examsTable.year, examsTable.term, examsTable.name);
  res.json(ListExamsResponse.parse(rows));
});

router.post("/exams", async (req, res): Promise<void> => {
  const parsed = CreateExamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  // RBAC: class teacher or staff only
  if (!canEditClass(parsed.data.classId, res.locals as AppLocals)) {
    forbidden(res, "Only the class teacher can create exams for this class."); return;
  }
  const [exam] = await db.insert(examsTable).values(parsed.data).returning();
  const row = await examWithClass(exam.id);
  res.status(201).json(GetExamResponse.parse(row));
});

router.get("/exams/:id", async (req, res): Promise<void> => {
  const params = GetExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const row = await examWithClass(params.data.id);
  if (!row) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }
  res.json(GetExamResponse.parse(row));
});

router.patch("/exams/:id", async (req, res): Promise<void> => {
  const params = UpdateExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateExamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  // RBAC: class teacher or staff only
  const [_patchExam] = await db.select({ classId: examsTable.classId }).from(examsTable).where(eq(examsTable.id, params.data.id));
  if (!_patchExam || !canEditClass(_patchExam.classId, res.locals as AppLocals)) {
    forbidden(res, "Only the class teacher can edit this exam."); return;
  }
  const [updated] = await db.update(examsTable).set(parsed.data).where(eq(examsTable.id, params.data.id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }
  const row = await examWithClass(params.data.id);
  res.json(UpdateExamResponse.parse(row));
});

router.delete("/exams/:id", async (req, res): Promise<void> => {
  const params = DeleteExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  // RBAC: class teacher or staff only
  const [_delExam] = await db.select({ classId: examsTable.classId }).from(examsTable).where(eq(examsTable.id, params.data.id));
  if (!_delExam || !canEditClass(_delExam.classId, res.locals as AppLocals)) {
    forbidden(res, "Only the class teacher can delete this exam."); return;
  }
  const [deleted] = await db.delete(examsTable).where(eq(examsTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }
  res.sendStatus(204);
});

const BulkCreateExamBody = z.object({
  name: z.string().min(1),
  year: z.number().int().min(2000),
  term: z.number().int().min(1).max(3),
  openingDate: z.string().optional(),
  closingDate: z.string().optional(),
  status: z.enum(["draft", "active", "closed"]).default("draft"),
  classIds: z.array(z.number().int().positive()).min(1, "Select at least one class"),
});

router.post("/exams/bulk", async (req, res): Promise<void> => {
  const parsed = BulkCreateExamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  // Bulk create touches multiple classes — require staff or verify all classes belong to the caller
  const { classIds, ...examBase } = parsed.data;
  const allAllowed = (classIds as number[]).every(cId => canEditClass(cId, res.locals as AppLocals));
  if (!allAllowed) {
    forbidden(res, "You can only bulk-create exams for classes you are assigned to."); return;
  }

  const rows = await db
    .insert(examsTable)
    .values(classIds.map(classId => ({ ...examBase, classId })))
    .returning();

  const created = await db
    .select({
      id: examsTable.id,
      name: examsTable.name,
      classId: examsTable.classId,
      className: classesTable.name,
      year: examsTable.year,
      term: examsTable.term,
      openingDate: examsTable.openingDate,
      closingDate: examsTable.closingDate,
      status: examsTable.status,
    })
    .from(examsTable)
    .leftJoin(classesTable, eq(classesTable.id, examsTable.classId))
    .where(inArray(examsTable.id, rows.map(r => r.id)))
    .orderBy(classesTable.name);

  res.status(201).json({ exams: created, count: created.length });
});

export default router;
