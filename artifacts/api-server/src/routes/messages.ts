import { Router, type IRouter } from "express";
import { eq, desc, inArray, and } from "drizzle-orm";
import {
  db, messagesTable, messageRecipientsTable, studentsTable,
  classesTable, examsTable, scoresTable, learningAreasTable,
} from "@workspace/db";

const router: IRouter = Router();

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) return "254" + digits.slice(1);
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("7") && digits.length === 9) return "254" + digits;
  return digits;
}

router.get("/messages", async (req, res): Promise<void> => {
  const messages = await db
    .select({
      id: messagesTable.id,
      type: messagesTable.type,
      title: messagesTable.title,
      body: messagesTable.body,
      classId: messagesTable.classId,
      examId: messagesTable.examId,
      recipientCount: messagesTable.recipientCount,
      createdAt: messagesTable.createdAt,
      className: classesTable.name,
      examName: examsTable.name,
    })
    .from(messagesTable)
    .leftJoin(classesTable, eq(classesTable.id, messagesTable.classId))
    .leftJoin(examsTable, eq(examsTable.id, messagesTable.examId))
    .orderBy(desc(messagesTable.createdAt));
  res.json(messages);
});

router.get("/messages/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [message] = await db
    .select({
      id: messagesTable.id,
      type: messagesTable.type,
      title: messagesTable.title,
      body: messagesTable.body,
      classId: messagesTable.classId,
      examId: messagesTable.examId,
      recipientCount: messagesTable.recipientCount,
      createdAt: messagesTable.createdAt,
      className: classesTable.name,
      examName: examsTable.name,
    })
    .from(messagesTable)
    .leftJoin(classesTable, eq(classesTable.id, messagesTable.classId))
    .leftJoin(examsTable, eq(examsTable.id, messagesTable.examId))
    .where(eq(messagesTable.id, id));

  if (!message) { res.status(404).json({ error: "Message not found" }); return; }

  const recipients = await db
    .select()
    .from(messageRecipientsTable)
    .where(eq(messageRecipientsTable.messageId, id))
    .orderBy(messageRecipientsTable.studentName);

  res.json({ ...message, recipients });
});

router.post("/messages", async (req, res): Promise<void> => {
  const { type = "general", title, body, classId, examId, studentIds, feeData } = req.body;
  if (!title || !body) { res.status(400).json({ error: "title and body are required" }); return; }

  let recipientRows: Array<{
    studentId: number; studentName: string; parentName: string | null;
    parentPhone: string | null; parentEmail: string | null; feeBalance: string | null;
  }> = [];

  if (type === "fee_arrears" && Array.isArray(feeData) && feeData.length > 0) {
    const ids = (feeData as Array<{ studentId: number; balance: string }>)
      .map(f => f.studentId).filter(Boolean);

    if (ids.length === 0) { res.status(400).json({ error: "No matched students in feeData" }); return; }

    const students = await db
      .select({ id: studentsTable.id, name: studentsTable.name, parentName: studentsTable.parentName, parentPhone: studentsTable.parentPhone, parentEmail: studentsTable.parentEmail })
      .from(studentsTable)
      .where(inArray(studentsTable.id, ids));

    recipientRows = (feeData as Array<{ studentId: number; balance: string }>).map(f => {
      const student = students.find(s => s.id === f.studentId);
      if (!student) return null;
      return {
        studentId: student.id,
        studentName: student.name,
        parentName: student.parentName ?? null,
        parentPhone: student.parentPhone ?? null,
        parentEmail: student.parentEmail ?? null,
        feeBalance: f.balance ?? null,
      };
    }).filter(Boolean) as typeof recipientRows;
  } else {
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      res.status(400).json({ error: "At least one recipient is required" }); return;
    }

    const students = await db
      .select({ id: studentsTable.id, name: studentsTable.name, parentName: studentsTable.parentName, parentPhone: studentsTable.parentPhone, parentEmail: studentsTable.parentEmail })
      .from(studentsTable)
      .where(classId
        ? eq(studentsTable.classId, parseInt(classId))
        : inArray(studentsTable.id, studentIds)
      );

    const selected = students.filter(s => studentIds.includes(s.id));
    recipientRows = selected.map(s => ({
      studentId: s.id,
      studentName: s.name,
      parentName: s.parentName ?? null,
      parentPhone: s.parentPhone ?? null,
      parentEmail: s.parentEmail ?? null,
      feeBalance: null,
    }));
  }

  if (recipientRows.length === 0) {
    res.status(400).json({ error: "No valid recipients found" }); return;
  }

  const [message] = await db
    .insert(messagesTable)
    .values({
      type,
      title,
      body,
      classId: classId ? parseInt(classId) : null,
      examId: examId ? parseInt(examId) : null,
      recipientCount: recipientRows.length,
    })
    .returning();

  await db.insert(messageRecipientsTable).values(
    recipientRows.map(r => ({ messageId: message.id, ...r }))
  );

  res.status(201).json(message);
});

router.post("/messages/:id/send-sms", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const atApiKey = process.env.AT_API_KEY;
  const atUsername = process.env.AT_USERNAME;
  if (!atApiKey || !atUsername) {
    res.status(503).json({ error: "SMS_NOT_CONFIGURED" }); return;
  }

  const { recipientId } = req.body;

  const [message] = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.id, id));
  if (!message) { res.status(404).json({ error: "Message not found" }); return; }

  const allRecipients = await db
    .select()
    .from(messageRecipientsTable)
    .where(eq(messageRecipientsTable.messageId, id))
    .orderBy(messageRecipientsTable.studentName);

  const targets = recipientId
    ? allRecipients.filter(r => r.id === recipientId && r.parentPhone)
    : allRecipients.filter(r => r.parentPhone);

  let examRecord: { name: string; term: number; year: number } | undefined;
  let subjectMap = new Map<number, string>();
  let scoresByStudent = new Map<number, Array<{ abbr: string; marks: number | null; maxMarks: number }>>() ;

  if (message.examId) {
    const exams = await db.select({ name: examsTable.name, term: examsTable.term, year: examsTable.year })
      .from(examsTable).where(eq(examsTable.id, message.examId));
    examRecord = exams[0];

    const subjects = await db
      .select({ id: learningAreasTable.id, abbreviation: learningAreasTable.abbreviation, maxMarks: learningAreasTable.maxMarks })
      .from(learningAreasTable)
      .orderBy(learningAreasTable.sortOrder);
    for (const s of subjects) subjectMap.set(s.id, s.abbreviation);

    const studentIds = targets.map(r => r.studentId);
    if (studentIds.length > 0) {
      const scores = await db
        .select({ studentId: scoresTable.studentId, learningAreaId: scoresTable.learningAreaId, marks: scoresTable.marks })
        .from(scoresTable)
        .where(and(eq(scoresTable.examId, message.examId), inArray(scoresTable.studentId, studentIds)));

      for (const score of scores) {
        if (!scoresByStudent.has(score.studentId)) scoresByStudent.set(score.studentId, []);
        const abbr = subjectMap.get(score.learningAreaId) ?? "?";
        scoresByStudent.get(score.studentId)!.push({ abbr, marks: score.marks, maxMarks: subjects.find(s => s.id === score.learningAreaId)?.maxMarks ?? 100 });
      }
    }
  }

  const results = { sent: 0, failed: 0, noPhone: 0, errors: [] as string[] };
  const atEndpoint = "https://api.africastalking.com/version1/messaging";
  const atSenderId = process.env.AT_SENDER_ID;

  for (const recipient of targets) {
    if (!recipient.parentPhone) { results.noPhone++; continue; }

    let smsText: string;

    if (message.examId && scoresByStudent.has(recipient.studentId)) {
      const scores = scoresByStudent.get(recipient.studentId)!;
      const marksStr = scores.map(s => `${s.abbr}:${s.marks ?? "-"}`).join(", ");
      const total = scores.reduce((sum, s) => sum + (s.marks ?? 0), 0);
      const maxTotal = scores.reduce((sum, s) => sum + s.maxMarks, 0);
      const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
      const examLabel = examRecord ? `${examRecord.name} ` : "";
      smsText = `${recipient.studentName} - ${examLabel}Results\n${marksStr}\nTotal: ${total}/${maxTotal} (${pct}%)`;
    } else {
      smsText = message.body
        .replace(/\[Student Name\]/gi, recipient.studentName)
        .replace(/\[Fee Balance\]/gi,
          recipient.feeBalance
            ? `Ksh ${Number(recipient.feeBalance).toLocaleString("en-KE")}`
            : ""
        );
    }

    const phone = `+${normalizePhone(recipient.parentPhone)}`;
    const formBody: Record<string, string> = {
      username: atUsername,
      to: phone,
      message: smsText,
    };
    if (atSenderId) formBody.from = atSenderId;

    try {
      const atRes = await fetch(atEndpoint, {
        method: "POST",
        headers: {
          apiKey: atApiKey,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(formBody).toString(),
      });
      const data = await atRes.json() as any;
      const rData = data?.SMSMessageData?.Recipients?.[0];
      if (rData?.statusCode === 101) {
        results.sent++;
        await db.update(messageRecipientsTable)
          .set({ smsSentAt: new Date() })
          .where(eq(messageRecipientsTable.id, recipient.id));
      } else {
        results.failed++;
        results.errors.push(`${recipient.studentName}: ${rData?.status ?? "Unknown error"}`);
      }
    } catch (err: any) {
      results.failed++;
      results.errors.push(`${recipient.studentName}: ${err.message}`);
    }
  }

  res.json(results);
});

router.delete("/messages/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(messagesTable).where(eq(messagesTable.id, id));
  res.status(204).send();
});

export default router;
