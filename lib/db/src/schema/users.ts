import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

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
  /**
   * Deactivated accounts are blocked at the auth layer (see auth.ts) — a
   * deactivated teacher's requests are rejected even with a valid session
   * token. This is deliberately NOT a delete: teachers reference historical
   * data everywhere (classes they taught, scores they entered, report
   * signatures, sent messages, audit log entries) and removing the row
   * would break or orphan all of that. Default true so existing accounts
   * are unaffected until an admin explicitly deactivates someone.
   */
  isActive: boolean("is_active").notNull().default(true),
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
