import { NextRequest, NextResponse } from "next/server";
import { getDefiObservation } from "@/lib/zaf/defi-observation";
import { enforceRateLimit } from "@/lib/zaf/rate-limit";
import {
  compareDefiSnapshots,
  getLatestDefiSnapshot,
  isDefiHistoryConfigured,
  saveDefiSnapshot,
  toDefiHistorySnapshot,
} from "@/lib/zaf/defi-history";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const rateLimit = await enforceRateLimit(request, "defi", { limit: 20, windowMs: 60_000 });
  if (rateLimit) return rateLimit;

  const network = request.nextUrl.searchParams.get("network")?.trim().toLowerCase() ?? "testnet";
  if (network !== "testnet") {
    return NextResponse.json(
      { error: "Only Testnet DeFi observations are enabled in this phase.", networkScope: "unknown" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "100");
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 200) : 100;
  const observation = await getDefiObservation(safeLimit);
  const currentSnapshot = toDefiHistorySnapshot(observation);
  const configured = isDefiHistoryConfigured();
  // A failed source is unknown, not zero. Compare only complete observations
  // with the same canonical sample size, and never persist a partial sample.
  const snapshotEligible = observation.sources.liquidityPools.state !== "unavailable" && observation.sources.trades.state !== "unavailable" && safeLimit === 100;
  let previousSnapshot: Awaited<ReturnType<typeof getLatestDefiSnapshot>> = null;
  let historyError: string | null = null;
  let stored = false;
  if (configured && snapshotEligible) {
    try { previousSnapshot = await getLatestDefiSnapshot(); }
    catch { historyError = "Historical storage could not be refreshed. Live observations remain available."; }
    if (!historyError) {
      try { stored = await saveDefiSnapshot(currentSnapshot); }
      catch { historyError = "The current observation could not be stored. Live observations remain available."; }
    }
  }
  const comparisonAvailable = snapshotEligible && previousSnapshot != null;
  const alerts = comparisonAvailable ? compareDefiSnapshots(currentSnapshot, previousSnapshot) : [];

  return NextResponse.json({
    ...observation,
    history: {
      configured,
      previousObservedAt: previousSnapshot?.generatedAt ?? null,
      alerts,
      comparisonAvailable,
      snapshotEligible,
      stored,
      error: historyError,
    },
  }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
