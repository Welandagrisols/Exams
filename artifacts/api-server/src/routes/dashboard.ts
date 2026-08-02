import { Router, type IRouter } from "express";
import { eq, desc, asc, sql, inArray } from "drizzle-orm";
import { db, studentsTable, classesTable, examsTable, scoresTable, learningAreasTable } from "@workspace/db";
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
  const [{ count: totalActive }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(examsTable)
    .where(eq(examsTable.status, "active"));

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

  // --- Class Snapshots ---
  const allClasses = await db
    .select({ id: classesTable.id, name: classesTable.name })
    .from(classesTable)
    .orderBy(asc(classesTable.id));

  const learningAreas = await db
    .select({ id: learningAreasTable.id, maxMarks: learningAreasTable.maxMarks })
    .from(learningAreasTable);

  const classSnapshots = [];

  for (const cls of allClasses) {
    // Student count for this class
    const [{ count: studentCount }] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(studentsTable)
      .where(eq(studentsTable.classId, cls.id));

    // All exams for this class, ordered chronologically
    const classExams = await db
      .select({ id: examsTable.id, name: examsTable.name, term: examsTable.term, year: examsTable.year })
      .from(examsTable)
      .where(eq(examsTable.classId, cls.id))
      .orderBy(asc(examsTable.year), asc(examsTable.term), asc(examsTable.id));

    // Build sparkline — average % per exam (only exams with scores)
    const sparkline: { examId: number; examName: string; term: number; year: number; average: number }[] = [];

    for (const exam of classExams) {
      const scores = await db
        .select({ learningAreaId: scoresTable.learningAreaId, marks: scoresTable.marks })
        .from(scoresTable)
        .where(eq(scoresTable.examId, exam.id));

      if (scores.length === 0) continue;

      // Group marks by learning area, compute % per student
      const areaMarks = new Map<number, number[]>();
      for (const s of scores) {
        if (!s.learningAreaId) continue;
        const m = parseFloat(s.marks as unknown as string);
        if (!areaMarks.has(s.learningAreaId)) areaMarks.set(s.learningAreaId, []);
        areaMarks.get(s.learningAreaId)!.push(m);
      }

      const areaPcts: number[] = [];
      for (const la of learningAreas) {
        const marks = areaMarks.get(la.id) ?? [];
        if (marks.length === 0) continue;
        const avg = marks.reduce((s, m) => s + m, 0) / marks.length;
        areaPcts.push(la.maxMarks > 0 ? (avg / la.maxMarks) * 100 : 0);
      }
      const classAvg = areaPcts.length > 0 ? areaPcts.reduce((s, p) => s + p, 0) / areaPcts.length : 0;

      sparkline.push({ examId: exam.id, examName: exam.name, term: exam.term, year: exam.year, average: Math.round(classAvg * 10) / 10 });
    }

    // Latest snapshot (last entry in sparkline)
    let latestExamId: number | null = null;
    let latestExamName: string | null = null;
    let latestAverage: number | null = null;
    let latestGrades = { EE: 0, ME: 0, AE: 0, BE: 0 };
    let topStudentName: string | null = null;
    let topStudentGrade: string | null = null;

    if (sparkline.length > 0) {
      const last = sparkline[sparkline.length - 1];
      latestExamId = last.examId;
      latestExamName = last.examName;
      latestAverage = last.average;

      // Grade distribution for latest exam
      const latestScores = await db
        .select({
          studentId: scoresTable.studentId,
          learningAreaId: scoresTable.learningAreaId,
          marks: scoresTable.marks,
        })
        .from(scoresTable)
        .where(eq(scoresTable.examId, last.examId));

      // Group scores by student
      const studentMarks = new Map<number, { totalPts: number; count: number; totalMarks: number; totalMax: number }>();
      for (const s of latestScores) {
        const m = parseFloat(s.marks as unknown as string);
        const la = learningAreas.find(l => l.id === s.learningAreaId);
        const maxM = la?.maxMarks ?? 100;
        const grade = getRubricGrade(m, maxM);
        const pts = getRubricPoints(grade);
        if (!studentMarks.has(s.studentId)) studentMarks.set(s.studentId, { totalPts: 0, count: 0, totalMarks: 0, totalMax: 0 });
        const entry = studentMarks.get(s.studentId)!;
        entry.totalPts += pts;
        entry.count++;
        entry.totalMarks += m;
        entry.totalMax += maxM;
      }

      // Batch-fetch all student names for this exam in one query
      const examStudentIds = [...studentMarks.keys()];
      const examStudentRows = examStudentIds.length > 0
        ? await db
            .select({ id: studentsTable.id, name: studentsTable.name })
            .from(studentsTable)
            .where(inArray(studentsTable.id, examStudentIds))
        : [];
      const studentNameMap = new Map(examStudentRows.map(s => [s.id, s.name]));

      let topMarks = -1;
      for (const [studentId, data] of studentMarks.entries()) {
        const avgPts = data.count > 0 ? data.totalPts / data.count : 0;
        const overall = getOverallGrade(avgPts);
        if (overall.startsWith("EE")) latestGrades.EE++;
        else if (overall.startsWith("ME")) latestGrades.ME++;
        else if (overall.startsWith("AE")) latestGrades.AE++;
        else latestGrades.BE++;

        if (data.totalMarks > topMarks) {
          topMarks = data.totalMarks;
          const name = studentNameMap.get(studentId);
          if (name) {
            topStudentName = name;
            topStudentGrade = getOverallGrade(avgPts);
          }
        }
      }
    }

    classSnapshots.push({
      classId: cls.id,
      className: cls.name,
      studentCount: studentCount ?? 0,
      latestExamId,
      latestExamName,
      latestAverage,
      latestGrades,
      sparkline,
      topStudentName,
      topStudentGrade,
    });
  }

  res.json({
    totalStudents: totalStudents ?? 0,
    totalClasses: totalClasses ?? 0,
    totalExams: totalExams ?? 0,
    totalActive: totalActive ?? 0,
    recentExams: recentExamRows,
    classSnapshots,
  });
});

export default router;
