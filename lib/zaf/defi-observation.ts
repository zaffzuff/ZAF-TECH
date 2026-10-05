import type { ZafNetworkScope } from "@/lib/zaf/network-scope";

const NETWORK_BASE = "https://api.testnet.minepi.com";
const TIMEOUT_MS = 10_000;

export type DefiSourceState = "observed" | "empty" | "unavailable";

export type DefiAssetRef = {
  assetType: string | null;
  assetCode: string | null;
  issuer: string | null;
  label: string;
};

export type DefiPoolObservation = {
  networkScope: "testnet";
  poolId: string;
  feeBp: number | null;
  totalShares: number | null;
  reserves: Array<{ asset: DefiAssetRef; amount: number | null }>;
  observedTrades: number;
  lastModifiedLedger: string | null;
};

export type DefiTradeObservation = {
  networkScope: "testnet";
  id: string;
  ledgerCloseTime: string | null;
  tradeType: string | null;
  base: { asset: DefiAssetRef; amount: number | null; poolId: string | null; offerId: string | null };
  counter: { asset: DefiAssetRef; amount: number | null; poolId: string | null; offerId: string | null };
  price: number | null;
};

export type DefiPairObservation = {
  networkScope: "testnet";
  pairKey: string;
  base: DefiAssetRef;
  counter: DefiAssetRef;
  trades: number;
  baseAmount: number;
  counterAmount: number;
  liquidityPoolTrades: number;
  orderbookTrades: number;
  latestCloseTime: string | null;
};

type EndpointResult<T> = {
  state: DefiSourceState;
  source: string;
  count: number;
  records: T[];
  error: string | null;
};

function recordsFromPage(body: Record<string, unknown>) {
  const embedded = body._embedded;
  if (!embedded || typeof embedded !== "object") return [];
  const records = (embedded as Record<string, unknown>).records;
  return Array.isArray(records)
    ? records.filter((record): record is Record<string, unknown> => Boolean(record) && typeof record === "object")
    : [];
}

function numberOrNull(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function stringOrNull(value: unknown) {
  return value == null ? null : String(value);
}

function assetLabel(record: Record<string, unknown>, prefix = "") {
  const type = stringOrNull(record[prefix + "asset_type"]);
  const code = stringOrNull(record[prefix + "asset_code"]);
  const issuer = stringOrNull(record[prefix + "asset_issuer"]);
  if (type === "native") return "Pi";
  if (code && issuer) return code + " (" + issuer.slice(0, 8) + "…)";
  return code ?? type ?? "Unknown asset";
}

function assetRef(record: Record<string, unknown>, prefix = ""): DefiAssetRef {
  return {
    assetType: stringOrNull(record[prefix + "asset_type"]),
    assetCode: stringOrNull(record[prefix + "asset_code"]),
    issuer: stringOrNull(record[prefix + "asset_issuer"]),
    label: assetLabel(record, prefix),
  };
}

function reserveAssetRef(value: unknown): DefiAssetRef {
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw || raw === "native") return {
      assetType: raw === "native" ? "native" : null,
      assetCode: null,
      issuer: null,
      label: raw === "native" ? "Pi" : "Unknown asset",
    };
    const separator = raw.indexOf(":");
    if (separator > 0) {
      const code = raw.slice(0, separator);
      const issuer = raw.slice(separator + 1) || null;
      return {
        assetType: "credit_alphanum",
        assetCode: code,
        issuer,
        label: issuer ? code + " (" + issuer.slice(0, 8) + "…)" : code,
      };
    }
    return {
      assetType: "unknown",
      assetCode: raw,
      issuer: null,
      label: raw,
    };
  }

  if (value && typeof value === "object") {
    const asset = value as Record<string, unknown>;
    const assetType = stringOrNull(asset.asset_type);
    const assetCode = stringOrNull(asset.asset_code);
    const issuer = stringOrNull(asset.asset_issuer);
    return {
      assetType,
      assetCode,
      issuer,
      label: assetType === "native"
        ? "Pi"
        : assetCode && issuer
          ? assetCode + " (" + issuer.slice(0, 8) + "…)"
          : assetCode ?? assetType ?? "Unknown asset",
    };
  }

  return { assetType: null, assetCode: null, issuer: null, label: "Unknown asset" };
}

function assetKey(asset: DefiAssetRef) {
  return [asset.assetType, asset.assetCode, asset.issuer].join("|");
}

function pairKeyFor(base: DefiAssetRef, counter: DefiAssetRef) {
  const left = assetKey(base);
  const right = assetKey(counter);
  return left <= right ? left + "||" + right : right + "||" + left;
}

function createPairObservation(base: DefiAssetRef, counter: DefiAssetRef): DefiPairObservation {
  const ordered = assetKey(base) <= assetKey(counter)
    ? { base, counter }
    : { base: counter, counter: base };
  return {
    networkScope: "testnet",
    pairKey: pairKeyFor(base, counter),
    base: ordered.base,
    counter: ordered.counter,
    trades: 0,
    baseAmount: 0,
    counterAmount: 0,
    liquidityPoolTrades: 0,
    orderbookTrades: 0,
    latestCloseTime: null,
  };
}

async function fetchJson(path: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(NETWORK_BASE + path, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(typeof body?.title === "string" ? body.title : "Pi Testnet DeFi request failed: " + response.status);
    }
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Pi Testnet DeFi request timed out after 10 seconds");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function readPools(limit: number): Promise<EndpointResult<DefiPoolObservation>> {
  const source = NETWORK_BASE + "/liquidity_pools";
  try {
    const body = await fetchJson("/liquidity_pools?limit=" + limit + "&order=desc");
    const records = recordsFromPage(body).map((record): DefiPoolObservation => {
      const reserves = Array.isArray(record.reserves)
        ? record.reserves.filter((reserve): reserve is Record<string, unknown> => Boolean(reserve) && typeof reserve === "object").map((reserve) => {
            return {
              asset: reserveAssetRef(reserve.asset),
              amount: numberOrNull(reserve.amount),
            };
          })
        : [];
      return {
        networkScope: "testnet",
        poolId: String(record.id ?? record.pool_id ?? ""),
        feeBp: numberOrNull(record.fee_bp ?? record.fee_bp),
        totalShares: numberOrNull(record.total_shares),
        reserves,
        observedTrades: 0,
        lastModifiedLedger: stringOrNull(record.last_modified_ledger),
      };
    }).filter(pool => pool.poolId.length > 0);

    return {
      state: records.length ? "observed" : "empty",
      source,
      count: records.length,
      records,
      error: null,
    };
  } catch (error) {
    return {
      state: "unavailable",
      source,
      count: 0,
      records: [],
      error: error instanceof Error ? error.message : "Unknown liquidity pool source error",
    };
  }
}

async function readTrades(limit: number): Promise<EndpointResult<DefiTradeObservation>> {
  const source = NETWORK_BASE + "/trades";
  try {
    const body = await fetchJson("/trades?limit=" + limit + "&order=desc&trade_type=all");
    const records = recordsFromPage(body).map((record): DefiTradeObservation => {
      const priceRecord = record.price && typeof record.price === "object" ? record.price as Record<string, unknown> : null;
      const n = priceRecord ? Number(priceRecord.n) : NaN;
      const d = priceRecord ? Number(priceRecord.d) : NaN;
      return {
        networkScope: "testnet",
        id: String(record.id ?? ""),
        ledgerCloseTime: stringOrNull(record.ledger_close_time),
        tradeType: stringOrNull(record.trade_type),
        base: {
          asset: assetRef(record, "base_"),
          amount: numberOrNull(record.base_amount),
          poolId: stringOrNull(record.base_liquidity_pool_id),
          offerId: stringOrNull(record.base_offer_id),
        },
        counter: {
          asset: assetRef(record, "counter_"),
          amount: numberOrNull(record.counter_amount),
          poolId: stringOrNull(record.counter_liquidity_pool_id),
          offerId: stringOrNull(record.counter_offer_id),
        },
        price: Number.isFinite(n) && Number.isFinite(d) && d !== 0 ? n / d : null,
      };
    }).filter(trade => trade.id.length > 0);

    return {
      state: records.length ? "observed" : "empty",
      source,
      count: records.length,
      records,
      error: null,
    };
  } catch (error) {
    return {
      state: "unavailable",
      source,
      count: 0,
      records: [],
      error: error instanceof Error ? error.message : "Unknown trade source error",
    };
  }
}

export async function getDefiObservation(limit = 100) {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 200);
  const [pools, trades] = await Promise.all([readPools(safeLimit), readTrades(safeLimit)]);

  const tokenKeys = new Map<string, DefiAssetRef>();
  const pairKeys = new Map<string, DefiPairObservation>();
  const poolTradeCounts = new Map<string, number>();
  for (const pool of pools.records) {
    for (const reserve of pool.reserves) {
      tokenKeys.set(assetKey(reserve.asset), reserve.asset);
    }
  }
  for (const trade of trades.records) {
    for (const poolId of [trade.base.poolId, trade.counter.poolId]) {
      if (poolId) poolTradeCounts.set(poolId, (poolTradeCounts.get(poolId) ?? 0) + 1);
    }
    for (const asset of [trade.base.asset, trade.counter.asset]) {
      tokenKeys.set(assetKey(asset), asset);
    }

    if (trade.base.asset.label !== "Unknown asset" && trade.counter.asset.label !== "Unknown asset") {
      const key = pairKeyFor(trade.base.asset, trade.counter.asset);
      const pair = pairKeys.get(key) ?? createPairObservation(trade.base.asset, trade.counter.asset);
      const baseFirst = assetKey(trade.base.asset) <= assetKey(trade.counter.asset);
      const orderedBaseAmount = baseFirst ? trade.base.amount : trade.counter.amount;
      const orderedCounterAmount = baseFirst ? trade.counter.amount : trade.base.amount;
      pair.trades += 1;
      pair.baseAmount += orderedBaseAmount ?? 0;
      pair.counterAmount += orderedCounterAmount ?? 0;
      if (trade.tradeType === "liquidity_pool" || trade.tradeType?.includes("liquidity")) pair.liquidityPoolTrades += 1;
      else pair.orderbookTrades += 1;
      if (!pair.latestCloseTime || (trade.ledgerCloseTime && trade.ledgerCloseTime > pair.latestCloseTime)) {
        pair.latestCloseTime = trade.ledgerCloseTime;
      }
      pairKeys.set(key, pair);
    }
  }

  for (const pool of pools.records) {
    pool.observedTrades = poolTradeCounts.get(pool.poolId) ?? 0;
  }

  const pairActivity = [...pairKeys.values()].sort((a, b) =>
    b.trades - a.trades ||
    b.baseAmount - a.baseAmount ||
    b.counterAmount - a.counterAmount
  );

  const errors = [pools.error, trades.error].filter((value): value is string => Boolean(value));
  const availableCount = [pools.state, trades.state].filter(state => state !== "unavailable").length;
  const state = availableCount === 0
    ? "unavailable"
    : pools.count || trades.count
      ? "observed"
      : "empty";

  return {
    generatedAt: new Date().toISOString(),
    networkScope: "testnet" as const,
    sources: {
      liquidityPools: pools,
      trades,
    },
    summary: {
      pools: pools.count,
      trades: trades.count,
      pairs: pairActivity.length,
      distinctAssets: tokenKeys.size,
      state,
    },
    assets: [...tokenKeys.values()],
    pairActivity,
    notes: [
      "DEX/AMM observations are currently scoped to Pi Testnet public data.",
      "An unavailable endpoint is not treated as proof that the underlying blockchain feature does not exist.",
      "No market-cap, USD price, or network-wide volume is inferred without an observable source.",
    ],
    errors,
  };
}
