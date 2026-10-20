import { NextRequest, NextResponse } from "next/server";
import { assertPiSameOrigin } from "@/lib/zaf/pi/auth-input";
import { PI_SESSION_COOKIE, PI_LEGACY_SESSION_COOKIE, readPiSession, readPiPageSessionRequest, piSessionCookieOptions, piLegacyCookieClearOptions } from "@/lib/zaf/pi/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Explicit transport selection prevents a missing/invalid page credential
  // from restoring a different account from an old browser cookie.
  const user = request.headers.get("x-zaf-pi-session-transport") === "memory"
    ? readPiPageSessionRequest(request) : readPiSession(request.cookies.get(PI_SESSION_COOKIE)?.value);
  return NextResponse.json({ user: user ? { username: user.username } : null }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function DELETE(request: NextRequest) {
  try { assertPiSameOrigin(request); } catch {
    return NextResponse.json({ error: "A same-origin request is required." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  if (request.headers.get("x-zaf-pi-session-transport") === "memory") {
    if (!readPiPageSessionRequest(request)) return NextResponse.json({ error: "Session expired." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    // As with cookie logout, the client discards its own app credential. Neither
    // transport revokes the user's global Pi session or other devices.
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  }
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(PI_SESSION_COOKIE, "", { ...piSessionCookieOptions, maxAge: 0 });
  response.cookies.set(PI_LEGACY_SESSION_COOKIE, "", piLegacyCookieClearOptions);
  return response;
}
