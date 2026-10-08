
import { ensureZafSchema, getZafDb, isZafDatabaseConfigured } from "@/lib/zaf/db";

export type EcosystemSnapshotRecord = {
  generatedAt: string;
  sourceAvailable: boolean;
  observedAppCount: number | null;
  payload: Record<string, unknown>;
};

export function isEcosystemHistoryConfigured() {
  return isZafDatabaseConfigured();
}

export async function saveEcosystemSnapshot(record: EcosystemSnapshotRecord) {
  const sql = getZafDb();
  if (!sql) return false;

  try {
    if (!(await ensureZafSchema())) return false;

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
  }
}

export async function getEcosystemSnapshotHistory(limit = 50) {
  const sql = getZafDb();
  if (!sql) return [];

  try {
    if (!(await ensureZafSchema())) return [];
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
  }
}
