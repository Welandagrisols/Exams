import { pgTable, serial, integer, text, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { examsTable } from "./exams";

export const reportCommentsTable = pgTable("report_comments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  examId: integer("exam_id").notNull().references(() => examsTable.id, { onDelete: "cascade" }),
  teacherComment: text("teacher_comment"),
  principalComment: text("principal_comment"),
}, (table) => ({
  uniqueComment: unique().on(table.studentId, table.examId),
}));

export const insertReportCommentSchema = createInsertSchema(reportCommentsTable).omit({ id: true });
export type InsertReportComment = z.infer<typeof insertReportCommentSchema>;
export type ReportComment = typeof reportCommentsTable.$inferSelect;
