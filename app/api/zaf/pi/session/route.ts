import { NextRequest, NextResponse } from "next/server";
import { assertPiSameOrigin } from "@/lib/zaf/pi/auth-input";
import { PI_SESSION_COOKIE, readPiSession, piSessionCookieOptions } from "@/lib/zaf/pi/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = readPiSession(request.cookies.get(PI_SESSION_COOKIE)?.value);
  return NextResponse.json({ user: user ? { username: user.username } : null }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function DELETE(request: NextRequest) {
  try { assertPiSameOrigin(request); } catch {
    return NextResponse.json({ error: "A same-origin request is required." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(PI_SESSION_COOKIE, "", { ...piSessionCookieOptions, maxAge: 0 });
  return response;
}
