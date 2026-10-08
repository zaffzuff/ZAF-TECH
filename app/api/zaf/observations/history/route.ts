import { NextRequest, NextResponse } from "next/server";
import { getObservationHistory, isObservationHistoryConfigured } from "@/lib/zaf/observation-history";
import { enforceRateLimit } from "@/lib/zaf/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rateLimit = await enforceRateLimit(request, "observations-history", { limit: 60, windowMs: 60_000 });
  if (rateLimit) return rateLimit;

  const raw = Number(request.nextUrl.searchParams.get("limit") ?? "168");
  const limit = Number.isFinite(raw) ? Math.min(Math.max(Math.floor(raw), 1), 10000) : 168;
  const history = await getObservationHistory(limit);
  return NextResponse.json(
    { configured: isObservationHistoryConfigured(), count: history.length, points: history },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
