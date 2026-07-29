import { pgTable, serial, text, jsonb, timestamp } from "drizzle-orm/pg-core";

/**
 * A lightweight, append-only audit trail. Not exhaustive — covers the
 * mutation points where accountability actually matters (academic records,
 * role changes, report signing), not every request in the system.
 */
export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id"), // nullable: some actions may happen without a resolved user in edge cases
  userName: text("user_name"), // denormalized at write time so the log stays readable even if the user is later removed
  action: text("action").notNull(), // e.g. "class.create", "user.role_change", "score.bulk_save"
  entityType: text("entity_type").notNull(), // e.g. "class", "student", "exam"
  entityId: text("entity_id"), // stringified id — flexible across integer and text PKs
  details: jsonb("details"), // free-form context: previous/new values, counts, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AuditLog = typeof auditLogsTable.$inferSelect;
