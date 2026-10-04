import { getUnifiedObservation } from "@/lib/zaf/observation-engine";
import { getObservationHistory } from "@/lib/zaf/observation-history";

export type ObservationChange = {
  type: "transactions" | "operations" | "apps" | "sources" | "protocol" | "confidence" | "ledger";
  direction: "up" | "down" | "changed" | "stable";
  title: string;
  detail: string;
  detailTr: string;
  previous: string | number | null;
  current: string | number | null;
  percent: number | null;
};

export type ObservationChanges = {
  generatedAt: string;
  baselineAt: string | null;
  hasBaseline: boolean;
  changes: ObservationChange[];
};

function percentChange(current: number | null, previous: number | null) {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function numericChange(
  type: ObservationChange["type"],
  label: string,
  labelTr: string,
  current: number | null,
  previous: number | null,
): ObservationChange | null {
  if (current == null || previous == null || current === previous) return null;
  const percent = percentChange(current, previous);
  const direction = current > previous ? "up" : "down";
  const sign = current > previous ? "+" : "";
  return {
    type,
    direction,
    title: label,
    detail: percent == null
      ? `${label}: ${previous} → ${current}.`
      : `${label}: ${previous} → ${current} (${sign}${percent.toFixed(1)}%).`,
    detailTr: percent == null
      ? `${labelTr}: ${previous} → ${current}.`
      : `${labelTr}: ${previous} → ${current} (${sign}${percent.toFixed(1)}%).`,
    previous,
    current,
    percent,
  };
}

export async function getObservationChanges(): Promise<ObservationChanges> {
  const current = await getUnifiedObservation();
  const history = await getObservationHistory(20);
  const currentTime = Date.parse(current.generatedAt);
  const baseline = history.find((item) => {
    const time = Date.parse(item.generatedAt);
    return Number.isFinite(time) && Number.isFinite(currentTime) && currentTime - time >= 300000;
  }) ?? null;

  if (!baseline) {
    return { generatedAt: current.generatedAt, baselineAt: null, hasBaseline: false, changes: [] };
  }

  const changes: ObservationChange[] = [];
  const network = current.network;
  changes.push(...[
    numericChange("transactions", "Observed Transactions", "Gözlemlenen İşlemler", network?.metrics.observedTransactionsPerDay ?? null, baseline.dailyTransactions),
    numericChange("operations", "Observed Operations", "Gözlemlenen Operasyonlar", network?.metrics.observedOperationsPerDay ?? null, baseline.dailyOperations),
    numericChange("apps", "Observed Apps", "Gözlemlenen Uygulamalar", current.ecosystem?.apps.totalCount ?? null, baseline.observedApps),
    numericChange("sources", "Available Sources", "Kullanılabilir Kaynaklar", current.ecosystem ? current.ecosystem.sources.filter((source) => source.status === "available").length : null, baseline.availableSources),
    numericChange("confidence", "Observation Confidence", "Gözlem Güveni", current.confidence.score, baseline.confidenceScore),
  ].filter((item): item is ObservationChange => item !== null));

  const currentProtocol = network?.metrics.latestProtocolVersion ?? null;
  if (currentProtocol != null && baseline.protocolVersion != null && currentProtocol !== baseline.protocolVersion) {
    changes.push({
      type: "protocol",
      direction: "changed",
      title: "Protocol Version Changed",
      detail: `Protocol version changed from ${baseline.protocolVersion} to ${currentProtocol}.`,
      detailTr: `Protokol sürümü ${baseline.protocolVersion} değerinden ${currentProtocol} değerine değişti.`,
      previous: baseline.protocolVersion,
      current: currentProtocol,
      percent: null,
    });
  }

  const currentLedger = network?.latestLedger?.sequence ?? null;
  if (currentLedger && baseline.networkLedger && currentLedger !== baseline.networkLedger) {
    changes.push({
      type: "ledger",
      direction: "changed",
      title: "Latest Ledger Changed",
      detail: `Latest observed ledger changed from ${baseline.networkLedger} to ${currentLedger}.`,
      detailTr: `Son gözlemlenen ledger ${baseline.networkLedger} değerinden ${currentLedger} değerine değişti.`,
      previous: baseline.networkLedger,
      current: currentLedger,
      percent: null,
    });
  }

  return {
    generatedAt: current.generatedAt,
    baselineAt: baseline.generatedAt,
    hasBaseline: true,
    changes: changes.sort((a, b) => Math.abs(b.percent ?? 0) - Math.abs(a.percent ?? 0)).slice(0, 20),
  };
}
