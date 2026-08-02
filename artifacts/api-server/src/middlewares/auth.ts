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
    let isActive = true;
    try {
      const [userRow, assignedClasses] = await Promise.all([
        db.select({ role: usersTable.role, isActive: usersTable.isActive }).from(usersTable).where(eq(usersTable.id, userId)).then(r => r[0]),
        db.select({ id: classesTable.id }).from(classesTable).where(eq(classesTable.teacherId, userId)),
      ]);
      role = userRow?.role ?? "teacher";
      isActive = userRow?.isActive ?? true;
      assignedClassIds = assignedClasses.map(c => c.id);
    } catch (dbErr: any) {
      // Only swallow the specific "schema not yet migrated" case (new
      // columns/tables not present yet) — that's a genuinely benign,
      // temporary state right after a fresh deploy. Everything else
      // (connection refused, wrong database, auth failure, timeout) is a
      // real problem and must NOT be silently smoothed over into "teacher" —
      // that silent fallback is exactly what made a misconfigured database
      // connection look like a permissions bug instead of an infra bug.
      const code = dbErr?.code as string | undefined;
      const isMissingSchema = code === "42P01" /* undefined_table */ || code === "42703" /* undefined_column */;
      if (isMissingSchema) {
        logger.warn({ err: dbErr }, "DB schema not yet migrated — defaulting to teacher");
      } else {
        logger.error({ err: dbErr }, "Database connection failed while checking user role");
        res.status(503).json({ error: "Could not reach the database to verify your account. This usually means the server's database connection is misconfigured — contact your administrator." });
        return;
      }
    }

    if (!isActive) {
      res.status(403).json({ error: "This account has been deactivated. Contact your school admin." });
      return;
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
