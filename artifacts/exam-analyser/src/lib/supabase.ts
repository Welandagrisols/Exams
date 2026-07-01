import { setAuthTokenGetter } from "@workspace/api-client-react";

setAuthTokenGetter(null);

export async function authFetch(input: string | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, credentials: "include" });
}
