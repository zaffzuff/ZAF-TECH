import { createHash, randomBytes } from "node:crypto";
import { type NextResponse } from "next/server";
import { ensureZafSchema, getZafDb } from "@/lib/zaf/db";
import { getPiRuntimeConfig, type PiNetwork, type PiRuntimeEnvironment } from "@/lib/zaf/pi/runtime";
import type { PiVerifiedUser } from "@/lib/zaf/pi/auth";

export const PI_SESSION_COOKIE = "zaf_pi_session";
export const PI_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const MAX_SESSION_COOKIE_LENGTH = 128;

export type PiSessionUser = {
  uid: string;
  username: string | null;
};

export type PiSession = {
  user: PiSessionUser;
  environment: PiRuntimeEnvironment;
  network: PiNetwork;
  expiresAt: string;
};

export class PiSessionStorageError extends Error {
  constructor(message = "Pi session storage is unavailable.") {
    super(message);
    this.name = "PiSessionStorageError";
  }
}

function hashSessionToken(token: string) {
  return createHash("sha256")
    .update("zaf-pi-session:v1|" + token)
    .digest("hex");
}

function readSessionToken(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const prefix = `${PI_SESSION_COOKIE}=`;
  const value = cookie
    .split(";")
    .map(part => part.trim())
    .find(part => part.startsWith(prefix))
    ?.slice(prefix.length);
  if (!value || value.length > MAX_SESSION_COOKIE_LENGTH) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export async function createPiSession(user: PiVerifiedUser): Promise<{ token: string; expiresAt: string }> {
  const sql = getZafDb();
  if (!sql || !(await ensureZafSchema())) {
    throw new PiSessionStorageError();
  }

  const config = getPiRuntimeConfig();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + PI_SESSION_MAX_AGE_SECONDS * 1000).toISOString();

  try {
    await sql`
      INSERT INTO zaf_pi_sessions
        (session_hash, pi_uid, username, environment, network, created_at, expires_at, last_seen_at)
      VALUES
        (${hashSessionToken(token)}, ${user.uid}, ${user.username}, ${config.environment}, ${config.network}, NOW(), ${expiresAt}, NOW())
    `;
  } catch (error) {
    console.error("[ZAF-TECH] Pi session creation storage failed", error);
    throw new PiSessionStorageError();
  }

  return { token, expiresAt };
}

export async function getPiSession(request: Request): Promise<PiSession | null> {
  const token = readSessionToken(request);
  if (!token) return null;

  const sql = getZafDb();
  if (!sql || !(await ensureZafSchema())) throw new PiSessionStorageError();

  let rows;
  try {
    rows = await sql`
    SELECT
      pi_uid AS "piUid",
      username,
      environment,
      network,
      expires_at AS "expiresAt"
    FROM zaf_pi_sessions
    WHERE session_hash = ${hashSessionToken(token)}
      AND expires_at > NOW()
    LIMIT 1
    `;
  } catch (error) {
    console.error("[ZAF-TECH] Pi session lookup failed", error);
    throw new PiSessionStorageError();
  }

  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row || typeof row.piUid !== "string") return null;

  return {
    user: {
      uid: row.piUid,
      username: typeof row.username === "string" ? row.username : null,
    },
    environment: row.environment === "production" ? "production" : "sandbox",
    network: row.network === "mainnet" ? "mainnet" : "testnet",
    expiresAt: String(row.expiresAt),
  };
}

export async function deletePiSession(request: Request) {
  const token = readSessionToken(request);
  if (!token) return false;

  const sql = getZafDb();
  if (!sql || !(await ensureZafSchema())) return false;

  try {
    const rows = await sql`
      DELETE FROM zaf_pi_sessions
      WHERE session_hash = ${hashSessionToken(token)}
      RETURNING session_hash
    `;
    return rows.length > 0;
  } catch (error) {
    console.error("[ZAF-TECH] Pi session deletion failed", error);
    return false;
  }
}

export async function cleanupExpiredPiSessions() {
  const sql = getZafDb();
  if (!sql || !(await ensureZafSchema())) return 0;

  try {
    const rows = await sql`
      DELETE FROM zaf_pi_sessions
      WHERE expires_at <= NOW()
      RETURNING session_hash
    `;
    return rows.length;
  } catch (error) {
    console.error("[ZAF-TECH] Expired Pi session cleanup failed", error);
    return 0;
  }
}

export function setPiSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: PI_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PI_SESSION_MAX_AGE_SECONDS,
  });
}

export function clearPiSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: PI_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
