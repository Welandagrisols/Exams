import { supabase } from "./supabase";
import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};
const DEV_DOMAIN = (
  extra.apiUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  "http://localhost:8000"
).replace(/\/$/, "");

export function getApiUrl(path: string): string {
  return `${DEV_DOMAIN}/api${path}`;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }
  return {};
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = getApiUrl(path);
  const authHeaders = await getAuthHeaders();
  const { headers: customHeaders, ...restOptions } = options ?? {};
  const res = await fetch(url, {
    ...restOptions,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(customHeaders instanceof Headers
        ? Object.fromEntries(customHeaders.entries())
        : (customHeaders as Record<string, string> | undefined)),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  // 204 No Content — no body to parse
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const url = getApiUrl(path);
  const authHeaders = await getAuthHeaders();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...authHeaders,
    },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  // 204 No Content — no body to parse
  if (res.status === 204) return undefined as unknown as T;
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
