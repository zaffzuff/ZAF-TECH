import { NextResponse } from "next/server";
import { runEcosystemHealthChecks } from "@/lib/zaf/app-health-runner";
import { enforceRateLimit } from "@/lib/zaf/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const blocked = await enforceRateLimit(request, "app-health-run", { limit: 3, windowMs: 60_000 });
  if (blocked) return blocked;
  const result = await runEcosystemHealthChecks();

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
