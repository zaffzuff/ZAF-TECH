import { NextResponse } from "next/server";
import { readMonitorStatus } from "@/lib/zaf/monitor-status";
import { getObservationHistory } from "@/lib/zaf/observation-history";

export const dynamic = "force-dynamic";

export async function GET() {
  const [monitoring, history] = await Promise.all([readMonitorStatus(), getObservationHistory(1)]);
  const latest = history[0];
  const age = (value: string | null | undefined) => value && Number.isFinite(Date.parse(value)) ? Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 1000)) : null;
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    access: "free_public", paymentsEnabled: false,
    monitoring: { ...monitoring, ageSeconds: age(monitoring.latestScheduledRun?.checkedAt), expectedIntervalSeconds: 86400, overdue: monitoring.latestScheduledRun ? (age(monitoring.latestScheduledRun.checkedAt) ?? Infinity) > 129600 : null },
    latestObservation: latest ? { generatedAt: latest.generatedAt, ageSeconds: age(latest.generatedAt), protocol: latest.protocolVersion, ledger: latest.networkLedger, freshness: latest.freshnessState } : null,
  }, { headers: { "Cache-Control": "no-store" } });
}
