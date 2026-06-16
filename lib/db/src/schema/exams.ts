import { pgTable, text, serial, integer, date } from "drizzle-orm/pg-core";
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
});

export const insertExamSchema = createInsertSchema(examsTable).omit({ id: true });
export type InsertExam = z.infer<typeof insertExamSchema>;
export type Exam = typeof examsTable.$inferSelect;
