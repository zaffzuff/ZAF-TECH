import type { ZafWalletSnapshot } from "@/lib/zaf/types";

export type WalletActivityAnalytics = {
  transactionCount: number;
  operationCount: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number | null;
  totalObservedFeesPi: number;
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  activeLedgerCount: number;
  operationTypeCounts: Array<{ type: string; count: number }>;
};

export function getWalletActivityAnalytics(snapshot: ZafWalletSnapshot): WalletActivityAnalytics {
  const transactions = snapshot.transactions ?? [];
  const operations = snapshot.operations ?? [];
  const successfulTransactions = transactions.filter(item => item.successful === true).length;
  const failedTransactions = transactions.filter(item => item.successful === false).length;
  const feeValues = transactions.map(item => item.feePi).filter((value): value is number => value != null && Number.isFinite(value));
  const dates = [...transactions.map(item => item.createdAt), ...operations.map(item => item.createdAt)]
    .filter((value): value is string => Boolean(value))
    .sort();
  const ledgers = new Set([...transactions.map(item => item.ledger), ...operations.map(item => item.ledger)].filter(Boolean));
  const typeCounts = new Map<string, number>();
  for (const operation of operations) typeCounts.set(operation.type, (typeCounts.get(operation.type) ?? 0) + 1);

  return {
    transactionCount: transactions.length,
    operationCount: operations.length,
    successfulTransactions,
    failedTransactions,
    successRate: successfulTransactions + failedTransactions
      ? (successfulTransactions / (successfulTransactions + failedTransactions)) * 100
      : null,
    totalObservedFeesPi: feeValues.reduce((sum, value) => sum + value, 0),
    firstObservedAt: dates[0] ?? null,
    lastObservedAt: dates.at(-1) ?? null,
    activeLedgerCount: ledgers.size,
    operationTypeCounts: [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([type, count]) => ({ type, count })),
  };
}
