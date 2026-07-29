import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, examsTable, classesTable, scoresTable, learningAreasTable, studentsTable, schoolTable } from "@workspace/db";
import { GetAnalyticsParams, GetAnalyticsResponse } from "@workspace/api-zod";
import { getRubricGrade, getRubricPoints, getOverallGrade, emptyDistribution, thresholdsFromSchool, type RubricGrade } from "../lib/rubric";

const router: IRouter = Router();

router.get("/analytics/:examId", async (req, res): Promise<void> => {
  const params = GetAnalyticsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { examId } = params.data;

  const [[schoolRow], [exam]] = await Promise.all([
    db.select().from(schoolTable).limit(1),
    db
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
      .where(eq(examsTable.id, examId)),
  ]);

  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

  const thresholds = thresholdsFromSchool(schoolRow);

  const allScores = await db
    .select({
      studentId: scoresTable.studentId,
      learningAreaId: scoresTable.learningAreaId,
      learningAreaName: learningAreasTable.name,
      abbreviation: learningAreasTable.abbreviation,
      marks: scoresTable.marks,
      maxMarks: learningAreasTable.maxMarks,
      sortOrder: learningAreasTable.sortOrder,
    })
    .from(scoresTable)
    .leftJoin(learningAreasTable, eq(learningAreasTable.id, scoresTable.learningAreaId))
    .where(eq(scoresTable.examId, examId));

  const studentIds = [...new Set(allScores.map((s) => s.studentId))];
  const classSize = studentIds.length;
  const gradedCount = studentIds.length;

  // Group by learning area
  const areaMap = new Map<number, {
    learningAreaName: string; abbreviation: string; maxMarks: number;
    marks: number[]; sortOrder: number;
  }>();
  for (const s of allScores) {
    if (!s.learningAreaId) continue;
    const m = parseFloat(s.marks as unknown as string);
    if (!areaMap.has(s.learningAreaId)) {
      areaMap.set(s.learningAreaId, {
        learningAreaName: s.learningAreaName ?? "",
        abbreviation: s.abbreviation ?? "",
        maxMarks: s.maxMarks ?? 100,
        marks: [],
        sortOrder: s.sortOrder ?? 0,
      });
    }
    areaMap.get(s.learningAreaId)!.marks.push(m);
  }

  const overallDist = emptyDistribution();
  const allAreaMeanPcts: number[] = [];

  const learningAreas = Array.from(areaMap.entries())
    .sort((a, b) => a[1].sortOrder - b[1].sortOrder)
    .map(([id, area]) => {
      const dist = emptyDistribution();
      const { marks, maxMarks } = area;
      let sum = 0;
      let highest = marks[0] ?? 0;
      let lowest = marks[0] ?? 0;
      for (const m of marks) {
        sum += m;
        if (m > highest) highest = m;
        if (m < lowest) lowest = m;
        const grade = getRubricGrade(m, maxMarks, thresholds) as RubricGrade;
        dist[grade]++;
        overallDist[grade]++;
      }
      const mean = marks.length > 0 ? sum / marks.length : 0;
      const meanPercentage = maxMarks > 0 ? (mean / maxMarks) * 100 : 0;
      const meanGrade = getRubricGrade(mean, maxMarks, thresholds);
      const meanPoints = getRubricPoints(meanGrade);
      allAreaMeanPcts.push(meanPercentage);
      return {
        learningAreaId: id,
        learningAreaName: area.learningAreaName,
        abbreviation: area.abbreviation,
        mean,
        maxMarks,
        meanPercentage,
        meanPoints,
        meanGrade,
        distribution: dist,
        highest,
        lowest,
      };
    });

  const overallMean = allAreaMeanPcts.length > 0 ? allAreaMeanPcts.reduce((s, x) => s + x, 0) / allAreaMeanPcts.length : 0;
  const overallMeanPercentage = overallMean;

  res.json(GetAnalyticsResponse.parse({
    exam,
    learningAreas,
    overallMean,
    overallMeanPercentage,
    classSize,
    gradedCount,
    overallDistribution: overallDist,
  }));
});

export default router;
