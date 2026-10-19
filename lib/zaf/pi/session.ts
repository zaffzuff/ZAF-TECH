import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { validPiProfile } from "./auth-input";

// A distinct name prevents legacy and partitioned cookies shadowing each other.
export const PI_SESSION_COOKIE = "__Host-zaf-pi-session-v2";
export const PI_LEGACY_SESSION_COOKIE = "__Host-zaf-pi-session";
export const PI_SESSION_SECONDS = 30 * 60;
type Identity = { uid: string; username: string };

function sessionKey() {
  const secret = process.env.ZAF_PI_SESSION_SECRET;
  if (!secret || !/^[a-f0-9]{64}$/.test(secret)) throw new Error("Pi session secret is not configured.");
  return Buffer.from(secret, "hex");
}

export function assertPiSessionConfigured() { sessionKey(); }

// Encrypt identity as well as authenticating it. Never store either Pi token.
export function sealPiSession(user: Identity, now = Date.now()) {
  if (!validPiProfile(user)) throw new Error("Invalid identity.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sessionKey(), iv);
  cipher.setAAD(Buffer.from(PI_SESSION_COOKIE));
  const payload = Buffer.from(JSON.stringify({ user, issuedAt: now, expiresAt: now + PI_SESSION_SECONDS * 1000 }));
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function readPiSession(value: string | undefined, now = Date.now()): Identity | null {
  if (!value || value.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const bytes = Buffer.from(value, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", sessionKey(), bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from(PI_SESSION_COOKIE));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const payload = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8"));
    if (!validPiProfile(payload.user) || !Number.isFinite(payload.issuedAt) || !Number.isFinite(payload.expiresAt) ||
        payload.issuedAt > now || payload.expiresAt <= now || payload.expiresAt - payload.issuedAt !== PI_SESSION_SECONDS * 1000) return null;
    return { uid: payload.user.uid, username: payload.user.username };
  } catch { return null; }
}

export const piSessionCookieOptions = { httpOnly: true, secure: true, sameSite: "none" as const, path: "/", maxAge: PI_SESSION_SECONDS, partitioned: true };
export const piLegacyCookieClearOptions = { httpOnly: true, secure: true, sameSite: "none" as const, path: "/", maxAge: 0 };
