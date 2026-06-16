import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, studentsTable, classesTable, examsTable, scoresTable } from "@workspace/db";
import { GetDashboardResponse } from "@workspace/api-zod";
import { getRubricGrade, getRubricPoints, getOverallGrade } from "../lib/rubric";

const router: IRouter = Router();

router.get("/dashboard", async (_req, res): Promise<void> => {
  const [{ count: totalStudents }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(studentsTable);
  const [{ count: totalClasses }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(classesTable);
  const [{ count: totalExams }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(examsTable);

  const recentExamRows = await db
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
    .orderBy(desc(examsTable.id))
    .limit(5);

  const topPerformers: any[] = [];

  // Find the most recent exam that actually has scores
  const examsWithScores = await db
    .selectDistinct({ examId: scoresTable.examId })
    .from(scoresTable);

  if (examsWithScores.length > 0) {
    // Pick the exam with the highest id that has scores
    const examIds = examsWithScores.map((e) => e.examId);
    const latestExamId = Math.max(...examIds);

    const studentIds = await db
      .selectDistinct({ studentId: scoresTable.studentId })
      .from(scoresTable)
      .where(eq(scoresTable.examId, latestExamId));

    const results = [];
    for (const { studentId } of studentIds) {
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
        .select({ marks: scoresTable.marks })
        .from(scoresTable)
        .where(eq(scoresTable.studentId, studentId));
      const totalMarks = scoreRows.reduce((s, r) => s + parseFloat(r.marks as unknown as string), 0);
      const subjectCount = scoreRows.length;
      const totalMaxMarks = subjectCount * 100;
      const averagePercentage = subjectCount > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;
      const pointsArr = scoreRows.map((r) => {
        const m = parseFloat(r.marks as unknown as string);
        return getRubricPoints(getRubricGrade(m, 100));
      });
      const averagePoints = pointsArr.length > 0 ? pointsArr.reduce((s, p) => s + p, 0) / pointsArr.length : 0;
      const overallGrade = getOverallGrade(averagePoints);
      results.push({ student, totalMarks, totalMaxMarks, averagePercentage, averagePoints, overallGrade, subjectCount });
    }
    results.sort((a, b) => b.totalMarks - a.totalMarks);
    const ranked = results.slice(0, 5).map((r, i) => ({ rank: i + 1, ...r }));
    topPerformers.push(...ranked);
  }

  res.json(GetDashboardResponse.parse({
    totalStudents: totalStudents ?? 0,
    totalClasses: totalClasses ?? 0,
    totalExams: totalExams ?? 0,
    recentExams: recentExamRows,
    topPerformers,
  }));
});

export default router;
