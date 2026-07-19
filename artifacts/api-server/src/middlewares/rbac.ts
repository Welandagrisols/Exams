import type { Response } from "express";
import type { UserRole } from "@workspace/db";

export interface AppLocals {
  user: { id: string; email?: string };
  role: UserRole;
  assignedClassIds: number[];
}

/**
 * Returns true for admin / principal / deputy — these roles have full
 * write access across all classes without needing a class assignment.
 */
export function isStaff(locals: AppLocals): boolean {
  return ["admin", "principal", "deputy"].includes(locals.role);
}

/**
 * Returns true if the user may perform write operations on a specific class.
 * A user can write if they are staff OR they are the assigned class teacher.
 */
export function canEditClass(classId: number, locals: AppLocals): boolean {
  return isStaff(locals) || locals.assignedClassIds.includes(classId);
}

/** Send a 403 and return — call `return` after this in route handlers. */
export function forbidden(res: Response, message = "You do not have permission to perform this action."): void {
  res.status(403).json({ error: message });
}
