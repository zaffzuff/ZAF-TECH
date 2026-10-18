import type { ZafLedger } from "./types";

const BASE = "https://api.mainnet.minepi.com";
const HORIZON_TIMEOUT_MS = 10_000;
const PAGE_LIMIT = 200;

type HorizonRecord = Record<string, unknown>;
type HorizonResponse = {
  _embedded?: { records?: HorizonRecord[] };
  _links?: { next?: { href?: unknown } };
} & Record<string, unknown>;

async function horizon(path: string): Promise<HorizonResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HORIZON_TIMEOUT_MS);
  try {
    const response = await fetch(`${BASE}${path}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Pi Horizon request failed: ${response.status}`);
    return await response.json() as HorizonResponse;
  } finally {
    clearTimeout(timeout);
  }
}

function mapLedger(raw: HorizonRecord): ZafLedger {
  return {
    sequence: String(raw.sequence),
    hash: String(raw.hash ?? ""),
    closedAt: String(raw.closed_at ?? ""),
    transactionCount: raw.successful_transaction_count != null || raw.failed_transaction_count != null
      ? Number(raw.successful_transaction_count ?? 0) + Number(raw.failed_transaction_count ?? 0)
      : Number(raw.transaction_count ?? 0),
    operationCount: Number(raw.operation_count ?? 0),
    successfulTransactionCount: raw.successful_transaction_count == null ? null : Number(raw.successful_transaction_count),
    failedTransactionCount: raw.failed_transaction_count == null ? null : Number(raw.failed_transaction_count),
    successfulOperationCount: raw.successful_operation_count == null ? null : Number(raw.successful_operation_count),
    protocolVersion: raw.protocol_version == null ? null : Number(raw.protocol_version),
    baseFeePi: raw.base_fee_in_stroops == null ? null : Number(raw.base_fee_in_stroops) / 10_000_000,
  };
}

export interface HistoricalLedgerPage {
  ledgers: ZafLedger[];
  nextCursor: string | null;
  hasMore: boolean;
  fetchedAt: string;
}

export async function getHistoricalLedgerPage(cursor?: string | null, limit = PAGE_LIMIT): Promise<HistoricalLedgerPage> {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), PAGE_LIMIT);
  const params = new URLSearchParams({
    order: "desc",
    limit: String(safeLimit),
  });
  if (cursor) params.set("cursor", cursor);

  const page = await horizon(`/ledgers?${params.toString()}`);
  const records = page?._embedded?.records ?? [];
  const ledgers = records.map(mapLedger);
  const nextCursor = ledgers.length ? String(records[records.length - 1].paging_token ?? ledgers[ledgers.length - 1].sequence) : null;

  return {
    ledgers,
    nextCursor,
    hasMore: Boolean(page?._links?.next?.href) && ledgers.length > 0,
    fetchedAt: new Date().toISOString(),
  };
}
