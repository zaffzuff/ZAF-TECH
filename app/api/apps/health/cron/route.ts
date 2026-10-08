import { NextResponse } from "next/server";
import { runEcosystemHealthChecks } from "@/lib/zaf/app-health-runner";
import { cleanupZafRateLimits } from "@/lib/zaf/rate-limit";

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

  const result = await runEcosystemHealthChecks();
  const rateLimitRowsRemoved = await cleanupZafRateLimits();

  return NextResponse.json(
    {
      ok: true,
      scheduled: true,
      rateLimitRowsRemoved,
      ...result,
    },
    {
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
