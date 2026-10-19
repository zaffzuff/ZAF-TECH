import type { ZafHistoricalActivity, ZafHistoricalPoint, ZafLedger } from "./types";

const BASE = "https://api.mainnet.minepi.com";

const HORIZON_TIMEOUT_MS = 10_000;

type HorizonRecord = Record<string, unknown>;
type HorizonResponse = { _embedded?: { records?: HorizonRecord[] } } & Record<string, unknown>;

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
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Pi Horizon request timed out after 10 seconds");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function numberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapLedger(raw: HorizonRecord): ZafLedger {
  return {
    sequence: String(raw.sequence),
    hash: String(raw.hash ?? ""),
    closedAt: String(raw.closed_at ?? ""),
    transactionCount: numberOrNull(raw.transaction_count) ?? 0,
    operationCount: numberOrNull(raw.operation_count) ?? 0,
    successfulTransactionCount: numberOrNull(raw.successful_transaction_count),
    failedTransactionCount: numberOrNull(raw.failed_transaction_count),
    successfulOperationCount: numberOrNull(raw.successful_operation_count),
    protocolVersion: numberOrNull(raw.protocol_version),
    baseFeePi: numberOrNull(raw.base_fee_in_stroops) != null ? numberOrNull(raw.base_fee_in_stroops)! / 10_000_000 : null,
  };
}

export async function getZafHistoricalActivity(): Promise<ZafHistoricalActivity> {
  try {
    const page = await horizon("/ledgers?order=desc&limit=100");
    const recent = (page?._embedded?.records ?? []).map(mapLedger) as ZafLedger[];
    if (recent.length < 2) throw new Error("Insufficient ledger history");

    const ordered = recent
      .filter((ledger) => Number.isFinite(Date.parse(ledger.closedAt)))
      .sort((a, b) => Date.parse(a.closedAt) - Date.parse(b.closedAt));

    if (ordered.length < 2) throw new Error("Ledger timestamps are unavailable");

    // The first ledger has no preceding close time in this sample. Only count
    // ledgers whose full interval is observed, keeping counts and time aligned.
    const measured = ordered.slice(1);
    const bucketCount = Math.min(12, measured.length);
    const bucketSize = Math.ceil(measured.length / bucketCount);
    const points: ZafHistoricalPoint[] = [];
    const fullWindowSeconds = Math.max(
      1,
      (Date.parse(ordered[ordered.length - 1].closedAt) - Date.parse(ordered[0].closedAt)) / 1000
    );
    for (let start = 0; start < measured.length; start += bucketSize) {
      const bucket = measured.slice(start, Math.min(start + bucketSize, measured.length));
      const first = Date.parse(ordered[start].closedAt);
      const last = Date.parse(bucket[bucket.length - 1].closedAt);
      const elapsedSeconds = Math.max(1, (last - first) / 1000);

      const transactions = bucket.reduce((sum, ledger) => {
        const successful = ledger.successfulTransactionCount;
        const failed = ledger.failedTransactionCount;
        return sum + (successful != null && failed != null
          ? successful + failed
          : ledger.transactionCount);
      }, 0);
      const operations = bucket.reduce((sum, ledger) => sum + ledger.operationCount, 0);
      const successful = bucket.reduce((sum, ledger) => sum + (ledger.successfulTransactionCount ?? 0), 0);
      const failed = bucket.reduce((sum, ledger) => sum + (ledger.failedTransactionCount ?? 0), 0);
      const knownTotal = successful + failed;
      const hours = elapsedSeconds / 3600;

      points.push({
        sequence: bucket[bucket.length - 1].sequence,
        closedAt: bucket[bucket.length - 1].closedAt,
        transactions,
        operations,
        successRate: knownTotal > 0 ? (successful / knownTotal) * 100 : null,
        transactionsPerHour: transactions / hours,
        operationsPerHour: operations / hours,
        windowMinutes: elapsedSeconds / 60,
      });
    }

    const actualWindowHours = fullWindowSeconds / 3600;

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const percentageChange = (first: number | null, last: number | null) => {
      if (first == null || last == null || first === 0) return null;
      return ((last - first) / first) * 100;
    };

    return {
      windowHours: Number(actualWindowHours.toFixed(2)),
      points,
      change: {
        transactionsPerHourPercent: percentageChange(firstPoint?.transactionsPerHour ?? null, lastPoint?.transactionsPerHour ?? null),
        operationsPerHourPercent: percentageChange(firstPoint?.operationsPerHour ?? null, lastPoint?.operationsPerHour ?? null),
      },
      error: null,
    };
  } catch (error) {
    return {
      windowHours: 24,
      points: [],
      change: {
        transactionsPerHourPercent: null,
        operationsPerHourPercent: null,
      },
      error: error instanceof Error ? error.message : "Unable to load historical Pi Mainnet activity",
    };
  }
}
