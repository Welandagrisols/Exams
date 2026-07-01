import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, studentsTable, classesTable, examsTable, schoolTable, scoresTable, learningAreasTable, reportCommentsTable } from "@workspace/db";
import { GetReportParams, UpdateReportParams, UpdateReportBody } from "@workspace/api-zod";
import { getRubricGrade, getRubricPoints, getOverallGrade, thresholdsFromSchool } from "../lib/rubric";

const router: IRouter = Router();

interface PrecomputedRank {
  rank: number;
  classSize: number;
}

async function buildReport(
  examId: number,
  studentId: number,
  precomputedRank?: PrecomputedRank,
) {
  const [student] = await db
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

  if (!student) return null;

  const [exam] = await db
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
    .where(eq(examsTable.id, examId));

  if (!exam) return null;

  let [school] = await db.select().from(schoolTable).limit(1);
  if (!school) {
    const [created] = await db.insert(schoolTable).values({ name: "My School" }).returning();
    school = created;
  }

  const scoreRows = await db
    .select({
      learningAreaId: scoresTable.learningAreaId,
      learningAreaName: learningAreasTable.name,
      abbreviation: learningAreasTable.abbreviation,
      marks: scoresTable.marks,
      maxMarks: learningAreasTable.maxMarks,
      sortOrder: learningAreasTable.sortOrder,
    })
    .from(scoresTable)
    .leftJoin(learningAreasTable, eq(learningAreasTable.id, scoresTable.learningAreaId))
    .where(and(eq(scoresTable.examId, examId), eq(scoresTable.studentId, studentId)))
    .orderBy(learningAreasTable.sortOrder, learningAreasTable.name);

  const thresholds = thresholdsFromSchool(school);

  const subjects = scoreRows.map((r) => {
    const marks = parseFloat(r.marks as unknown as string);
    const maxMarks = r.maxMarks ?? 100;
    const percentage = (marks / maxMarks) * 100;
    const grade = getRubricGrade(marks, maxMarks, thresholds);
    return {
      learningAreaId: r.learningAreaId!,
      learningAreaName: r.learningAreaName!,
      abbreviation: r.abbreviation!,
      marks,
      maxMarks,
      rubricGrade: grade,
      rubricPoints: getRubricPoints(grade),
      percentage,
    };
  });

  const totalMarks = subjects.reduce((s, x) => s + x.marks, 0);
  const totalMaxMarks = subjects.reduce((s, x) => s + x.maxMarks, 0);
  const averagePercentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;
  const averagePoints = subjects.length > 0
    ? subjects.reduce((s, x) => s + x.rubricPoints, 0) / subjects.length
    : 0;
  const overallGrade = getOverallGrade(averagePoints);

  let rank: number;
  let classSize: number;

  if (precomputedRank) {
    ({ rank, classSize } = precomputedRank);
  } else {
    const allScoreRows = await db
      .select({ studentId: scoresTable.studentId, marks: scoresTable.marks })
      .from(scoresTable)
      .where(eq(scoresTable.examId, examId));

    const studentTotals = new Map<number, number>();
    for (const row of allScoreRows) {
      const m = parseFloat(row.marks as unknown as string);
      studentTotals.set(row.studentId, (studentTotals.get(row.studentId) ?? 0) + m);
    }

    classSize = studentTotals.size;
    rank = 1;
    for (const [sid, total] of studentTotals) {
      if (sid !== studentId && total > totalMarks) rank++;
    }
  }

  const [comment] = await db.select().from(reportCommentsTable)
    .where(and(eq(reportCommentsTable.examId, examId), eq(reportCommentsTable.studentId, studentId)));

  return {
    student,
    exam,
    school,
    subjects,
    totalMarks,
    totalMaxMarks,
    averagePercentage,
    averagePoints,
    overallGrade,
    rank,
    classSize,
    teacherComment: comment?.teacherComment ?? null,
    principalComment: comment?.principalComment ?? null,
  };
}

router.get("/reports/:examId/all", async (req, res): Promise<void> => {
  const examId = parseInt(req.params.examId);
  if (isNaN(examId)) { res.status(400).json({ error: "Invalid examId" }); return; }

  const allScoreRows = await db
    .select({ studentId: scoresTable.studentId, marks: scoresTable.marks })
    .from(scoresTable)
    .where(eq(scoresTable.examId, examId));

  const studentTotals = new Map<number, number>();
  for (const row of allScoreRows) {
    const m = parseFloat(row.marks as unknown as string);
    studentTotals.set(row.studentId, (studentTotals.get(row.studentId) ?? 0) + m);
  }

  const classSize = studentTotals.size;
  const rankMap = new Map<number, number>();
  for (const [sid, total] of studentTotals) {
    let rank = 1;
    for (const [otherId, otherTotal] of studentTotals) {
      if (otherId !== sid && otherTotal > total) rank++;
    }
    rankMap.set(sid, rank);
  }

  const studentIds = [...studentTotals.keys()];
  const reports = [];
  for (const studentId of studentIds) {
    const report = await buildReport(examId, studentId, {
      rank: rankMap.get(studentId) ?? 1,
      classSize,
    });
    if (report) reports.push(report);
  }

  reports.sort((a, b) => a.rank - b.rank);
  res.json(reports);
});

router.get("/reports/:examId/:studentId", async (req, res): Promise<void> => {
  const params = GetReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const report = await buildReport(params.data.examId, params.data.studentId);
  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }
  res.json(report);
});

router.patch("/reports/:examId/:studentId", async (req, res): Promise<void> => {
  const params = UpdateReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { examId, studentId } = params.data;
  const [existing] = await db.select().from(reportCommentsTable)
    .where(and(eq(reportCommentsTable.examId, examId), eq(reportCommentsTable.studentId, studentId)));
  if (existing) {
    await db.update(reportCommentsTable).set(parsed.data)
      .where(and(eq(reportCommentsTable.examId, examId), eq(reportCommentsTable.studentId, studentId)));
  } else {
    await db.insert(reportCommentsTable).values({ examId, studentId, ...parsed.data });
  }
  const report = await buildReport(examId, studentId);
  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }
  res.json(report);
});

export default router;
