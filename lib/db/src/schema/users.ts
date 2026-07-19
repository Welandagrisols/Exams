import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export type UserRole = "teacher" | "admin" | "principal" | "deputy";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  /** Base64 PNG data-URL of the user's drawn or uploaded signature */
  signatureData: text("signature_data"),
  /**
   * Role controls what the user can do:
   *   teacher   – can edit/upload/message only for their assigned class
   *   admin     – full access across all classes
   *   principal – full access across all classes
   *   deputy    – full access across all classes
   * Default is 'teacher'. The first user to sign up should be promoted to
   * admin/principal by running: UPDATE users SET role='admin' WHERE email='...';
   */
  role: text("role").$type<UserRole>().notNull().default("teacher"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessionsTable = pgTable("sessions", {
  sid: text("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
