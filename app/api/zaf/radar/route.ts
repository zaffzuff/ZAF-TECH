import { NextResponse } from "next/server";
import { getUnifiedObservation } from "@/lib/zaf/observation-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const observation = await getUnifiedObservation();
  const state = observation.network?.intelligence.activityState ?? "insufficient-data";
  const changes = observation.network?.intelligence;
  return NextResponse.json({
    generatedAt: observation.generatedAt,
    activityState: state,
    dailyTransactions: observation.network?.metrics.observedTransactionsPerDay ?? null,
    dailyOperations: observation.network?.metrics.observedOperationsPerDay ?? null,
    confidence: observation.confidence,
    health: observation.health,
    sourceCoverage: {
      available: observation.ecosystem?.sources.filter(source => source.status === "available").length ?? 0,
      total: observation.ecosystem?.sources.length ?? 0,
    },
    changes: {
      transactionPercent: changes?.transactionChangePercent ?? null,
      operationPercent: changes?.operationChangePercent ?? null,
    },
  }, {
    headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" },
  });
}
