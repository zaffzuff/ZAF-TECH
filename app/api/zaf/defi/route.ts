import { NextRequest, NextResponse } from "next/server";
import { getDefiObservation } from "@/lib/zaf/defi-observation";
import {
  compareDefiSnapshots,
  getLatestDefiSnapshot,
  isDefiHistoryConfigured,
  toDefiHistorySnapshot,
} from "@/lib/zaf/defi-history";

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
  const observation = await getDefiObservation(Number.isFinite(limit) ? limit : 100);
  const currentSnapshot = toDefiHistorySnapshot(observation);
  const previousSnapshot = isDefiHistoryConfigured() ? await getLatestDefiSnapshot() : null;
  const alerts = compareDefiSnapshots(currentSnapshot, previousSnapshot);
  return NextResponse.json({
    ...observation,
    history: {
      configured: isDefiHistoryConfigured(),
      previousObservedAt: previousSnapshot?.generatedAt ?? null,
      alerts,
    },
  }, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
