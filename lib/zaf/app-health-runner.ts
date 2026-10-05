import { getEcosystemSnapshot } from "@/lib/zaf/ecosystem";
import { checkAppHealth, type AppHealthCheck } from "@/lib/zaf/app-health";
import { saveAppChecks } from "@/lib/zaf/app-check-history";
import { saveEcosystemSnapshot } from "@/lib/zaf/ecosystem-history";
import { calculateAppHealthScore, type AppHealthScore } from "@/lib/zaf/app-health-score";
import { assessHealthTrend } from "@/lib/zaf/app-health-trend";
import { getAppHealthTrend } from "@/lib/zaf/app-check-history";

export const MAX_APPS = 20;

export type EcosystemHealthRun = {
  generatedAt: string;
  source: boolean;
  limit: number;
  checked: number;
  summary: {
    reachable: number;
    online: number;
    offline: number;
    averageScore: number | null;
    healthy: number;
    degraded: number;
    limited: number;
    declining: number;
    improving: number;
    stale: number;
    attention: number;
  };
  results: Array<{
    name: string;
    url: string;
    check: AppHealthCheck;
    score: AppHealthScore;
    trend: ReturnType<typeof assessHealthTrend>;
  }>;
};

export async function runEcosystemHealthChecks(): Promise<EcosystemHealthRun> {
  const ecosystem = await getEcosystemSnapshot();
  const apps = ecosystem.apps.items.slice(0, MAX_APPS);

  const results = await Promise.all(
    apps.map(async (app) => {
      const check = await checkAppHealth(app.url);
      return {
        name: app.name,
        url: app.url,
        check,
        score: calculateAppHealthScore(check),
      };
    }),
  );

  try {
    await saveAppChecks(results.map((item) => ({ appName: item.name, ...item.check })));
  } catch {
    // Persistence is best-effort; an unavailable database must not break live checks.
  }

  try {
    await saveEcosystemSnapshot({
      generatedAt: new Date().toISOString(),
      sourceAvailable: ecosystem.apps.sourceAvailable,
      observedAppCount: ecosystem.apps.totalCount,
      payload: ecosystem,
    });
  } catch {
    // Snapshot persistence is best-effort.
  }

  const enrichedResults = await Promise.all(results.map(async (item) => {
    try {
      const points = await getAppHealthTrend(item.url, 48);
      const trend = assessHealthTrend(points.map(point => ({ checkedAt: point.checkedAt, score: point.score, healthStatus: point.healthStatus })));
      return { ...item, trend };
    } catch {
      return {
        ...item,
        trend: assessHealthTrend([]),
      };
    }
  }));

  const reachable = enrichedResults.filter((item) => item.check.reachable).length;
  const online = enrichedResults.filter((item) => item.check.ok).length;
  const averageScore = enrichedResults.length ? Math.round(enrichedResults.reduce((sum, item) => sum + item.score.score, 0) / enrichedResults.length) : null;
  const healthy = enrichedResults.filter((item) => item.score.status === "healthy").length;
  const degraded = enrichedResults.filter((item) => item.score.status === "degraded").length;
  const limited = enrichedResults.filter((item) => item.score.status === "limited").length;
  const declining = enrichedResults.filter((item) => item.trend.direction === "declining").length;
  const improving = enrichedResults.filter((item) => item.trend.direction === "improving").length;
  const stale = enrichedResults.filter((item) => item.trend.freshness.state === "stale" || item.trend.freshness.state === "old").length;
  const attention = enrichedResults.filter((item) => item.score.status !== "healthy" || item.trend.direction === "declining").length;

  return {
    generatedAt: new Date().toISOString(),
    source: ecosystem.apps.sourceAvailable,
    limit: MAX_APPS,
    checked: results.length,
    summary: {
      reachable,
      online,
      offline: results.length - reachable,
      averageScore,
      healthy,
      degraded,
      limited,
      declining,
      improving,
      stale,
      attention,
    },
    results: enrichedResults,
  };
}
