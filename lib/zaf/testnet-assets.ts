import type { ZafNetworkScope } from "@/lib/zaf/network-scope";

const NETWORKS = { testnet: "https://api.testnet.minepi.com" } as const;
const TIMEOUT_MS = 10_000;

export type ZafAssetObservation = {
  networkScope: ZafNetworkScope;
  assetType: string;
  assetCode: string;
  assetIssuer: string | null;
  amount: number | null;
  numAccounts: number | null;
  numTrades: number | null;
  numLiquidityPools: number | null;
  numClaimableBalances: number | null;
  createdAt: string | null;
  tomlUrl: string | null;
};

function recordsFromPage(body: Record<string, unknown>) {
  const embedded = body._embedded;
  if (!embedded || typeof embedded !== "object") return [];
  const records = (embedded as Record<string, unknown>).records;
  return Array.isArray(records) ? records.filter((record): record is Record<string, unknown> => Boolean(record) && typeof record === "object") : [];
}
function numberOrNull(value: unknown) { const n = Number(value); return Number.isFinite(n) ? n : null; }
function stringOrNull(value: unknown) { return value == null ? null : String(value); }

async function fetchAssets(limit: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(NETWORKS.testnet + "/assets?limit=" + limit + "&order=desc", { cache: "no-store", headers: { Accept: "application/json" }, signal: controller.signal });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof body?.title === "string" ? body.title : "Pi Testnet assets request failed: " + response.status);
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("Pi Testnet assets request timed out after 10 seconds");
    throw error;
  } finally { clearTimeout(timeout); }
}

export async function getTestnetAssets(limit = 100) {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 200);
  try {
    const body = await fetchAssets(safeLimit);
    const generatedAt = new Date().toISOString();
    const assets = recordsFromPage(body).map((record): ZafAssetObservation => {
      const links = record._links && typeof record._links === "object" ? record._links as Record<string, unknown> : {};
      const toml = links.toml && typeof links.toml === "object" ? links.toml as Record<string, unknown> : {};
      return { networkScope: "testnet", assetType: stringOrNull(record.asset_type) ?? "unknown", assetCode: stringOrNull(record.asset_code) ?? "—", assetIssuer: stringOrNull(record.asset_issuer), amount: numberOrNull(record.amount), numAccounts: numberOrNull(record.num_accounts), numTrades: numberOrNull(record.num_trades), numLiquidityPools: numberOrNull(record.num_liquidity_pools), numClaimableBalances: numberOrNull(record.num_claimable_balances), createdAt: stringOrNull(record.created_at), tomlUrl: stringOrNull(toml.href) };
    });
    return { generatedAt, networkScope: "testnet" as const, source: NETWORKS.testnet + "/assets", available: true, count: assets.length, assets, note: "Public Testnet asset observations returned by Pi Horizon.", error: null };
  } catch (error) {
    return { generatedAt: new Date().toISOString(), networkScope: "testnet" as const, source: NETWORKS.testnet + "/assets", available: false, count: 0, assets: [] as ZafAssetObservation[], note: "The Testnet asset source was not available for observation.", error: error instanceof Error ? error.message : "Unknown Pi Testnet asset error" };
  }
}