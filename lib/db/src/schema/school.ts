import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const schoolTable = pgTable("school", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("My School"),
  address: text("address"),
  motto: text("motto"),
  principalName: text("principal_name"),
  logoUrl: text("logo_url"),
  term1StartDate: text("term1_start_date"),
  term1EndDate: text("term1_end_date"),
  term2StartDate: text("term2_start_date"),
  term2EndDate: text("term2_end_date"),
  term3StartDate: text("term3_start_date"),
  term3EndDate: text("term3_end_date"),
  rubricEe2: integer("rubric_ee2").default(86),
  rubricEe1: integer("rubric_ee1").default(70),
  rubricMe2: integer("rubric_me2").default(55),
  rubricMe1: integer("rubric_me1").default(40),
  rubricAe2: integer("rubric_ae2").default(25),
  rubricAe1: integer("rubric_ae1").default(10),
  rubricBe2: integer("rubric_be2").default(5),
});

export const insertSchoolSchema = createInsertSchema(schoolTable).omit({ id: true });
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type School = typeof schoolTable.$inferSelect;
