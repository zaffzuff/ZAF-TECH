import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/zaf/rate-limit";
import { getPiRuntimeConfig } from "@/lib/zaf/pi/runtime";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = await enforceRateLimit(
    request,
    "pi-auth-config",
    { limit: 60, windowMs: 60_000, failClosed: false },
  );
  if (rateLimit) return rateLimit;

  const config = getPiRuntimeConfig();

  return NextResponse.json(
    {
      enabled: config.compatible,
      environment: config.environment,
      network: config.network,
      sandbox: config.sdkSandbox,
      sdkVersion: config.sdkVersion,
      sdkScriptUrl: config.sdkScriptUrl,
      compatible: config.compatible,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
