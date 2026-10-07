
import { NextRequest, NextResponse } from "next/server";
import { getLaunchpadObservation } from "@/lib/zaf/launchpad-observation";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET(request: NextRequest) {
  const network = request.nextUrl.searchParams.get("network")?.trim().toLowerCase() ?? "testnet";
  if (network !== "testnet") {
    return NextResponse.json(
      { error: "Only Testnet Launchpad observations are enabled in this phase.", networkScope: "unknown" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(getLaunchpadObservation(), {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800" },
  });
}
