import { NextRequest, NextResponse } from "next/server";
import { getLaunchpadObservation } from "@/lib/zaf/launchpad-observation";
import { enforceRateLimit } from "@/lib/zaf/rate-limit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const rateLimit = await enforceRateLimit(request, "launchpad", { limit: 30, windowMs: 60_000 });
  if (rateLimit) return rateLimit;

  const network = request.nextUrl.searchParams.get("network")?.trim().toLowerCase() ?? "testnet";
  if (network !== "testnet") {
    return NextResponse.json(
      { error: "Only Testnet Launchpad observations are enabled in this phase.", networkScope: "unknown" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(getLaunchpadObservation(), {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
