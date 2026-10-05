import { NextResponse } from "next/server";
import { getProtocolHistory } from "@/lib/zaf/protocol-history";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const history = await getProtocolHistory(120);
  return NextResponse.json(history, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
