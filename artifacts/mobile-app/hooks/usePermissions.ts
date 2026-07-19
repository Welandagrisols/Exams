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

  /** Can perform write operations on the given class (or globally if no classId given) */
  const canWrite = isStaff || (
    classId != null && assignedClassIds.includes(Number(classId))
  );

  /** Can send messages / broadcast results / manage fees for this class */
  const canMessage = canWrite;

  /** Can view anything (all authenticated users can view all classes) */
  const canView = true;

  return { isStaff, canWrite, canMessage, canView, role, assignedClassIds };
}
