import { NextRequest, NextResponse } from "next/server";
import { getDefiObservation } from "@/lib/zaf/defi-observation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const network = request.nextUrl.searchParams.get("network")?.trim().toLowerCase() ?? "testnet";
  if (network !== "testnet") {
    return NextResponse.json(
      { error: "Only Testnet DeFi observations are enabled in this phase.", networkScope: "unknown" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "100");
  return NextResponse.json(await getDefiObservation(Number.isFinite(limit) ? limit : 100), {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
