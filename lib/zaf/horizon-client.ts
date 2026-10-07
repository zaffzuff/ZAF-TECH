import type { ZafLedger, ZafOperation, ZafSnapshot, ZafTransaction } from "./types";

const BASE = "https://api.mainnet.minepi.com";

const HORIZON_TIMEOUT_MS = 10_000;

type HorizonResponse = Record<string, unknown>;
type HorizonRecord = Record<string, unknown>;

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
    return response.json() as Promise<HorizonResponse>;
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

function stroopsToPi(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n / 10_000_000 : null;
}

function numberOrNull(value: unknown): number | null {
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
    baseFeePi: stroopsToPi(raw.base_fee_in_stroops),
  };
}

function mapTransaction(raw: HorizonRecord): ZafTransaction {
  return {
    hash: String(raw.hash ?? raw.id ?? ""),
    ledger: raw.ledger != null ? String(raw.ledger) : null,
    createdAt: raw.created_at != null ? String(raw.created_at) : null,
    successful: typeof raw.successful === "boolean" ? raw.successful : null,
    sourceAccount: raw.source_account != null ? String(raw.source_account) : null,
    feePi: stroopsToPi(raw.fee_charged),
    operationCount: numberOrNull(raw.operation_count),
    memo: raw.memo != null ? String(raw.memo) : null,
  };
}

function mapOperation(raw: HorizonRecord): ZafOperation {
  return {
    id: String(raw.id ?? ""),
    ledger: raw.ledger != null ? String(raw.ledger) : null,
    createdAt: raw.created_at != null ? String(raw.created_at) : null,
    type: String(raw.type ?? "unknown"),
    successful: typeof raw.transaction_successful === "boolean" ? raw.transaction_successful : null,
    sourceAccount: raw.source_account != null ? String(raw.source_account) : null,
    transactionHash: raw.transaction_hash != null ? String(raw.transaction_hash) : null,
    amountPi: stroopsToPi(raw.amount),
    from: raw.from != null ? String(raw.from) : null,
    to: raw.to != null ? String(raw.to) : null,
  };
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

function standardDeviation(values: number[], mean: number | null): number | null {
  if (!values.length || mean == null) return null;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

function uniqueCount(values: Array<string | null>): number {
  return new Set(values.filter((value): value is string => Boolean(value))).size;
}

function sampleWindowMinutes(createdAtValues: Array<string | null>): number | null {
  const times = createdAtValues
    .map((value) => (value ? Date.parse(value) : NaN))
    .filter(Number.isFinite);

  if (times.length < 2) return null;
  const min = Math.min(...times);
  const max = Math.max(...times);
  return (max - min) / 60_000;
}

function ledgerTransactionCount(ledger: ZafLedger): number {
  if (ledger.successfulTransactionCount != null && ledger.failedTransactionCount != null) {
    return ledger.successfulTransactionCount + ledger.failedTransactionCount;
  }
  return ledger.transactionCount;
}

function observedPerHour(count: number, windowMinutes: number | null): number | null {
  if (!count || windowMinutes == null || windowMinutes <= 0) return null;
  return count / (windowMinutes / 60);
}

export async function getZafSnapshot(): Promise<ZafSnapshot> {
  const generatedAt = new Date().toISOString();
  try {
    const [ledgerPage, transactionPage, operationPage] = await Promise.all([
      horizon("/ledgers?order=desc&limit=100"),
      horizon("/transactions?order=desc&limit=100&include_failed=true"),
      horizon("/operations?order=desc&limit=100"),
    ]);

    const recentLedgers = recordsFromPage(ledgerPage).map(mapLedger);
    const transactions = recordsFromPage(transactionPage).map(mapTransaction);
    const operations = recordsFromPage(operationPage).map(mapOperation);

    const closeTimes = recentLedgers.map((ledger) => Date.parse(ledger.closedAt)).filter(Number.isFinite).sort((a, b) => a - b);
    const intervals: number[] = [];
    for (let i = 1; i < closeTimes.length; i++) intervals.push((closeTimes[i] - closeTimes[i - 1]) / 1000);

    const transactionLedgers = new Set(transactions.map((transaction) => transaction.ledger).filter(Boolean));
    const operationLedgers = new Set(operations.map((operation) => operation.ledger).filter(Boolean));
    const ledgerSuccessfulTransactions = recentLedgers.reduce((sum, ledger) => sum + (ledger.successfulTransactionCount ?? 0), 0);
    const ledgerFailedTransactions = recentLedgers.reduce((sum, ledger) => sum + (ledger.failedTransactionCount ?? 0), 0);
    const ledgerTransactionTotal = ledgerSuccessfulTransactions + ledgerFailedTransactions;
    const ledgerOperationTotal = recentLedgers.reduce((sum, ledger) => sum + (ledger.operationCount ?? 0), 0);
    const successfulTransactions = transactions.filter((transaction) => transaction.successful === true).length;
    const fees = transactions.flatMap((transaction) => transaction.feePi == null ? [] : [transaction.feePi]);
    const operationCounts = transactions.flatMap((transaction) => transaction.operationCount == null ? [] : [transaction.operationCount]);
    const avgLedgerCloseSeconds = average(intervals);
    const ledgerIntervalStdDevSeconds = standardDeviation(intervals, avgLedgerCloseSeconds);
    const ledgerIntervalCoefficientVariationPercent = avgLedgerCloseSeconds && ledgerIntervalStdDevSeconds != null
      ? (ledgerIntervalStdDevSeconds / avgLedgerCloseSeconds) * 100
      : null;
    const protocolCounts = recentLedgers.reduce<Record<string, number>>((m, ledger) => {
      if (ledger.protocolVersion != null) {
        const key = String(ledger.protocolVersion);
        m[key] = (m[key] ?? 0) + 1;
      }
      return m;
    }, {});
    const protocolVersionDistribution = Object.entries(protocolCounts)
      .map(([version, count]) => ({ version: Number(version), count, percentage: recentLedgers.length ? (count / recentLedgers.length) * 100 : 0 }))
      .sort((a, b) => b.count - a.count);
    const ledgerWindowSeconds = closeTimes.length >= 2 ? (closeTimes[closeTimes.length - 1] - closeTimes[0]) / 1000 : null;
    const emptyLedgerCount = recentLedgers.filter((ledger) => ledgerTransactionCount(ledger) === 0 && ledger.operationCount === 0).length;
    const emptyLedgerRatePercent = recentLedgers.length ? (emptyLedgerCount / recentLedgers.length) * 100 : null;
    const ledgerActivityRatePerMinute = ledgerWindowSeconds != null && ledgerWindowSeconds > 0
      ? ((Math.max(0, recentLedgers.length - 1)) / ledgerWindowSeconds) * 60
      : null;
    const typeCounts = operations.reduce<Record<string, number>>((m, operation) => {
      m[operation.type] = (m[operation.type] ?? 0) + 1;
      return m;
    }, {});
    const sortedOperationTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    const topOperation = sortedOperationTypes[0];
    const operationTypeDistribution = sortedOperationTypes.slice(0, 6).map(([type, count]) => ({
      type,
      count,
      percentage: operations.length ? (count / operations.length) * 100 : 0,
    }));
    const dominantOperationShare = operationTypeDistribution[0]?.percentage ?? null;
    const intelligenceChanges = {
      transactionChangePercent: null as number | null,
      operationChangePercent: null as number | null,
    };
    const midpoint = Math.floor(recentLedgers.length / 2);
    const olderLedgers = recentLedgers.slice(midpoint);
    const newerLedgers = recentLedgers.slice(0, midpoint);
    const ledgerTxCount = (ledger: ZafLedger) =>
      ledger.successfulTransactionCount != null && ledger.failedTransactionCount != null
        ? ledger.successfulTransactionCount + ledger.failedTransactionCount
        : ledger.transactionCount;
    function ledgerRatePerHour(ledgers: ZafLedger[], countFor: (ledger: ZafLedger) => number): number | null {
      if (ledgers.length < 2) return null;
      const validTimes = ledgers
        .map((ledger) => Date.parse(ledger.closedAt))
        .filter(Number.isFinite)
        .sort((a, b) => a - b);
      if (validTimes.length < 2) return null;
      const elapsedHours = (validTimes[validTimes.length - 1] - validTimes[0]) / 3_600_000;
      if (elapsedHours <= 0) return null;
      return ledgers.reduce((sum, ledger) => sum + countFor(ledger), 0) / elapsedHours;
    }
    const olderTxRate = ledgerRatePerHour(olderLedgers, ledgerTxCount);
    const newerTxRate = ledgerRatePerHour(newerLedgers, ledgerTxCount);
    const olderOpRate = ledgerRatePerHour(olderLedgers, (ledger) => ledger.operationCount);
    const newerOpRate = ledgerRatePerHour(newerLedgers, (ledger) => ledger.operationCount);
    const txChange = olderTxRate != null && olderTxRate !== 0 && newerTxRate != null ? ((newerTxRate - olderTxRate) / olderTxRate) * 100 : null;
    const opChange = olderOpRate != null && olderOpRate !== 0 && newerOpRate != null ? ((newerOpRate - olderOpRate) / olderOpRate) * 100 : null;
    const combinedChange = [txChange, opChange].filter((value): value is number => value != null);
    const averageChange = combinedChange.length ? combinedChange.reduce((a, b) => a + b, 0) / combinedChange.length : null;
    const activityState: "rising" | "falling" | "stable" | "insufficient-data" =
      averageChange == null ? "insufficient-data" :
      averageChange > 5 ? "rising" :
      averageChange < -5 ? "falling" : "stable";
    intelligenceChanges.transactionChangePercent = txChange;
    intelligenceChanges.operationChangePercent = opChange;
    const transactionSampleWindowMinutes = sampleWindowMinutes(transactions.map((transaction) => transaction.createdAt));
    const operationSampleWindowMinutes = sampleWindowMinutes(operations.map((operation) => operation.createdAt));

    return {
      network: "Pi Network",
      networkScope: "mainnet",
      source: "Pi Mainnet Horizon",
      generatedAt,
      latestLedger: recentLedgers[0] ?? null,
      recentLedgers,
      transactions,
      operations,
      intelligence: {
        activityState,
        transactionChangePercent: intelligenceChanges.transactionChangePercent,
        operationChangePercent: intelligenceChanges.operationChangePercent,
        dominantOperationShare,
        uniqueTransactionSources: uniqueCount(transactions.map((transaction) => transaction.sourceAccount)),
        uniqueOperationSources: uniqueCount(operations.map((operation) => operation.sourceAccount)),
        notes: [
          "Intelligence is derived only from observable Pi Mainnet blockchain data.",
          "No app-traffic, user-intent, or ecosystem-wide usage inference is made.",
        ],
      },
      metrics: {
        recentLedgerCount: recentLedgers.length,
        recentTransactions: transactions.length,
        recentOperations: operations.length,
        avgTransactionsPerLedger: recentLedgers.length ? ledgerTransactionTotal / recentLedgers.length : (transactionLedgers.size ? transactions.length / transactionLedgers.size : null),
        avgOperationsPerLedger: recentLedgers.length ? ledgerOperationTotal / recentLedgers.length : (operationLedgers.size ? operations.length / operationLedgers.size : null),
        avgLedgerCloseSeconds,
        ledgerIntervalStdDevSeconds,
        ledgerIntervalCoefficientVariationPercent,
        latestProtocolVersion: recentLedgers[0]?.protocolVersion ?? null,
        protocolVersionDistribution,
        transactionSuccessRate: ledgerTransactionTotal ? (ledgerSuccessfulTransactions / ledgerTransactionTotal) * 100 : (transactions.length ? (successfulTransactions / transactions.length) * 100 : null),
        failedTransactionRatePercent: ledgerTransactionTotal ? (ledgerFailedTransactions / ledgerTransactionTotal) * 100 : (transactions.length ? ((transactions.length - successfulTransactions) / transactions.length) * 100 : null),
        averageTransactionFeePi: average(fees),
        averageOperationsPerTransaction: average(operationCounts),
        uniqueTransactionSources: uniqueCount(transactions.map((transaction) => transaction.sourceAccount)),
        uniqueOperationSources: uniqueCount(operations.map((operation) => operation.sourceAccount)),
        topOperationType: topOperation?.[0] ?? null,
        topOperationTypeCount: topOperation?.[1] ?? 0,
        operationTypeDistribution,
        transactionSampleWindowMinutes,
        operationSampleWindowMinutes,
        observedTransactionsPerHour: ledgerWindowSeconds ? ledgerTransactionTotal / (ledgerWindowSeconds / 3600) : observedPerHour(transactions.length, transactionSampleWindowMinutes),
        observedOperationsPerHour: ledgerWindowSeconds ? ledgerOperationTotal / (ledgerWindowSeconds / 3600) : observedPerHour(operations.length, operationSampleWindowMinutes),
        observedTransactionsPerDay: ledgerWindowSeconds ? (ledgerTransactionTotal / (ledgerWindowSeconds / 86_400)) : (observedPerHour(transactions.length, transactionSampleWindowMinutes) == null ? null : observedPerHour(transactions.length, transactionSampleWindowMinutes)! * 24),
        observedOperationsPerDay: ledgerWindowSeconds ? (ledgerOperationTotal / (ledgerWindowSeconds / 86_400)) : (observedPerHour(operations.length, operationSampleWindowMinutes) == null ? null : observedPerHour(operations.length, operationSampleWindowMinutes)! * 24),
        emptyLedgerRatePercent,
        ledgerActivityRatePerMinute,
      },
      error: null,
    };
  } catch (error) {
    return {
      network: "Pi Network", networkScope: "mainnet", source: "Pi Mainnet Horizon", generatedAt,
      latestLedger: null, recentLedgers: [], transactions: [], operations: [],
      intelligence: {
        activityState: "insufficient-data",
        transactionChangePercent: null,
        operationChangePercent: null,
        dominantOperationShare: null,
        uniqueTransactionSources: 0,
        uniqueOperationSources: 0,
        notes: [],
      },
      metrics: {
        recentLedgerCount: 0, recentTransactions: 0, recentOperations: 0,
        avgTransactionsPerLedger: null, avgOperationsPerLedger: null,
        avgLedgerCloseSeconds: null, ledgerIntervalStdDevSeconds: null, ledgerIntervalCoefficientVariationPercent: null, latestProtocolVersion: null,
        protocolVersionDistribution: [],
        transactionSuccessRate: null, failedTransactionRatePercent: null, averageTransactionFeePi: null,
        averageOperationsPerTransaction: null, uniqueTransactionSources: 0,
        uniqueOperationSources: 0, topOperationType: null, topOperationTypeCount: 0,
        operationTypeDistribution: [],
        transactionSampleWindowMinutes: null, operationSampleWindowMinutes: null,
        observedTransactionsPerHour: null, observedOperationsPerHour: null, observedTransactionsPerDay: null, observedOperationsPerDay: null,
        emptyLedgerRatePercent: null, ledgerActivityRatePerMinute: null,
      },
      error: error instanceof Error ? error.message : "Unknown Pi Mainnet error",
    };
  }
}
