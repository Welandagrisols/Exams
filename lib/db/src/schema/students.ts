import { pgTable, text, serial, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { classesTable } from "./classes";

export const studentsTable = pgTable("students", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  admissionNo: text("admission_no").notNull().unique(),
  classId: integer("class_id").notNull().references(() => classesTable.id, { onDelete: "cascade" }),
  gender: text("gender"),
  dateOfBirth: date("date_of_birth", { mode: "string" }),
});

export const insertStudentSchema = createInsertSchema(studentsTable).omit({ id: true });
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof studentsTable.$inferSelect;
