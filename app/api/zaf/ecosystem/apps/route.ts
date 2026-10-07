
import { NextResponse } from "next/server";
import { getEcosystemAppObservations } from "@/lib/zaf/ecosystem-app-observations";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET() {
  const data = await getEcosystemAppObservations(200);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
