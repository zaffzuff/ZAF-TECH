import { NextResponse } from "next/server";
import { getEcosystemChanges } from "@/lib/zaf/ecosystem-changes";
import { getUnifiedObservation } from "@/lib/zaf/observation-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getEcosystemChanges((await getUnifiedObservation()).ecosystem ?? undefined);
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
