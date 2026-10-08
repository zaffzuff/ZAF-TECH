import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/zaf/rate-limit";
import { verifyPiAccessToken, PiAuthError } from "@/lib/zaf/pi/auth";
import { createPiSession, setPiSessionCookie } from "@/lib/zaf/pi/session";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const MAX_PI_AUTH_BODY_BYTES = 16_384;

type JsonBodyResult =
  | { ok: true; body: unknown }
  | { ok: false; tooLarge: boolean };

async function readJsonBodyLimited(request: Request): Promise<JsonBodyResult> {
  const reader = request.body?.getReader();
  if (!reader) return { ok: false, tooLarge: false };

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_PI_AUTH_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, tooLarge: true };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, tooLarge: false };
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, body: JSON.parse(new TextDecoder().decode(bytes)) as unknown };
  } catch {
    return { ok: false, tooLarge: false };
  }
}

export async function POST(request: Request) {
  const rateLimit = await enforceRateLimit(
    request,
    "pi-auth",
    { limit: 10, windowMs: 60_000, failClosed: true },
  );
  if (rateLimit) return rateLimit;

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_PI_AUTH_BODY_BYTES) {
    return NextResponse.json(
      { error: "Request body is too large.", code: "INVALID_REQUEST" },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  const parsed = await readJsonBodyLimited(request);
  if (!parsed.ok && parsed.tooLarge) {
    return NextResponse.json(
      { error: "Request body is too large.", code: "INVALID_REQUEST" },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid JSON body.", code: "INVALID_REQUEST" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const body = parsed.body;

  const accessToken = isRecord(body) && typeof body.accessToken === "string"
    ? body.accessToken.trim()
    : "";

  if (!accessToken || accessToken.length > 4096) {
    return NextResponse.json(
      { error: "A valid Pi access token is required.", code: "INVALID_REQUEST" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const user = await verifyPiAccessToken(accessToken);
    const session = await createPiSession(user);
    const response = NextResponse.json(
      {
        ok: true,
        user: {
          uid: user.uid,
          username: user.username,
        },
        expiresAt: session.expiresAt,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
    setPiSessionCookie(response, session.token);
    return response;
  } catch (error) {
    if (error instanceof PiAuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }

    console.error("[ZAF-TECH] Pi session creation failed", error);
    return NextResponse.json(
      { error: "Pi session could not be created.", code: "SESSION_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
