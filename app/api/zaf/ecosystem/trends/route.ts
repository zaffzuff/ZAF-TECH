import { NextResponse } from "next/server";
import { getEcosystemTrends } from "@/lib/zaf/ecosystem-trends";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getEcosystemTrends(48);
  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
