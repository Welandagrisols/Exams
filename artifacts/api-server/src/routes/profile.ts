import { Router, type IRouter } from "express";
import { db, usersTable, classesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

/** Upsert a row in the local users table from the Supabase user attached by auth middleware */
async function ensureUserRow(userId: string, email?: string) {
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (existing) return existing;
  const [created] = await db
    .insert(usersTable)
    .values({ id: userId, email: email ?? null })
    .returning();
  return created;
}

/**
 * Bootstrap fix: this app has no signup-time way to designate an admin — the
 * schema default is `teacher`, and promoting someone requires a direct SQL
 * UPDATE against the database, which most users can't do themselves. That
 * left new deployments with no way to reach the admin screens at all.
 *
 * Self-heal instead: if the system has zero admins, promote the oldest
 * account (first person who ever signed in) to admin automatically. Once
 * any admin exists, this is a no-op forever — it never re-promotes or
 * touches roles again, and it never demotes anyone.
 */
async function selfHealFirstAdmin(row: typeof usersTable.$inferSelect) {
  if (row.role === "admin") return row;

  const [existingAdmin] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.role, "admin"))
    .limit(1);
  if (existingAdmin) return row;

  const [oldest] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .orderBy(asc(usersTable.createdAt))
    .limit(1);
  if (!oldest || oldest.id !== row.id) return row;

  const [promoted] = await db
    .update(usersTable)
    .set({ role: "admin", updatedAt: new Date() })
    .where(eq(usersTable.id, row.id))
    .returning();
  return promoted ?? row;
}

/** GET /api/me — return the current user's profile, role, and assigned class IDs */
router.get("/me", async (req, res): Promise<void> => {
  const { user } = res.locals as { user: { id: string; email?: string } };
  let row = await ensureUserRow(user.id, user.email);
  row = await selfHealFirstAdmin(row);

  // Fetch classes this user is assigned to as class teacher
  const assignedClasses = await db
    .select({ id: classesTable.id, name: classesTable.name })
    .from(classesTable)
    .where(eq(classesTable.teacherId, user.id));

  res.json({
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    profileImageUrl: row.profileImageUrl,
    signatureData: row.signatureData,
    role: row.role ?? "teacher",
    assignedClassIds: assignedClasses.map(c => c.id),
    assignedClasses,
  });
});

const SaveSignatureBody = z.object({
  signatureData: z.string().min(1).max(500_000),
});

/** PATCH /api/me/signature — save or update the user's signature */
router.patch("/me/signature", async (req, res): Promise<void> => {
  const parsed = SaveSignatureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { user } = res.locals as { user: { id: string; email?: string } };
  await ensureUserRow(user.id, user.email);
  await db
    .update(usersTable)
    .set({ signatureData: parsed.data.signatureData, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id));
  res.json({ ok: true });
});

/** DELETE /api/me/signature — remove the user's signature */
router.delete("/me/signature", async (req, res): Promise<void> => {
  const { user } = res.locals as { user: { id: string; email?: string } };
  await db
    .update(usersTable)
    .set({ signatureData: null, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id));
  res.json({ ok: true });
});

export default router;
