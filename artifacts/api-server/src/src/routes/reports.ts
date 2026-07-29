import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, studentsTable, classesTable, examsTable, schoolTable, scoresTable, learningAreasTable, reportCommentsTable, reportSignaturesTable, usersTable } from "@workspace/db";
import { GetReportParams, UpdateReportParams, UpdateReportBody } from "@workspace/api-zod";
import { getRubricGrade, getRubricPoints, getOverallGrade, thresholdsFromSchool } from "../lib/rubric";
import { canEditClass, isStaff, forbidden, type AppLocals } from "../middlewares/rbac";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

/**
 * Flexible signatures for a report — additive to the legacy
 * teacherSignatureData/principalSignatureData fields (which the web app
 * still reads/writes unchanged). Any number of staff can appear here.
 */
async function getReportSignatures(examId: number, studentId: number) {
  const rows = await db
    .select({
      userId: reportSignaturesTable.userId,
      title: reportSignaturesTable.title,
      signedAt: reportSignaturesTable.signedAt,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      signatureData: usersTable.signatureData,
    })
    .from(reportSignaturesTable)
    .leftJoin(usersTable, eq(usersTable.id, reportSignaturesTable.userId))
    .where(and(eq(reportSignaturesTable.examId, examId), eq(reportSignaturesTable.studentId, studentId)))
    .orderBy(reportSignaturesTable.signedAt);

  return rows.map(r => ({
    userId: r.userId,
    title: r.title,
    name: [r.firstName, r.lastName].filter(Boolean).join(" ") || "Staff",
    signatureData: r.signatureData ?? null,
    signedAt: r.signedAt,
  }));
}

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
    const percentage = maxMarks > 0 ? (marks / maxMarks) * 100 : 0;
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

  const signatures = await getReportSignatures(examId, studentId);

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
    // Legacy two-slot fields — kept for the web app, unchanged.
    teacherSignatureData: comment?.teacherSignatureData ?? null,
    principalSignatureData: comment?.principalSignatureData ?? null,
    // New flexible list — any number of staff, each with their own title. Mobile uses this.
    signatures,
  };
}

router.get("/reports/:examId/all", async (req, res): Promise<void> => {
  const examId = parseInt(req.params.examId);
  if (isNaN(examId)) { res.status(400).json({ error: "Invalid examId" }); return; }

  try {
    const allScoreRows = await db
      .select({ studentId: scoresTable.studentId, marks: scoresTable.marks })
      .from(scoresTable)
      .where(eq(scoresTable.examId, examId));

    const studentTotals = new Map<number, number>();
    for (const row of allScoreRows) {
      const m = parseFloat(row.marks as unknown as string);
      if (!isNaN(m)) {
        studentTotals.set(row.studentId, (studentTotals.get(row.studentId) ?? 0) + m);
      }
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
  } catch (err) {
    const isDev = process.env.NODE_ENV !== "production";
    res.status(500).json({ error: isDev && err instanceof Error ? err.message : "Failed to generate reports" });
  }
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

  // RBAC: only the class teacher or staff can add/edit report comments and signatures
  const [_examForRbac] = await db.select({ classId: examsTable.classId }).from(examsTable).where(eq(examsTable.id, examId));
  if (!_examForRbac || !canEditClass(_examForRbac.classId, res.locals as AppLocals)) {
    forbidden(res, "Only the class teacher can edit report comments for this exam."); return;
  }
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

const SignReportBody = z.object({
  title: z.string().min(1, "Title is required").max(60),
});

/**
 * POST /api/reports/:examId/sign-all
 * Sign every student's report for this exam at once, under the given title.
 * Same rule as the per-student version: the caller's own saved signature,
 * nobody signs on behalf of someone else. Intended for the moment results
 * are approved and ready to go out — sign the whole class in one action
 * instead of opening each report individually.
 */
router.post("/reports/:examId/sign-all", async (req, res): Promise<void> => {
  const examId = parseInt(req.params.examId);
  if (isNaN(examId)) { res.status(400).json({ error: "Invalid examId" }); return; }
  const parsed = SignReportBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const locals = res.locals as AppLocals;

  const [exam] = await db.select({ classId: examsTable.classId }).from(examsTable).where(eq(examsTable.id, examId));
  if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }
  if (!canEditClass(exam.classId, locals)) {
    forbidden(res, "You do not have access to sign reports for this exam."); return;
  }

  const [me] = await db.select({ signatureData: usersTable.signatureData }).from(usersTable).where(eq(usersTable.id, locals.user.id));
  if (!me?.signatureData) {
    res.status(400).json({ error: "Save your signature in Settings before signing reports." }); return;
  }

  const students = await db.select({ id: studentsTable.id }).from(studentsTable).where(eq(studentsTable.classId, exam.classId));
  if (students.length === 0) {
    res.status(400).json({ error: "No students found in this class." }); return;
  }

  await db.transaction(async (tx) => {
    for (const student of students) {
      const [existing] = await tx.select({ id: reportSignaturesTable.id }).from(reportSignaturesTable)
        .where(and(
          eq(reportSignaturesTable.examId, examId),
          eq(reportSignaturesTable.studentId, student.id),
          eq(reportSignaturesTable.userId, locals.user.id),
        ));
      if (existing) {
        await tx.update(reportSignaturesTable)
          .set({ title: parsed.data.title, signedAt: new Date() })
          .where(eq(reportSignaturesTable.id, existing.id));
      } else {
        await tx.insert(reportSignaturesTable).values({
          examId, studentId: student.id, userId: locals.user.id, title: parsed.data.title,
        });
      }
    }
  });

  logAudit(locals, "report.sign_all", "exam", examId, { title: parsed.data.title, studentCount: students.length });
  res.json({ ok: true, signedCount: students.length });
});

/**
 * POST /api/reports/:examId/:studentId/signatures
 * Attach the CALLER's own saved signature (users.signatureData) to this
 * report under the given title (e.g. "Class Teacher", "Principal",
 * "Deputy Principal", or any custom label). Nobody can sign on behalf of
 * someone else — the signature image always comes from the caller's own
 * profile. Same access rule as editing the report: the class teacher for
 * this exam's class, or any staff (admin/principal/deputy).
 */
router.post("/reports/:examId/:studentId/signatures", async (req, res): Promise<void> => {
  const params = GetReportParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = SignReportBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { examId, studentId } = params.data;
  const locals = res.locals as AppLocals;

  const [exam] = await db.select({ classId: examsTable.classId }).from(examsTable).where(eq(examsTable.id, examId));
  if (!exam || !canEditClass(exam.classId, locals)) {
    forbidden(res, "You do not have access to sign this report."); return;
  }

  const [me] = await db.select({ signatureData: usersTable.signatureData }).from(usersTable).where(eq(usersTable.id, locals.user.id));
  if (!me?.signatureData) {
    res.status(400).json({ error: "Save your signature in Settings before signing a report." }); return;
  }

  const [existing] = await db.select().from(reportSignaturesTable)
    .where(and(
      eq(reportSignaturesTable.examId, examId),
      eq(reportSignaturesTable.studentId, studentId),
      eq(reportSignaturesTable.userId, locals.user.id),
    ));

  if (existing) {
    await db.update(reportSignaturesTable)
      .set({ title: parsed.data.title, signedAt: new Date() })
      .where(eq(reportSignaturesTable.id, existing.id));
  } else {
    await db.insert(reportSignaturesTable).values({
      examId, studentId, userId: locals.user.id, title: parsed.data.title,
    });
  }

  logAudit(locals, "report.sign", "student_report", `${examId}-${studentId}`, { title: parsed.data.title });
  res.json({ signatures: await getReportSignatures(examId, studentId) });
});

/**
 * DELETE /api/reports/:examId/:studentId/signatures
 * Remove a signature. Defaults to removing the CALLER's own signature.
 * Staff (admin/principal/deputy) may pass ?userId=<id> to remove someone
 * else's — e.g. an admin correcting a mistaken signature.
 */
router.delete("/reports/:examId/:studentId/signatures", async (req, res): Promise<void> => {
  const params = GetReportParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const { examId, studentId } = params.data;
  const locals = res.locals as AppLocals;

  const targetUserId = typeof req.query.userId === "string" ? req.query.userId : locals.user.id;
  if (targetUserId !== locals.user.id && !isStaff(locals)) {
    forbidden(res, "You can only remove your own signature."); return;
  }

  await db.delete(reportSignaturesTable).where(and(
    eq(reportSignaturesTable.examId, examId),
    eq(reportSignaturesTable.studentId, studentId),
    eq(reportSignaturesTable.userId, targetUserId),
  ));

  res.json({ signatures: await getReportSignatures(examId, studentId) });
});

export default router;
