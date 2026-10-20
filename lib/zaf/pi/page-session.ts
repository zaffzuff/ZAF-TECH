// Cookie-blocked native WebViews keep only our short-lived app credential in
// module memory. Never persist it, put it in a URL, or reuse a Pi access token.
let enabled = false;
let credential: { token: string; expiresAt: number } | null = null;

export function usesPiPageSession() { return enabled; }
export function enablePiPageSession() {
  if (!enabled && typeof window !== "undefined") window.addEventListener?.("pagehide", forgetPiPageSession);
  enabled = true; credential = null;
}
export function forgetPiPageSession() { credential = null; }

export function rememberPiPageSession(value: unknown, now = Date.now()) {
  credential = null;
  if (!enabled || !value || typeof value !== "object") return false;
  const { token, expiresAt } = value as { token?: unknown; expiresAt?: unknown };
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{20,2048}$/.test(token) ||
      typeof expiresAt !== "number" || !Number.isFinite(expiresAt) ||
      expiresAt <= now || expiresAt > now + 30 * 60_000) return false;
  credential = { token, expiresAt };
  return true;
}

export function piSessionRequestOptions(method: "GET" | "DELETE"): RequestInit {
  if (!enabled) return { method, credentials: "same-origin", cache: "no-store" };
  if (credential && credential.expiresAt <= Date.now()) credential = null;
  return {
    method, credentials: "omit", cache: "no-store",
    headers: {
      "X-ZAF-Pi-Session-Transport": "memory",
      ...(credential ? { Authorization: `Bearer ${credential.token}` } : {}),
    },
  };
}
