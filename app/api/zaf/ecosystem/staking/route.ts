import { NextResponse } from "next/server";
import { getEcosystemStakingOverview } from "@/lib/zaf/ecosystem-staking";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(getEcosystemStakingOverview(), {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
