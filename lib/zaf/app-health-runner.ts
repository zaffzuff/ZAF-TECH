import { getEcosystemSnapshot } from "@/lib/zaf/ecosystem";
import { checkAppHealth, type AppHealthCheck } from "@/lib/zaf/app-health";
import { saveAppChecks } from "@/lib/zaf/app-check-history";
import { saveEcosystemSnapshot } from "@/lib/zaf/ecosystem-history";
import { calculateAppHealthScore, type AppHealthScore } from "@/lib/zaf/app-health-score";

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
  };
  results: Array<{
    name: string;
    url: string;
    check: AppHealthCheck;
    score: AppHealthScore;
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

  const reachable = results.filter((item) => item.check.reachable).length;
  const online = results.filter((item) => item.check.ok).length;
  const averageScore = results.length ? Math.round(results.reduce((sum, item) => sum + item.score.score, 0) / results.length) : null;
  const healthy = results.filter((item) => item.score.status === "healthy").length;
  const degraded = results.filter((item) => item.score.status === "degraded").length;
  const limited = results.filter((item) => item.score.status === "limited").length;

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
    },
    results,
  };
}
