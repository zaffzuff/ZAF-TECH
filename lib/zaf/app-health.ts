import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

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
  if (isIP(value) !== 4) return true;
  const parts = value.split(".").map(Number);
  const [a, b, c] = parts;

  // Private, loopback, link-local, shared, documentation, benchmarking,
  // multicast and reserved IPv4 space must never be probed by this endpoint.
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function expandIpv6Segments(value: string): number[] | null {
  const host = value.toLowerCase().split("%")[0].replace(/^\[|\]$/g, "");
  if (isIP(host) !== 6 || host.includes(".")) return null;

  const halves = host.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) return null;

  const segments = [...left, ...Array(missing).fill("0"), ...right];
  if (segments.length !== 8 || segments.some(segment => !/^[0-9a-f]{1,4}$/.test(segment))) return null;
  return segments.map(segment => Number.parseInt(segment, 16));
}

function isPrivateIpv6(value: string) {
  const parts = expandIpv6Segments(value);
  if (parts === null) return true;

  // Only global-unicast 2000::/3 addresses are accepted. This rejects
  // unspecified, loopback, link-local, unique-local, multicast, IPv4-mapped,
  // NAT64 and other non-global IPv6 address spaces by default.
  const first = parts[0];
  if (first < 0x2000 || first > 0x3fff) return true;

  // Documentation-only prefix: 2001:db8::/32.
  if (parts[0] === 0x2001 && parts[1] === 0x0db8) return true;

  return false;
}

function isPrivateIp(value: string) {
  const version = isIP(value);
  if (version === 4) return isPrivateIpv4(value);
  if (version === 6) return isPrivateIpv6(value);
  return false;
}

function isPrivateHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
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

async function resolvesToPublicAddress(hostname: string) {
  if (isPrivateHostname(hostname)) return false;
  try {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    return addresses.length > 0 && addresses.every(({ address }) => !isPrivateIp(address));
  } catch {
    return false;
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
  if (!(await resolvesToPublicAddress(parsed.hostname))) {
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(target, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
      headers: { "user-agent": "ZAF-TECH-App-Checker/1.0" },
    });

    return {
      url: target,
      status: response.status,
      ok: response.ok,
      reachable: true,
      responseTimeMs: Date.now() - started,
      https,
      redirect: response.status >= 300 && response.status < 400,
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
  } finally {
    clearTimeout(timer);
  }
}
