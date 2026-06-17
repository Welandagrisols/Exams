import { Router, type IRouter } from "express";
import multer from "multer";
import { eq } from "drizzle-orm";
import { db, examsTable, classesTable, studentsTable, learningAreasTable } from "@workspace/db";
import OpenAI from "openai";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/exams/:examId/ocr-upload", upload.single("image"), async (req, res): Promise<void> => {
  const examId = parseInt(req.params.examId);
  if (isNaN(examId) || !req.file) {
    res.status(400).json({ error: "examId and image file are required" });
    return;
  }

  const [exam] = await db
    .select({ id: examsTable.id, name: examsTable.name, classId: examsTable.classId, className: classesTable.name })
    .from(examsTable)
    .leftJoin(classesTable, eq(classesTable.id, examsTable.classId))
    .where(eq(examsTable.id, examId));

  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

  const students = await db
    .select({ id: studentsTable.id, name: studentsTable.name, admissionNo: studentsTable.admissionNo })
    .from(studentsTable)
    .where(eq(studentsTable.classId, exam.classId!))
    .orderBy(studentsTable.name);

  const subjects = await db
    .select({ id: learningAreasTable.id, name: learningAreasTable.name, abbreviation: learningAreasTable.abbreviation, maxMarks: learningAreasTable.maxMarks })
    .from(learningAreasTable)
    .orderBy(learningAreasTable.sortOrder);

  if (!students.length || !subjects.length) {
    res.status(400).json({ error: "No students or subjects found for this exam" });
    return;
  }

  const studentList = students.map(s => `${s.name} (${s.admissionNo})`).join(", ");
  const subjectList = subjects.map(s => `${s.name} [max: ${s.maxMarks}]`).join(", ");

  const prompt = `You are reading a handwritten school score sheet for ${exam.className} — ${exam.name}.

The score sheet has these students (in order): ${studentList}
The subjects/columns are: ${subjectList}

Extract ALL marks from the image. Return ONLY a valid JSON object with this exact structure:
{
  "scores": [
    { "studentName": "exact name from list above", "admissionNo": "from list", "marks": { "subject name": number_or_null, ... } },
    ...
  ]
}

Rules:
- Match student names exactly to the list provided
- Use null for any mark that is blank, illegible, or missing
- Marks must be numbers (integers or decimals), not strings
- Include ALL students even if all their marks are null
- Subject keys must match the subject names exactly as given above`;

  const base64Image = req.file.buffer.toString("base64");
  const mimeType = (req.file.mimetype as "image/jpeg" | "image/png" | "image/webp" | "image/gif") || "image/jpeg";

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}`, detail: "high" } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);

    // Enrich with IDs for the frontend
    const enriched = (parsed.scores ?? []).map((row: any) => {
      const student = students.find(s => s.admissionNo === row.admissionNo || s.name === row.studentName);
      return {
        studentId: student?.id ?? null,
        studentName: row.studentName,
        admissionNo: row.admissionNo,
        marks: subjects.map(sub => ({
          learningAreaId: sub.id,
          subjectName: sub.name,
          maxMarks: sub.maxMarks,
          marks: row.marks?.[sub.name] ?? null,
        })),
      };
    });

    res.json({ examId, examName: exam.name, className: exam.className, scores: enriched, subjects });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "OCR processing failed" });
  }
});

export default router;
