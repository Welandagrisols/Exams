import { Router, type IRouter } from "express";
import { db, usersTable, classesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";

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

/** GET /api/me — return the current user's profile, role, and assigned class IDs */
router.get("/me", async (req, res): Promise<void> => {
  const { user } = res.locals as { user: { id: string; email?: string } };
  const row = await ensureUserRow(user.id, user.email);

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
