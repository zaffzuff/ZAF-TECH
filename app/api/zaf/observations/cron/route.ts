import { NextResponse } from "next/server";
import { getUnifiedObservation } from "@/lib/zaf/observation-engine";
import { saveObservationSnapshot } from "@/lib/zaf/observation-history";
import type { ObservationHistoryRecord } from "@/lib/zaf/observation-history";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const observation = await getUnifiedObservation({ force: true });
  const network = observation.network;
  const ecosystem = observation.ecosystem;
  const record: ObservationHistoryRecord = {
    generatedAt: observation.generatedAt,
    networkScope: "mainnet",
    freshnessState: observation.freshness.state,
    confidenceScore: observation.confidence.score,
    networkLedger: network?.latestLedger?.sequence ?? null,
    protocolVersion: network?.metrics.latestProtocolVersion ?? null,
    observedTransactions: network?.metrics.recentTransactions ?? null,
    observedOperations: network?.metrics.recentOperations ?? null,
    dailyTransactions: network?.metrics.observedTransactionsPerDay ?? null,
    dailyOperations: network?.metrics.observedOperationsPerDay ?? null,
    observedApps: ecosystem?.apps.totalCount ?? null,
    availableSources: ecosystem?.sources.filter(source => source.status === "available").length ?? 0,
    totalSources: ecosystem?.sources.length ?? 0,
  };

  const saved = await saveObservationSnapshot(record);

  return NextResponse.json(
    { ok: saved, generatedAt: observation.generatedAt },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
