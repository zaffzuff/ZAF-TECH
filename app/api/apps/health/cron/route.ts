import { NextResponse } from "next/server";
import { runEcosystemHealthChecks } from "@/lib/zaf/app-health-runner";
import { cleanupZafRateLimits } from "@/lib/zaf/rate-limit";
import { getUnifiedObservation } from "@/lib/zaf/observation-engine";

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

  return NextResponse.json(
    {
      ok: true,
      scheduled: true,
      rateLimitRowsRemoved,
      observation: {
        generatedAt: observation.generatedAt,
        networkObserved: Boolean(observation.network?.latestLedger),
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
