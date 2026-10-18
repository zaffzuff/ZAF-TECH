import { spawn } from "node:child_process";
import process from "node:process";

const root = process.cwd();
const port = Number(process.env.SMOKE_PORT ?? (3200 + (process.pid % 500)));
const baseUrl = process.env.SMOKE_BASE_URL ?? `http://127.0.0.1:${port}`;
const external = Boolean(process.env.SMOKE_LIVE);

const checks = [
  { path: "/pi-app-validation.txt", status: 200 },
  { path: "/api/zaf/pi/session", status: 200 },
  { path: "/", status: 200 },
  { path: "/about", status: 200 },
  { path: "/privacy", status: 200 },
  { path: "/terms", status: 200 },
  { path: "/terms?lang=tr", status: 200 },
  { path: "/start-with-pi", status: 200 },
  { path: "/signin/callback", status: 200 },
  { path: "/api/zaf/status", status: 200 },
  { path: "/api/zaf/wallet?address=BAD", status: 400 },
  { path: "/api/tools/transaction?id=BAD", status: 400 },
  { path: "/api/apps/check?url=http://127.0.0.1:3000", status: 400 },
  { path: "/api/zaf/defi?network=mainnet", status: 400 },
  { path: "/api/zaf/assets?network=mainnet", status: 400 },
  { path: "/api/apps/health/cron", status: 401 },
];

const requiredHeaders = [
  ["x-content-type-options", "nosniff"],
  ["referrer-policy", "strict-origin-when-cross-origin"],
  ["content-security-policy", "connect-src 'self' https://socialchain.app http://127.0.0.1:39100; frame-ancestors 'self' https://app-cdn.minepi.com https://*.pinet.com https://*.minepi.com https://appstudio-u7cm9zhmha0ruwv8.piappengine.com;"],
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

async function request(path, options = {}) {
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
      process.execPath,
      ["node_modules/next/dist/bin/next", "start", "-p", String(port)],
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

  // Policy pages must work before hydration, including direct Turkish terms.
  for (const [path, title] of [["/privacy", "Privacy"], ["/terms", "Terms of Service"], ["/terms?lang=tr", "Kullanım Koşulları"]]) {
    const page = await request(path);
    if (!page.text.includes(title) || !page.text.includes("Zafer TEKYILDIZ") || !page.text.includes("mailto:zaftech.contact@gmail.com")) {
      throw new Error(`Policy page missing rendered identity, contact or language: ${path}`);
    }
    if (!(page.headers["content-security-policy"] ?? "").includes("https://app-cdn.minepi.com")) {
      throw new Error(`Policy page must remain accessible inside verified Pi Browser shell: ${path}`);
    }
  }


  const piAuthResponse = await request("/api/zaf/pi/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": baseUrl },
    body: JSON.stringify({}),
  });
  if (piAuthResponse.status !== 400) {
    throw new Error(`/api/zaf/pi/auth empty-token guard expected 400, received ${piAuthResponse.status}: ${piAuthResponse.text.slice(0, 220)}`);
  }
  if (!(piAuthResponse.headers["cache-control"] ?? "").toLowerCase().includes("no-store")) {
    throw new Error("Pi authentication error responses must not be cached.");
  }
  let piAuthBody = null;
  try { piAuthBody = JSON.parse(piAuthResponse.text); } catch {}
  if (piAuthBody?.error !== "A valid Pi access token is required.") {
    throw new Error("Pi authentication must reject a missing access token before contacting Pi.");
  }

  if (external) {
    const response = await request("/api/apps/check?url=https://example.com");
    if (response.status !== 200) throw new Error(`Live external health check expected 200, received ${response.status}`);
  }

  console.log(`ZAF Tech smoke checks passed (base: ${baseUrl}).`);
} finally {
  stopSmokeServer(server);
}
