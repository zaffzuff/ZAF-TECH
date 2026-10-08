import { NextRequest, NextResponse } from "next/server";
import { getUnifiedObservation } from "@/lib/zaf/observation-engine";
import { enforceRateLimit } from "@/lib/zaf/rate-limit";

export const dynamic = "force-dynamic";

function cleanQuery(value: string) {
  return value.replace(/[<>]/g, "").trim().slice(0, 80);
}

export async function GET(request: NextRequest) {
  const rateLimit = await enforceRateLimit(request, "search", { limit: 60, windowMs: 60_000 });
  if (rateLimit) return rateLimit;

  const q = cleanQuery(request.nextUrl.searchParams.get("q") ?? "");
  if (q.length < 2) return NextResponse.json({ query: q, results: [] }, { headers: { "Cache-Control": "no-store" } });

  const observation = await getUnifiedObservation();
  const needle = q.toLowerCase();
  const results: Array<{ type: "app" | "source" | "signal" | "ledger"; title: string; detail: string; href: string }> = [];

  for (const app of observation.ecosystem?.apps.items ?? []) {
    if ((app.name + " " + app.url).toLowerCase().includes(needle)) {
      const slug = app.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "app";
      results.push({ type: "app", title: app.name, detail: app.url, href: "/ecosystem/" + slug });
    }
    if (results.length >= 20) break;
  }

  for (const source of observation.ecosystem?.sources ?? []) {
    if ((source.label + " " + source.url).toLowerCase().includes(needle)) {
      results.push({ type: "source", title: source.label, detail: source.url, href: source.url });
    }
  }

  for (const signal of observation.ecosystem?.signals ?? []) {
    if ((signal.title + " " + signal.detail).toLowerCase().includes(needle)) {
      results.push({ type: "signal", title: signal.title, detail: signal.detail, href: signal.sourceUrl ?? "/?section=intelligence&subtab=Activity%20Signals" });
    }
    if (results.length >= 35) break;
  }

  const latest = observation.network?.latestLedger;
  if (latest && (latest.sequence.includes(needle) || latest.hash.toLowerCase().includes(needle))) {
    results.push({
      type: "ledger",
      title: "Ledger " + latest.sequence,
      detail: latest.hash,
      href: "/?section=overview&subtab=Network&ledger=" + latest.sequence,
    });
  }

  return NextResponse.json(
    { query: q, results: results.slice(0, 40), generatedAt: observation.generatedAt },
    { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" } },
  );
}
