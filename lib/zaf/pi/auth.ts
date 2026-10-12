import { assertPiRuntimeCompatible, getPiRuntimeConfig } from "@/lib/zaf/pi/runtime";

const MAX_ACCESS_TOKEN_LENGTH = 4096;

export type PiVerifiedUser = {
  uid: string;
  username: string | null;
};

export type PiAuthErrorCode =
  | "INVALID_ACCESS_TOKEN"
  | "PI_API_UNAVAILABLE"
  | "PI_API_INVALID_RESPONSE"
  | "PI_RUNTIME_MISMATCH";

export class PiAuthError extends Error {
  constructor(
    public readonly code: PiAuthErrorCode,
    message: string,
    public readonly status: 401 | 502 | 503,
  ) {
    super(message);
    this.name = "PiAuthError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

export async function verifyPiAccessToken(accessToken: string): Promise<PiVerifiedUser> {
  const token = accessToken.trim();
  if (!token || token.length > MAX_ACCESS_TOKEN_LENGTH) {
    throw new PiAuthError("INVALID_ACCESS_TOKEN", "Invalid Pi access token.", 401);
  }

  const config = getPiRuntimeConfig();
  try {
    assertPiRuntimeCompatible(config);
  } catch {
    throw new PiAuthError(
      "PI_RUNTIME_MISMATCH",
      config.configurationError ?? "Pi runtime configuration is incompatible.",
      503,
    );
  }

  let response: Response;
  try {
    response = await fetch(`${config.platformApiBaseUrl}/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("[ZAF-TECH] Pi identity verification request failed", error);
    throw new PiAuthError("PI_API_UNAVAILABLE", "Pi identity verification is temporarily unavailable.", 502);
  }

  if (response.status === 401 || response.status === 403) {
    throw new PiAuthError("INVALID_ACCESS_TOKEN", "Pi access token was rejected.", 401);
  }

  if (!response.ok) {
    console.error("[ZAF-TECH] Pi identity verification returned", response.status);
    throw new PiAuthError("PI_API_UNAVAILABLE", "Pi identity verification is temporarily unavailable.", 502);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new PiAuthError("PI_API_INVALID_RESPONSE", "Pi identity verification returned invalid data.", 502);
  }

  if (!isRecord(payload) || typeof payload.uid !== "string" || !payload.uid.trim()) {
    throw new PiAuthError("PI_API_INVALID_RESPONSE", "Pi identity verification returned an invalid user.", 502);
  }

  return {
    uid: payload.uid.trim(),
    username: normalizeOptionalString(payload.username),
  };
}
