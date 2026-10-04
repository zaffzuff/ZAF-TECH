import { getObservationHistory, isObservationHistoryConfigured, type ObservationHistoryRecord } from "@/lib/zaf/observation-history";

export type ObservationTimelineItem = {
  generatedAt: string;
  baselineAt: string | null;
  activity: "rising" | "falling" | "stable" | "insufficient-data";
  transactionChangePercent: number | null;
  operationChangePercent: number | null;
  observedTransactions: number | null;
  observedOperations: number | null;
  dailyTransactions: number | null;
  dailyOperations: number | null;
  observedApps: number | null;
  availableSources: number;
  totalSources: number;
  confidenceScore: number | null;
  freshnessState: ObservationHistoryRecord["freshnessState"];
  ledger: string | null;
  protocolVersion: number | null;
};

function percentChange(current: number | null, previous: number | null) {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function activityFor(tx: number | null, ops: number | null) {
  const values = [tx, ops].filter((value): value is number => value != null && Number.isFinite(value));
  if (!values.length) return "insufficient-data" as const;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (Math.abs(average) < 1) return "stable" as const;
  return average > 0 ? "rising" as const : "falling" as const;
}

export async function getObservationTimeline(limit = 24) {
  const history = await getObservationHistory(Math.min(Math.max(limit, 2), 1000));
  const newestFirst = [...history];
  const items: ObservationTimelineItem[] = [];

  for (let index = 0; index < newestFirst.length; index += 1) {
    const current = newestFirst[index];
    const baseline = newestFirst[index + 1] ?? null;
    const transactionChangePercent = percentChange(current.dailyTransactions, baseline?.dailyTransactions ?? null);
    const operationChangePercent = percentChange(current.dailyOperations, baseline?.dailyOperations ?? null);
    const changes = [transactionChangePercent, operationChangePercent].filter((value): value is number => value != null);
    const averageChange = changes.length ? changes.reduce((sum, value) => sum + value, 0) / changes.length : null;

    items.push({
      generatedAt: current.generatedAt,
      baselineAt: baseline?.generatedAt ?? null,
      activity: averageChange == null ? "insufficient-data" : activityFor(averageChange, 0),
      transactionChangePercent,
      operationChangePercent,
      observedTransactions: current.observedTransactions,
      observedOperations: current.observedOperations,
      dailyTransactions: current.dailyTransactions,
      dailyOperations: current.dailyOperations,
      observedApps: current.observedApps,
      availableSources: current.availableSources,
      totalSources: current.totalSources,
      confidenceScore: current.confidenceScore,
      freshnessState: current.freshnessState,
      ledger: current.networkLedger,
      protocolVersion: current.protocolVersion,
    });
  }

  return {
    configured: isObservationHistoryConfigured(),
    points: items,
  };
}
