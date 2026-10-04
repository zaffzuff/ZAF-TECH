import { NextResponse } from "next/server";
import { getRadarObservation } from "@/lib/zaf/radar";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getRadarObservation();
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
