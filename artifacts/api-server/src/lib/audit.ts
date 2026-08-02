import { db, auditLogsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { AppLocals } from "../middlewares/rbac";

/**
 * Records an audit entry. Deliberately fire-and-forget: a logging failure
 * must never break the actual request it's attached to, so this never
 * throws — it logs to the console and moves on.
 *
 * @param locals   res.locals from the request (for the acting user)
 * @param action   e.g. "class.create", "user.role_change", "score.bulk_save"
 * @param entityType e.g. "class", "student", "exam"
 * @param entityId   the affected record's id (stringified)
 * @param details    optional free-form context (previous/new values, counts)
 */
export async function logAudit(
  locals: AppLocals,
  action: string,
  entityType: string,
  entityId: string | number | null,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    const [user] = await db
      .select({ firstName: usersTable.firstName, lastName: usersTable.lastName, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, locals.user.id));
    const userName = user ? ([user.firstName, user.lastName].filter(Boolean).join(" ") || user.email) : null;

    await db.insert(auditLogsTable).values({
      userId: locals.user.id,
      userName,
      action,
      entityType,
      entityId: entityId != null ? String(entityId) : null,
      details: details ?? null,
    });
  } catch (err) {
    // Never let audit logging break the request it's attached to.
    console.error("[audit] failed to record:", action, err);
  }
}
