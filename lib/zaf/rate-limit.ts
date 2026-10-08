import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { ensureZafSchema, getZafDb } from "@/lib/zaf/db";

export type RateLimitRule = { limit: number; windowMs: number; failClosed?: boolean };
export type RateLimitResult = {
  allowed: boolean; limit: number; remaining: number; resetAt: number;
  retryAfterSeconds: number; storageAvailable: boolean;
};

function normalizeRule(rule: RateLimitRule) {
  return { limit: Math.max(1, Math.floor(rule.limit)), windowMs: Math.max(1_000, Math.floor(rule.windowMs)), failClosed: Boolean(rule.failClosed) };
}

function clientIdentity(request: Request) {
  const realIp = request.headers.get("x-real-ip")?.trim();
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = realIp || forwarded || "unknown";
  const userAgent = request.headers.get("user-agent")?.trim().slice(0, 256) || "unknown";
  return address + "|" + userAgent;
}

function keyHash(request: Request, scope: string) {
  return createHash("sha256").update("zaf-rate-limit:v1|" + scope + "|" + clientIdentity(request)).digest("hex");
}

export async function consumeRateLimit(request: Request, scope: string, rule: RateLimitRule): Promise<RateLimitResult> {
  const normalized = normalizeRule(rule);
  const now = Date.now();
  const windowStartMs = Math.floor(now / normalized.windowMs) * normalized.windowMs;
  const resetAt = windowStartMs + normalized.windowMs;
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
  const sql = getZafDb();

  if (!sql) return { allowed: true, limit: normalized.limit, remaining: normalized.limit, resetAt, retryAfterSeconds, storageAvailable: false };
  if (!(await ensureZafSchema())) return {
    allowed: normalized.failClosed ? false : true,
    limit: normalized.limit, remaining: normalized.failClosed ? 0 : normalized.limit, resetAt, retryAfterSeconds, storageAvailable: false,
  };

  try {
    const rows = await sql`
      INSERT INTO zaf_rate_limits (key_hash, window_start, request_count, updated_at)
      VALUES (${keyHash(request, scope)}, ${new Date(windowStartMs).toISOString()}, 1, NOW())
      ON CONFLICT (key_hash) DO UPDATE SET
        request_count = CASE
          WHEN zaf_rate_limits.window_start = EXCLUDED.window_start THEN zaf_rate_limits.request_count + 1
          ELSE 1
        END,
        window_start = EXCLUDED.window_start,
        updated_at = NOW()
      RETURNING request_count AS "requestCount"
    `;
    const count = Number(rows[0]?.requestCount ?? 1);
    return { allowed: count <= normalized.limit, limit: normalized.limit, remaining: Math.max(0, normalized.limit - count), resetAt, retryAfterSeconds, storageAvailable: true };
  } catch (error) {
    console.error("[ZAF-TECH] Rate-limit storage check failed", error);
    return {
      allowed: normalized.failClosed ? false : true,
      limit: normalized.limit, remaining: normalized.failClosed ? 0 : normalized.limit, resetAt, retryAfterSeconds, storageAvailable: false,
    };
  }
}

export function rateLimitHeaders(result: RateLimitResult, blocked = false) {
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
  };
  if (blocked) headers["Retry-After"] = String(result.retryAfterSeconds);
  return headers;
}

export async function enforceRateLimit(request: Request, scope: string, rule: RateLimitRule) {
  const result = await consumeRateLimit(request, scope, rule);
  if (result.allowed) return null;
  return NextResponse.json(
    { error: "Too many requests. Please retry later.", code: "RATE_LIMITED", retryAfterSeconds: result.retryAfterSeconds },
    { status: 429, headers: rateLimitHeaders(result, true) },
  );
}

export async function cleanupZafRateLimits(maxAgeHours = 24) {
  const sql = getZafDb();
  if (!sql) return 0;
  if (!(await ensureZafSchema())) return 0;
  try {
    const cutoff = new Date(Date.now() - Math.max(1, maxAgeHours) * 60 * 60 * 1000);
    const rows = await sql`DELETE FROM zaf_rate_limits WHERE updated_at < ${cutoff.toISOString()} RETURNING key_hash`;
    return rows.length;
  } catch (error) {
    console.error("[ZAF-TECH] Rate-limit cleanup failed", error);
    return 0;
  }
}