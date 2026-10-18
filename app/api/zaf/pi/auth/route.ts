import { NextResponse } from "next/server";
import { assertPiSessionConfigured, sealPiSession, PI_SESSION_COOKIE, piSessionCookieOptions } from "@/lib/zaf/pi/session";
import { enforceRateLimit } from "@/lib/zaf/rate-limit";
import { readPiAuthInput, PiInputError, validPiProfile, piRetryAfter } from "@/lib/zaf/pi/auth-input";

export const dynamic = "force-dynamic";
export const revalidate = 0;


export async function POST(request: Request) {
  const rateLimit = await enforceRateLimit(request, "pi-auth-verify", { limit: 12, windowMs: 60_000 });
  if (rateLimit) return rateLimit;

  let accessToken: string;
  try {
    accessToken = await readPiAuthInput(request);
  } catch (error) {
    return NextResponse.json({ error: error instanceof PiInputError ? error.message : "Invalid request." }, {
      status: error instanceof PiInputError ? error.status : 400,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try { assertPiSessionConfigured(); } catch {
    return NextResponse.json({ error: "Pi session is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const piResponse = await fetch("https://backend.appstudio-u7cm9zhmha0ruwv8.piappengine.com/pi/auth/v1/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ accessToken }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });

    if (piResponse.status === 401 || piResponse.status === 403) {
      return NextResponse.json({ error: "Pi could not verify this sign-in." }, {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      });
    }

    if (piResponse.status === 429) {
      return NextResponse.json({ error: "Pi verification is busy. Please retry later." }, {
        status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(piRetryAfter(piResponse.headers.get("retry-after"))) },
      });
    }
    if (!piResponse.ok) {
      return NextResponse.json({ error: "Pi verification is temporarily unavailable." }, {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const result: unknown = await piResponse.json();
    const { user, sessionToken } = (result && typeof result === "object" ? result : {}) as { user?: unknown; sessionToken?: unknown };
    if (!validPiProfile(user) || typeof sessionToken !== "string" || !/^[\x21-\x7e]{1,16384}$/.test(sessionToken)) {
      return NextResponse.json({ error: "Pi returned an incomplete user profile." }, {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const response = NextResponse.json({ ok: true, user: { username: user.username } }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
    response.cookies.set(PI_SESSION_COOKIE, sealPiSession({ uid: user.uid, username: user.username }), piSessionCookieOptions);
    return response;
  } catch (error) {
    console.error("[ZAF Tech] Pi identity verification failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Pi verification is temporarily unavailable." }, {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
