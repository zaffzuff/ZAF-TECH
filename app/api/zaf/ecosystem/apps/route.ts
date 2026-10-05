import { NextResponse } from "next/server";
import { getEcosystemAppObservations } from "@/lib/zaf/ecosystem-app-observations";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const data = await getEcosystemAppObservations(200);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
