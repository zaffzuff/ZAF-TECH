import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/zaf/rate-limit";
import { getUnifiedObservation } from "@/lib/zaf/observation-engine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const rate = rateLimit(request, { prefix: "zaf-ecosystem", limit: 60, windowMs: 60_000 });
  if (!rate.allowed) return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(rate.retryAfterSeconds) } });
  const observation = await getUnifiedObservation();
  return NextResponse.json(observation.ecosystem, {
    headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60", "X-RateLimit-Limit": "60", "X-RateLimit-Remaining": String(rate.remaining) },
  });
}
