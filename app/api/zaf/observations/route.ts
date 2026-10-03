import { NextResponse } from "next/server";
import { getUnifiedObservation } from "@/lib/zaf/observation-engine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const observation = await getUnifiedObservation();
  return NextResponse.json(observation, {
    headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" },
  });
}
