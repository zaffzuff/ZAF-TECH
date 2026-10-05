import type { ZafWalletAsset, ZafWalletOperation, ZafWalletSnapshot, ZafWalletTransaction } from "./types";
import type { ZafNetworkScope } from "@/lib/zaf/network-scope";

const NETWORKS = {
  mainnet: { label: "Pi Mainnet" as const, base: "https://api.mainnet.minepi.com" },
  testnet: { label: "Pi Testnet" as const, base: "https://api.testnet.minepi.com" },
};

const HORIZON_TIMEOUT_MS = 10_000;
const ADDRESS_RE = /^G[A-Z2-7]{55}$/;

type HorizonResponse = Record<string, unknown>;
type HorizonRecord = Record<string, unknown>;

async function horizon(base: string, path: string): Promise<HorizonResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HORIZON_TIMEOUT_MS);

  try {
    const response = await fetch(`${base}${path}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        typeof body?.title === "string" ? body.title : `Pi Horizon request failed: ${response.status}`,
      );
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }

    return body as HorizonResponse;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Pi Horizon request timed out after 10 seconds");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function recordsFromPage(page: HorizonResponse): HorizonRecord[] {
  const embedded = page._embedded;
  if (!embedded || typeof embedded !== "object") return [];
  const records = (embedded as HorizonRecord).records;
  return Array.isArray(records)
    ? records.filter((record): record is HorizonRecord => Boolean(record) && typeof record === "object")
    : [];
}

function stringOrNull(value: unknown): string | null {
  return value == null ? null : String(value);
}

function stroopsToPi(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number / 10_000_000 : null;
}

function decimalPi(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function mapAssets(account: HorizonResponse, networkScope: "mainnet" | "testnet"): ZafWalletAsset[] {
  const balances = account.balances;
  if (!Array.isArray(balances)) return [];
  return balances
    .filter((item): item is HorizonRecord => Boolean(item) && typeof item === "object")
    .map((item) => {
      const isNative = item.asset_type === "native";
      return {
        networkScope,
        assetType: String(item.asset_type ?? "unknown"),
        assetCode: isNative ? null : stringOrNull(item.asset_code),
        assetIssuer: isNative ? null : stringOrNull(item.asset_issuer),
        balance: decimalPi(item.balance),
        isNative,
      };
    });
}

function nativeBalance(account: HorizonResponse): number | null {
  const balances = account.balances;
  if (!Array.isArray(balances)) return null;

  const native = balances.find(
    (item): item is HorizonRecord =>
      Boolean(item) && typeof item === "object" && item.asset_type === "native",
  );

  return native ? decimalPi(native.balance) : null;
}

function mapTransaction(raw: HorizonRecord): ZafWalletTransaction {
  const operationCount = Number(raw.operation_count);
  return {
    hash: String(raw.hash ?? raw.id ?? ""),
    ledger: stringOrNull(raw.ledger),
    createdAt: stringOrNull(raw.created_at),
    successful: typeof raw.successful === "boolean" ? raw.successful : null,
    sourceAccount: stringOrNull(raw.source_account),
    feePi: stroopsToPi(raw.fee_charged),
    operationCount: Number.isFinite(operationCount) ? operationCount : null,
    memo: stringOrNull(raw.memo),
  };
}

function mapOperation(raw: HorizonRecord): ZafWalletOperation {
  return {
    id: String(raw.id ?? ""),
    ledger: stringOrNull(raw.ledger),
    createdAt: stringOrNull(raw.created_at),
    type: String(raw.type ?? "unknown"),
    successful: typeof raw.transaction_successful === "boolean" ? raw.transaction_successful : null,
    sourceAccount: stringOrNull(raw.source_account),
    transactionHash: stringOrNull(raw.transaction_hash),
    amountPi: decimalPi(raw.amount),
    from: stringOrNull(raw.from),
    to: stringOrNull(raw.to),
  };
}

function unlockAt(predicate: unknown, createdAt: string | null): string | null {
  if (!predicate || typeof predicate !== "object") return null;
  const record = predicate as HorizonRecord;

  if (typeof record.abs_before === "string" && record.abs_before) return record.abs_before;

  const relativeSeconds = Number(record.rel_before);
  if (!Number.isFinite(relativeSeconds) || !createdAt) return null;

  const createdAtMs = Date.parse(createdAt);
  return Number.isFinite(createdAtMs)
    ? new Date(createdAtMs + relativeSeconds * 1000).toISOString()
    : null;
}

export async function getZafWallet(
  address: string,
  network: "mainnet" | "testnet" = "mainnet",
): Promise<ZafWalletSnapshot> {
  const normalized = address.trim().toUpperCase();
  const selected = NETWORKS[network];
  const networkScope: ZafNetworkScope = network;
  const generatedAt = new Date().toISOString();

  if (!ADDRESS_RE.test(normalized)) {
    throw new Error("Invalid Pi wallet address");
  }

  try {
    const results = await Promise.allSettled([
      horizon(selected.base, `/accounts/${encodeURIComponent(normalized)}`),
      horizon(selected.base, `/claimable_balances?claimant=${encodeURIComponent(normalized)}&limit=200&order=desc`),
      horizon(selected.base, `/accounts/${encodeURIComponent(normalized)}/transactions?order=desc&limit=20&include_failed=true`),
      horizon(selected.base, `/accounts/${encodeURIComponent(normalized)}/operations?order=desc&limit=20`),
    ]);

    const accountResult = results[0];
    const account = accountResult.status === "fulfilled" ? accountResult.value : null;
    if (!account) {
      const reason = accountResult.status === "rejected" ? accountResult.reason : null;
      const status = reason instanceof Error && "status" in reason ? Number((reason as Error & { status?: number }).status) : null;
      if (status === 404) {
        return {
          address: normalized,
          network: selected.label,
          networkScope,
          assets: [],
          exists: false,
          accountBalancePi: null,
          observableClaimablePi: null,
          lockup: null,
          account: null,
          lastActivity: null,
          transactions: [],
          operations: [],
          source: `${selected.label} Horizon`,
          generatedAt,
          error: null,
        };
      }
      throw reason instanceof Error ? reason : new Error("Pi wallet account request failed");
    }

    const claimablePage = results[1].status === "fulfilled" ? results[1].value : null;
    const transactionPage = results[2].status === "fulfilled" ? results[2].value : null;
    const operationPage = results[3].status === "fulfilled" ? results[3].value : null;

    const transactions = transactionPage ? recordsFromPage(transactionPage).map(mapTransaction) : [];
    const operations = operationPage ? recordsFromPage(operationPage).map(mapOperation) : [];

    const lockups = (claimablePage ? recordsFromPage(claimablePage) : [])
      .filter((record) => record.asset === "native" || record.asset_type === "native")
      .map((record) => {
        const createdAt = stringOrNull(record.created_at);
        const predicate = record.predicate ?? null;
        const unlockAtValue = unlockAt(predicate, createdAt);
        return {
          id: String(record.id ?? record.balance_id ?? ""),
          amountPi: decimalPi(record.amount) ?? 0,
          claimants: Array.isArray(record.claimants)
            ? record.claimants.map((claimant) =>
                claimant && typeof claimant === "object"
                  ? String((claimant as HorizonRecord).destination ?? "")
                  : String(claimant ?? ""),
              )
            : [],
          canClaimNow: unlockAtValue ? Date.now() >= Date.parse(unlockAtValue) : false,
          createdAt,
          unlockAt: unlockAtValue,
          predicate,
        };
      });

    const assets = mapAssets(account, networkScope);
    const totalBalancePi = nativeBalance(account);
    const observableClaimablePi = lockups.reduce((sum, item) => sum + item.amountPi, 0);
    const timestamps = [
      ...transactions.map((item) => item.createdAt),
      ...operations.map((item) => item.createdAt),
    ]
      .filter((value): value is string => Boolean(value))
      .map(Date.parse)
      .filter(Number.isFinite);

    return {
      address: normalized,
      network: selected.label,
      networkScope,
      assets,
      exists: true,
      accountBalancePi: totalBalancePi,
      observableClaimablePi,
      lockup: {
        observableClaimablePi,
        items: lockups,
        note: "These are publicly observable native claimable balances. ZAF TECH does not infer private Pi lockup commitments from unavailable data.",
      },
      account: {
        sequence: stringOrNull(account.sequence),
        subentryCount: Number.isFinite(Number(account.subentry_count)) ? Number(account.subentry_count) : null,
        lastModifiedLedger: stringOrNull(account.last_modified_ledger),
      },
      lastActivity: timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null,
      transactions,
      operations,
      source: `${selected.label} Horizon`,
      generatedAt,
      error: null,
    };
  } catch (error) {
    const status = error instanceof Error && "status" in error
      ? Number((error as Error & { status?: number }).status)
      : null;

    return {
      address: normalized,
      network: selected.label,
      networkScope,
      assets: [],
      exists: status !== 404 ? null : false,
      accountBalancePi: null,
      observableClaimablePi: null,
      lockup: null,
      account: null,
      lastActivity: null,
      transactions: [],
      operations: [],
      source: `${selected.label} Horizon`,
      generatedAt,
      error: error instanceof Error ? error.message : "Pi wallet request failed",
    };
  }
}
