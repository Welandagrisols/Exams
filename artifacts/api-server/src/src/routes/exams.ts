import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, examsTable, classesTable, usersTable } from "@workspace/db";
import { canEditClass, isStaff, forbidden, type AppLocals } from "../middlewares/rbac";
import { logAudit } from "../lib/audit";
import {
  ListExamsQueryParams,
  ListExamsResponse,
  CreateExamBody,
  GetExamParams,
  GetExamResponse,
  UpdateExamParams,
  UpdateExamBody,
  UpdateExamResponse,
  DeleteExamParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function examWithClass(id: number) {
  const [row] = await db
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
      scoresApprovedAt: examsTable.scoresApprovedAt,
      approvedByFirstName: usersTable.firstName,
      approvedByLastName: usersTable.lastName,
    })
    .from(examsTable)
    .leftJoin(classesTable, eq(classesTable.id, examsTable.classId))
    .leftJoin(usersTable, eq(usersTable.id, examsTable.scoresApprovedById))
    .where(eq(examsTable.id, id));
  return row;
}

// scoresApprovedAt/approvedByName aren't declared in the generated
// GetExamResponse/UpdateExamResponse zod schemas, so .parse() would
// silently strip them (same issue fixed for classes.teacherId earlier) —
// re-attach after parsing instead of extending the shared contract.
function withApproval(parsed: Record<string, unknown>, row: Awaited<ReturnType<typeof examWithClass>>) {
  return {
    ...parsed,
    scoresApprovedAt: row?.scoresApprovedAt ? new Date(row.scoresApprovedAt).toISOString() : null,
    approvedByName: row?.approvedByFirstName || row?.approvedByLastName
      ? [row.approvedByFirstName, row.approvedByLastName].filter(Boolean).join(" ")
      : null,
  };
}

router.get("/exams", async (req, res): Promise<void> => {
  const query = ListExamsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const rows = await db
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
      scoresApprovedAt: examsTable.scoresApprovedAt,
    })
    .from(examsTable)
    .leftJoin(classesTable, eq(classesTable.id, examsTable.classId))
    .where(query.data.classId != null ? eq(examsTable.classId, query.data.classId) : undefined)
    .orderBy(examsTable.year, examsTable.term, examsTable.name);
  const parsed = ListExamsResponse.parse(rows);
  res.json(parsed.map((p, i) => ({ ...p, scoresApprovedAt: rows[i]?.scoresApprovedAt ? new Date(rows[i].scoresApprovedAt).toISOString() : null })));
});

router.post("/exams", async (req, res): Promise<void> => {
  const parsed = CreateExamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  // RBAC: class teacher or staff only
  if (!canEditClass(parsed.data.classId, res.locals as AppLocals)) {
    forbidden(res, "Only the class teacher can create exams for this class."); return;
  }
  const [exam] = await db.insert(examsTable).values(parsed.data).returning();
  const row = await examWithClass(exam.id);
  res.status(201).json(withApproval(GetExamResponse.parse(row), row));
});

router.get("/exams/:id", async (req, res): Promise<void> => {
  const params = GetExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const row = await examWithClass(params.data.id);
  if (!row) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }
  res.json(withApproval(GetExamResponse.parse(row), row));
});

router.patch("/exams/:id", async (req, res): Promise<void> => {
  const params = UpdateExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateExamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  // RBAC: class teacher or staff only
  const [_patchExam] = await db.select({ classId: examsTable.classId }).from(examsTable).where(eq(examsTable.id, params.data.id));
  if (!_patchExam || !canEditClass(_patchExam.classId, res.locals as AppLocals)) {
    forbidden(res, "Only the class teacher can edit this exam."); return;
  }
  const [updated] = await db.update(examsTable).set(parsed.data).where(eq(examsTable.id, params.data.id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }
  const row = await examWithClass(params.data.id);
  res.json(withApproval(UpdateExamResponse.parse(row), row));
});

router.delete("/exams/:id", async (req, res): Promise<void> => {
  const params = DeleteExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  // RBAC: class teacher or staff only
  const [_delExam] = await db.select({ classId: examsTable.classId }).from(examsTable).where(eq(examsTable.id, params.data.id));
  if (!_delExam || !canEditClass(_delExam.classId, res.locals as AppLocals)) {
    forbidden(res, "Only the class teacher can delete this exam."); return;
  }
  const [deleted] = await db.delete(examsTable).where(eq(examsTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }
  res.sendStatus(204);
});

const BulkCreateExamBody = z.object({
  name: z.string().min(1),
  year: z.number().int().min(2000),
  term: z.number().int().min(1).max(3),
  openingDate: z.string().optional(),
  closingDate: z.string().optional(),
  status: z.enum(["draft", "active", "closed"]).default("draft"),
  classIds: z.array(z.number().int().positive()).min(1, "Select at least one class"),
});

router.post("/exams/bulk", async (req, res): Promise<void> => {
  const parsed = BulkCreateExamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  // Bulk create touches multiple classes — require staff or verify all classes belong to the caller
  const { classIds, ...examBase } = parsed.data;
  const allAllowed = (classIds as number[]).every(cId => canEditClass(cId, res.locals as AppLocals));
  if (!allAllowed) {
    forbidden(res, "You can only bulk-create exams for classes you are assigned to."); return;
  }

  const rows = await db
    .insert(examsTable)
    .values(classIds.map(classId => ({ ...examBase, classId })))
    .returning();

  const created = await db
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
    .where(inArray(examsTable.id, rows.map(r => r.id)))
    .orderBy(classesTable.name);

  res.status(201).json({ exams: created, count: created.length });
});

/**
 * POST /api/exams/:examId/approve-scores
 * Locks the exam's scores from further edits and unlocks broadcasting
 * results to parents. Staff only (admin/principal/deputy) — deliberately
 * NOT available via canEditClass, so the class teacher who entered the
 * marks can never approve their own work. A second set of eyes, always.
 */
router.post("/exams/:examId/approve-scores", async (req, res): Promise<void> => {
  const examId = parseInt(req.params.examId);
  if (isNaN(examId)) { res.status(400).json({ error: "Invalid examId" }); return; }
  const locals = res.locals as AppLocals;
  if (!isStaff(locals)) {
    forbidden(res, "Only admin, principal, or deputy can approve scores."); return;
  }

  const [updated] = await db
    .update(examsTable)
    .set({ scoresApprovedAt: new Date(), scoresApprovedById: locals.user.id })
    .where(eq(examsTable.id, examId))
    .returning({ id: examsTable.id });
  if (!updated) { res.status(404).json({ error: "Exam not found" }); return; }

  const [approver] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
    .from(usersTable).where(eq(usersTable.id, locals.user.id));
  logAudit(locals, "exam.approve_scores", "exam", examId, {});
  res.json({
    ok: true,
    scoresApprovedAt: new Date().toISOString(),
    approvedByName: approver ? [approver.firstName, approver.lastName].filter(Boolean).join(" ") : null,
  });
});

/**
 * POST /api/exams/:examId/unapprove-scores
 * Reopens an approved exam for corrections. Staff only. Scores stay
 * exactly as they were — this just clears the lock so edits are possible
 * again; re-approving afterward records the new approver and timestamp.
 */
router.post("/exams/:examId/unapprove-scores", async (req, res): Promise<void> => {
  const examId = parseInt(req.params.examId);
  if (isNaN(examId)) { res.status(400).json({ error: "Invalid examId" }); return; }
  const locals = res.locals as AppLocals;
  if (!isStaff(locals)) {
    forbidden(res, "Only admin, principal, or deputy can unapprove scores."); return;
  }

  const [updated] = await db
    .update(examsTable)
    .set({ scoresApprovedAt: null, scoresApprovedById: null })
    .where(eq(examsTable.id, examId))
    .returning({ id: examsTable.id });
  if (!updated) { res.status(404).json({ error: "Exam not found" }); return; }

  logAudit(locals, "exam.unapprove_scores", "exam", examId, {});
  res.json({ ok: true });
});

export default router;
