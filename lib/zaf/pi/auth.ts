import { getPiRuntimeConfig } from "@/lib/zaf/pi/runtime";

export class PiAuthError extends Error {
  constructor(public readonly code: "invalid-token" | "platform-error" | "configuration-error", message: string, public readonly status: number) {
    super(message);
    this.name = "PiAuthError";
  }
}

const ACCESS_TOKEN_TIMEOUT_MS = 10_000;

export type VerifiedPiUser = { uid: string; username: string };

export async function verifyPiAccessToken(accessToken: string): Promise<VerifiedPiUser> {
  const config = getPiRuntimeConfig();
  if (!config.compatible) {
    throw new PiAuthError("configuration-error", "Pi runtime configuration is invalid.", 503);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ACCESS_TOKEN_TIMEOUT_MS);

  try {
    const response = await fetch(`${config.platformApiBaseUrl}/me`, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: controller.signal,
    });

    if (response.status === 401) {
      throw new PiAuthError("invalid-token", "Pi access token is invalid or expired.", 401);
    }
    if (!response.ok) {
      throw new PiAuthError("platform-error", `Pi Platform API returned ${response.status}.`, 502);
    }

    const payload = await response.json() as Record<string, unknown>;
    const candidate = payload.user && typeof payload.user === "object"
      ? payload.user as Record<string, unknown>
      : payload;
    const uid = typeof candidate.uid === "string" ? candidate.uid.trim() : "";
    const username = typeof candidate.username === "string" ? candidate.username.trim() : "";

    if (!uid || !username) {
      throw new PiAuthError("platform-error", "Pi Platform API returned an incomplete user profile.", 502);
    }

    return { uid, username };
  } catch (error) {
    if (error instanceof PiAuthError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new PiAuthError("platform-error", "Pi Platform API request timed out.", 504);
    }
    throw new PiAuthError("platform-error", "Pi Platform API request failed.", 502);
  } finally {
    clearTimeout(timeout);
  }
}