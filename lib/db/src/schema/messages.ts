import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { classesTable } from "./classes";
import { studentsTable } from "./students";
import { examsTable } from "./exams";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  classId: integer("class_id").references(() => classesTable.id, { onDelete: "set null" }),
  examId: integer("exam_id").references(() => examsTable.id, { onDelete: "set null" }),
  recipientCount: integer("recipient_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messageRecipientsTable = pgTable("message_recipients", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").references(() => messagesTable.id, { onDelete: "cascade" }).notNull(),
  studentId: integer("student_id").references(() => studentsTable.id, { onDelete: "cascade" }).notNull(),
  studentName: text("student_name").notNull(),
  parentName: text("parent_name"),
  parentPhone: text("parent_phone"),
  parentEmail: text("parent_email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Message = typeof messagesTable.$inferSelect;
export type MessageRecipient = typeof messageRecipientsTable.$inferSelect;
