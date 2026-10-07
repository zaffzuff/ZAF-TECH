import { NextResponse } from "next/server";
import { getDefiObservation } from "@/lib/zaf/defi-observation";
import { saveDefiSnapshot, toDefiHistorySnapshot } from "@/lib/zaf/defi-history";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const observation = await getDefiObservation(100);
  if (observation.summary.state === "unavailable") {
    return NextResponse.json(
      { ok: false, scheduled: true, error: "DeFi observation unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  const saved = await saveDefiSnapshot(toDefiHistorySnapshot(observation));

  return NextResponse.json(
    { ok: true, scheduled: true, saved, generatedAt: observation.generatedAt },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
