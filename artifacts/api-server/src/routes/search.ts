import { Router, type IRouter } from "express";
import { ilike, or, eq } from "drizzle-orm";
import { db, studentsTable, classesTable, examsTable, messagesTable } from "@workspace/db";

const router: IRouter = Router();

/**
 * GET /api/search?q=...
 * Searches across students (name, admission no), classes (name), exams
 * (name), and messages (title, body) in one call. Same view rules as the
 * individual list endpoints — no extra restriction, since viewing any of
 * these is already open to every authenticated user; only editing is
 * locked down elsewhere.
 * Capped at 8 results per category to keep this fast and skimmable.
 */
router.get("/search", async (req, res): Promise<void> => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2) {
    res.json({ students: [], classes: [], exams: [], messages: [] });
    return;
  }
  const like = `%${q}%`;

  const [students, classes, exams, messages] = await Promise.all([
    db.select({
      id: studentsTable.id,
      name: studentsTable.name,
      admissionNo: studentsTable.admissionNo,
      classId: studentsTable.classId,
      className: classesTable.name,
    })
      .from(studentsTable)
      .leftJoin(classesTable, eq(classesTable.id, studentsTable.classId))
      .where(or(ilike(studentsTable.name, like), ilike(studentsTable.admissionNo, like)))
      .limit(8),

    db.select({ id: classesTable.id, name: classesTable.name, year: classesTable.year, term: classesTable.term })
      .from(classesTable)
      .where(ilike(classesTable.name, like))
      .limit(8),

    db.select({
      id: examsTable.id,
      name: examsTable.name,
      classId: examsTable.classId,
      className: classesTable.name,
      status: examsTable.status,
    })
      .from(examsTable)
      .leftJoin(classesTable, eq(classesTable.id, examsTable.classId))
      .where(ilike(examsTable.name, like))
      .limit(8),

    db.select({
      id: messagesTable.id,
      title: messagesTable.title,
      body: messagesTable.body,
      createdAt: messagesTable.createdAt,
      classId: messagesTable.classId,
      className: classesTable.name,
    })
      .from(messagesTable)
      .leftJoin(classesTable, eq(classesTable.id, messagesTable.classId))
      .where(or(ilike(messagesTable.title, like), ilike(messagesTable.body, like)))
      .limit(8),
  ]);

  res.json({ students, classes, exams, messages });
});

export default router;
