
import { NextRequest, NextResponse } from "next/server";
import { getHistoricalLedgerPage } from "@/lib/zaf/historical-engine";
import { rateLimit } from "@/lib/zaf/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rate = rateLimit(request, { prefix: "zaf-historical", limit: 30, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  try {
    const cursor = request.nextUrl.searchParams.get("cursor");
    const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? "200");
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.floor(rawLimit), 1), 200) : 200;
    const page = await getHistoricalLedgerPage(cursor, limit);

    return NextResponse.json(page, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        "X-RateLimit-Limit": "30",
        "X-RateLimit-Remaining": String(rate.remaining),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Historical Pi Mainnet request failed" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
