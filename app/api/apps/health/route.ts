import { NextResponse } from "next/server";
import { runEcosystemHealthChecks } from "@/lib/zaf/app-health-runner";
import { enforceRateLimit } from "@/lib/zaf/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Each run may probe up to 20 external hosts and write history. Bound public
  // invocations separately from the authenticated scheduled cron route.
  const rateLimit = await enforceRateLimit(request, "app-health-run", { limit: 5, windowMs: 60_000 });
  if (rateLimit) return rateLimit;

  const result = await runEcosystemHealthChecks();

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
