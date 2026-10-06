import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/zaf/rate-limit";
import { getEcosystemSnapshot } from "@/lib/zaf/ecosystem";
import { slugify, toDirectoryApp } from "@/lib/zaf/app-directory";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const rate = rateLimit(request, { prefix: "zaf-ecosystem-app", limit: 60, windowMs: 60_000 });
  if (!rate.allowed) return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(rate.retryAfterSeconds) } });

  const { slug } = await context.params;
  const snapshot = await getEcosystemSnapshot();
  const app = snapshot.apps.items
    .map((item) => toDirectoryApp(item, snapshot.generatedAt))
    .find((item) => item.slug === slug);

  if (!app) {
    return NextResponse.json({ error: "App not found", slug }, { status: 404 });
  }

  return NextResponse.json({
    app,
    source: snapshot.apps.sourceAvailable ? "Pi Ecosystem source" : "unavailable",
    sourceUrl: app.url,
    generatedAt: snapshot.generatedAt,
  }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900", "X-RateLimit-Limit": "60", "X-RateLimit-Remaining": String(rate.remaining) } });
}
