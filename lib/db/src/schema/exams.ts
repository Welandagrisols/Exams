import { pgTable, text, serial, integer, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { classesTable } from "./classes";

export const examsTable = pgTable("exams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  classId: integer("class_id").notNull().references(() => classesTable.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  term: integer("term").notNull().default(1),
  openingDate: date("opening_date", { mode: "string" }),
  closingDate: date("closing_date", { mode: "string" }),
  status: text("status").notNull().default("draft"),
  /**
   * Score approval — deliberately separate from `status`. Once set, scores
   * for this exam are locked from further edits (see scores.ts), and
   * results can be broadcast to parents (see messages.ts). An admin,
   * principal, or deputy must approve — never the class teacher who
   * entered the marks, so there's always a second set of eyes before
   * anything goes out. Approving again after unapproving overwrites both
   * fields with the new approver/timestamp.
   */
  scoresApprovedAt: timestamp("scores_approved_at"),
  scoresApprovedById: text("scores_approved_by_id"),
});

export const insertExamSchema = createInsertSchema(examsTable).omit({ id: true });
export type InsertExam = z.infer<typeof insertExamSchema>;
export type Exam = typeof examsTable.$inferSelect;
