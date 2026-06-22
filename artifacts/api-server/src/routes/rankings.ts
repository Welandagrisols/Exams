import { Router, type IRouter } from "express";
import { and, eq, inArray } from "drizzle-orm";
import { db, studentsTable, classesTable, scoresTable, learningAreasTable, schoolTable } from "@workspace/db";
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

  // Fetch all learning areas for this exam upfront (avoids N+1)
  const allScoreRows = await db
    .select({
      studentId: scoresTable.studentId,
      marks: scoresTable.marks,
      learningAreaId: scoresTable.learningAreaId,
    })
    .from(scoresTable)
    .where(eq(scoresTable.examId, examId));

  const learningAreaIds = [...new Set(allScoreRows.map((r) => r.learningAreaId))];
  const learningAreas =
    learningAreaIds.length > 0
      ? await db
          .select({ id: learningAreasTable.id, maxMarks: learningAreasTable.maxMarks })
          .from(learningAreasTable)
          .where(inArray(learningAreasTable.id, learningAreaIds))
      : [];
  const maxMarksMap = new Map(learningAreas.map((la) => [la.id, la.maxMarks ?? 100]));

  // Group scores by student
  const scoresByStudent = new Map<number, typeof allScoreRows>();
  for (const row of allScoreRows) {
    const arr = scoresByStudent.get(row.studentId) ?? [];
    arr.push(row);
    scoresByStudent.set(row.studentId, arr);
  }

  // Fetch all student details in one query
  const studentIds = studentRows.map((r) => r.studentId);
  const studentDetails =
    studentIds.length > 0
      ? await db
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
          .where(inArray(studentsTable.id, studentIds))
      : [];
  const studentMap = new Map(studentDetails.map((s) => [s.id, s]));

  const results = [];
  for (const { studentId } of studentRows) {
    const student = studentMap.get(studentId);
    if (!student) continue;

    const scoreRows = scoresByStudent.get(studentId) ?? [];
    const totalMarks = scoreRows.reduce((s, r) => s + parseFloat(r.marks as unknown as string), 0);
    const totalMaxMarks = scoreRows.reduce((s, r) => s + (maxMarksMap.get(r.learningAreaId) ?? 100), 0);
    const subjectCount = scoreRows.length;
    const averagePercentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;

    const pointsArr = scoreRows.map((r) => {
      const m = parseFloat(r.marks as unknown as string);
      const maxM = maxMarksMap.get(r.learningAreaId) ?? 100;
      const g = getRubricGrade(m, maxM, thresholds);
      return getRubricPoints(g);
    });
    const averagePoints =
      pointsArr.length > 0 ? pointsArr.reduce((s, p) => s + p, 0) / pointsArr.length : 0;
    const overallGrade = getOverallGrade(averagePoints);

    results.push({ student, totalMarks, totalMaxMarks, averagePercentage, averagePoints, overallGrade, subjectCount });
  }

  results.sort((a, b) => b.totalMarks - a.totalMarks);
  const ranked = results.map((r, i) => ({ rank: i + 1, ...r }));
  res.json(GetRankingsResponse.parse(ranked));
});

export default router;
