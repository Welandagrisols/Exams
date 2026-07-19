import type { Request, Response, NextFunction } from "express";
import { db, usersTable, classesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }

  const token = authHeader.slice(7);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }

    const supabaseUser = await response.json();
    const userId = supabaseUser.id as string;

    // Fetch role + assigned classes in parallel — gracefully fall back if schema
    // not yet migrated (new columns may not exist until drizzle-kit push is run).
    let role = "teacher";
    let assignedClassIds: number[] = [];
    try {
      const [userRow, assignedClasses] = await Promise.all([
        db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId)).then(r => r[0]),
        db.select({ id: classesTable.id }).from(classesTable).where(eq(classesTable.teacherId, userId)),
      ]);
      role = userRow?.role ?? "teacher";
      assignedClassIds = assignedClasses.map(c => c.id);
    } catch (dbErr) {
      // DB schema not yet migrated or connection error — default to most-restrictive role
      logger.warn({ err: dbErr }, "Could not fetch user role from DB — defaulting to teacher");
    }

    res.locals.user = { id: userId, email: supabaseUser.email };
    res.locals.role = role;
    res.locals.assignedClassIds = assignedClassIds;
    next();
  } catch {
    res.status(401).json({ error: "Authentication failed" });
  } finally {
    clearTimeout(timeout);
  }
}
