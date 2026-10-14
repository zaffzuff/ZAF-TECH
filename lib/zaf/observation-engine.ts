import { getEcosystemSnapshot, type EcosystemSnapshot } from "@/lib/zaf/ecosystem";
import { getZafSnapshot } from "@/lib/zaf/horizon-client";
import { saveObservationSnapshot, type ObservationHistoryRecord } from "@/lib/zaf/observation-history";
import type { ZafSnapshot } from "@/lib/zaf/types";

export type FreshnessState = "fresh" | "aging" | "stale" | "unknown";
export type ObservationFreshness = { state: FreshnessState; ageSeconds: number; maxAgeSeconds: number; generatedAt: string | null };
export type ObservationConfidence = { score: number; level: "high" | "medium" | "low"; reasons: string[] };
export type ObservationHealth = { score: number; status: "healthy" | "degraded" | "limited"; components: { network: number; ecosystem: number; freshness: number } };

export type UnifiedObservation = {
  version: "1.1";
  generatedAt: string;
  freshness: ObservationFreshness;
  confidence: ObservationConfidence;
  health: ObservationHealth;
  network: ZafSnapshot | null;
  ecosystem: EcosystemSnapshot | null;
  errors: string[];
  historyStored?: boolean;
};

const CACHE_TTL_MS = 15000;
let cached: { expiresAt: number; value: UnifiedObservation } | null = null;
let pending: Promise<UnifiedObservation> | null = null;
let lastSuccessfulNetwork: ZafSnapshot | null = null;

function freshnessFor(generatedAt: string | null): ObservationFreshness {
  if (!generatedAt) return { state: "unknown", ageSeconds: 0, maxAgeSeconds: 60, generatedAt: null };
  const ageSeconds = Math.max(0, Math.floor((Date.now() - Date.parse(generatedAt)) / 1000));
  const maxAgeSeconds = 120;
  return { state: ageSeconds <= 30 ? "fresh" : ageSeconds <= maxAgeSeconds ? "aging" : "stale", ageSeconds, maxAgeSeconds, generatedAt };
}

function confidenceFor(network: ZafSnapshot | null, ecosystem: EcosystemSnapshot | null, freshness: ObservationFreshness, errors: string[]): ObservationConfidence {
  let score = 0;
  const reasons: string[] = [];
  if (network?.latestLedger) { score += 30; reasons.push("Latest Mainnet ledger observed."); }
  else reasons.push("No current Mainnet ledger was observed.");
  if ((network?.recentLedgers.length ?? 0) >= 50) { score += 20; reasons.push("A substantial ledger sample is available."); }
  else if ((network?.recentLedgers.length ?? 0) >= 10) { score += 12; reasons.push("A partial ledger sample is available."); }
  if (ecosystem) {
    const available = ecosystem.sources.filter(source => source.status === "available").length;
    const total = ecosystem.sources.length;
    score += total ? Math.round((available / total) * 25) : 0;
    reasons.push(available + "/" + total + " public ecosystem sources responded.");
    if (ecosystem.apps.totalCount == null && ecosystem.apps.items.length === 0) {
      score = Math.max(0, score - 15);
      reasons.push("The ecosystem app directory is reachable, but its records are not exposed in the current response; app-directory coverage is incomplete.");
    }
  } else reasons.push("Ecosystem observation is unavailable.");
  if (freshness.state === "fresh") score += 15;
  else if (freshness.state === "aging") score += 8;
  else if (freshness.state === "stale") reasons.push("The latest collection did not provide a fresh observation.");
  if (errors.length) reasons.push(String(errors.length) + " observation source error" + (errors.length === 1 ? "" : "s") + " occurred.");
  const bounded = Math.max(0, Math.min(100, score));
  return { score: bounded, level: bounded >= 80 ? "high" : bounded >= 55 ? "medium" : "low", reasons };
}

function healthFor(network: ZafSnapshot | null, ecosystem: EcosystemSnapshot | null, freshness: ObservationFreshness): ObservationHealth {
  const networkScore = network?.latestLedger ? (network.metrics.latestProtocolVersion != null ? 100 : 75) : 0;
  const ecosystemScore = ecosystem ? Math.round((ecosystem.sources.filter(source => source.status === "available").length / Math.max(1, ecosystem.sources.length)) * 100) : 0;
  const freshnessScore = freshness.state === "fresh" ? 100 : freshness.state === "aging" ? 70 : freshness.state === "stale" ? 35 : 0;
  const score = Math.min(network?.error || freshness.state === "stale" ? 54 : 100, Math.round(networkScore * 0.45 + ecosystemScore * 0.35 + freshnessScore * 0.20));
  return { score, status: score >= 80 ? "healthy" : score >= 55 ? "degraded" : "limited", components: { network: networkScore, ecosystem: ecosystemScore, freshness: freshnessScore } };
}

function historyRecord(value: UnifiedObservation): ObservationHistoryRecord {
  const network = value.network;
  const ecosystem = value.ecosystem;
  return {
    generatedAt: value.generatedAt,
    networkScope: "mainnet",
    freshnessState: value.freshness.state,
    confidenceScore: value.confidence.score,
    networkLedger: network?.latestLedger?.sequence ?? null,
    protocolVersion: network?.metrics.latestProtocolVersion ?? null,
    observedTransactions: network?.metrics.recentTransactions ?? null,
    observedOperations: network?.metrics.recentOperations ?? null,
    dailyTransactions: network?.metrics.observedTransactionsPerDay ?? null,
    dailyOperations: network?.metrics.observedOperationsPerDay ?? null,
    observedApps: ecosystem?.apps.totalCount ?? null,
    availableSources: ecosystem?.sources.filter(source => source.status === "available").length ?? 0,
    totalSources: ecosystem?.sources.length ?? 0,
  };
}

async function collect(): Promise<UnifiedObservation> {
  const results = await Promise.allSettled([getZafSnapshot(), getEcosystemSnapshot()]);
  const collectedNetwork = results[0].status === "fulfilled" ? results[0].value : null;
  if (collectedNetwork?.latestLedger && !collectedNetwork.error) lastSuccessfulNetwork = collectedNetwork;
  const networkFailed = !collectedNetwork?.latestLedger || Boolean(collectedNetwork.error);
  const network = networkFailed && lastSuccessfulNetwork ? { ...lastSuccessfulNetwork, error: collectedNetwork?.error ?? "Mainnet source could not be refreshed; showing the last successful observation." } : collectedNetwork;
  const ecosystem = results[1].status === "fulfilled" ? results[1].value : null;
  const errors = results.filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map(result => result.reason instanceof Error ? result.reason.message : "Observation source failed");
  if (network?.error) errors.push(network.error);
  const generatedAt = new Date().toISOString();
  const sourceGeneratedAt = network?.generatedAt ?? ecosystem?.generatedAt ?? null;
  const freshness = freshnessFor(sourceGeneratedAt);
  if (networkFailed && lastSuccessfulNetwork) freshness.state = "stale";
  const value: UnifiedObservation = {
    version: "1.1", generatedAt, freshness,
    confidence: confidenceFor(network, ecosystem, freshness, errors),
    health: healthFor(network, ecosystem, freshness),
    network, ecosystem, errors,
  };
  // A retained old sample is displayed as stale, never stored as a new measurement.
  value.historyStored = networkFailed ? false : await saveObservationSnapshot(historyRecord(value)).catch(() => false);
  return value;
}

export async function getUnifiedObservation(options: { force?: boolean } = {}) {
  if (pending) return pending;
  const now = Date.now();
  if (!options.force && cached && cached.expiresAt > now) return cached.value;
  pending = collect();
  try {
    const value = await pending;
    cached = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    return value;
  } finally { pending = null; }
}
