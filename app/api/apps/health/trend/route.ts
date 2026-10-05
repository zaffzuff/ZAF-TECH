import { NextResponse } from "next/server";
import { getAppHealthTrend, isHistoryStorageConfigured } from "@/lib/zaf/app-check-history";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url")?.trim();
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });
  if (!isHistoryStorageConfigured()) {
    return NextResponse.json({ configured: false, url, points: [], summary: null }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }
  const points = await getAppHealthTrend(url, 48);
  const checks = points.length;
  const reachable = points.filter((p) => p.reachable).length;
  const online = points.filter((p) => p.reachable && p.status != null && p.status >= 200 && p.status < 400).length;
  const responseTimes = points.map((p) => p.responseTimeMs).filter((n) => Number.isFinite(n) && n >= 0);
  const averageResponseTimeMs = responseTimes.length ? Math.round(responseTimes.reduce((sum, n) => sum + n, 0) / responseTimes.length) : null;
  const healthScores = points.map((p) => p.score).filter((n) => Number.isFinite(n));
  const averageHealthScore = healthScores.length ? Math.round(healthScores.reduce((sum, n) => sum + n, 0) / healthScores.length) : null;
  let transitions = 0;
  for (let i = 1; i < points.length; i += 1) if (points[i].reachable !== points[i - 1].reachable) transitions += 1;
  return NextResponse.json({
    configured: true,
    url,
    points,
    summary: {
      checks,
      reachable,
      offline: checks - reachable,
      reachabilityRate: checks ? Math.round((reachable / checks) * 100) : null,
      online,
      onlineRate: checks ? Math.round((online / checks) * 100) : null,
      averageResponseTimeMs,
      averageHealthScore,
      transitions,
      firstCheckedAt: points[0]?.checkedAt ?? null,
      lastCheckedAt: points.at(-1)?.checkedAt ?? null,
    },
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
