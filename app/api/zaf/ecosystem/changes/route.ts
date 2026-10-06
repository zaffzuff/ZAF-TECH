
import { NextResponse } from "next/server";
import { getEcosystemChanges } from "@/lib/zaf/ecosystem-changes";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET() {
  const result = await getEcosystemChanges();
  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
