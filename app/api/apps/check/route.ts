import { NextResponse } from "next/server";
import { checkAppHealth } from "@/lib/zaf/app-health";
import { calculateAppHealthScore } from "@/lib/zaf/app-health-score";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get("url")?.trim();

  if (!target) {
    return NextResponse.json(
      { error: "A public HTTP(S) URL is required." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await checkAppHealth(target);
  const score = calculateAppHealthScore(result);

  return NextResponse.json({ ...result, score: score.score, healthStatus: score.status, scoreFactors: score.factors }, {
    status: result.error === "A public HTTP(S) URL is required." ? 400 : 200,
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
  });
}
