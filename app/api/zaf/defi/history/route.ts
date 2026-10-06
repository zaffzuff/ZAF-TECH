import { NextRequest, NextResponse } from "next/server";
import { getDefiSnapshotHistory, isDefiHistoryConfigured } from "@/lib/zaf/defi-history";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.floor(rawLimit), 1), 200) : 50;
  let history;
  try {
    history = await getDefiSnapshotHistory(limit);
  } catch {
    return NextResponse.json(
      { configured: isDefiHistoryConfigured(), count: 0, snapshots: [], error: "Stored DeFi history is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  }
  return NextResponse.json({
    configured: isDefiHistoryConfigured(),
    count: history.length,
    snapshots: history,
  }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
