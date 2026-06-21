import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, studentsTable, classesTable, scoresTable, schoolTable } from "@workspace/db";
import { GetRankingsParams, GetRankingsResponse } from "@workspace/api-zod";
import { getRubricGrade, getRubricPoints, getOverallGrade, thresholdsFromSchool } from "../lib/rubric";

const router: IRouter = Router();

router.get("/rankings/:examId", async (req, res): Promise<void> => {
  const params = GetRankingsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { examId } = params.data;

  const [schoolRow] = await db.select().from(schoolTable).limit(1);
  const thresholds = thresholdsFromSchool(schoolRow);

  const studentRows = await db
    .selectDistinct({ studentId: scoresTable.studentId })
    .from(scoresTable)
    .where(eq(scoresTable.examId, examId));

  const results = [];
  for (const { studentId } of studentRows) {
    const [student] = await db
      .select({
        id: studentsTable.id,
        name: studentsTable.name,
        admissionNo: studentsTable.admissionNo,
        classId: studentsTable.classId,
        className: classesTable.name,
        gender: studentsTable.gender,
        dateOfBirth: studentsTable.dateOfBirth,
      })
      .from(studentsTable)
      .leftJoin(classesTable, eq(classesTable.id, studentsTable.classId))
      .where(eq(studentsTable.id, studentId));

    if (!student) continue;

    const scoreRows = await db
      .select({ marks: scoresTable.marks, learningAreaId: scoresTable.learningAreaId })
      .from(scoresTable)
      .where(and(eq(scoresTable.examId, examId), eq(scoresTable.studentId, studentId)));

    const totalMarks = scoreRows.reduce((s, r) => s + parseFloat(r.marks as unknown as string), 0);
    const subjectCount = scoreRows.length;

    // We need maxMarks — use 100 default per subject
    const totalMaxMarks = subjectCount * 100;
    const averagePercentage = subjectCount > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;

    const pointsArr = scoreRows.map((r) => {
      const m = parseFloat(r.marks as unknown as string);
      const g = getRubricGrade(m, 100, thresholds);
      return getRubricPoints(g);
    });
    const averagePoints = pointsArr.length > 0 ? pointsArr.reduce((s, p) => s + p, 0) / pointsArr.length : 0;
    const overallGrade = getOverallGrade(averagePoints);

    results.push({ student, totalMarks, totalMaxMarks, averagePercentage, averagePoints, overallGrade, subjectCount });
  }

  results.sort((a, b) => b.totalMarks - a.totalMarks);
  const ranked = results.map((r, i) => ({ rank: i + 1, ...r }));
  res.json(GetRankingsResponse.parse(ranked));
});

export default router;
