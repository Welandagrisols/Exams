import type { RequestHandler } from "express";
import { isAuthenticated } from "../replit_integrations/auth";

export const requireAuth: RequestHandler = isAuthenticated();
