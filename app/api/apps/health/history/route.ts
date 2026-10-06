import { NextResponse } from "next/server";
import { getAppCheckHistory, isHistoryStorageConfigured } from "@/lib/zaf/app-check-history";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url")?.trim();

  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  if (!isHistoryStorageConfigured()) {
    return NextResponse.json({
      configured: false,
      url,
      records: [],
      note: "Historical storage is not configured.",
    });
  }

  let records;
  try {
    records = await getAppCheckHistory(url);
  } catch {
    return NextResponse.json(
      { configured: true, url, records: [], error: "Stored App Health history is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  return NextResponse.json({
    configured: true,
    url,
    records: records ?? [],
  }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
