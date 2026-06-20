const DEV_DOMAIN = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export function getApiUrl(path: string): string {
  return `${DEV_DOMAIN}/api${path}`;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = getApiUrl(path);
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function getRubricColor(grade: string): string {
  if (grade?.startsWith("EE")) return "#10b981";
  if (grade?.startsWith("ME")) return "#3b82f6";
  if (grade?.startsWith("AE")) return "#f59e0b";
  return "#ef4444";
}

export function getRubricLabel(grade: string): string {
  if (grade?.startsWith("EE")) return "Exceeds Expectation";
  if (grade?.startsWith("ME")) return "Meets Expectation";
  if (grade?.startsWith("AE")) return "Approaches Expectation";
  return "Below Expectation";
}
