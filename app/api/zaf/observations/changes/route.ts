import { NextResponse } from "next/server";
import { getObservationChanges } from "@/lib/zaf/observation-changes";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getObservationChanges();
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
