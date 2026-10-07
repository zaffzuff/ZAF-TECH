import { NextResponse } from "next/server";
import { getEcosystemStatistics } from "@/lib/zaf/ecosystem-statistics";

export const dynamic = "force-dynamic";

export async function GET() {
  const statistics = await getEcosystemStatistics();

  return NextResponse.json(statistics, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
