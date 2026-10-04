import { NextResponse } from "next/server";
import { getObservationTimeline } from "@/lib/zaf/observation-timeline";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getObservationTimeline(24);
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
