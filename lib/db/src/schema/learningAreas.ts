import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const learningAreasTable = pgTable("learning_areas", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  abbreviation: text("abbreviation").notNull(),
  maxMarks: integer("max_marks").notNull().default(100),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertLearningAreaSchema = createInsertSchema(learningAreasTable).omit({ id: true });
export type InsertLearningArea = z.infer<typeof insertLearningAreaSchema>;
export type LearningArea = typeof learningAreasTable.$inferSelect;
