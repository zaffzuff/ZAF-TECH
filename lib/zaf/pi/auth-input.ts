export const PI_AUTH_BODY_LIMIT = 8192;
export class PiInputError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Bound actual streamed bytes, including bodies without Content-Length. */
export async function readPiAuthInput(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new PiInputError(415, "A JSON request is required.");
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) throw new PiInputError(403, "A same-origin request is required.");
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > PI_AUTH_BODY_LIMIT)) throw new PiInputError(413, "Request body is too large.");
  if (!request.body) throw new PiInputError(400, "A valid JSON body is required.");
  const reader = request.body.getReader();
  let size = 0, timedOut = false;
  const chunks: Uint8Array[] = [];
  const timer = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => undefined); }, 5_000);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (timedOut) throw new PiInputError(408, "Request body timed out.");
      if (done) break;
      size += value.byteLength;
      if (size > PI_AUTH_BODY_LIMIT) {
        void reader.cancel().catch(() => undefined);
        throw new PiInputError(413, "Request body is too large.");
      }
      chunks.push(value);
    }
  } finally { clearTimeout(timer); reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let body: unknown;
  try { body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new PiInputError(400, "A valid JSON body is required."); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new PiInputError(400, "A valid JSON object is required.");
  const token = (body as { accessToken?: unknown }).accessToken;
  if (typeof token !== "string" || !/^[\x21-\x7e]{1,4096}$/.test(token)) throw new PiInputError(400, "A valid Pi access token is required.");
  return token;
}

export function validPiProfile(value: unknown): value is { uid: string; username: string } {
  if (!value || typeof value !== "object") return false;
  const { uid, username } = value as { uid?: unknown; username?: unknown };
  return typeof uid === "string" && /^[^\s\x00-\x1f\x7f]{1,256}$/.test(uid) &&
    typeof username === "string" && /^[^\s\x00-\x1f\x7f]{1,100}$/.test(username);
}

export function piRetryAfter(value: string | null, now = Date.now()) {
  const seconds = value && /^\d+$/.test(value) ? Number(value) : value ? Math.ceil((Date.parse(value) - now) / 1000) : 60;
  return Math.min(300, Math.max(1, Number.isFinite(seconds) ? seconds : 60));
}
