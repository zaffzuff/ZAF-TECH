import { NextResponse } from "next/server";
import { getLatestAppChecks, isHistoryStorageConfigured, getAppHealthTrend } from "@/lib/zaf/app-check-history";
import { calculateAppHealthScore } from "@/lib/zaf/app-health-score";
import { assessHealthTrend } from "@/lib/zaf/app-health-trend";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isHistoryStorageConfigured()) {
    return NextResponse.json({ configured: false, records: [], summary: null }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  }

  try {
    const records = (await getLatestAppChecks(20)) ?? [];
    const enriched = await Promise.all(records.map(async record => {
    const score = calculateAppHealthScore({
      reachable: Boolean(record.reachable),
      ok: Boolean(record.ok),
      responseTimeMs: Number(record.responseTimeMs) || 0,
      https: Boolean(record.https),
      redirect: Boolean(record.redirect),
    });
    try {
      const points = await getAppHealthTrend(record.url, 48);
      const trend = assessHealthTrend(points.map(point => ({ checkedAt: point.checkedAt, score: point.score, healthStatus: point.healthStatus })));
      return { ...record, score: score.score, healthStatus: score.status, trend };
    } catch {
      return { ...record, score: score.score, healthStatus: score.status, trend: assessHealthTrend([]) };
    }
  }));

  const averageScore = enriched.length ? Math.round(enriched.reduce((sum, item) => sum + item.score, 0) / enriched.length) : null;
  const healthy = enriched.filter(item => item.healthStatus === "healthy").length;
  const degraded = enriched.filter(item => item.healthStatus === "degraded").length;
  const limited = enriched.filter(item => item.healthStatus === "limited").length;
  const offline = enriched.filter(item => item.healthStatus === "offline").length;
  const declining = enriched.filter(item => item.trend.direction === "declining").length;
  const improving = enriched.filter(item => item.trend.direction === "improving").length;
  const stale = enriched.filter(item => item.trend.freshness.state === "stale" || item.trend.freshness.state === "old").length;
  const attention = enriched.filter(item => item.healthStatus !== "healthy" || item.trend.direction === "declining").length;
  const latestCheckedAt = records.map(item => Date.parse(String(item.checkedAt))).filter(Number.isFinite).reduce((max, value) => Math.max(max, value), 0);

    return NextResponse.json({
      configured: true,
      generatedAt: new Date().toISOString(),
      latestCheckedAt: latestCheckedAt ? new Date(latestCheckedAt).toISOString() : null,
      records: enriched,
      summary: { checked: enriched.length, averageScore, healthy, degraded, limited, offline, declining, improving, stale, attention },
    }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch {
    return NextResponse.json(
      { configured: true, records: [], summary: null, error: "Stored App Health history is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  }
}
