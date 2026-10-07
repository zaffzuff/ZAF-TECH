import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/zaf/rate-limit";
import { getZafHistoricalActivity } from "@/lib/zaf/history-client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rate = rateLimit(request, { prefix: "zaf-history", limit: 30, windowMs: 60_000 });
  if (!rate.allowed) return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, {
    status: 429,
    headers: { "Cache-Control": "no-store", "Retry-After": String(rate.retryAfterSeconds) },
  });
  const history = await getZafHistoricalActivity();
  return NextResponse.json(history, {
    headers: {
      "Cache-Control": "public, max-age=900, stale-while-revalidate=3600",
      "X-RateLimit-Limit": "30",
      "X-RateLimit-Remaining": String(rate.remaining),
    },
  });
}
