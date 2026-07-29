import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { studentsTable } from "./students";
import { examsTable } from "./exams";
import { usersTable } from "./users";

/**
 * Flexible, per-report signatures. Unlike the two fixed slots on
 * report_comments (teacherSignatureData / principalSignatureData, kept as-is
 * for the web app), this table allows ANY staff member with access to a
 * report to attach their own saved signature (from users.signatureData)
 * under a title that describes their capacity on THIS document — e.g. a
 * deputy can sign in the "Principal" slot when standing in, or as
 * "Deputy Principal", without being hardcoded to a fixed role/column.
 *
 * A person can only attach their OWN saved signature (resolved server-side
 * from their user id) — nobody can sign as someone else. One row per
 * (exam, student, signer); a signer can update their own title, and staff
 * or the signer themselves can remove it.
 */
export const reportSignaturesTable = pgTable("report_signatures", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  examId: integer("exam_id").notNull().references(() => examsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  /** Label shown under the signature on the report, e.g. "Class Teacher", "Principal", "Deputy Principal" */
  title: text("title").notNull(),
  signedAt: timestamp("signed_at").notNull().defaultNow(),
}, (table) => ({
  uniqueSigner: unique().on(table.studentId, table.examId, table.userId),
}));

export const insertReportSignatureSchema = createInsertSchema(reportSignaturesTable).omit({ id: true, signedAt: true });
export type InsertReportSignature = z.infer<typeof insertReportSignatureSchema>;
export type ReportSignature = typeof reportSignaturesTable.$inferSelect;
