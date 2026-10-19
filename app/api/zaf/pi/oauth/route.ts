import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { assertPiSessionConfigured, sealPiSession, PI_SESSION_COOKIE, PI_LEGACY_SESSION_COOKIE, piSessionCookieOptions, piLegacyCookieClearOptions } from "@/lib/zaf/pi/session";
import { enforceRateLimit } from "@/lib/zaf/rate-limit";
import { readPiAuthInput, PiInputError, validPiProfile, piRetryAfter } from "@/lib/zaf/pi/auth-input";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Pi Sign-in OAuth belongs to the Developer Portal app, not the converted
// App Studio app. This is a separate verifier, never a fallback for SDK auth.
export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "pi-auth-verify", { limit: 12, windowMs: 60_000 });
  if (limited) return limited;
  const reply = (error: string, status: number, headers = {}) => NextResponse.json({ error }, {
    status, headers: { "Cache-Control": "no-store", ...headers },
  });
  let accessToken: string;
  try { accessToken = await readPiAuthInput(request); }
  catch (error) { return reply(error instanceof PiInputError ? error.message : "Invalid request.", error instanceof PiInputError ? error.status : 400); }
  try { assertPiSessionConfigured(); }
  catch { return reply("Pi session is temporarily unavailable.", 503); }

  try {
    const upstream = await fetch("https://api.minepi.com/v2/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10_000),
    });
    if (!upstream.ok) console.warn("[ZAF Tech] Pi OAuth rejected", { stage: "platform-me", status: upstream.status });
    if (upstream.status === 401 || upstream.status === 403) return reply("Pi could not verify this sign-in.", 401);
    if (upstream.status === 429) return reply("Pi verification is busy. Please retry later.", 429, {
      "Retry-After": String(piRetryAfter(upstream.headers.get("retry-after"))),
    });
    if (!upstream.ok) return reply("Pi verification is temporarily unavailable.", 502);
    const user: unknown = await upstream.json();
    if (!validPiProfile(user)) return reply("Pi returned an incomplete user profile.", 502);

    // UIDs are app-specific. Never correlate Developer Portal and App Studio
    // identities by username or accidentally share their future entitlements.
    const uid = "pi-oauth:" + createHash("sha256").update(user.uid).digest("hex");
    const response = NextResponse.json({ ok: true, user: { username: user.username } }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
    response.cookies.set(PI_SESSION_COOKIE, sealPiSession({ uid, username: user.username }), piSessionCookieOptions);
    response.cookies.set(PI_LEGACY_SESSION_COOKIE, "", piLegacyCookieClearOptions);
    return response;
  } catch (error) {
    console.error("[ZAF Tech] Pi OAuth verification failed", error instanceof Error ? error.name : "unknown");
    return reply("Pi verification is temporarily unavailable.", 502);
  }
}
