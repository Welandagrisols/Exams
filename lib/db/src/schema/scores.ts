import { pgTable, serial, integer, numeric, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { examsTable } from "./exams";
import { learningAreasTable } from "./learningAreas";

export const scoresTable = pgTable("scores", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  examId: integer("exam_id").notNull().references(() => examsTable.id, { onDelete: "cascade" }),
  learningAreaId: integer("learning_area_id").notNull().references(() => learningAreasTable.id, { onDelete: "cascade" }),
  marks: numeric("marks", { precision: 5, scale: 2 }).notNull().default("0"),
}, (table) => ({
  uniqueScore: unique().on(table.studentId, table.examId, table.learningAreaId),
}));

export const insertScoreSchema = createInsertSchema(scoresTable).omit({ id: true });
export type InsertScore = z.infer<typeof insertScoreSchema>;
export type Score = typeof scoresTable.$inferSelect;
