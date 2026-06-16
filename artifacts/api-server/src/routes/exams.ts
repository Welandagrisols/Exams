import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, examsTable, classesTable } from "@workspace/db";
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
  const [deleted] = await db.delete(examsTable).where(eq(examsTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
