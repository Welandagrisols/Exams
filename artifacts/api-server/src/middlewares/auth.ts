import type { Request, Response, NextFunction } from "express";

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

    const user = await response.json();
    (req as Request & { user: unknown }).user = user;
    next();
  } catch {
    res.status(401).json({ error: "Authentication failed" });
  } finally {
    clearTimeout(timeout);
  }
}
