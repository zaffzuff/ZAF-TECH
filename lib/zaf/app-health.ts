import { lookup } from "node:dns/promises";

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

  const [a, b, c] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 100 && b >= 64 && b <= 127 ||
    a === 127 ||
    a === 169 && b === 254 ||
    a === 172 && b >= 16 && b <= 31 ||
    a === 192 && (b === 0 || b === 168) ||
    a === 192 && b === 88 && c === 99 ||
    a === 198 && b === 18 || a === 198 && b === 19 ||
    a === 198 && b === 51 && c === 100 ||
    a === 203 && b === 0 && c === 113 ||
    a >= 224
  );
}

function isPrivateIpv6(value: string) {
  const host = value.toLowerCase().split("%")[0];
  if (host === "::" || host === "::1") return true;

  const mapped = host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIpv4(mapped[1]);

  const first = host.split(":").filter(Boolean)[0] ?? "";
  const firstValue = Number.parseInt(first, 16);

  return (
    first.startsWith("fc") ||
    first.startsWith("fd") ||
    first.startsWith("fe8") ||
    first.startsWith("fe9") ||
    first.startsWith("fea") ||
    first.startsWith("feb") ||
    (Number.isFinite(firstValue) && firstValue >= 0x2001 && firstValue <= 0x2001 && /^2001:db8(?::|$)/i.test(host))
  );
}

function isPrivateIp(value: string) {
  return value.includes(":") ? isPrivateIpv6(value) : isPrivateIpv4(value);
}

function isPrivateHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "[::1]" ||
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
