import { NextRequest, NextResponse } from "next/server";
import { getUnifiedObservation } from "@/lib/zaf/observation-engine";
import { enforceRateLimit } from "@/lib/zaf/rate-limit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const rateLimit = await enforceRateLimit(request, "observations", { limit: 20, windowMs: 60_000 });
  if (rateLimit) return rateLimit;

  const force = request.nextUrl.searchParams.get("force") === "1";
  const observation = await getUnifiedObservation({ force });
  return NextResponse.json(observation, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
