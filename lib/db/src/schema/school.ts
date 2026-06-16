import { pgTable, text, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const schoolTable = pgTable("school", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("My School"),
  address: text("address"),
  motto: text("motto"),
  principalName: text("principal_name"),
  logoUrl: text("logo_url"),
});

export const insertSchoolSchema = createInsertSchema(schoolTable).omit({ id: true });
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type School = typeof schoolTable.$inferSelect;
