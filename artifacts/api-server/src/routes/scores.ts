import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db, scoresTable, learningAreasTable, examsTable, studentsTable } from "@workspace/db";
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

// Summary endpoint used by the mobile scores read-only view
router.get("/scores/:examId", async (req, res): Promise<void> => {
  const examId = parseInt(req.params.examId, 10);
  if (isNaN(examId) || examId <= 0) { res.status(400).json({ error: "Invalid examId" }); return; }

  const [exam] = await db
    .select({ id: examsTable.id, name: examsTable.name, classId: examsTable.classId })
    .from(examsTable)
    .where(eq(examsTable.id, examId));
  if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }

  const [students, scoreRows, areas] = await Promise.all([
    db.select({ id: studentsTable.id, name: studentsTable.name, admissionNo: studentsTable.admissionNo })
      .from(studentsTable)
      .where(eq(studentsTable.classId, exam.classId))
      .orderBy(asc(studentsTable.name)),
    db.select({
        studentId: scoresTable.studentId,
        learningAreaId: scoresTable.learningAreaId,
        marks: scoresTable.marks,
        learningAreaName: learningAreasTable.name,
        abbreviation: learningAreasTable.abbreviation,
        maxMarks: learningAreasTable.maxMarks,
      })
      .from(scoresTable)
      .leftJoin(learningAreasTable, eq(learningAreasTable.id, scoresTable.learningAreaId))
      .where(eq(scoresTable.examId, examId)),
    db.select({ id: learningAreasTable.id, name: learningAreasTable.name, abbreviation: learningAreasTable.abbreviation, maxMarks: learningAreasTable.maxMarks })
      .from(learningAreasTable)
      .orderBy(asc(learningAreasTable.sortOrder)),
  ]);

  // Group scores by studentId
  const scoresByStudent = new Map<number, typeof scoreRows>();
  for (const s of scoreRows) {
    if (!scoresByStudent.has(s.studentId)) scoresByStudent.set(s.studentId, []);
    scoresByStudent.get(s.studentId)!.push(s);
  }

  // Only return students who have at least one score entered
  const rows = students
    .filter(st => scoresByStudent.has(st.id))
    .map(st => {
      const studentScores = scoresByStudent.get(st.id) ?? [];
      const scoreMap = new Map(studentScores.map(s => [s.learningAreaId, s]));
      let total = 0;
      let maxTotal = 0;
      const subjectScores = areas
        .filter(la => scoreMap.has(la.id))
        .map(la => {
          const s = scoreMap.get(la.id)!;
          const marks = parseFloat(s.marks as unknown as string);
          total += isNaN(marks) ? 0 : marks;
          maxTotal += la.maxMarks;
          return {
            learningAreaId: la.id,
            learningAreaName: la.name,
            abbreviation: la.abbreviation,
            marks: isNaN(marks) ? null : marks,
            maxMarks: la.maxMarks,
          };
        });
      return { studentId: st.id, studentName: st.name, admissionNo: st.admissionNo, scores: subjectScores, total, maxTotal };
    });

  res.json({ examId: exam.id, examName: exam.name, rows });
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

// Bulk upsert scores for multiple students in one exam — used by OCR upload
router.post("/scores/bulk", async (req, res): Promise<void> => {
  const { examId, students } = req.body;
  if (!examId || !Array.isArray(students) || students.length === 0) {
    res.status(400).json({ error: "examId and students array are required" });
    return;
  }
  const parsedExamId = parseInt(examId);
  if (isNaN(parsedExamId)) {
    res.status(400).json({ error: "examId must be a number" });
    return;
  }

  const areaMap = new Map(
    (await db.select().from(learningAreasTable)).map((a) => [a.id, a])
  );

  let saved = 0;
  let skipped = 0;
  const errors: string[] = [];

  await db.transaction(async (tx) => {
    for (const student of students) {
      const studentId = parseInt(student?.studentId);
      if (isNaN(studentId)) { skipped++; continue; }
      const scores = Array.isArray(student?.scores) ? student.scores : [];
      const validScores = scores.filter((s: any) => {
        const m = parseFloat(s?.marks);
        return !isNaN(parseInt(s?.learningAreaId)) && !isNaN(m) && m >= 0;
      });
      for (const entry of validScores) {
        try {
          await tx
            .insert(scoresTable)
            .values({
              studentId,
              examId: parsedExamId,
              learningAreaId: parseInt(entry.learningAreaId),
              marks: String(parseFloat(entry.marks)),
            })
            .onConflictDoUpdate({
              target: [scoresTable.studentId, scoresTable.examId, scoresTable.learningAreaId],
              set: { marks: String(parseFloat(entry.marks)) },
            });
          saved++;
        } catch (err: any) {
          errors.push(`student ${studentId} area ${entry.learningAreaId}: ${err.message}`);
          skipped++;
        }
      }
    }
  });

  res.json({ saved, skipped, errors });
});

export default router;
