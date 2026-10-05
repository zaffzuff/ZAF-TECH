import postgres from "postgres";
import { calculateAppHealthScore } from "@/lib/zaf/app-health-score";

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

let sqlClient: ReturnType<typeof postgres> | null = null;
let appChecksSchemaReady = false;

function getClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  if (!sqlClient) {
    sqlClient = postgres(connectionString, {
      max: 2,
      prepare: false,
    });
  }
  return sqlClient;
}

export function isHistoryStorageConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export async function ensureAppChecksTable() {
  if (appChecksSchemaReady) return true;
  const sql = getClient();
  if (!sql) return false;

  await sql`
    CREATE TABLE IF NOT EXISTS zaf_app_checks (
      id BIGSERIAL PRIMARY KEY,
      app_name TEXT NOT NULL,
      url TEXT NOT NULL,
      status INTEGER,
      ok BOOLEAN NOT NULL,
      reachable BOOLEAN NOT NULL,
      response_time_ms INTEGER NOT NULL,
      https BOOLEAN NOT NULL,
      redirect BOOLEAN NOT NULL,
      checked_at TIMESTAMPTZ NOT NULL,
      error TEXT
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS zaf_app_checks_url_checked_at_idx
    ON zaf_app_checks (url, checked_at DESC)
  `;
  appChecksSchemaReady = true;
  return true;
}

export async function saveAppChecks(records: AppCheckRecord[]) {
  const sql = getClient();
  if (!sql || records.length === 0) return false;

  await ensureAppChecksTable();

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
  const sql = getClient();
  if (!sql) return null;

  await ensureAppChecksTable();

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
  const sql = getClient();
  if (!sql) return null;

  await ensureAppChecksTable();

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
