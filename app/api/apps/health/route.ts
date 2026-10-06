import { NextResponse } from "next/server";
import { calculateAppHealthScore } from "@/lib/zaf/app-health-score";
import { assessHealthTrend } from "@/lib/zaf/app-health-trend";
import { getAppHealthTrend, getLatestAppChecks } from "@/lib/zaf/app-check-history";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = await getLatestAppChecks(20);

  if (!checks) {
    return NextResponse.json(
      { error: "No health observation store is configured." },
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  const results = await Promise.all(
    checks.map(async (check) => {
      const score = calculateAppHealthScore({
        reachable: Boolean(check.reachable),
        ok: Boolean(check.ok),
        responseTimeMs: Number(check.responseTimeMs) || 0,
        https: Boolean(check.https),
        redirect: Boolean(check.redirect),
      });
      let trend = assessHealthTrend([]);

      try {
        const points = await getAppHealthTrend(check.url, 48);
        trend = assessHealthTrend(
          points.map((point) => ({
            checkedAt: point.checkedAt,
            score: point.score,
            healthStatus: point.healthStatus,
          })),
        );
      } catch {
        // A missing history must not make the cached observation unavailable.
      }

      return {
        name: check.appName,
        url: check.url,
        check,
        score,
        trend,
      };
    }),
  );

  const reachable = results.filter((item) => item.check.reachable).length;
  const online = results.filter((item) => item.check.ok).length;
  const averageScore = results.length
    ? Math.round(results.reduce((sum, item) => sum + item.score.score, 0) / results.length)
    : null;

  return NextResponse.json(
    {
      generatedAt: results.length
        ? results.reduce((latest, item) =>
            Date.parse(item.check.checkedAt) > Date.parse(latest)
              ? item.check.checkedAt
              : latest, results[0].check.checkedAt)
        : new Date(0).toISOString(),
      source: true,
      limit: 20,
      checked: results.length,
      summary: {
        reachable,
        online,
        offline: results.length - reachable,
        averageScore,
        healthy: results.filter((item) => item.score.status === "healthy").length,
        degraded: results.filter((item) => item.score.status === "degraded").length,
        limited: results.filter((item) => item.score.status === "limited").length,
        declining: results.filter((item) => item.trend.direction === "declining").length,
        improving: results.filter((item) => item.trend.direction === "improving").length,
        stale: results.filter((item) => item.trend.freshness.state === "stale" || item.trend.freshness.state === "old").length,
        attention: results.filter((item) => item.score.status !== "healthy" || item.trend.direction === "declining").length,
      },
      results,
    },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300" } },
  );
}
