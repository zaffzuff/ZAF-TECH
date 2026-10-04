import postgres from "postgres";

export type ObservationHistoryRecord = {
  generatedAt: string;
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

function getClient() {
  const url = process.env.DATABASE_URL;
  return url ? postgres(url, { max: 2, prepare: false }) : null;
}

export function isObservationHistoryConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

async function ensureTable(sql: ReturnType<typeof postgres>) {
  await sql`
    CREATE TABLE IF NOT EXISTS zaf_observation_snapshots (
      id BIGSERIAL PRIMARY KEY,
      bucket_start TIMESTAMPTZ NOT NULL UNIQUE,
      generated_at TIMESTAMPTZ NOT NULL,
      freshness_state TEXT NOT NULL,
      confidence_score NUMERIC NULL,
      network_ledger TEXT NULL,
      protocol_version INTEGER NULL,
      observed_transactions INTEGER NULL,
      observed_operations INTEGER NULL,
      daily_transactions INTEGER NULL,
      daily_operations INTEGER NULL,
      observed_apps INTEGER NULL,
      available_sources INTEGER NOT NULL,
      total_sources INTEGER NOT NULL
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS zaf_observation_snapshots_generated_at_idx
    ON zaf_observation_snapshots (generated_at DESC)
  `;
  await sql.unsafe(
    "ALTER TABLE zaf_observation_snapshots " +
    "ALTER COLUMN daily_transactions TYPE DOUBLE PRECISION USING daily_transactions::double precision, " +
    "ALTER COLUMN daily_operations TYPE DOUBLE PRECISION USING daily_operations::double precision"
  );
}

function bucketStart(value: string) {
  const date = new Date(value);
  return new Date(Math.floor(date.getTime() / 300000) * 300000).toISOString();
}

export async function saveObservationSnapshot(record: ObservationHistoryRecord) {
  const sql = getClient();
  if (!sql) return false;
  try {
    await ensureTable(sql);
    await sql`
      INSERT INTO zaf_observation_snapshots
        (bucket_start, generated_at, freshness_state, confidence_score, network_ledger, protocol_version, observed_transactions, observed_operations, daily_transactions, daily_operations, observed_apps, available_sources, total_sources)
      VALUES
        (${bucketStart(record.generatedAt)}, ${record.generatedAt}, ${record.freshnessState}, ${record.confidenceScore}, ${record.networkLedger}, ${record.protocolVersion}, ${record.observedTransactions}, ${record.observedOperations}, ${record.dailyTransactions}, ${record.dailyOperations}, ${record.observedApps}, ${record.availableSources}, ${record.totalSources})
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
  } finally {
    await sql.end();
  }
}

export async function getObservationHistory(limit = 336) {
  const sql = getClient();
  if (!sql) return [];
  try {
    await ensureTable(sql);
    const safeLimit = Math.min(Math.max(limit, 1), 1000);
    return await sql`
      SELECT
        bucket_start AS "bucketStart",
        generated_at AS "generatedAt",
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
  } finally {
    await sql.end();
  }
}

export async function getPreviousObservation(beforeGeneratedAt: string, minAgeSeconds = 300) {
  const sql = getClient();
  if (!sql) return null;
  try {
    await ensureTable(sql);
    const cutoffMs = Date.parse(beforeGeneratedAt) - (minAgeSeconds * 1000);
    if (!Number.isFinite(cutoffMs)) return null;
    const cutoff = new Date(cutoffMs).toISOString();
    const rows = await sql`
      SELECT
        bucket_start AS "bucketStart",
        generated_at AS "generatedAt",
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
  } finally {
    await sql.end();
  }
}
