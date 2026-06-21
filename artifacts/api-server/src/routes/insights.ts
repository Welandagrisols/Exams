import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, examsTable, classesTable, scoresTable, learningAreasTable, studentsTable, schoolTable } from "@workspace/db";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getRubricGrade, getRubricPoints, getOverallGrade, thresholdsFromSchool } from "../lib/rubric";

const router: IRouter = Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

router.get("/insights/:examId", async (req, res): Promise<void> => {
  const examId = parseInt(req.params.examId);
  if (isNaN(examId)) {
    res.status(400).json({ error: "Invalid examId" });
    return;
  }

  const [[schoolRow], [exam]] = await Promise.all([
    db.select().from(schoolTable).limit(1),
    db
      .select({
        id: examsTable.id,
        name: examsTable.name,
        term: examsTable.term,
        year: examsTable.year,
        className: classesTable.name,
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
      marks: scoresTable.marks,
      maxMarks: learningAreasTable.maxMarks,
    })
    .from(scoresTable)
    .leftJoin(learningAreasTable, eq(learningAreasTable.id, scoresTable.learningAreaId))
    .where(eq(scoresTable.examId, examId));

  if (allScores.length === 0) {
    res.status(400).json({ error: "No scores found for this exam" });
    return;
  }

  const areaMap = new Map<number, { name: string; marks: number[]; maxMarks: number }>();
  for (const s of allScores) {
    if (!s.learningAreaId) continue;
    const m = parseFloat(s.marks as unknown as string);
    if (!areaMap.has(s.learningAreaId)) {
      areaMap.set(s.learningAreaId, { name: s.learningAreaName ?? "", marks: [], maxMarks: s.maxMarks ?? 100 });
    }
    areaMap.get(s.learningAreaId)!.marks.push(m);
  }

  const subjectSummaries = Array.from(areaMap.values()).map(area => {
    const mean = area.marks.reduce((s, m) => s + m, 0) / area.marks.length;
    const pct = (mean / area.maxMarks) * 100;
    const grade = getRubricGrade(mean, area.maxMarks, thresholds);
    const below = area.marks.filter(m =>
      getRubricGrade(m, area.maxMarks, thresholds).startsWith("AE") ||
      getRubricGrade(m, area.maxMarks, thresholds).startsWith("BE")
    ).length;
    return { subject: area.name, meanPct: pct.toFixed(1), grade, studentsBelow: below, total: area.marks.length };
  });

  const studentMap = new Map<number, { totalPts: number; count: number }>();
  for (const s of allScores) {
    const m = parseFloat(s.marks as unknown as string);
    const grade = getRubricGrade(m, s.maxMarks ?? 100, thresholds);
    const pts = getRubricPoints(grade);
    if (!studentMap.has(s.studentId)) studentMap.set(s.studentId, { totalPts: 0, count: 0 });
    const entry = studentMap.get(s.studentId)!;
    entry.totalPts += pts;
    entry.count++;
  }

  let EE = 0, ME = 0, AE = 0, BE = 0;
  for (const [, data] of studentMap) {
    const avg = data.count > 0 ? data.totalPts / data.count : 0;
    const og = getOverallGrade(avg);
    if (og.startsWith("EE")) EE++;
    else if (og.startsWith("ME")) ME++;
    else if (og.startsWith("AE")) AE++;
    else BE++;
  }

  const totalStudents = studentMap.size;
  const overallMeanPct = subjectSummaries.reduce((s, x) => s + parseFloat(x.meanPct), 0) / subjectSummaries.length;

  const rubricScale = [
    `EE2 ≥ ${thresholds.ee2}%`,
    `EE1 ≥ ${thresholds.ee1}%`,
    `ME2 ≥ ${thresholds.me2}%`,
    `ME1 ≥ ${thresholds.me1}%`,
    `AE2 ≥ ${thresholds.ae2}%`,
    `AE1 ≥ ${thresholds.ae1}%`,
    `BE2 ≥ ${thresholds.be2}%`,
    `BE1 < ${thresholds.be2}%`,
  ].join(" | ");

  const prompt = `You are an educational data analyst for a Kenyan CBC (Competency Based Curriculum) junior secondary school.
Analyze this exam data and provide concise, actionable insights for the class teacher and principal.

Exam: ${exam.name} — ${exam.className} — Term ${exam.term}, ${exam.year}
Total Students: ${totalStudents}
Overall Class Mean: ${overallMeanPct.toFixed(1)}%
Grade Distribution: EE: ${EE}, ME: ${ME}, AE: ${AE}, BE: ${BE}

Grading Scale (school-configured): ${rubricScale}

Subject Performance:
${subjectSummaries.map(s => `- ${s.subject}: ${s.meanPct}% (${s.grade}) — ${s.studentsBelow}/${s.total} students below expectation`).join("\n")}

Provide your response in this exact format with these 4 sections:

## Summary
2-3 sentences on overall class performance.

## Strengths
2-3 bullet points on what the class is doing well.

## Areas of Concern
2-3 bullet points on subjects or patterns that need attention, naming specific subjects.

## Recommended Actions
3-4 specific, practical actions the teacher can take next term, grounded in CBC pedagogy.

Be direct, specific, and practical. Use simple English suitable for Kenyan teachers.`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const streamResult = await model.generateContentStream(prompt);

    for await (const chunk of streamResult.stream) {
      const content = chunk.text();
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message ?? "AI unavailable" })}\n\n`);
  }

  res.end();
});

export default router;
