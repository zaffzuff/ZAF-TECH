import { calculateAppHealthScore } from "@/lib/zaf/app-health-score";
import { ensureZafSchema, getZafDb, isZafDatabaseConfigured } from "@/lib/zaf/db";

export type AppCheckRecord = {
  appName: string;
  url: string;
  status: number | null;
  ok: boolean;
  reachable: boolean;
  responseTimeMs: number;
  https: boolean;
  redirect: boolean;
  checkedAt: string;
  error: string | null;
};


export function isHistoryStorageConfigured() {
  return isZafDatabaseConfigured();
}

export async function ensureAppChecksTable() {
  return ensureZafSchema();
}

export async function saveAppChecks(records: AppCheckRecord[]) {
  const sql = getZafDb();
  if (!sql || records.length === 0) return false;
  if (!(await ensureZafSchema())) return false;


  await sql.begin(async (tx) => {
    for (const record of records) {
      await tx`
        INSERT INTO zaf_app_checks
          (app_name, url, status, ok, reachable, response_time_ms, https, redirect, checked_at, error)
        VALUES
          (${record.appName}, ${record.url}, ${record.status}, ${record.ok},
           ${record.reachable}, ${record.responseTimeMs}, ${record.https},
           ${record.redirect}, ${record.checkedAt}, ${record.error})
      `;
    }
  });

  return true;
}

export async function getLatestAppChecks(limit = 20) {
  const sql = getZafDb();
  if (!sql) return null;
  if (!(await ensureZafSchema())) return null;


  return sql`
    SELECT DISTINCT ON (url)
      app_name AS "appName",
      url,
      status,
      ok,
      reachable,
      response_time_ms AS "responseTimeMs",
      https,
      redirect,
      checked_at AS "checkedAt",
      error
    FROM zaf_app_checks
    ORDER BY url, checked_at DESC
    LIMIT ${Math.min(Math.max(limit, 1), 100)}
  `;
}

export async function getAppCheckHistory(url: string, limit = 50) {
  const sql = getZafDb();
  if (!sql) return null;
  if (!(await ensureZafSchema())) return null;


  return sql`
    SELECT
      app_name AS "appName",
      url,
      status,
      ok,
      reachable,
      response_time_ms AS "responseTimeMs",
      https,
      redirect,
      checked_at AS "checkedAt",
      error
    FROM zaf_app_checks
    WHERE url = ${url}
    ORDER BY checked_at DESC
    LIMIT ${Math.min(Math.max(limit, 1), 200)}
  `;
}

export async function getAppHealthTrend(url: string, limit = 48) {
  const records = (await getAppCheckHistory(url, limit)) ?? [];
  return records.reverse().map((record) => {
    const score = calculateAppHealthScore({
      reachable: Boolean(record.reachable),
      ok: Boolean(record.ok),
      responseTimeMs: Number(record.responseTimeMs) || 0,
      https: Boolean(record.https),
      redirect: Boolean(record.redirect),
    });
    return {
      checkedAt: record.checkedAt,
      reachable: record.reachable,
      responseTimeMs: record.responseTimeMs,
      status: record.status,
      https: record.https,
      redirect: record.redirect,
      score: score.score,
      healthStatus: score.status,
    };
  });
}
