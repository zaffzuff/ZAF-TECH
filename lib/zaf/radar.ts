import { getRollingObservationBaseline } from "@/lib/zaf/observation-history";
import { getUnifiedObservation } from "@/lib/zaf/observation-engine";
import type { ZafSnapshot } from "@/lib/zaf/types";

export type RadarSignalState = "rising" | "falling" | "stable" | "limited";
export type RadarConfidenceLevel = "high" | "medium" | "low";

export type RadarSignal = {
  id: string;
  title: string;
  detail: string;
  detailTr: string;
  state: RadarSignalState;
  value: number | string | null;
  changePercent: number | null;
  confidence: { score: number; level: RadarConfidenceLevel; reasons: string[] };
};

export type RadarObservation = {
  generatedAt: string;
  activityState: ZafSnapshot["intelligence"]["activityState"];
  dailyTransactions: number | null;
  dailyOperations: number | null;
  sourceCoverage: { available: number; total: number };
  confidence: { score: number; level: RadarConfidenceLevel; reasons: string[] };
  health: { score: number; status: "healthy" | "degraded" | "limited" };
  baselineAt: string | null;
  baselineSampleCount: number;
  baselineWindowMinutes: number;
  signals: RadarSignal[];
};

function level(score: number): RadarConfidenceLevel {
  return score >= 80 ? "high" : score >= 55 ? "medium" : "low";
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function percentChange(current: number | null, baseline: number | null) {
  if (current == null || baseline == null || baseline === 0) return null;
  return ((current - baseline) / Math.abs(baseline)) * 100;
}

function direction(change: number | null): RadarSignalState {
  if (change == null) return "limited";
  if (change > 5) return "rising";
  if (change < -5) return "falling";
  return "stable";
}

function sampleConfidence(label: string, metricAvailable: boolean, sampleSize: number, baselineAvailable: boolean, fresh: boolean): RadarSignal["confidence"] {
  let score = 0;
  const reasons: string[] = [];
  if (metricAvailable) { score += 35; reasons.push(label + " is present in the current public observation."); }
  else reasons.push(label + " is not available in the current observation.");
  if (sampleSize >= 50) { score += 25; reasons.push("A substantial ledger sample is available."); }
  else if (sampleSize >= 10) { score += 15; reasons.push("A partial ledger sample is available."); }
  else if (sampleSize > 0) { score += 5; reasons.push("Only a small ledger sample is available."); }
  if (baselineAvailable) { score += 20; reasons.push("A 30-minute rolling historical baseline is available from stored observations."); }
  else reasons.push("At least three stored observations are required for the rolling baseline.");
  if (fresh) { score += 20; reasons.push("The underlying observation is inside the preferred freshness window."); }
  else reasons.push("The underlying observation is outside the preferred freshness window.");
  const bounded = clamp(score);
  return { score: bounded, level: level(bounded), reasons };
}

function currentConfidence(label: string, available: boolean, evidence: number, fresh: boolean, extraReason?: string): RadarSignal["confidence"] {
  let score = 0;
  const reasons: string[] = [];
  if (available) { score += 40; reasons.push(label + " is directly observable from the current public sample."); }
  else reasons.push(label + " is not directly observable from the current public sample.");
  if (evidence >= 50) { score += 30; reasons.push("The supporting observation sample is substantial."); }
  else if (evidence >= 10) { score += 20; reasons.push("The supporting observation sample is partial."); }
  else if (evidence > 0) { score += 8; reasons.push("The supporting observation sample is small."); }
  if (fresh) { score += 30; reasons.push("The source observation is fresh."); }
  else reasons.push("The source observation is aging or stale.");
  if (extraReason) reasons.push(extraReason);
  const bounded = clamp(score);
  return { score: bounded, level: level(bounded), reasons };
}

export async function getRadarObservation(): Promise<RadarObservation> {
  const observation = await getUnifiedObservation();
  const baseline = await getRollingObservationBaseline(observation.generatedAt, 30, 300, 3);

  const current = observation.network;
  const fresh = observation.freshness.state === "fresh";
  const ledgers = current?.recentLedgers.length ?? 0;
  const sourceCount = observation.ecosystem?.sources.length ?? 0;
  const availableSources = observation.ecosystem?.sources.filter((source) => source.status === "available").length ?? 0;
  const txCurrent = current?.metrics.observedTransactionsPerDay ?? null;
  const opCurrent = current?.metrics.observedOperationsPerDay ?? null;
  const txChange = percentChange(txCurrent, baseline?.dailyTransactions ?? null);
  const opChange = percentChange(opCurrent, baseline?.dailyOperations ?? null);
  const baselineAvailable = Boolean(baseline);

  const signals: RadarSignal[] = [
    {
      id: "transaction-pace", title: "Observed Transaction Pace",
      detail: txChange == null ? "Current daily transaction pace is observable, but at least three stored observations are needed for a rolling comparison." : "Observed daily transactions changed by " + (txChange >= 0 ? "+" : "") + txChange.toFixed(1) + "% versus the 30-minute rolling median of stored observations.",
      detailTr: txChange == null ? "Mevcut günlük işlem temposu gözlemlenebiliyor, ancak hareketli karşılaştırma için en az üç kayıtlı gözlem gerekiyor." : "Gözlemlenen günlük işlemler, kayıtlı gözlemlerin 30 dakikalık hareketli medyanına göre " + (txChange >= 0 ? "+" : "") + txChange.toFixed(1) + "% değişti.",
      state: direction(txChange), value: txCurrent, changePercent: txChange,
      confidence: sampleConfidence("Transaction pace", txCurrent != null, ledgers, baselineAvailable && baseline?.dailyTransactions != null, fresh),
    },
    {
      id: "operation-pace", title: "Observed Operation Pace",
      detail: opChange == null ? "Current daily operation pace is observable, but at least three stored observations are needed for a rolling comparison." : "Observed daily operations changed by " + (opChange >= 0 ? "+" : "") + opChange.toFixed(1) + "% versus the 30-minute rolling median of stored observations.",
      detailTr: opChange == null ? "Mevcut günlük operasyon temposu gözlemlenebiliyor, ancak hareketli karşılaştırma için en az üç kayıtlı gözlem gerekiyor." : "Gözlemlenen günlük operasyonlar, kayıtlı gözlemlerin 30 dakikalık hareketli medyanına göre " + (opChange >= 0 ? "+" : "") + opChange.toFixed(1) + "% değişti.",
      state: direction(opChange), value: opCurrent, changePercent: opChange,
      confidence: sampleConfidence("Operation pace", opCurrent != null, ledgers, baselineAvailable && baseline?.dailyOperations != null, fresh),
    },
    {
      id: "transaction-success", title: "Transaction Success Rate",
      detail: current?.metrics.transactionSuccessRate == null ? "Transaction success rate is not available in the current sample." : "Current observed transaction success rate is " + current.metrics.transactionSuccessRate.toFixed(1) + "%.",
      detailTr: current?.metrics.transactionSuccessRate == null ? "Mevcut örnekte işlem başarı oranı bulunmuyor." : "Mevcut gözlemlenen işlem başarı oranı %" + current.metrics.transactionSuccessRate.toFixed(1) + ".",
      state: current?.metrics.transactionSuccessRate == null ? "limited" : "stable", value: current?.metrics.transactionSuccessRate ?? null, changePercent: null,
      confidence: currentConfidence("Transaction success rate", current?.metrics.transactionSuccessRate != null, ledgers, fresh, "This signal is descriptive and is not a prediction of future transaction outcomes."),
    },
    {
      id: "ledger-throughput", title: "Ledger Throughput",
      detail: current?.metrics.avgTransactionsPerLedger == null ? "Average transactions per observed ledger are not available." : "Observed ledgers contain an average of " + current.metrics.avgTransactionsPerLedger.toFixed(2) + " transactions each.",
      detailTr: current?.metrics.avgTransactionsPerLedger == null ? "Gözlemlenen ledger başına ortalama işlem sayısı bulunmuyor." : "Gözlemlenen ledgerlarda ortalama " + current.metrics.avgTransactionsPerLedger.toFixed(2) + " işlem bulunuyor.",
      state: current?.metrics.avgTransactionsPerLedger == null ? "limited" : "stable", value: current?.metrics.avgTransactionsPerLedger ?? null, changePercent: null,
      confidence: currentConfidence("Ledger throughput", current?.metrics.avgTransactionsPerLedger != null, ledgers, fresh),
    },
    {
      id: "source-coverage", title: "Public Source Coverage",
      detail: sourceCount ? availableSources + " of " + sourceCount + " configured public ecosystem sources are currently available." : "No ecosystem source coverage is currently available.",
      detailTr: sourceCount ? sourceCount + " yapılandırılmış herkese açık ekosistem kaynağının " + availableSources + " tanesi şu anda kullanılabilir durumda." : "Şu anda ekosistem kaynak kapsamı bulunmuyor.",
      state: sourceCount === 0 ? "limited" : availableSources === sourceCount ? "stable" : "falling", value: sourceCount ? availableSources + "/" + sourceCount : null, changePercent: null,
      confidence: currentConfidence("Public source coverage", sourceCount > 0, sourceCount, fresh),
    },
    {
      id: "protocol", title: "Protocol Observation",
      detail: current?.metrics.latestProtocolVersion == null ? "No current protocol version is available." : "Latest observed protocol version is v" + current.metrics.latestProtocolVersion + ".",
      detailTr: current?.metrics.latestProtocolVersion == null ? "Mevcut protokol sürümü bulunmuyor." : "Son gözlemlenen protokol sürümü v" + current.metrics.latestProtocolVersion + ".",
      state: current?.metrics.latestProtocolVersion == null ? "limited" : "stable", value: current?.metrics.latestProtocolVersion ?? null, changePercent: null,
      confidence: currentConfidence("Protocol observation", current?.metrics.latestProtocolVersion != null, ledgers, fresh),
    },
  ];

  return {
    generatedAt: observation.generatedAt,
    activityState: current?.intelligence.activityState ?? "insufficient-data",
    dailyTransactions: txCurrent, dailyOperations: opCurrent,
    sourceCoverage: { available: availableSources, total: sourceCount },
    confidence: observation.confidence,
    health: { score: observation.health.score, status: observation.health.status },
    baselineAt: baseline?.newestGeneratedAt ?? null,
    baselineSampleCount: baseline?.sampleCount ?? 0,
    baselineWindowMinutes: baseline?.windowMinutes ?? 30,
    signals,
  };
}
