import { NextResponse } from "next/server";
import { getPiRuntimeConfig } from "@/lib/zaf/pi/runtime";
import { enforceRateLimit } from "@/lib/zaf/rate-limit";
import { readPiAuthInput, PiInputError, validPiProfile, piRetryAfter } from "@/lib/zaf/pi/auth-input";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PiUserResponse = {
  uid?: unknown;
  username?: unknown;
};

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

  const runtime = getPiRuntimeConfig();
  if (!runtime.compatible) {
    return NextResponse.json({ error: "Pi authentication runtime is not configured correctly." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const piResponse = await fetch(`${runtime.platformApiBaseUrl}/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken.trim()}`,
        Accept: "application/json",
      },
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

    const user = await piResponse.json() as PiUserResponse;
    if (!validPiProfile(user)) {
      return NextResponse.json({ error: "Pi returned an incomplete user profile." }, {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      });
    }

    // Do not return or persist the access token or UID. The username is returned
    // only to show the result of this server-side verification in the current UI.
    return NextResponse.json({
      ok: true,
      user: { username: user.username.trim() },
    }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("[ZAF Tech] Pi identity verification failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Pi verification is temporarily unavailable." }, {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
