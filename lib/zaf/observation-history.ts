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
  await sql.unsafe(
    "CREATE TABLE IF NOT EXISTS zaf_observation_snapshots (" +
    "id BIGSERIAL PRIMARY KEY, bucket_start TIMESTAMPTZ NOT NULL UNIQUE, generated_at TIMESTAMPTZ NOT NULL, " +
    "freshness_state TEXT NOT NULL, confidence_score NUMERIC NULL, network_ledger TEXT NULL, protocol_version INTEGER NULL, " +
    "observed_transactions INTEGER NULL, observed_operations INTEGER NULL, daily_transactions INTEGER NULL, daily_operations INTEGER NULL, " +
    "observed_apps INTEGER NULL, available_sources INTEGER NOT NULL, total_sources INTEGER NOT NULL)"
  );
  await sql.unsafe("CREATE INDEX IF NOT EXISTS zaf_observation_snapshots_generated_at_idx ON zaf_observation_snapshots (generated_at DESC)");
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
    await sql.unsafe(
      "INSERT INTO zaf_observation_snapshots " +
      "(bucket_start, generated_at, freshness_state, confidence_score, network_ledger, protocol_version, observed_transactions, observed_operations, daily_transactions, daily_operations, observed_apps, available_sources, total_sources) " +
      "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) " +
      "ON CONFLICT (bucket_start) DO UPDATE SET generated_at=EXCLUDED.generated_at, freshness_state=EXCLUDED.freshness_state, confidence_score=EXCLUDED.confidence_score, network_ledger=EXCLUDED.network_ledger, protocol_version=EXCLUDED.protocol_version, observed_transactions=EXCLUDED.observed_transactions, observed_operations=EXCLUDED.observed_operations, daily_transactions=EXCLUDED.daily_transactions, daily_operations=EXCLUDED.daily_operations, observed_apps=EXCLUDED.observed_apps, available_sources=EXCLUDED.available_sources, total_sources=EXCLUDED.total_sources",
      [bucketStart(record.generatedAt), record.generatedAt, record.freshnessState, record.confidenceScore, record.networkLedger, record.protocolVersion, record.observedTransactions, record.observedOperations, record.dailyTransactions, record.dailyOperations, record.observedApps, record.availableSources, record.totalSources]
    );
    return true;
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
    return await sql.unsafe(
      "SELECT bucket_start AS \"bucketStart\", generated_at AS \"generatedAt\", freshness_state AS \"freshnessState\", confidence_score AS \"confidenceScore\", network_ledger AS \"networkLedger\", protocol_version AS \"protocolVersion\", observed_transactions AS \"observedTransactions\", observed_operations AS \"observedOperations\", daily_transactions AS \"dailyTransactions\", daily_operations AS \"dailyOperations\", observed_apps AS \"observedApps\", available_sources AS \"availableSources\", total_sources AS \"totalSources\" FROM zaf_observation_snapshots ORDER BY generated_at DESC LIMIT $1",
      [safeLimit]
    );
  } finally {
    await sql.end();
  }
}
