import postgres from "postgres";
import type { DefiObservation } from "@/lib/zaf/defi-observation";

export type DefiHistorySnapshot = {
  generatedAt: string;
  pools: number;
  trades: number;
  pairs: number;
  distinctAssets: number;
  poolIds: string[];
  pairKeys: string[];
};

export type DefiChangeAlert = {
  id: string;
  severity: "info" | "attention";
  type: "new-pool" | "new-pair" | "pool-count-change" | "trade-count-change" | "asset-count-change";
  title: string;
  detail: string;
  detailTr: string;
  current: number | string | null;
  previous: number | string | null;
};

function getClient() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return postgres(url, { max: 2, prepare: false });
}

export function isDefiHistoryConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

async function ensureTable(sql: ReturnType<typeof postgres>) {
  await sql.unsafe("CREATE TABLE IF NOT EXISTS zaf_defi_snapshots (id BIGSERIAL PRIMARY KEY, generated_at TIMESTAMPTZ NOT NULL, pools INTEGER NOT NULL, trades INTEGER NOT NULL, pairs INTEGER NOT NULL, distinct_assets INTEGER NOT NULL, pool_ids JSONB NOT NULL, pair_keys JSONB NOT NULL)");
  await sql.unsafe("CREATE INDEX IF NOT EXISTS zaf_defi_snapshots_generated_at_idx ON zaf_defi_snapshots (generated_at DESC)");
}

export function toDefiHistorySnapshot(observation: DefiObservation): DefiHistorySnapshot {
  return {
    generatedAt: observation.generatedAt,
    pools: observation.summary.pools,
    trades: observation.summary.trades,
    pairs: observation.summary.pairs,
    distinctAssets: observation.summary.distinctAssets,
    poolIds: observation.sources.liquidityPools.records.map(pool => pool.poolId),
    pairKeys: observation.pairActivity.map(pair => pair.pairKey),
  };
}

export async function getLatestDefiSnapshot(): Promise<DefiHistorySnapshot | null> {
  const sql = getClient();
  if (!sql) return null;
  try {
    await ensureTable(sql);
    const rows = await sql.unsafe('SELECT generated_at AS "generatedAt", pools, trades, pairs, distinct_assets AS "distinctAssets", pool_ids AS "poolIds", pair_keys AS "pairKeys" FROM zaf_defi_snapshots ORDER BY generated_at DESC LIMIT 1');
    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      generatedAt: String(row.generatedAt),
      pools: Number(row.pools),
      trades: Number(row.trades),
      pairs: Number(row.pairs),
      distinctAssets: Number(row.distinctAssets),
      poolIds: Array.isArray(row.poolIds) ? row.poolIds.map(String) : [],
      pairKeys: Array.isArray(row.pairKeys) ? row.pairKeys.map(String) : [],
    };
  } finally {
    await sql.end();
  }
}

export async function saveDefiSnapshot(snapshot: DefiHistorySnapshot) {
  const sql = getClient();
  if (!sql) return false;
  try {
    await ensureTable(sql);
    const latest = await sql.unsafe('SELECT generated_at AS "generatedAt" FROM zaf_defi_snapshots ORDER BY generated_at DESC LIMIT 1');
    const latestAt = latest[0]?.generatedAt ? new Date(String(latest[0].generatedAt)).getTime() : null;
    const currentAt = new Date(snapshot.generatedAt).getTime();
    if (latestAt != null && Number.isFinite(currentAt) && currentAt - latestAt < 300000) return false;
    await sql.unsafe('INSERT INTO zaf_defi_snapshots (generated_at, pools, trades, pairs, distinct_assets, pool_ids, pair_keys) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)', [snapshot.generatedAt, snapshot.pools, snapshot.trades, snapshot.pairs, snapshot.distinctAssets, JSON.stringify(snapshot.poolIds), JSON.stringify(snapshot.pairKeys)]);
    return true;
  } finally {
    await sql.end();
  }
}

export async function getDefiSnapshotHistory(limit = 50): Promise<DefiHistorySnapshot[]> {
  const sql = getClient();
  if (!sql) return [];
  try {
    await ensureTable(sql);
    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 200);
    const rows = await sql.unsafe('SELECT generated_at AS "generatedAt", pools, trades, pairs, distinct_assets AS "distinctAssets", pool_ids AS "poolIds", pair_keys AS "pairKeys" FROM zaf_defi_snapshots ORDER BY generated_at DESC LIMIT $1', [safeLimit]);
    return rows.map(row => ({
      generatedAt: String(row.generatedAt),
      pools: Number(row.pools),
      trades: Number(row.trades),
      pairs: Number(row.pairs),
      distinctAssets: Number(row.distinctAssets),
      poolIds: Array.isArray(row.poolIds) ? row.poolIds.map(String) : [],
      pairKeys: Array.isArray(row.pairKeys) ? row.pairKeys.map(String) : [],
    }));
  } finally {
    await sql.end();
  }
}

export function compareDefiSnapshots(current: DefiHistorySnapshot, previous: DefiHistorySnapshot | null): DefiChangeAlert[] {
  if (!previous) return [];
  const alerts: DefiChangeAlert[] = [];
  const newPools = current.poolIds.filter(id => !previous.poolIds.includes(id));
  const newPairs = current.pairKeys.filter(id => !previous.pairKeys.includes(id));
  if (newPools.length) alerts.push({ id: "new-pools", severity: "attention", type: "new-pool", title: newPools.length + " new liquidity pool" + (newPools.length === 1 ? "" : "s") + " observed", detail: newPools.length + " pool ID" + (newPools.length === 1 ? "" : "s") + " appeared since the previous stored observation.", detailTr: "Önceki kayıtlı gözleme göre " + newPools.length + " yeni likidite havuzu gözlemlendi.", current: newPools.length, previous: 0 });
  if (newPairs.length) alerts.push({ id: "new-pairs", severity: "attention", type: "new-pair", title: newPairs.length + " new trading pair" + (newPairs.length === 1 ? "" : "s") + " observed", detail: newPairs.length + " pair relationship appeared in the observed Testnet trade sample.", detailTr: "Gözlemlenen Testnet işlem örneğinde " + newPairs.length + " yeni parite ilişkisi ortaya çıktı.", current: newPairs.length, previous: 0 });
  if (current.pools !== previous.pools) alerts.push({ id: "pool-count", severity: "info", type: "pool-count-change", title: "Observed pool count changed", detail: "Observed pools changed from " + previous.pools + " to " + current.pools + ".", detailTr: "Gözlemlenen havuz sayısı " + previous.pools + " değerinden " + current.pools + " değerine değişti.", current: current.pools, previous: previous.pools });
  if (current.trades !== previous.trades) alerts.push({ id: "trade-count", severity: "info", type: "trade-count-change", title: "Observed trade count changed", detail: "Observed trade sample changed from " + previous.trades + " to " + current.trades + " records.", detailTr: "Gözlemlenen işlem örneği " + previous.trades + " kayıttan " + current.trades + " kayda değişti.", current: current.trades, previous: previous.trades });
  if (current.distinctAssets !== previous.distinctAssets) alerts.push({ id: "asset-count", severity: "info", type: "asset-count-change", title: "Observed DeFi asset count changed", detail: "Observed DeFi-linked assets changed from " + previous.distinctAssets + " to " + current.distinctAssets + ".", detailTr: "Gözlemlenen DeFi bağlantılı varlık sayısı " + previous.distinctAssets + " değerinden " + current.distinctAssets + " değerine değişti.", current: current.distinctAssets, previous: previous.distinctAssets });
  return alerts;
}
