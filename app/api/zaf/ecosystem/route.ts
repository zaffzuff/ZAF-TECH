import { NextResponse } from "next/server";
import { getUnifiedObservation } from "@/lib/zaf/observation-engine";
import { enforceRateLimit } from "@/lib/zaf/rate-limit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const rateLimit = await enforceRateLimit(request, "ecosystem", { limit: 60, windowMs: 60_000 });
  if (rateLimit) return rateLimit;

  const observation = await getUnifiedObservation();
  return NextResponse.json(observation.ecosystem, {
    headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" },
  });
}
