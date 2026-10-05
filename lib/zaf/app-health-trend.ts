export type HealthTrendDirection = "improving" | "stable" | "declining" | "insufficient";
export type HealthFreshnessState = "fresh" | "aging" | "stale" | "old" | "unknown";
export type HealthConfidenceLevel = "high" | "medium" | "low" | "insufficient";

export type HealthTrendAssessment = {
  direction: HealthTrendDirection;
  delta: number | null;
  freshness: { state: HealthFreshnessState; ageSeconds: number | null };
  confidence: {
    score: number;
    level: HealthConfidenceLevel;
    checks: number;
    observedWindowMinutes: number | null;
    cadenceStabilityScore: number;
  };
};

type TrendPoint = { checkedAt: string; score: number; healthStatus: string };

function finiteScores(points: TrendPoint[]) {
  return points.map(point => point.score).filter(score => Number.isFinite(score));
}

export function classifyHealthTrend(points: TrendPoint[]): Pick<HealthTrendAssessment, "direction" | "delta"> {
  const scores = finiteScores(points);
  if (scores.length < 2) return { direction: "insufficient", delta: null };
  const delta = Math.round((scores.at(-1)! - scores[0]) * 10) / 10;
  if (delta >= 5) return { direction: "improving", delta };
  if (delta <= -5) return { direction: "declining", delta };
  return { direction: "stable", delta };
}

export function assessHealthData(points: TrendPoint[], nowMs = Date.now()): HealthTrendAssessment["freshness"] & { confidence: HealthTrendAssessment["confidence"] } {
  const ordered = points.filter(point => Number.isFinite(Date.parse(point.checkedAt)));
  const latestMs = ordered.length ? Date.parse(ordered.at(-1)!.checkedAt) : NaN;
  const ageSeconds = Number.isFinite(latestMs) ? Math.max(0, Math.round((nowMs - latestMs) / 1000)) : null;
  const state: HealthFreshnessState =
    ageSeconds == null ? "unknown" :
    ageSeconds <= 15 * 60 ? "fresh" :
    ageSeconds <= 60 * 60 ? "aging" :
    ageSeconds <= 180 * 60 ? "stale" : "old";

  const checks = ordered.length;
  const observedWindowMinutes = ordered.length >= 2
    ? Math.max(0, Math.round((Date.parse(ordered.at(-1)!.checkedAt) - Date.parse(ordered[0].checkedAt)) / 60000))
    : null;

  const intervals = ordered.slice(1).map((point, index) => (Date.parse(point.checkedAt) - Date.parse(ordered[index].checkedAt)) / 60000).filter(value => value > 0 && Number.isFinite(value));
  const averageInterval = intervals.length ? intervals.reduce((sum, value) => sum + value, 0) / intervals.length : null;
  const variance = averageInterval && intervals.length > 1
    ? intervals.reduce((sum, value) => sum + Math.pow(value - averageInterval, 2), 0) / intervals.length
    : null;
  const coefficientOfVariation = averageInterval && variance != null ? Math.sqrt(variance) / averageInterval : null;
  const cadenceStabilityScore = coefficientOfVariation == null ? 0 : coefficientOfVariation <= 0.35 ? 15 : coefficientOfVariation <= 0.75 ? 8 : 3;

  const checkScore = checks >= 6 ? 35 : checks >= 3 ? 25 : checks >= 1 ? 10 : 0;
  const windowScore = observedWindowMinutes == null ? 0 : observedWindowMinutes >= 120 ? 30 : observedWindowMinutes >= 30 ? 20 : observedWindowMinutes >= 10 ? 10 : 0;
  const freshnessScore = ageSeconds == null ? 0 : ageSeconds <= 15 * 60 ? 20 : ageSeconds <= 60 * 60 ? 15 : ageSeconds <= 180 * 60 ? 5 : 0;
  const score = Math.min(100, checkScore + windowScore + freshnessScore + cadenceStabilityScore);
  const level: HealthConfidenceLevel =
    checks < 2 ? "insufficient" :
    score >= 80 ? "high" :
    score >= 55 ? "medium" : "low";

  return {
    freshness: { state, ageSeconds },
    confidence: { score, level, checks, observedWindowMinutes, cadenceStabilityScore },
  };
}

export function assessHealthTrend(points: TrendPoint[], nowMs = Date.now()): HealthTrendAssessment {
  const trend = classifyHealthTrend(points);
  const data = assessHealthData(points, nowMs);
  return { ...trend, ...data };
}
