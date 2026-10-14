import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

export type AppHealthCheck = {
  url: string;
  status: number | null;
  ok: boolean;
  reachable: boolean;
  responseTimeMs: number;
  https: boolean;
  redirect: boolean;
  checkedAt: string;
  error: string | null;
};

function isPrivateIpv4(value: string) {
  const parts = value.split(".").map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 192 && b === 0 && (parts[2] === 0 || parts[2] === 2)) ||
    (a === 192 && b === 88 && parts[2] === 99) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && parts[2] === 100) ||
    (a === 203 && b === 0 && parts[2] === 113) ||
    a >= 224
  );
}

function isPrivateIpv6(value: string) {
  const host = value.toLowerCase().split("%")[0];
  const [first, second] = host.split(":").map(part => parseInt(part, 16));
  if (!(first >= 0x2000 && first <= 0x3fff)) return true;
  return first === 0x2002 || (first === 0x2001 && [0, 2, 0x10, 0x20, 0xdb8].includes(second));
}

function isPrivateIp(value: string) {
  const family = isIP(value);
  return family === 6 ? isPrivateIpv6(value) : family === 4 ? isPrivateIpv4(value) : false;
}

export function isPublicIp(value: string) { return isIP(value) !== 0 && !isPrivateIp(value); }

function isPrivateHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "[::1]" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") || host.endsWith(".home.arpa")
  ) return true;

  return isPrivateIp(host);
}

export function isSafeHttpUrl(value: string) {
  try {
    if (value.length > 2048) return false;
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    if (url.username || url.password) return false;
    if (url.port && !((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443"))) return false;
    return !isPrivateHostname(url.hostname);
  } catch {
    return false;
  }
}

async function resolvePublicAddresses(hostname: string, signal: AbortSignal) {
  if (isPrivateHostname(hostname)) return [];
  try {
    const addresses = await new Promise<Array<{ address: string; family: number }>>((resolve, reject) => {
      const aborted = () => reject(new Error("Hostname lookup timed out"));
      if (signal.aborted) return aborted();
      signal.addEventListener("abort", aborted, { once: true });
      lookup(hostname.replace(/^\[|\]$/g, ""), { all: true, verbatim: true }).then(resolve, reject)
        .finally(() => signal.removeEventListener("abort", aborted));
    });
    return addresses.length > 0 && addresses.every(({ address }) => isPublicIp(address)) ? addresses : [];
  } catch {
    return [];
  }
}

export async function checkAppHealth(target: string, timeoutMs = 8000): Promise<AppHealthCheck> {
  const started = Date.now();
  const checkedAt = new Date().toISOString();
  let https = false;

  try {
    const parsed = new URL(target);
    https = parsed.protocol === "https:";
  } catch {
    // Validation below returns the normal public-URL error.
  }

  if (!isSafeHttpUrl(target)) {
    return {
      url: target,
      status: null,
      ok: false,
      reachable: false,
      responseTimeMs: 0,
      https,
      redirect: false,
      checkedAt,
      error: "A public HTTP(S) URL is required.",
    };
  }

  const parsed = new URL(target);
  const signal = AbortSignal.timeout(Math.max(1, timeoutMs));
  const addresses = await resolvePublicAddresses(parsed.hostname, signal);
  if (!addresses.length) {
    return {
      url: target,
      status: null,
      ok: false,
      reachable: false,
      responseTimeMs: Date.now() - started,
      https,
      redirect: false,
      checkedAt,
      error: "The target hostname does not resolve to a public address.",
    };
  }

  try {
    const address = addresses[0];
    // Pin the validated DNS result to the connection; a second DNS lookup could
    // otherwise resolve the same public hostname to an internal address.
    // Native HTTP does not follow redirects (equivalent to redirect: "manual").
    const status = await new Promise<number>((resolve, reject) => {
      const request = (https ? httpsRequest : httpRequest)(parsed, {
        method: "GET", signal, agent: false,
        family: address.family,
        lookup: (_hostname, _options, callback) => callback(null, address.address, address.family),
        headers: { "user-agent": "ZAF-TECH-App-Checker/1.1" },
      }, response => {
        resolve(response.statusCode ?? 0);
        response.destroy();
      });
      request.on("error", reject);
      request.end();
    });

    return {
      url: target,
      status,
      ok: status >= 200 && status < 300,
      reachable: true,
      responseTimeMs: Date.now() - started,
      https,
      redirect: status >= 300 && status < 400,
      checkedAt: new Date().toISOString(),
      error: null,
    };
  } catch (error) {
    return {
      url: target,
      status: null,
      ok: false,
      reachable: false,
      responseTimeMs: Date.now() - started,
      https,
      redirect: false,
      checkedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Request failed",
    };
  }
}
