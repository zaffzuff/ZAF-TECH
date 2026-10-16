import { NextResponse } from "next/server";
import { runEcosystemHealthChecks } from "@/lib/zaf/app-health-runner";
import { cleanupZafRateLimits } from "@/lib/zaf/rate-limit";
import { getUnifiedObservation } from "@/lib/zaf/observation-engine";
import { saveMonitorRun } from "@/lib/zaf/monitor-status";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const observation = await getUnifiedObservation({ force: true });
  const result = await runEcosystemHealthChecks(observation.ecosystem);
  const rateLimitRowsRemoved = await cleanupZafRateLimits();
  const networkObserved = Boolean(observation.network?.latestLedger) && !observation.network?.error && observation.freshness?.state !== "stale" && observation.freshness?.state !== "unknown";
  const newsAvailable = observation.ecosystem?.newsMetadata.status === "available";
  const historyStored = observation.historyStored === true;
  const monitorStored = await saveMonitorRun({
    checkedAt: new Date().toISOString(),
    status: !networkObserved || !newsAvailable ? "failed" : !historyStored || !observation.ecosystem?.apps.items.length ? "limited" : "healthy",
    networkObserved, protocol: observation.network?.metrics?.latestProtocolVersion ?? null,
    newsAvailable, directoryRecords: observation.ecosystem?.apps.items.length ?? 0,
    historyStored, appsChecked: result.checked,
  });

  return NextResponse.json(
    {
      ok: true,
      scheduled: true,
      historyStored,
      monitorStored,
      rateLimitRowsRemoved,
      observation: {
        generatedAt: observation.generatedAt,
        networkObserved,
        news: observation.ecosystem?.newsMetadata ?? null,
        errors: observation.errors,
      },
      ...result,
    },
    {
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
