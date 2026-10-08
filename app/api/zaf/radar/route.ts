import { NextResponse } from "next/server";
import { getRadarObservation } from "@/lib/zaf/radar";
import { enforceRateLimit } from "@/lib/zaf/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = await enforceRateLimit(request, "radar", { limit: 30, windowMs: 60_000 });
  if (rateLimit) return rateLimit;

  const result = await getRadarObservation();
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
