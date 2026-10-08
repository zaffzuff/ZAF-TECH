import { createHash, randomBytes } from "node:crypto";
import { ensureZafSchema, getZafDb } from "@/lib/zaf/db";

export const PI_SESSION_COOKIE = "zaf_session";
export const PI_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const HASH_PREFIX = "zaf-session:v1|";

export type PiSessionUser = { id: number; uid: string; username: string };

function sessionHash(token: string) {
  return createHash("sha256").update(HASH_PREFIX + token).digest("hex");
}

async function readyDb() {
  const sql = getZafDb();
  if (!sql) throw new Error("ZAF database is not configured.");
  if (!(await ensureZafSchema())) throw new Error("ZAF database schema is unavailable.");
  return sql;
}

export async function createPiSession(user: { uid: string; username: string }) {
  const sql = await readyDb();
  const token = randomBytes(32).toString("base64url");
  const hash = sessionHash(token);

  const rows = await sql.begin(async (tx) => {
    const userRows = await tx`
      INSERT INTO zaf_pi_users (pi_uid, username, created_at, last_seen_at)
      VALUES (${user.uid}, ${user.username}, NOW(), NOW())
      ON CONFLICT (pi_uid) DO UPDATE SET
        username = EXCLUDED.username,
        last_seen_at = NOW()
      RETURNING id, pi_uid AS "uid", username
    `;

    const userId = Number(userRows[0].id);
    await tx`
      INSERT INTO zaf_pi_sessions (session_hash, user_id, created_at, expires_at, last_seen_at)
      VALUES (${hash}, ${userId}, NOW(), NOW() + INTERVAL '30 days', NOW())
    `;
    return userRows;
  });

  return {
    token,
    user: { id: Number(rows[0].id), uid: String(rows[0].uid), username: String(rows[0].username) },
  };
}

export async function getPiSession(token: string): Promise<PiSessionUser | null> {
  const sql = await readyDb();
  const rows = await sql`
    SELECT u.id, u.pi_uid AS "uid", u.username
    FROM zaf_pi_sessions s
    INNER JOIN zaf_pi_users u ON u.id = s.user_id
    WHERE s.session_hash = ${sessionHash(token)}
      AND s.expires_at > NOW()
    LIMIT 1
  `;
  if (!rows[0]) return null;
  return { id: Number(rows[0].id), uid: String(rows[0].uid), username: String(rows[0].username) };
}

export async function revokePiSession(token: string) {
  const sql = await readyDb();
  const rows = await sql`
    DELETE FROM zaf_pi_sessions
    WHERE session_hash = ${sessionHash(token)}
    RETURNING session_hash
  `;
  return rows.length > 0;
}

export async function cleanupExpiredPiSessions() {
  const sql = getZafDb();
  if (!sql) return 0;
  if (!(await ensureZafSchema())) return 0;
  try {
    const rows = await sql`DELETE FROM zaf_pi_sessions WHERE expires_at <= NOW() RETURNING session_hash`;
    return rows.length;
  } catch {
    return 0;
  }
}