import type { ZafNetworkScope } from "@/lib/zaf/network-scope";
import { ensureZafSchema, getZafDb, isZafDatabaseConfigured } from "@/lib/zaf/db";

export type ObservationHistoryRecord = {
  generatedAt: string;
  networkScope: ZafNetworkScope;
  freshnessState: "fresh" | "aging" | "stale" | "unknown";
  confidenceScore: number | null;
  networkLedger: string | null;
  protocolVersion: number | null;
  observedTransactions: number | null;
  observedOperations: number | null;
  dailyTransactions: number | null;
  dailyOperations: number | null;
  observedApps: number | null;
  availableSources: number;
  totalSources: number;
};

export type RollingObservationBaseline = {
  generatedAt: string;
  dailyTransactions: number | null;
  dailyOperations: number | null;
  sampleCount: number;
  oldestGeneratedAt: string;
  newestGeneratedAt: string;
  windowMinutes: number;
};

export function isObservationHistoryConfigured() {
  return isZafDatabaseConfigured();
}

function bucketStart(value: string) {
  const date = new Date(value);
  return new Date(Math.floor(date.getTime() / 300000) * 300000).toISOString();
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export async function saveObservationSnapshot(record: ObservationHistoryRecord) {
  const sql = getZafDb();
  if (!sql) return false;
  try {
    if (!(await ensureZafSchema())) return false;
    await sql`
      INSERT INTO zaf_observation_snapshots
        (bucket_start, generated_at, network_scope, freshness_state, confidence_score, network_ledger, protocol_version, observed_transactions, observed_operations, daily_transactions, daily_operations, observed_apps, available_sources, total_sources)
      VALUES
        (${bucketStart(record.generatedAt)}, ${record.generatedAt}, ${record.networkScope}, ${record.freshnessState}, ${record.confidenceScore}, ${record.networkLedger}, ${record.protocolVersion}, ${record.observedTransactions}, ${record.observedOperations}, ${record.dailyTransactions}, ${record.dailyOperations}, ${record.observedApps}, ${record.availableSources}, ${record.totalSources})
      ON CONFLICT (bucket_start) DO UPDATE SET
        generated_at = EXCLUDED.generated_at,
        freshness_state = EXCLUDED.freshness_state,
        confidence_score = EXCLUDED.confidence_score,
        network_ledger = EXCLUDED.network_ledger,
        protocol_version = EXCLUDED.protocol_version,
        observed_transactions = EXCLUDED.observed_transactions,
        observed_operations = EXCLUDED.observed_operations,
        daily_transactions = EXCLUDED.daily_transactions,
        daily_operations = EXCLUDED.daily_operations,
        observed_apps = EXCLUDED.observed_apps,
        available_sources = EXCLUDED.available_sources,
        total_sources = EXCLUDED.total_sources
    `;
    return true;
  } catch (error) {
    console.error("[ZAF-TECH] Observation history write failed", error);
    return false;
  }
}

export async function getObservationHistory(limit = 336) {
  const sql = getZafDb();
  if (!sql) return [];
  try {
    if (!(await ensureZafSchema())) return [];
    const safeLimit = Math.min(Math.max(limit, 1), 1000);
    return await sql`
      SELECT
        bucket_start AS "bucketStart",
        generated_at AS "generatedAt",
        network_scope AS "networkScope",
        freshness_state AS "freshnessState",
        confidence_score AS "confidenceScore",
        network_ledger AS "networkLedger",
        protocol_version AS "protocolVersion",
        observed_transactions AS "observedTransactions",
        observed_operations AS "observedOperations",
        daily_transactions AS "dailyTransactions",
        daily_operations AS "dailyOperations",
        observed_apps AS "observedApps",
        available_sources AS "availableSources",
        total_sources AS "totalSources"
      FROM zaf_observation_snapshots
      ORDER BY generated_at DESC
      LIMIT ${safeLimit}
    `;
  } catch (error) {
    console.error("[ZAF-TECH] Observation history read failed", error);
    return [];
  }
}

export async function getPreviousObservation(beforeGeneratedAt: string, minAgeSeconds = 300) {
  const sql = getZafDb();
  if (!sql) return null;
  try {
    if (!(await ensureZafSchema())) return null;
    const cutoffMs = Date.parse(beforeGeneratedAt) - (minAgeSeconds * 1000);
    if (!Number.isFinite(cutoffMs)) return null;
    const cutoff = new Date(cutoffMs).toISOString();
    const rows = await sql`
      SELECT
        bucket_start AS "bucketStart",
        generated_at AS "generatedAt",
        network_scope AS "networkScope",
        freshness_state AS "freshnessState",
        confidence_score AS "confidenceScore",
        network_ledger AS "networkLedger",
        protocol_version AS "protocolVersion",
        observed_transactions AS "observedTransactions",
        observed_operations AS "observedOperations",
        daily_transactions AS "dailyTransactions",
        daily_operations AS "dailyOperations",
        observed_apps AS "observedApps",
        available_sources AS "availableSources",
        total_sources AS "totalSources"
      FROM zaf_observation_snapshots
      WHERE generated_at <= ${cutoff}
      ORDER BY generated_at DESC
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch (error) {
    console.error("[ZAF-TECH] Observation baseline read failed", error);
    return null;
  }
}

export async function getRollingObservationBaseline(beforeGeneratedAt: string, windowMinutes = 30, minAgeSeconds = 300, minPoints = 3) {
  const sql = getZafDb();
  if (!sql) return null;
  try {
    if (!(await ensureZafSchema())) return null;
    const generatedAtMs = Date.parse(beforeGeneratedAt);
    if (!Number.isFinite(generatedAtMs)) return null;

    const cutoff = new Date(generatedAtMs - (minAgeSeconds * 1000)).toISOString();
    const eligibleWindowMs = (windowMinutes * 60 * 1000) + (minAgeSeconds * 1000);
    const windowStart = new Date(generatedAtMs - eligibleWindowMs).toISOString();
    const safeMinPoints = Math.max(1, Math.floor(minPoints));
    const rows = await sql`
      SELECT
        generated_at AS "generatedAt",
        daily_transactions AS "dailyTransactions",
        daily_operations AS "dailyOperations"
      FROM zaf_observation_snapshots
      WHERE generated_at <= ${cutoff}
        AND generated_at >= ${windowStart}
      ORDER BY generated_at DESC
      LIMIT 12
    `;

    if (rows.length < safeMinPoints) return null;

    const transactionValues = rows
      .map(row => typeof row.dailyTransactions === "number" ? row.dailyTransactions : Number(row.dailyTransactions))
      .filter((value): value is number => Number.isFinite(value));
    const operationValues = rows
      .map(row => typeof row.dailyOperations === "number" ? row.dailyOperations : Number(row.dailyOperations))
      .filter((value): value is number => Number.isFinite(value));

    return {
      generatedAt: rows[0].generatedAt,
      dailyTransactions: median(transactionValues),
      dailyOperations: median(operationValues),
      sampleCount: rows.length,
      oldestGeneratedAt: rows[rows.length - 1].generatedAt,
      newestGeneratedAt: rows[0].generatedAt,
      windowMinutes,
    };
  } catch (error) {
    console.error("[ZAF-TECH] Rolling observation baseline read failed", error);
    return null;
  }
}
