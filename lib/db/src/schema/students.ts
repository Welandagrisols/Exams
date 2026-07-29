import { pgTable, text, serial, integer, date, numeric } from "drizzle-orm/pg-core";
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
  parentName: text("parent_name"),
  parentPhone: text("parent_phone"),
  parentEmail: text("parent_email"),
  nationality: text("nationality"),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  feeBalance: numeric("fee_balance", { precision: 10, scale: 2 }).notNull().default("0"),
});

export const insertStudentSchema = createInsertSchema(studentsTable).omit({ id: true });
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof studentsTable.$inferSelect;
