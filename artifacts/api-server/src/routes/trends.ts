import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db, examsTable, classesTable, scoresTable, learningAreasTable, studentsTable } from "@workspace/db";
import { getRubricGrade, getOverallGrade, getRubricPoints } from "../lib/rubric";

const router: IRouter = Router();

router.get("/trends/class/:classId", async (req, res): Promise<void> => {
  const classId = parseInt(req.params.classId, 10);
  if (isNaN(classId) || classId <= 0) { res.status(400).json({ error: "Invalid classId" }); return; }

  const [cls] = await db
    .select({ id: classesTable.id, name: classesTable.name })
    .from(classesTable)
    .where(eq(classesTable.id, classId));

  if (!cls) { res.status(404).json({ error: "Class not found" }); return; }

  const exams = await db
    .select({ id: examsTable.id, name: examsTable.name, term: examsTable.term, year: examsTable.year })
    .from(examsTable)
    .where(eq(examsTable.classId, classId))
    .orderBy(asc(examsTable.year), asc(examsTable.term), asc(examsTable.id));

  const learningAreas = await db
    .select({ id: learningAreasTable.id, name: learningAreasTable.name, abbreviation: learningAreasTable.abbreviation, maxMarks: learningAreasTable.maxMarks })
    .from(learningAreasTable)
    .orderBy(asc(learningAreasTable.sortOrder));

  const trendExams = [];
  for (const exam of exams) {
    const scores = await db
      .select({ learningAreaId: scoresTable.learningAreaId, marks: scoresTable.marks })
      .from(scoresTable)
      .where(eq(scoresTable.examId, exam.id));

    if (scores.length === 0) continue;

    const areaMarks = new Map<number, number[]>();
    for (const s of scores) {
      if (!s.learningAreaId) continue;
      const m = parseFloat(s.marks as unknown as string);
      if (!areaMarks.has(s.learningAreaId)) areaMarks.set(s.learningAreaId, []);
      areaMarks.get(s.learningAreaId)!.push(m);
    }

    const areaAverages = [];
    const allPcts: number[] = [];
    for (const la of learningAreas) {
      const marks = areaMarks.get(la.id) ?? [];
      if (marks.length === 0) continue;
      const avg = marks.reduce((s, m) => s + m, 0) / marks.length;
      const pct = (avg / la.maxMarks) * 100;
      allPcts.push(pct);
      areaAverages.push({ learningAreaId: la.id, name: la.name, abbreviation: la.abbreviation, average: Math.round(pct * 10) / 10 });
    }

    const classAverage = allPcts.length > 0 ? allPcts.reduce((s, p) => s + p, 0) / allPcts.length : 0;

    trendExams.push({
      examId: exam.id,
      examName: exam.name,
      term: exam.term,
      year: exam.year,
      classAverage: Math.round(classAverage * 10) / 10,
      learningAreas: areaAverages,
    });
  }

  res.json({ classId: cls.id, className: cls.name, exams: trendExams });
});

router.get("/trends/student/:studentId", async (req, res): Promise<void> => {
  const studentId = parseInt(req.params.studentId, 10);
  if (isNaN(studentId) || studentId <= 0) { res.status(400).json({ error: "Invalid studentId" }); return; }

  const [studentRow] = await db
    .select({
      id: studentsTable.id,
      name: studentsTable.name,
      admissionNo: studentsTable.admissionNo,
      classId: studentsTable.classId,
      className: classesTable.name,
      gender: studentsTable.gender,
      dateOfBirth: studentsTable.dateOfBirth,
      photoUrl: studentsTable.photoUrl,
    })
    .from(studentsTable)
    .leftJoin(classesTable, eq(classesTable.id, studentsTable.classId))
    .where(eq(studentsTable.id, studentId));

  if (!studentRow) { res.status(404).json({ error: "Student not found" }); return; }

  const student = {
    id: studentRow.id,
    name: studentRow.name,
    admissionNo: studentRow.admissionNo,
    classId: studentRow.classId,
    className: studentRow.className ?? null,
    gender: studentRow.gender ?? null,
    dateOfBirth: studentRow.dateOfBirth ?? null,
    photoUrl: studentRow.photoUrl ?? null,
  };

  const examIds = await db
    .selectDistinct({ examId: scoresTable.examId })
    .from(scoresTable)
    .where(eq(scoresTable.studentId, studentId));

  const learningAreas = await db
    .select({ id: learningAreasTable.id, name: learningAreasTable.name, abbreviation: learningAreasTable.abbreviation, maxMarks: learningAreasTable.maxMarks })
    .from(learningAreasTable)
    .orderBy(asc(learningAreasTable.sortOrder));

  const trendExams = [];
  for (const { examId } of examIds) {
    const [exam] = await db
      .select({ id: examsTable.id, name: examsTable.name, term: examsTable.term, year: examsTable.year, classId: examsTable.classId })
      .from(examsTable)
      .where(eq(examsTable.id, examId));
    if (!exam) continue;

    const scores = await db
      .select({ learningAreaId: scoresTable.learningAreaId, marks: scoresTable.marks })
      .from(scoresTable)
      .where(and(eq(scoresTable.examId, examId), eq(scoresTable.studentId, studentId)));

    const scoreMap = new Map<number, number>();
    for (const s of scores) {
      if (s.learningAreaId) scoreMap.set(s.learningAreaId, parseFloat(s.marks as unknown as string));
    }

    const subjects = [];
    let totalMarks = 0;
    let totalMaxMarks = 0;
    const allPcts: number[] = [];

    for (const la of learningAreas) {
      const marks = scoreMap.get(la.id);
      if (marks === undefined) continue;
      const pct = (marks / la.maxMarks) * 100;
      totalMarks += marks;
      totalMaxMarks += la.maxMarks;
      allPcts.push(pct);
      subjects.push({ learningAreaId: la.id, name: la.name, abbreviation: la.abbreviation, marks, maxMarks: la.maxMarks, percentage: Math.round(pct * 10) / 10 });
    }

    const averagePercentage = allPcts.length > 0 ? allPcts.reduce((s, p) => s + p, 0) / allPcts.length : 0;
    const subjectGrades = subjects.map(s => getRubricGrade(s.marks, s.maxMarks));
    const subjectPoints = subjectGrades.map(g => getRubricPoints(g));
    const avgPoints = subjectPoints.length > 0 ? subjectPoints.reduce((s, p) => s + p, 0) / subjectPoints.length : 0;
    const overallGrade = getOverallGrade(avgPoints);

    // Compute class average for this exam (all students in same class)
    let classAverage: number | null = null;
    if (exam.classId) {
      const allScores = await db
        .select({ studentId: scoresTable.studentId, learningAreaId: scoresTable.learningAreaId, marks: scoresTable.marks })
        .from(scoresTable)
        .where(eq(scoresTable.examId, examId));

      if (allScores.length > 0) {
        const studentTotals = new Map<number, { total: number; maxTotal: number }>();
        for (const s of allScores) {
          const la = learningAreas.find(l => l.id === s.learningAreaId);
          if (!la) continue;
          const m = parseFloat(s.marks as unknown as string);
          const existing = studentTotals.get(s.studentId) ?? { total: 0, maxTotal: 0 };
          studentTotals.set(s.studentId, { total: existing.total + m, maxTotal: existing.maxTotal + la.maxMarks });
        }
        const pcts = [...studentTotals.values()].map(v => v.maxTotal > 0 ? (v.total / v.maxTotal) * 100 : 0);
        classAverage = pcts.length > 0 ? Math.round((pcts.reduce((s, p) => s + p, 0) / pcts.length) * 10) / 10 : null;
      }
    }

    trendExams.push({
      examId: exam.id,
      examName: exam.name,
      term: exam.term,
      year: exam.year,
      totalMarks,
      totalMaxMarks,
      averagePercentage: Math.round(averagePercentage * 10) / 10,
      overallGrade,
      classAverage,
      subjects,
    });
  }

  trendExams.sort((a, b) => a.year !== b.year ? a.year - b.year : a.term !== b.term ? a.term - b.term : a.examId - b.examId);

  res.json({ student, exams: trendExams });
});

export default router;
