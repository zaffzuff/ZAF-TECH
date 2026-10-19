import { NextRequest, NextResponse } from "next/server";
import { piSessionCookieOptions } from "@/lib/zaf/pi/session";

export const dynamic = "force-dynamic";
const PROBE_COOKIE = "__Host-zaf-pi-storage-probe";

// This constant is only a browser capability probe, never a session credential.
export async function GET(request: NextRequest) {
  const response = NextResponse.json({ available: request.cookies.get(PROBE_COOKIE)?.value === "1" }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
  response.cookies.set(PROBE_COOKIE, "1", { ...piSessionCookieOptions, maxAge: 300 });
  return response;
}
