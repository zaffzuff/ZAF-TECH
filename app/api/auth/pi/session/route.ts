import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/zaf/rate-limit";
import { getPiSession, PiSessionStorageError } from "@/lib/zaf/pi/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = await enforceRateLimit(
    request,
    "pi-session",
    { limit: 60, windowMs: 60_000, failClosed: false },
  );
  if (rateLimit) return rateLimit;

  let session;
  try {
    session = await getPiSession(request);
  } catch (error) {
    if (error instanceof PiSessionStorageError) {
      return NextResponse.json(
        { error: "Pi session storage is temporarily unavailable.", code: "SESSION_UNAVAILABLE" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    throw error;
  }

  if (!session) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      user: session.user,
      environment: session.environment,
      network: session.network,
      expiresAt: session.expiresAt,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
