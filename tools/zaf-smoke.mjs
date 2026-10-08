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

async function waitForServer() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (serverError) throw serverError;
    if (server?.exitCode != null) {
      throw new Error(`Smoke server exited before becoming ready (code ${server.exitCode}).`);
    }
    try {
      const response = await fetch(baseUrl, { redirect: "manual" });
      if (response.status === 200) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  throw new Error(`Smoke server did not become ready at ${baseUrl}`);
}

async function request(path) {
  const response = await fetch(baseUrl + path, { redirect: "manual" });
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    text: await response.text(),
  };
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

  if (external) {
    const response = await request("/api/apps/check?url=https://example.com");
    if (response.status !== 200) throw new Error(`Live external health check expected 200, received ${response.status}`);
  }

  console.log(`ZAF TECH smoke checks passed (base: ${baseUrl}).`);
} finally {
  if (server && !server.killed) server.kill("SIGTERM");
}
