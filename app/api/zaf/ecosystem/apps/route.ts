import { NextResponse } from "next/server";
import { getEcosystemAppObservations } from "@/lib/zaf/ecosystem-app-observations";
import { enforceRateLimit } from "@/lib/zaf/rate-limit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const rateLimit = await enforceRateLimit(request, "ecosystem-apps", { limit: 60, windowMs: 60_000 });
  if (rateLimit) return rateLimit;

  const data = await getEcosystemAppObservations(200);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
