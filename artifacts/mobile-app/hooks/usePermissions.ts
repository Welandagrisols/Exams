import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/contexts/AuthContext";

/**
 * Returns permission helpers based on the logged-in user's role and
 * assigned class. Import and use in any screen to gate UI elements.
 *
 * Example:
 *   const { canWrite, isStaff } = usePermissions(classId);
 *   {canWrite && <Button title="Add Student" />}
 */
export function usePermissions(classId?: number | string | null) {
  const { profile } = useAuth();

  const role: UserRole = profile?.role ?? "teacher";
  const assignedClassIds = profile?.assignedClassIds ?? [];

  /** admin, principal, or deputy — full write access everywhere */
  const isStaff = ["admin", "principal", "deputy"].includes(role);

  /** admin ONLY — reserved for granting/revoking roles (see server-side isAdmin) */
  const isAdmin = role === "admin";

  /** Can perform write operations on the given class (or globally if no classId given) */
  // Compare both as numbers and as strings to handle integer IDs passed as
  // route-param strings (e.g. "42") as well as any future string/UUID IDs.
  const canWrite = isStaff || (
    classId != null && (
      assignedClassIds.includes(Number(classId)) ||
      assignedClassIds.map(String).includes(String(classId))
    )
  );

  /** Can send messages / broadcast results / manage fees for this class */
  const canMessage = canWrite;

  /** Can view anything (all authenticated users can view all classes) */
  const canView = true;

  return { isStaff, isAdmin, canWrite, canMessage, canView, role, assignedClassIds };
}
