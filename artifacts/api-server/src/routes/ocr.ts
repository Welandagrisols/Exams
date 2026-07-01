import { Router, type IRouter } from "express";
import multer from "multer";
import { eq } from "drizzle-orm";
import { db, examsTable, classesTable, studentsTable, learningAreasTable } from "@workspace/db";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

function extractJson(raw: string): string {
  const stripped = raw.replace(/```json\n?|\n?```/g, "").trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  if (match) return match[0];
  return stripped;
}

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
  const mimeType = req.file.mimetype as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Image, mimeType } },
    ]);

    const parsed = JSON.parse(extractJson(result.response.text()));

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

router.post("/ocr/student", upload.single("image"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "Image file is required" });
    return;
  }

  const prompt = `You are reading a student registration form, admission card, or biodata sheet from a school.

Extract all visible student information from the image and return ONLY a valid JSON object with this exact structure:
{
  "name": "full student name or null",
  "admissionNo": "admission number or null",
  "gender": "M or F or null",
  "dateOfBirth": "YYYY-MM-DD format or null",
  "parentName": "parent or guardian full name or null",
  "parentPhone": "phone number or null",
  "parentEmail": "email address or null",
  "nationality": "nationality or null",
  "notes": "any other relevant notes or null"
}

Rules:
- Use null for any field not visible or legible
- Gender must be "M" or "F" only (infer from Male/Female/Boy/Girl if written)
- dateOfBirth must be in YYYY-MM-DD format; convert from any format found
- parentPhone: include country code if visible, otherwise use as written
- Return ONLY the JSON object, no explanation`;

  const base64Image = req.file.buffer.toString("base64");
  const mimeType = req.file.mimetype as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Image, mimeType } },
    ]);

    const parsed = JSON.parse(extractJson(result.response.text()));
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "OCR processing failed" });
  }
});

router.post("/ocr/fee-arrears", upload.single("image"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "Image file is required" });
    return;
  }

  const allStudents = await db
    .select({ id: studentsTable.id, name: studentsTable.name, admissionNo: studentsTable.admissionNo })
    .from(studentsTable)
    .orderBy(studentsTable.name);

  const prompt = `You are reading a school fee statement, fee balance sheet, or fee ledger from a Kenyan school.

Extract all student fee arrears/balance entries from the image. Return ONLY a valid JSON object:
{
  "entries": [
    { "studentName": "FULL NAME", "admissionNo": "admission/roll number or empty string", "balance": "amount as plain number e.g. 5000" },
    ...
  ]
}

Rules:
- Extract ALL rows that have a non-zero outstanding balance or arrear
- studentName: full name as written in the document (uppercase preferred)
- admissionNo: the admission/registration/roll number if shown, else empty string ""
- balance: outstanding balance as a plain number without currency symbols or commas (e.g. "5000" not "Ksh 5,000")
- Skip any student whose balance is zero or nil
- Return ONLY the JSON object, no explanation`;

  const base64Image = req.file.buffer.toString("base64");
  const mimeType = req.file.mimetype as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Image, mimeType } },
    ]);

    const parsed = JSON.parse(extractJson(result.response.text()));

    const entries = (parsed.entries ?? []).map((entry: any) => {
      let student = allStudents.find(s =>
        entry.admissionNo && entry.admissionNo !== "" && s.admissionNo === entry.admissionNo
      );
      if (!student && entry.studentName) {
        const nameLower = (entry.studentName as string).toLowerCase().trim();
        student = allStudents.find(s => s.name.toLowerCase() === nameLower);
        if (!student) {
          student = allStudents.find(s => {
            const sLower = s.name.toLowerCase();
            const words = nameLower.split(/\s+/).filter((w: string) => w.length > 1);
            return words.length >= 2 && words.every((w: string) => sLower.includes(w));
          });
        }
      }
      return {
        studentId: student?.id ?? null,
        studentName: student?.name ?? entry.studentName,
        admissionNo: student?.admissionNo ?? entry.admissionNo ?? "",
        balance: entry.balance ?? "",
        matched: !!student,
      };
    });

    res.json({ entries });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "OCR processing failed" });
  }
});

router.post("/ocr/student-list", upload.single("image"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "Image file is required" });
    return;
  }

  const prompt = `You are reading a handwritten or printed school student list, class register, or admission register.

Extract ALL student entries visible in the image and return ONLY a valid JSON object with this exact structure:
{
  "students": [
    {
      "name": "full student name",
      "admissionNo": "admission/roll number or null",
      "gender": "M or F or null",
      "dateOfBirth": "YYYY-MM-DD or null",
      "parentName": "parent/guardian name or null",
      "parentPhone": "phone number or null",
      "parentEmail": "email or null",
      "nationality": "nationality or null",
      "notes": "any other notes or null"
    }
  ]
}

Rules:
- Extract EVERY student row visible in the image, even if some fields are missing
- name is required — skip a row only if name is completely illegible
- admissionNo: the admission/roll/registration number if shown, else null
- gender: "M" or "F" only; infer from Male/Female/Boy/Girl/M/F if written; null if unclear
- dateOfBirth: convert any date format to YYYY-MM-DD; null if not shown
- parentPhone: include country code if visible; use as written otherwise; null if not shown
- Return ONLY the JSON object, no markdown, no explanation`;

  const base64Image = req.file.buffer.toString("base64");
  const mimeType = req.file.mimetype as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Image, mimeType } },
    ]);

    const parsed = JSON.parse(extractJson(result.response.text()));
    const students = (parsed.students ?? []).map((s: any, i: number) => ({
      rowIndex: i,
      name: (s.name ?? "").trim(),
      admissionNo: (s.admissionNo ?? "").trim(),
      gender: s.gender === "M" || s.gender === "F" ? s.gender : null,
      dateOfBirth: s.dateOfBirth ?? null,
      parentName: s.parentName ?? null,
      parentPhone: s.parentPhone ?? null,
      parentEmail: s.parentEmail ?? null,
      nationality: s.nationality ?? null,
      notes: s.notes ?? null,
      valid: !!(s.name ?? "").trim(),
    }));

    res.json({ students, total: students.length, valid: students.filter((s: any) => s.valid).length });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "OCR processing failed" });
  }
});

export default router;
