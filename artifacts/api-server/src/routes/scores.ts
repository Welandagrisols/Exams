import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, scoresTable, learningAreasTable } from "@workspace/db";
import { ListScoresQueryParams, ListScoresResponse, UpsertScoresBody, UpsertScoresResponse } from "@workspace/api-zod";
import { getRubricGrade, getRubricPoints } from "../lib/rubric";

const router: IRouter = Router();

router.get("/scores", async (req, res): Promise<void> => {
  const query = ListScoresQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const conditions = [eq(scoresTable.examId, query.data.examId)];
  if (query.data.studentId != null) {
    conditions.push(eq(scoresTable.studentId, query.data.studentId));
  }
  const rows = await db
    .select({
      id: scoresTable.id,
      studentId: scoresTable.studentId,
      examId: scoresTable.examId,
      learningAreaId: scoresTable.learningAreaId,
      learningAreaName: learningAreasTable.name,
      learningAreaAbbr: learningAreasTable.abbreviation,
      marks: scoresTable.marks,
      maxMarks: learningAreasTable.maxMarks,
    })
    .from(scoresTable)
    .leftJoin(learningAreasTable, eq(learningAreasTable.id, scoresTable.learningAreaId))
    .where(and(...conditions));

  const result = rows.map((r) => {
    const marks = parseFloat(r.marks as unknown as string);
    const maxMarks = r.maxMarks ?? 100;
    const grade = getRubricGrade(marks, maxMarks);
    return {
      ...r,
      marks,
      maxMarks,
      rubricGrade: grade,
      rubricPoints: getRubricPoints(grade),
    };
  });
  res.json(ListScoresResponse.parse(result));
});

router.post("/scores", async (req, res): Promise<void> => {
  const parsed = UpsertScoresBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { studentId, examId, scores } = parsed.data;

  const upserted = await db.transaction(async (tx) => {
    const rows = [];
    for (const entry of scores) {
      const [row] = await tx
        .insert(scoresTable)
        .values({
          studentId,
          examId,
          learningAreaId: entry.learningAreaId,
          marks: String(entry.marks),
        })
        .onConflictDoUpdate({
          target: [scoresTable.studentId, scoresTable.examId, scoresTable.learningAreaId],
          set: { marks: String(entry.marks) },
        })
        .returning();
      rows.push(row);
    }
    return rows;
  });

  const areaMap = new Map(
    (await db.select().from(learningAreasTable)).map((a) => [a.id, a])
  );

  const result = upserted.map((r) => {
    const area = areaMap.get(r.learningAreaId);
    const marks = parseFloat(r.marks as unknown as string);
    const maxMarks = area?.maxMarks ?? 100;
    const grade = getRubricGrade(marks, maxMarks);
    return {
      id: r.id,
      studentId: r.studentId,
      examId: r.examId,
      learningAreaId: r.learningAreaId,
      learningAreaName: area?.name ?? null,
      learningAreaAbbr: area?.abbreviation ?? null,
      marks,
      maxMarks,
      rubricGrade: grade,
      rubricPoints: getRubricPoints(grade),
    };
  });
  res.json(UpsertScoresResponse.parse(result));
});

export default router;
