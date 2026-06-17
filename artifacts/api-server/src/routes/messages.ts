import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, messagesTable, messageRecipientsTable, studentsTable, classesTable, examsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/messages", async (req, res): Promise<void> => {
  const messages = await db
    .select({
      id: messagesTable.id,
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
  const { title, body, classId, examId, studentIds } = req.body;
  if (!title || !body) { res.status(400).json({ error: "title and body are required" }); return; }
  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    res.status(400).json({ error: "At least one recipient is required" }); return;
  }

  const students = await db
    .select({
      id: studentsTable.id,
      name: studentsTable.name,
      parentName: studentsTable.parentName,
      parentPhone: studentsTable.parentPhone,
      parentEmail: studentsTable.parentEmail,
    })
    .from(studentsTable)
    .where(classId
      ? eq(studentsTable.classId, parseInt(classId))
      : eq(studentsTable.id, studentsTable.id)
    );

  const selected = students.filter(s => studentIds.includes(s.id));

  const [message] = await db
    .insert(messagesTable)
    .values({
      title,
      body,
      classId: classId ? parseInt(classId) : null,
      examId: examId ? parseInt(examId) : null,
      recipientCount: selected.length,
    })
    .returning();

  if (selected.length > 0) {
    await db.insert(messageRecipientsTable).values(
      selected.map(s => ({
        messageId: message.id,
        studentId: s.id,
        studentName: s.name,
        parentName: s.parentName ?? null,
        parentPhone: s.parentPhone ?? null,
        parentEmail: s.parentEmail ?? null,
      }))
    );
  }

  res.status(201).json(message);
});

router.delete("/messages/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(messagesTable).where(eq(messagesTable.id, id));
  res.status(204).send();
});

export default router;
