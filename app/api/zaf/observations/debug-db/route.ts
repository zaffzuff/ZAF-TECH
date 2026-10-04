import { NextResponse } from "next/server";
import postgres from "postgres";
import { getUnifiedObservation } from "@/lib/zaf/observation-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.DATABASE_URL;
  if (!url) return NextResponse.json({ configured: false });

  const observation = await getUnifiedObservation({ force: true });
  const value = observation.network;
  const ecosystem = observation.ecosystem;
  const record = {
    generatedAt: observation.generatedAt,
    freshnessState: observation.freshness.state,
    confidenceScore: observation.confidence.score,
    networkLedger: value?.latestLedger?.sequence ?? null,
    protocolVersion: value?.metrics.latestProtocolVersion ?? null,
    observedTransactions: value?.metrics.recentTransactions ?? null,
    observedOperations: value?.metrics.recentOperations ?? null,
    dailyTransactions: value?.metrics.observedTransactionsPerDay ?? null,
    dailyOperations: value?.metrics.observedOperationsPerDay ?? null,
    observedApps: ecosystem?.apps.totalCount ?? null,
    availableSources: ecosystem?.sources.filter((source) => source.status === "available").length ?? 0,
    totalSources: ecosystem?.sources.length ?? 0,
  };

  const sql = postgres(url, { max: 1, prepare: false });
  let directWrite: { ok: boolean; error: string | null } = { ok: false, error: null };
  try {
    const date = new Date(record.generatedAt);
    const bucketStart = new Date(Math.floor(date.getTime() / 300000) * 300000).toISOString();
    await sql.unsafe(
      "INSERT INTO zaf_observation_snapshots " +
      "(bucket_start, generated_at, freshness_state, confidence_score, network_ledger, protocol_version, observed_transactions, observed_operations, daily_transactions, daily_operations, observed_apps, available_sources, total_sources) " +
      "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) " +
      "ON CONFLICT (bucket_start) DO UPDATE SET generated_at=EXCLUDED.generated_at, freshness_state=EXCLUDED.freshness_state, confidence_score=EXCLUDED.confidence_score, network_ledger=EXCLUDED.network_ledger, protocol_version=EXCLUDED.protocol_version, observed_transactions=EXCLUDED.observed_transactions, observed_operations=EXCLUDED.observed_operations, daily_transactions=EXCLUDED.daily_transactions, daily_operations=EXCLUDED.daily_operations, observed_apps=EXCLUDED.observed_apps, available_sources=EXCLUDED.available_sources, total_sources=EXCLUDED.total_sources",
      [bucketStart, record.generatedAt, record.freshnessState, record.confidenceScore, record.networkLedger, record.protocolVersion, record.observedTransactions, record.observedOperations, record.dailyTransactions, record.dailyOperations, record.observedApps, record.availableSources, record.totalSources]
    );
    directWrite = { ok: true, error: null };
  } catch (error) {
    directWrite = { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  try {
    const rows = await sql.unsafe('SELECT count(*)::int AS "count", max(generated_at) AS "newest" FROM zaf_observation_snapshots');
    return NextResponse.json({
      configured: true,
      observation: {
        generatedAt: observation.generatedAt,
        freshnessState: observation.freshness.state,
        confidenceScore: observation.confidence.score,
        networkError: value?.error ?? null,
      },
      record,
      directWrite,
      rowCount: rows[0]?.count ?? 0,
      newestGeneratedAt: rows[0]?.newest ?? null,
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } finally {
    await sql.end();
  }
}
