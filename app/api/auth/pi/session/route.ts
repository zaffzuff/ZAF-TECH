import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/zaf/rate-limit";
import { getPiSession } from "@/lib/zaf/pi/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = await enforceRateLimit(
    request,
    "pi-session",
    { limit: 60, windowMs: 60_000, failClosed: false },
  );
  if (rateLimit) return rateLimit;

  const session = await getPiSession(request);
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
