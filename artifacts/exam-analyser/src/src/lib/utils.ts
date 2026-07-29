import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getRubricColor(grade: string | undefined | null): string {
  if (!grade) return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
  if (grade.startsWith('EE')) return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50";
  if (grade.startsWith('ME')) return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50";
  if (grade.startsWith('AE')) return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50";
  if (grade.startsWith('BE')) return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50";
  return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
}

export function getRubricHexColor(grade: string | undefined | null): string {
  if (!grade) return "#6b7280"; // gray-500
  if (grade.startsWith('EE')) return "#22c55e"; // green-500
  if (grade.startsWith('ME')) return "#3b82f6"; // blue-500
  if (grade.startsWith('AE')) return "#f59e0b"; // amber-500
  if (grade.startsWith('BE')) return "#ef4444"; // red-500
  return "#6b7280"; // gray-500
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  } catch (e) {
    return dateStr;
  }
}
