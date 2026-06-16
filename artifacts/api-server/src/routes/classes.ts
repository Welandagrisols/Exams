import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, classesTable, studentsTable } from "@workspace/db";
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

const router: IRouter = Router();

router.get("/classes", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: classesTable.id,
      name: classesTable.name,
      year: classesTable.year,
      term: classesTable.term,
      classTeacherName: classesTable.classTeacherName,
      studentCount: sql<number>`cast(count(${studentsTable.id}) as int)`,
    })
    .from(classesTable)
    .leftJoin(studentsTable, eq(studentsTable.classId, classesTable.id))
    .groupBy(classesTable.id)
    .orderBy(classesTable.year, classesTable.name);
  res.json(ListClassesResponse.parse(rows));
});

router.post("/classes", async (req, res): Promise<void> => {
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
    .select({
      id: classesTable.id,
      name: classesTable.name,
      year: classesTable.year,
      term: classesTable.term,
      classTeacherName: classesTable.classTeacherName,
      studentCount: sql<number>`cast(count(${studentsTable.id}) as int)`,
    })
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
    .select({
      id: classesTable.id,
      name: classesTable.name,
      year: classesTable.year,
      term: classesTable.term,
      classTeacherName: classesTable.classTeacherName,
      studentCount: sql<number>`cast(count(${studentsTable.id}) as int)`,
    })
    .from(classesTable)
    .leftJoin(studentsTable, eq(studentsTable.classId, classesTable.id))
    .where(eq(classesTable.id, params.data.id))
    .groupBy(classesTable.id);
  res.json(UpdateClassResponse.parse(row));
});

router.delete("/classes/:id", async (req, res): Promise<void> => {
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

export default router;
