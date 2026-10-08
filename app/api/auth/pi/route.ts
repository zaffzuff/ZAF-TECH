import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/zaf/rate-limit";
import { verifyPiAccessToken, PiAuthError } from "@/lib/zaf/pi/auth";
import { createPiSession, setPiSessionCookie } from "@/lib/zaf/pi/session";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const rateLimit = await enforceRateLimit(
    request,
    "pi-auth",
    { limit: 10, windowMs: 60_000, failClosed: true },
  );
  if (rateLimit) return rateLimit;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body.", code: "INVALID_REQUEST" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const accessToken = isRecord(body) && typeof body.accessToken === "string"
    ? body.accessToken.trim()
    : "";

  if (!accessToken || accessToken.length > 4096) {
    return NextResponse.json(
      { error: "A valid Pi access token is required.", code: "INVALID_REQUEST" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const user = await verifyPiAccessToken(accessToken);
    const session = await createPiSession(user);
    const response = NextResponse.json(
      {
        ok: true,
        user: {
          uid: user.uid,
          username: user.username,
        },
        expiresAt: session.expiresAt,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
    setPiSessionCookie(response, session.token);
    return response;
  } catch (error) {
    if (error instanceof PiAuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }

    console.error("[ZAF-TECH] Pi session creation failed", error);
    return NextResponse.json(
      { error: "Pi session could not be created.", code: "SESSION_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
