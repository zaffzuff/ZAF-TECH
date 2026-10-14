import { ensureZafSchema, getZafDb, isZafDatabaseConfigured } from "@/lib/zaf/db";
import type { EcosystemNewsItem, OfficialNewsMetadata } from "./official-news-parser";

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

  if (!(await ensureZafSchema())) return false;

  try {
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

  if (!(await ensureZafSchema())) return [];

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
  } catch {
    return [];
  }
}

export async function getLastSuccessfulOfficialNews() {
  const sql = getZafDb();
  if (!sql || !(await ensureZafSchema())) return null;
  try {
    const records = await sql`
      SELECT payload
      FROM zaf_ecosystem_snapshots
      WHERE payload->'newsMetadata'->>'lastSuccessfulAt' IS NOT NULL
        AND jsonb_array_length(COALESCE(payload->'news', '[]'::jsonb)) > 0
      ORDER BY generated_at DESC
      LIMIT 1
    `;
    const payload = records[0]?.payload as { news?: EcosystemNewsItem[]; newsMetadata?: OfficialNewsMetadata } | undefined;
    const metadata = payload?.newsMetadata;
    if (!Array.isArray(payload?.news) || !metadata?.lastSuccessfulAt) return null;
    return { items: payload.news, lastSuccessfulAt: metadata.lastSuccessfulAt, sourceUrl: metadata.sourceUrl, mode: metadata.mode };
  } catch { return null; }
}
