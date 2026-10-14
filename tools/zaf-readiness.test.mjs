import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { EventEmitter } from "node:events";
import { webcrypto } from "node:crypto";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();

test("Horizon mapping preserves native amounts and derives ledger transaction totals", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async url => new Response(JSON.stringify({ _embedded: { records: url.includes("/ledgers?") ? [{ sequence: 42, closed_at: "2026-10-14T10:00:00Z", successful_transaction_count: 2, failed_transaction_count: 3, operation_count: 2, protocol_version: null }] : url.includes("/operations?") ? [{ id: "1", type: "payment", asset_type: "native", amount: "12.5000000" }, { id: "2", type: "payment", asset_type: "credit_alphanum4", amount: "50.0000000" }] : [{ hash: "fixture", fee_charged: "100000", operation_count: null }] } }));
  try {
    const result = await loader()("@/lib/zaf/horizon-client").getZafSnapshot();
    assert.equal(result.latestLedger.transactionCount, 5);
    assert.equal(result.latestLedger.protocolVersion, null);
    assert.equal(result.operations[0].amountPi, 12.5);
    assert.equal(result.operations[1].amountPi, null);
    assert.equal(result.transactions[0].feePi, 0.01);
    assert.equal(result.transactions[0].operationCount, null);
  } finally { globalThis.fetch = previousFetch; }
});

test("Pi runtime rejects Mainnet Sandbox and inconsistent client/server settings", () => {
  const keys = ["PI_NETWORK", "PI_SDK_MODE", "NEXT_PUBLIC_PI_SDK_MODE", "PI_API_KEY"];
  const previous = keys.map(key => process.env[key]);
  const { getPiRuntimeConfig, isPiPaymentReady } = loader()("@/lib/zaf/pi/runtime");
  try {
    for (const key of keys) delete process.env[key];
    assert.equal(getPiRuntimeConfig().compatible, true);
    process.env.PI_NETWORK = "mainnet";
    process.env.NEXT_PUBLIC_PI_SDK_MODE = "sandbox";
    assert.equal(getPiRuntimeConfig().compatible, false);
    process.env.PI_SDK_MODE = "hosted";
    assert.equal(getPiRuntimeConfig().compatible, false);
    process.env.NEXT_PUBLIC_PI_SDK_MODE = "hosted";
    assert.equal(getPiRuntimeConfig().compatible, true);
    process.env.PI_API_KEY = "   ";
    assert.equal(isPiPaymentReady(), false);
    process.env.PI_NETWORK = "invalid";
    assert.equal(getPiRuntimeConfig().compatible, false);
  } finally {
    keys.forEach((key, index) => { if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index]; });
  }
});

test("only explicit Testnet Sandbox permits the official Sandbox frame", async () => {
  const keys = ["PI_NETWORK", "PI_SDK_MODE", "NEXT_PUBLIC_PI_SDK_MODE"];
  const previous = keys.map(key => process.env[key]);
  const { default: config } = await import("../next.config.mjs");
  try {
    process.env.PI_NETWORK = "mainnet"; process.env.PI_SDK_MODE = "hosted";
    const hosted = (await config.headers())[0].headers;
    assert.equal(hosted.find(header => header.key === "X-Frame-Options").value, "SAMEORIGIN");
    assert.equal(hosted.find(header => header.key === "Content-Security-Policy").value, "frame-ancestors 'self';");
    process.env.PI_NETWORK = "testnet"; process.env.PI_SDK_MODE = "sandbox";
    const sandbox = (await config.headers())[0].headers;
    assert.equal(sandbox.some(header => header.key === "X-Frame-Options"), false);
    assert.equal(sandbox.find(header => header.key === "Content-Security-Policy").value, "frame-ancestors 'self' https://sandbox.minepi.com;");
    process.env.PI_NETWORK = "mainnet";
    assert.equal((await config.headers())[0].headers.some(header => header.key === "X-Frame-Options"), true);
  } finally {
    keys.forEach((key, index) => { if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index]; });
  }
});
function loader(mocks = {}) {
  const cache = new Map();
  return function load(name, parent = root) {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (!name.startsWith("@/") && !name.startsWith(".")) return require(name);
    const base = name.startsWith("@/") ? path.join(root, name.slice(2)) : path.resolve(parent, name);
    const file = [base, base + ".ts", base + ".tsx"].find(file => fs.existsSync(file) && fs.statSync(file).isFile());
    if (!file) throw new Error("Missing test module " + name);
    if (cache.has(file)) return cache.get(file).exports;
    const source = fs.readFileSync(file, "utf8");
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
    const module = { exports: {} }; cache.set(file, module);
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(dependency => load(dependency, path.dirname(file)), module, module.exports);
    return module.exports;
  };
}

test("URL checks reject private, shared, documentation, mapped and reserved addresses", () => {
  const { isSafeHttpUrl, isPublicIp } = loader()('@/lib/zaf/app-health');
  for (const ip of ["0.0.0.0", "10.1.2.3", "100.64.0.1", "127.0.0.1", "169.254.169.254", "172.31.1.1", "192.168.1.1", "192.0.2.1", "198.18.0.1", "198.51.100.1", "203.0.113.1", "224.0.0.1", "255.255.255.255", "::1", "::", "::ffff:127.0.0.1", "::ffff:c0a8:101", "fd00::1", "fe80::1", "ff02::1", "2001:db8::1", "2002:7f00:1::1"]) {
    assert.equal(isPublicIp(ip), false, ip);
    assert.equal(isSafeHttpUrl(`http://${ip.includes(":") ? `[${ip}]` : ip}/`), false, ip);
  }
  for (const url of ["http://localhost./", "http://service.local/", "http://service.home.arpa/", "https://user:password@example.com/", "https://example.com:8443/", "file:///etc/passwd", "http://2130706433/", "http://0x7f000001/"]) assert.equal(isSafeHttpUrl(url), false, url);
  assert.equal(isSafeHttpUrl("https://example.com/"), true);
  assert.equal(isPublicIp("8.8.8.8"), true);
  assert.equal(isPublicIp("2606:4700:4700::1111"), true);
});

test("a validated DNS address is pinned to the actual connection and redirects are not followed", async () => {
  let dnsCalls = 0, requestCalls = 0, pinned;
  const request = (_url, options, callback) => {
    requestCalls++;
    options.lookup("example.com", {}, (_error, address, family) => { pinned = { address, family }; });
    const req = new EventEmitter();
    req.end = () => callback({ statusCode: 302, destroy() {} });
    return req;
  };
  const load = loader({
    "node:dns/promises": { lookup: async () => { dnsCalls++; return [{ address: "93.184.215.14", family: 4 }]; } },
    "node:http": { request }, "node:https": { request },
  });
  const result = await load('@/lib/zaf/app-health').checkAppHealth("https://example.com/");
  assert.equal(dnsCalls, 1);
  assert.equal(requestCalls, 1);
  assert.deepEqual(pinned, { address: "93.184.215.14", family: 4 });
  assert.equal(result.redirect, true);
  assert.equal(result.reachable, true);
  assert.equal(result.ok, false);
});

test("mixed public/private DNS answers are rejected before connecting", async () => {
  let connected = false;
  const load = loader({
    "node:dns/promises": { lookup: async () => [{ address: "8.8.8.8", family: 4 }, { address: "127.0.0.1", family: 4 }] },
    "node:https": { request: () => { connected = true; throw new Error("Unexpected connection"); } },
  });
  const result = await load('@/lib/zaf/app-health').checkAppHealth("https://example.com/");
  assert.equal(connected, false);
  assert.equal(result.reachable, false);
  assert.equal(result.status, null);
});

const responseMock = { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200, headers: options?.headers }) } };
test("rate limits still apply without a database and cannot be reset by changing user agent", async () => {
  const load = loader({ "next/server": responseMock, "@/lib/zaf/db": { getZafDb: () => null, ensureZafSchema: async () => false } });
  const { consumeRateLimit, enforceRateLimit } = load('@/lib/zaf/rate-limit');
  const request = agent => new Request("https://example.com/api", { headers: { "x-real-ip": "203.0.113.4", "user-agent": agent } });
  assert.equal((await consumeRateLimit(request("A"), "limited", { limit: 2, windowMs: 60_000 })).allowed, true);
  assert.equal((await consumeRateLimit(request("B"), "limited", { limit: 2, windowMs: 60_000 })).allowed, true);
  const blocked = await enforceRateLimit(request("C"), "limited", { limit: 2, windowMs: 60_000 });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers["Retry-After"]) > 0);
  assert.equal((await consumeRateLimit(request("A"), "required-db", { limit: 2, windowMs: 60_000, failClosed: true })).allowed, false);
});

test("fallback rate-limit windows expire independently across scopes", async () => {
  const load = loader({ "next/server": responseMock, "@/lib/zaf/db": { getZafDb: () => null, ensureZafSchema: async () => false } });
  const { consumeRateLimit } = load('@/lib/zaf/rate-limit');
  const originalNow = Date.now; let time = 0; Date.now = () => time;
  try {
    const request = new Request("https://example.com");
    await consumeRateLimit(request, "long", { limit: 1, windowMs: 600_000 });
    time = 61_000;
    await consumeRateLimit(request, "short", { limit: 1, windowMs: 60_000 });
    assert.equal((await consumeRateLimit(request, "long", { limit: 1, windowMs: 600_000 })).allowed, false);
    time = 600_000;
    assert.equal((await consumeRateLimit(request, "long", { limit: 1, windowMs: 600_000 })).allowed, true);
  } finally { Date.now = originalNow; }
});

test("OAuth return paths cannot escape the app or loop into its callback", () => {
  const { getSafePiSignInReturnPath } = loader()('@/lib/zaf/pi/oauth');
  const fallback = "/?section=overview&subtab=Pulse";
  for (const target of ["https://evil.example/", "//evil.example/", "/\\evil.example/", "/%5cevil.example/", "/%2f%2fevil.example/", "/signin/callback", "/signin/%63allback", "/signin/../signin/callback", "/\nevil.example", "/%ZZ", null]) assert.equal(getSafePiSignInReturnPath(target), fallback, String(target));
  assert.equal(getSafePiSignInReturnPath("/?section=network&subtab=Network"), "/?section=network&subtab=Network");
});

function mockBrowser(userAgent = "Chrome") {
  const storage = new Map(), navigations = [], effects = [], messages = [];
  const values = { window: globalThis.window, navigator: globalThis.navigator, sessionStorage: globalThis.sessionStorage, fetch: globalThis.fetch };
  const fakeWindow = { location: { origin: "https://zaf-tech.invalid", pathname: "/", search: "", hostname: "zaf-tech.invalid", hash: "", assign: value => navigations.push(value), replace: value => navigations.push(value) }, history: { replaceState: (...args) => navigations.push(args[2]) }, crypto: webcrypto, setTimeout, clearTimeout };
  Object.defineProperty(globalThis, "window", { configurable: true, value: fakeWindow, writable: true });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { userAgent }, writable: true });
  globalThis.sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  const react = { useEffect: callback => effects.push(callback), useRef: value => ({ current: value }), useState: value => [value, next => messages.push(next)] };
  const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
  const load = loader({ react, "react/jsx-runtime": jsx, "@/lib/zaf/i18n": { translate: (_locale, en) => en } });
  return { storage, navigations, effects, messages, fakeWindow, load, restore() { for (const [key, value] of Object.entries(values)) { if (value === undefined) delete globalThis[key]; else Object.defineProperty(globalThis, key, { configurable: true, value, writable: true }); } } };
}

test("callback credentials are cleared even if browser storage throws", async () => {
  const browser = mockBrowser();
  try {
    browser.fakeWindow.location.pathname = "/signin/callback";
    browser.fakeWindow.location.hash = "#access_token=test-fixture&state=test-state";
    sessionStorage.getItem = () => { throw new Error("Storage blocked"); };
    browser.load('@/app/signin/callback/page').default();
    browser.effects[0]();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(browser.navigations, ["/signin/callback"]);
    assert.ok(browser.messages.some(value => typeof value === "string" && value.includes("storage is unavailable")));
  } finally { browser.restore(); }
});

test("Pi Browser initialization precedes host detection and uses server-verified identity", async () => {
  const browser = mockBrowser("PiBrowser"); const calls = [];
  try {
    browser.fakeWindow.Pi = {
      init: async () => calls.push("init"),
      getPiHostAppInfo: async () => { calls.push("host"); return { hostApp: "pi-browser" }; },
      authenticate: async scopes => { assert.deepEqual(scopes, ["username"]); calls.push("authenticate"); return { accessToken: "test-fixture-token", user: { username: "untrusted-display" } }; },
    };
    globalThis.fetch = async (url, options) => { assert.equal(url, "/api/zaf/pi/auth"); assert.equal(JSON.parse(options.body).accessToken, "test-fixture-token"); calls.push("verify"); return new Response(JSON.stringify({ user: { username: "verified-display" } })); };
    const component = browser.load('@/components/zaf-pi-sign-in').ZafPiSignIn({ locale: "en" });
    component.props.children[0].props.onClick();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(calls, ["init", "host", "authenticate", "verify"]);
    assert.ok([...browser.storage.values()].includes("verified-display"));
    assert.ok(![...browser.storage.values()].includes("test-fixture-token"));
    assert.ok(![...browser.storage.values()].includes("untrusted-display"));
  } finally { browser.restore(); }
});

test("ordinary browsers can enter OAuth if native SDK initialization fails", async () => {
  const browser = mockBrowser("Chrome"); const previousId = process.env.NEXT_PUBLIC_PI_SIGNIN_CLIENT_ID;
  try {
    process.env.NEXT_PUBLIC_PI_SIGNIN_CLIENT_ID = "test-fixture-client";
    browser.fakeWindow.Pi = { init: async () => { throw new Error("SDK fixture failure"); } };
    const component = browser.load('@/components/zaf-pi-sign-in').ZafPiSignIn({ locale: "en" });
    component.props.children[0].props.onClick();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(browser.navigations.length, 1);
    const url = new URL(browser.navigations[0]);
    assert.equal(url.origin, "https://accounts.pinet.com");
    assert.equal(url.searchParams.get("scope"), "username");
    assert.equal(url.searchParams.get("redirect_uri"), "https://zaf-tech.invalid/signin/callback");
    assert.equal(url.searchParams.get("state").length, 48);
  } finally { if (previousId === undefined) delete process.env.NEXT_PUBLIC_PI_SIGNIN_CLIENT_ID; else process.env.NEXT_PUBLIC_PI_SIGNIN_CLIENT_ID = previousId; browser.restore(); }
});

test("JSON request deadlines cover stalled response bodies and support cancellation", async () => {
  const { requestJson } = loader()('@/lib/zaf/client-request'); const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (_url, options) => ({ json: () => new Promise((_resolve, reject) => { if (options.signal.aborted) reject(new Error("aborted")); else options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true }); }) });
    await assert.rejects(requestJson("/fixture", {}, 20), /aborted/);
    const controller = new AbortController();
    const result = requestJson("/fixture", { signal: controller.signal }, 1000); controller.abort();
    await assert.rejects(result, /aborted/);
  } finally { globalThis.fetch = originalFetch; }
});

test("observations return Radar and change data from the same collected snapshot", async () => {
  const ecosystem = { generatedAt: "2026-10-14T03:00:00Z" };
  const observation = { generatedAt: ecosystem.generatedAt, ecosystem, network: { latestLedger: { sequence: "100" } } };
  const load = loader({
    "next/server": responseMock,
    "@/lib/zaf/rate-limit": { enforceRateLimit: async () => null },
    "@/lib/zaf/observation-engine": { getUnifiedObservation: async () => observation },
    "@/lib/zaf/radar": { getRadarObservation: async value => { assert.equal(value, observation); return { generatedAt: value.generatedAt }; } },
    "@/lib/zaf/ecosystem-changes": { getEcosystemChanges: async value => { assert.equal(value, ecosystem); return { generatedAt: value.generatedAt }; } },
  });
  const result = await load('@/app/api/zaf/observations/route').GET({ nextUrl: new URL("https://example.com/api") });
  assert.equal(result.body.radar.generatedAt, result.body.generatedAt);
  assert.equal(result.body.ecosystemChanges.generatedAt, result.body.ecosystem.generatedAt);
});

test("change comparison skips a newly saved current snapshot", async () => {
  const current = { generatedAt: "2026-10-14T03:05:00Z", apps: { totalCount: 1 }, sources: [], signals: [], defi: { launchpad: { status: "testnet" }, dex: { status: "testnet" }, amm: { status: "testnet" }, mainnetTrading: { status: "restricted" } } };
  const previous = { ...current, generatedAt: "2026-10-14T03:00:00Z", apps: { totalCount: 0 } };
  const load = loader({
    "@/lib/zaf/observation-engine": { getUnifiedObservation: async () => { throw new Error("Should reuse observation"); } },
    "@/lib/zaf/ecosystem-history": { isEcosystemHistoryConfigured: () => true, getEcosystemSnapshotHistory: async () => [{ generatedAt: current.generatedAt, payload: current }, { generatedAt: previous.generatedAt, payload: previous }] },
  });
  const result = await load('@/lib/zaf/ecosystem-changes').getEcosystemChanges(current);
  assert.equal(result.comparedAt, previous.generatedAt);
  assert.equal(result.changes[0].type, "app_count");
  assert.equal(result.changes[0].previous, 0);
  assert.equal(result.changes[0].current, 1);
});
