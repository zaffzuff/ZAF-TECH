import { NextResponse } from "next/server";
import postgres from "postgres";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return NextResponse.json({ configured: false, error: "DATABASE_URL is not configured." }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  const sql = postgres(url, { max: 1, prepare: false });
  const now = new Date();
  const cutoff = new Date(now.getTime() - 300_000);

  try {
    const rows = await sql`
      SELECT
        bucket_start AS "bucketStart",
        generated_at AS "generatedAt",
        daily_transactions AS "dailyTransactions",
        daily_operations AS "dailyOperations",
        available_sources AS "availableSources",
        total_sources AS "totalSources"
      FROM zaf_observation_snapshots
      ORDER BY generated_at DESC
      LIMIT 20
    `;

    const candidate = rows.find((row) => {
      const t = Date.parse(String(row.generatedAt));
      return Number.isFinite(t) && t <= cutoff.getTime();
    }) ?? null;

    return NextResponse.json({
      configured: true,
      now: now.toISOString(),
      cutoff: cutoff.toISOString(),
      count: rows.length,
      newestGeneratedAt: rows[0]?.generatedAt ?? null,
      oldestReturnedGeneratedAt: rows.at(-1)?.generatedAt ?? null,
      candidateForFiveMinuteBaseline: candidate ? {
        generatedAt: candidate.generatedAt,
        bucketStart: candidate.bucketStart,
        dailyTransactions: candidate.dailyTransactions,
        dailyOperations: candidate.dailyOperations,
      } : null,
      rows,
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({
      configured: true,
      now: now.toISOString(),
      cutoff: cutoff.toISOString(),
      querySucceeded: false,
      error: "Observation history query failed.",
    }, { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } });
  } finally {
    await sql.end();
  }
}
