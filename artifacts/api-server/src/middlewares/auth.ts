import type { Request, Response, NextFunction } from "express";

export interface AuthenticatedUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sessionUser = (req.session as any)?.user as AuthenticatedUser | undefined;

  if (sessionUser?.id) {
    req.user = sessionUser;
    next();
    return;
  }

  const userId = req.headers["x-replit-user-id"] as string | undefined;
  const userName = req.headers["x-replit-user-name"] as string | undefined;
  const userProfileImage = req.headers["x-replit-user-profile-image"] as string | undefined;

  if (userId) {
    const user: AuthenticatedUser = {
      id: userId,
      email: null,
      firstName: userName ?? null,
      lastName: null,
      profileImageUrl: userProfileImage ?? null,
    };
    (req.session as any).user = user;
    req.session.save(() => {});
    req.user = user;
    next();
    return;
  }

  res.status(401).json({ error: "Unauthorised" });
}
