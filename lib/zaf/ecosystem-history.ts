import postgres from "postgres";

export type EcosystemSnapshotRecord = {
  generatedAt: string;
  sourceAvailable: boolean;
  observedAppCount: number | null;
  payload: Record<string, unknown>;
};

function getClient() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return postgres(url, { max: 2, prepare: false });
}

export function isEcosystemHistoryConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

async function ensureTable(sql: ReturnType<typeof postgres>) {
  await sql`
    CREATE TABLE IF NOT EXISTS zaf_ecosystem_snapshots (
      id BIGSERIAL PRIMARY KEY,
      generated_at TIMESTAMPTZ NOT NULL,
      source_available BOOLEAN NOT NULL,
      observed_app_count INTEGER NULL,
      payload JSONB NOT NULL
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS zaf_ecosystem_snapshots_generated_at_idx
    ON zaf_ecosystem_snapshots (generated_at DESC)
  `;
}

export async function saveEcosystemSnapshot(record: EcosystemSnapshotRecord) {
  const sql = getClient();
  if (!sql) return false;

  try {
    await ensureTable(sql);

    const latest = await sql`
      SELECT generated_at AS "generatedAt"
      FROM zaf_ecosystem_snapshots
      ORDER BY generated_at DESC
      LIMIT 1
    `;

    const latestAt = latest[0]?.generatedAt ? new Date(latest[0].generatedAt).getTime() : null;
    const currentAt = new Date(record.generatedAt).getTime();

    if (latestAt != null && Number.isFinite(currentAt) && currentAt - latestAt < 300000) {
      return false;
    }

    await sql`
      INSERT INTO zaf_ecosystem_snapshots
        (generated_at, source_available, observed_app_count, payload)
      VALUES
        (${record.generatedAt}, ${record.sourceAvailable}, ${record.observedAppCount}, ${JSON.stringify(record.payload)}::jsonb)
    `;
    return true;
  } catch {
    return false;
  } finally {
    await sql.end();
  }
}

export async function getEcosystemSnapshotHistory(limit = 50) {
  const sql = getClient();
  if (!sql) return [];

  try {
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    return await sql`
      SELECT id, generated_at AS "generatedAt",
        source_available AS "sourceAvailable",
        observed_app_count AS "observedAppCount",
        payload
      FROM zaf_ecosystem_snapshots
      ORDER BY generated_at DESC
      LIMIT ${safeLimit}
    `;
  } finally {
    await sql.end();
  }
}
