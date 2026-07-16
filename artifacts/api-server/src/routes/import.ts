import { Router, type IRouter } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { eq } from "drizzle-orm";
import { db, studentsTable, classesTable } from "@workspace/db";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Parse Excel file and return preview rows — does NOT write to DB
router.post("/students/import/preview", upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const classId = parseInt(req.body.classId);
  if (isNaN(classId)) {
    res.status(400).json({ error: "classId is required" });
    return;
  }
  const [cls] = await db.select({ name: classesTable.name }).from(classesTable).where(eq(classesTable.id, classId));
  if (!cls) {
    res.status(404).json({ error: "Class not found" });
    return;
  }

  const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const preview = rows.map((row, idx) => ({
    rowIndex: idx,
    name: String(row["Full Name"] ?? row["Name"] ?? row["name"] ?? "").trim(),
    admissionNo: String(row["Admission No"] ?? row["AdmissionNo"] ?? row["admission_no"] ?? row["Adm No"] ?? "").trim(),
    gender: String(row["Gender"] ?? row["gender"] ?? "").trim().toUpperCase().charAt(0) || null,
    dateOfBirth: String(row["Date of Birth"] ?? row["DOB"] ?? row["dateOfBirth"] ?? "").trim() || null,
    parentName: String(row["Parent Name"] ?? row["Guardian Name"] ?? row["parentName"] ?? "").trim() || null,
    parentPhone: String(row["Parent Phone"] ?? row["Phone"] ?? row["parentPhone"] ?? "").trim() || null,
    parentEmail: String(row["Parent Email"] ?? row["Email"] ?? row["parentEmail"] ?? "").trim() || null,
    nationality: String(row["Nationality"] ?? row["nationality"] ?? "").trim() || null,
    notes: String(row["Notes"] ?? row["notes"] ?? "").trim() || null,
    valid: !!(String(row["Full Name"] ?? row["Name"] ?? row["name"] ?? "").trim()) &&
           !!(String(row["Admission No"] ?? row["AdmissionNo"] ?? row["admission_no"] ?? row["Adm No"] ?? "").trim()),
  }));

  res.json({ className: cls.name, rows: preview, total: preview.length, valid: preview.filter(r => r.valid).length });
});

// Confirm import — write valid rows to DB
router.post("/students/import/confirm", async (req, res): Promise<void> => {
  const { classId, rows } = req.body;
  if (!classId || !Array.isArray(rows)) {
    res.status(400).json({ error: "classId and rows are required" });
    return;
  }

  const valid = rows.filter((r: any) => r.name && r.admissionNo);
  if (valid.length === 0) {
    res.status(400).json({ error: "No valid rows to import" });
    return;
  }

  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (const row of valid) {
    try {
      const values = {
        name: row.name,
        admissionNo: row.admissionNo,
        classId: parseInt(classId),
        gender: row.gender || null,
        dateOfBirth: row.dateOfBirth || null,
        parentName: row.parentName || null,
        parentPhone: row.parentPhone || null,
        parentEmail: row.parentEmail || null,
        nationality: row.nationality || null,
        notes: row.notes || null,
      };
      await db.insert(studentsTable).values(values)
        .onConflictDoUpdate({
          target: studentsTable.admissionNo,
          set: {
            name: values.name,
            classId: values.classId,
            gender: values.gender,
            dateOfBirth: values.dateOfBirth,
            parentName: values.parentName,
            parentPhone: values.parentPhone,
            parentEmail: values.parentEmail,
            nationality: values.nationality,
            notes: values.notes,
          },
        });
      results.created++;
    } catch (err: any) {
      results.skipped++;
      results.errors.push(`${row.name} (${row.admissionNo}): ${err.message}`);
    }
  }

  res.json(results);
});

export default router;
