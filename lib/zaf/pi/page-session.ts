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
  const { token, expiresIn } = value as { token?: unknown; expiresIn?: unknown };
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{20,2048}$/.test(token) ||
      typeof expiresIn !== "number" || !Number.isInteger(expiresIn) ||
      expiresIn <= 0 || expiresIn > 1800) return false;
  // Use a duration locally: a phone clock a few seconds behind the server
  // must not reject a freshly issued session. The server enforces real expiry.
  credential = { token, expiresAt: now + expiresIn * 1000 };
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
