import { NextRequest, NextResponse } from "next/server";
import { getDefiSnapshotHistory, isDefiHistoryConfigured } from "@/lib/zaf/defi-history";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "50");
  const history = await getDefiSnapshotHistory(Number.isFinite(limit) ? limit : 50);
  return NextResponse.json({
    configured: isDefiHistoryConfigured(),
    count: history.length,
    snapshots: history,
  }, {
    headers: { "Cache-Control": "no-store", "max-age=0" },
  });
}
