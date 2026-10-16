import { NextResponse } from "next/server";
import { readMonitorStatus } from "@/lib/zaf/monitor-status";
import { getObservationHistory } from "@/lib/zaf/observation-history";
import { observationFreshness } from "@/lib/zaf/freshness";

export const dynamic = "force-dynamic";

export async function GET() {
  const [monitoring, history] = await Promise.all([readMonitorStatus(), getObservationHistory(1)]);
  const latest = history[0];
  const age = (value: string | null | undefined) => value && Number.isFinite(Date.parse(value)) ? Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 1000)) : null;
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    access: "free_public", paymentsEnabled: false,
    monitoring: { ...monitoring, ageSeconds: age(monitoring.latestScheduledRun?.checkedAt), expectedIntervalSeconds: 86400, overdue: monitoring.latestScheduledRun ? (age(monitoring.latestScheduledRun.checkedAt) ?? Infinity) > 129600 : null },
    latestObservation: latest ? { generatedAt: latest.generatedAt, ageSeconds: age(latest.generatedAt), protocol: latest.protocolVersion, ledger: latest.networkLedger, freshnessAtCollection: latest.freshnessState, freshness: observationFreshness(latest.generatedAt).state } : null,
  }, { headers: { "Cache-Control": "no-store" } });
}
