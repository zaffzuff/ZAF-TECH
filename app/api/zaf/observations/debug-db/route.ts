import { NextResponse } from "next/server";
import postgres from "postgres";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.DATABASE_URL;
  if (!url) return NextResponse.json({ configured: false });

  const sql = postgres(url, { max: 1, prepare: false });
  try {
    const table = await sql.unsafe('SELECT to_regclass($1) AS "table"', ["public.zaf_observation_snapshots"]);
    const columns = await sql.unsafe('SELECT column_name AS "column", data_type AS "type", is_nullable AS "nullable" FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position', ["public", "zaf_observation_snapshots"]);
    let writeTest: { ok: boolean; error: string | null } = { ok: false, error: null };
    try {
      await sql.unsafe("BEGIN");
      await sql.unsafe(
        "INSERT INTO zaf_observation_snapshots " +
        "(bucket_start, generated_at, freshness_state, confidence_score, network_ledger, protocol_version, observed_transactions, observed_operations, daily_transactions, daily_operations, observed_apps, available_sources, total_sources) " +
        "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (bucket_start) DO NOTHING",
        [new Date("2000-01-01T00:00:00.000Z"), new Date("2000-01-01T00:00:00.000Z"), "fresh", 0, "diagnostic", 0, 0, 0, 0, 0, null, 0, 0]
      );
      await sql.unsafe("ROLLBACK");
      writeTest = { ok: true, error: null };
    } catch (error) {
      try { await sql.unsafe("ROLLBACK"); } catch {}
      writeTest = { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
    const rows = await sql.unsafe('SELECT count(*)::int AS "count", max(generated_at) AS "newest" FROM zaf_observation_snapshots');
    return NextResponse.json({ configured: true, table: table[0]?.table ?? null, columns, writeTest, rowCount: rows[0]?.count ?? 0, newestGeneratedAt: rows[0]?.newest ?? null }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ configured: true, error: error instanceof Error ? error.message : String(error) }, { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } });
  } finally {
    await sql.end();
  }
}
