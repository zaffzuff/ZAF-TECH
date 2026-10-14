import { ensureZafSchema, getZafDb, isZafDatabaseConfigured } from "./db";

export type MonitorRun = {
  checkedAt: string;
  status: "healthy" | "limited" | "failed";
  networkObserved: boolean;
  protocol: number | null;
  newsAvailable: boolean;
  directoryRecords: number;
  historyStored: boolean;
  appsChecked: number;
};

export async function saveMonitorRun(run: MonitorRun) {
  const sql = getZafDb();
  if (!sql) return false;
  try {
    if (!(await ensureZafSchema())) return false;
    await sql`INSERT INTO zaf_monitor_status (id, checked_at, payload)
      VALUES (1, ${run.checkedAt}, ${sql.json(run)})
      ON CONFLICT (id) DO UPDATE SET checked_at = EXCLUDED.checked_at, payload = EXCLUDED.payload`;
    return true;
  } catch (error) {
    console.error("[ZAF Tech] Monitor checkpoint write failed", error instanceof Error ? error.name : "UnknownError");
    return false;
  }
}

export async function readMonitorStatus() {
  const sql = getZafDb();
  if (!sql) return { storage: "not_configured" as const, latestScheduledRun: null };
  try {
    if (!(await ensureZafSchema())) return { storage: "unavailable" as const, latestScheduledRun: null };
    const rows = await sql`SELECT payload FROM zaf_monitor_status WHERE id = 1`;
    return { storage: "available" as const, latestScheduledRun: (rows[0]?.payload as MonitorRun | undefined) ?? null };
  } catch {
    return { storage: isZafDatabaseConfigured() ? "unavailable" as const : "not_configured" as const, latestScheduledRun: null };
  }
}
