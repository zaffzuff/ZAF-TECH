import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/zaf/rate-limit";
import { clearPiSessionCookie, deletePiSession } from "@/lib/zaf/pi/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rateLimit = await enforceRateLimit(
    request,
    "pi-logout",
    { limit: 20, windowMs: 60_000, failClosed: false },
  );
  if (rateLimit) return rateLimit;

  try {
    await deletePiSession(request);
  } catch (error) {
    console.error("[ZAF-TECH] Pi session revocation failed", error);
    const response = NextResponse.json(
      { error: "Pi session could not be revoked. Please retry.", code: "SESSION_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
    clearPiSessionCookie(response);
    return response;
  }

  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  clearPiSessionCookie(response);
  return response;
}
