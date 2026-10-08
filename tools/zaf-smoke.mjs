import { spawn } from "node:child_process";
import process from "node:process";

const root = process.cwd();
const port = Number(process.env.SMOKE_PORT ?? (3200 + (process.pid % 500)));
const baseUrl = process.env.SMOKE_BASE_URL ?? `http://127.0.0.1:${port}`;
const external = Boolean(process.env.SMOKE_LIVE);

const checks = [
  { path: "/", status: 200 },
  { path: "/about", status: 200 },
  { path: "/privacy", status: 200 },
  { path: "/api/zaf/wallet?address=BAD", status: 400 },
  { path: "/api/tools/transaction?id=BAD", status: 400 },
  { path: "/api/apps/check?url=http://127.0.0.1:3000", status: 400 },
  { path: "/api/zaf/defi?network=mainnet", status: 400 },
  { path: "/api/zaf/assets?network=mainnet", status: 400 },
];

const requiredHeaders = [
  ["x-content-type-options", "nosniff"],
  ["referrer-policy", "strict-origin-when-cross-origin"],
  ["x-frame-options", "SAMEORIGIN"],
  ["permissions-policy", "camera=(), microphone=(), geolocation=()"],
  ["strict-transport-security", "max-age=31536000; includeSubDomains; preload"],
];

let server = null;
let serverError = null;

async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs),
  });
}

async function waitForServer() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (serverError) throw serverError;
    if (server?.exitCode != null) {
      throw new Error(`Smoke server exited before becoming ready (code ${server.exitCode}).`);
    }
    try {
      const response = await fetchWithTimeout(baseUrl, { redirect: "manual" }, 5000);
      if (response.status === 200) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  throw new Error(`Smoke server did not become ready at ${baseUrl}`);
}

async function request(path) {
  const response = await fetchWithTimeout(baseUrl + path, { redirect: "manual" });
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    text: await response.text(),
  };
}

async function requestWithOptions(path, options = {}) {
  const response = await fetchWithTimeout(baseUrl + path, { redirect: "manual", ...options });
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    text: await response.text(),
  };
}

function stopSmokeServer(child) {
  if (!child || child.exitCode != null) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}

try {
  if (process.env.SMOKE_BASE_URL) {
    await waitForServer();
  } else {
    server = spawn(
      process.platform === "win32" ? "npm.cmd" : "npm",
      ["start", "--", "-p", String(port)],
      {
        cwd: root,
        env: { ...process.env, PORT: String(port) },
        stdio: "pipe",
        detached: process.platform !== "win32",
      },
    );
    server.on("error", error => { serverError = error; });
    server.stdout?.on("data", data => process.stdout.write(String(data)));
    server.stderr?.on("data", data => process.stderr.write(String(data)));
    await waitForServer();
    await new Promise(resolve => setTimeout(resolve, 150));
    if (serverError) throw serverError;
    if (server.exitCode != null) {
      throw new Error(`Smoke server exited after becoming ready (code ${server.exitCode}).`);
    }
  }

  const rootResponse = await request("/");
  if (rootResponse.status !== 200) throw new Error(`/ returned ${rootResponse.status}`);
  for (const [key, expected] of requiredHeaders) {
    if ((rootResponse.headers[key] ?? "").toLowerCase() !== expected.toLowerCase()) {
      throw new Error(`Missing or incorrect security header: ${key}`);
    }
  }

  for (const check of checks.slice(1)) {
    const response = await request(check.path);
    if (response.status !== check.status) {
      throw new Error(`${check.path} expected ${check.status}, received ${response.status}: ${response.text.slice(0, 220)}`);
    }
  }

  const piConfig = await request("/api/auth/pi/config");
  if (piConfig.status !== 200) throw new Error(`/api/auth/pi/config expected 200, received ${piConfig.status}`);
  let piConfigBody;
  try { piConfigBody = JSON.parse(piConfig.text); } catch { throw new Error("Pi auth config did not return JSON"); }
  if (piConfigBody.sdkVersion !== "2.0" || piConfigBody.sdkScriptUrl !== "https://sdk.minepi.com/pi-sdk.js") {
    throw new Error("Pi auth config returned an unexpected SDK configuration");
  }
  if (!["sandbox", "production"].includes(piConfigBody.environment) || !["testnet", "mainnet"].includes(piConfigBody.network)) {
    throw new Error("Pi auth config returned an invalid environment matrix");
  }

  const piSession = await request("/api/auth/pi/session");
  if (piSession.status !== 401) throw new Error(`/api/auth/pi/session expected 401 without a session, received ${piSession.status}`);

  const piLogin = await requestWithOptions("/api/auth/pi", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  if (piLogin.status !== 400) throw new Error(`/api/auth/pi empty body expected 400, received ${piLogin.status}: ${piLogin.text.slice(0, 220)}`);

  // A streamed request deliberately omits Content-Length. The server must
  // enforce the same body limit while reading the stream, not only by header.
  const oversizedPiBody = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(JSON.stringify({ accessToken: "x".repeat(20_000) })));
      controller.close();
    },
  });
  const oversizedPiLogin = await requestWithOptions("/api/auth/pi", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: oversizedPiBody,
    duplex: "half",
  });
  if (oversizedPiLogin.status !== 413) {
    throw new Error(`/api/auth/pi streamed oversized body expected 413, received ${oversizedPiLogin.status}: ${oversizedPiLogin.text.slice(0, 220)}`);
  }

  const piLogout = await requestWithOptions("/api/auth/pi/logout", { method: "POST" });
  if (piLogout.status !== 200) throw new Error(`/api/auth/pi/logout expected 200, received ${piLogout.status}`);
  if (!/zaf_pi_session=.*Max-Age=0/i.test(piLogout.headers["set-cookie"] ?? "")) {
    throw new Error("Pi logout did not clear the session cookie");
  }

  if (external) {
    const response = await request("/api/apps/check?url=https://example.com");
    if (response.status !== 200) throw new Error(`Live external health check expected 200, received ${response.status}`);
  }

  console.log(`ZAF TECH smoke checks passed (base: ${baseUrl}).`);
} finally {
  stopSmokeServer(server);
}
