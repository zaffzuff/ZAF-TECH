import { NextResponse } from "next/server";
import { getRadarObservation } from "@/lib/zaf/radar";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getRadarObservation();
  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
