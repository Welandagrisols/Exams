import type { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
  user: { id: string; name: string };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.headers["x-replit-user-id"];
  const userName = req.headers["x-replit-user-name"];

  if (!userId || !userName) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }

  (req as AuthenticatedRequest).user = {
    id: String(userId),
    name: String(userName),
  };

  next();
}
