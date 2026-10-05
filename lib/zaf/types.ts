import type { ZafNetworkScope } from "@/lib/zaf/network-scope";

export interface ZafLedger {
  sequence: string;
  hash: string;
  closedAt: string;
  transactionCount: number;
  operationCount: number;
  successfulTransactionCount: number | null;
  failedTransactionCount: number | null;
  successfulOperationCount: number | null;
  protocolVersion: number | null;
  baseFeePi: number | null;
}

export interface ZafTransaction {
  hash: string;
  ledger: string | null;
  createdAt: string | null;
  successful: boolean | null;
  sourceAccount: string | null;
  feePi: number | null;
  operationCount: number | null;
  memo: string | null;
}

export interface ZafOperation {
  id: string;
  ledger: string | null;
  createdAt: string | null;
  type: string;
  successful: boolean | null;
  sourceAccount: string | null;
  transactionHash: string | null;
  amountPi: number | null;
  from: string | null;
  to: string | null;
}

export interface ZafHistoricalPoint {
  sequence: string;
  closedAt: string;
  transactions: number;
  operations: number;
  successRate: number | null;
  transactionsPerHour: number | null;
  operationsPerHour: number | null;
  windowMinutes: number;
}

export interface ZafHistoricalActivity {
  windowHours: number;
  points: ZafHistoricalPoint[];
  change: {
    transactionsPerHourPercent: number | null;
    operationsPerHourPercent: number | null;
  };
  error: string | null;
}

export interface ZafOperationTypeShare {
  type: string;
  count: number;
  percentage: number;
}

export interface ZafIntelligence {
  activityState: "rising" | "falling" | "stable" | "insufficient-data";
  transactionChangePercent: number | null;
  operationChangePercent: number | null;
  dominantOperationShare: number | null;
  uniqueTransactionSources: number;
  uniqueOperationSources: number;
  notes: string[];
}

export interface ZafSnapshot {
  network: "Pi Network";
  networkScope: ZafNetworkScope;
  source: "Pi Mainnet Horizon";
  generatedAt: string;
  latestLedger: ZafLedger | null;
  recentLedgers: ZafLedger[];
  transactions: ZafTransaction[];
  operations: ZafOperation[];
  intelligence: ZafIntelligence;
  metrics: {
    recentLedgerCount: number;
    recentTransactions: number;
    recentOperations: number;
    avgTransactionsPerLedger: number | null;
    avgOperationsPerLedger: number | null;
    avgLedgerCloseSeconds: number | null;
    ledgerIntervalStdDevSeconds: number | null;
    ledgerIntervalCoefficientVariationPercent: number | null;
    latestProtocolVersion: number | null;
    protocolVersionDistribution: Array<{ version: number; count: number; percentage: number }>;
    transactionSuccessRate: number | null;
    failedTransactionRatePercent: number | null;
    averageTransactionFeePi: number | null;
    uniqueTransactionSources: number;
    uniqueOperationSources: number;
    topOperationType: string | null;
    topOperationTypeCount: number;
    operationTypeDistribution: ZafOperationTypeShare[];
    transactionSampleWindowMinutes: number | null;
    operationSampleWindowMinutes: number | null;
    observedTransactionsPerHour: number | null;
    observedOperationsPerHour: number | null;
    observedTransactionsPerDay: number | null;
    observedOperationsPerDay: number | null;
    emptyLedgerRatePercent: number | null;
    ledgerActivityRatePerMinute: number | null;
    averageOperationsPerTransaction: number | null;
  };
  error: string | null;
}


export interface ZafWalletAsset {
  networkScope: ZafNetworkScope;
  assetType: string;
  assetCode: string | null;
  assetIssuer: string | null;
  balance: number | null;
  isNative: boolean;
}

export interface ZafWalletTransaction {
  hash: string;
  ledger: string | null;
  createdAt: string | null;
  successful: boolean | null;
  sourceAccount: string | null;
  feePi: number | null;
  operationCount: number | null;
  memo: string | null;
}

export interface ZafWalletOperation {
  id: string;
  ledger: string | null;
  createdAt: string | null;
  type: string;
  successful: boolean | null;
  sourceAccount: string | null;
  transactionHash: string | null;
  amountPi: number | null;
  from: string | null;
  to: string | null;
}

export interface ZafWalletSnapshot {
  address: string;
  network: "Pi Mainnet" | "Pi Testnet";
  networkScope: ZafNetworkScope;
  exists: boolean | null;
  accountBalancePi: number | null;
  observableClaimablePi: number | null;
  lockup: null | Record<string, unknown>;
  account: {
    sequence: string | null;
    subentryCount: number | null;
    lastModifiedLedger: string | null;
  } | null;
  lastActivity: string | null;
  assets: ZafWalletAsset[];
  transactions: ZafWalletTransaction[];
  operations: ZafWalletOperation[];
  source: string;
  generatedAt: string;
  error: string | null;
}
