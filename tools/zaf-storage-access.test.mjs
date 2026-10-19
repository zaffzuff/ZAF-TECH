import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function storageFixture({ responses = [], requestStorageAccess } = {}) {
  const requests = [], events = [];
  const document = requestStorageAccess ? { requestStorageAccess } : {};
  const window = { document };
  const contextValues = { document, window, console };
  // The probe must work even when all JavaScript storage and cookie access is
  // unavailable. Browser-managed HttpOnly cookies are tested by the endpoint.
  for (const target of [contextValues, window]) {
    for (const key of ["localStorage", "sessionStorage"]) Object.defineProperty(target, key, { get() { throw new Error("Unexpected JavaScript storage access"); } });
  }
  Object.defineProperty(document, "cookie", { get() { throw new Error("Unexpected cookie read"); }, set() { throw new Error("Unexpected cookie write"); } });
  let index = 0;
  const requestJson = async (url, options) => {
    events.push("probe");
    requests.push({ url, options });
    const result = responses[Math.min(index++, responses.length - 1)];
    if (result instanceof Error) throw result;
    return result ?? { response: { ok: false, status: 503 }, body: {} };
  };
  const file = path.join(process.cwd(), "lib/zaf/pi/storage-access.ts");
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  const context = vm.createContext(contextValues);
  vm.runInContext(`(function(require,module,exports){${compiled}\n})`, context, { filename: file })(name => {
    if (name === "@/lib/zaf/client-request") return { requestJson };
    throw new Error("Unexpected dependency " + name);
  }, { exports }, exports);
  return { api: exports, requests, events, document };
}

const available = value => ({ response: { ok: true, status: 200 }, body: { available: value } });

function assertAnonymousProbes(requests) {
  for (const { url, options } of requests) {
    assert.equal(url, "/api/zaf/pi/storage");
    assert.equal(options.method, "GET");
    assert.equal(options.credentials, "same-origin");
    assert.equal(options.cache, "no-store");
    assert.equal(options.body, undefined);
    assert.equal(options.headers?.Authorization, undefined);
    assert.equal(options.headers?.authorization, undefined);
  }
}

test("storage readiness uses the HttpOnly probe and succeeds without JavaScript storage", async () => {
  const fixture = storageFixture({ responses: [available(true)] });
  assert.equal(fixture.api.PI_STORAGE_SETUP_PATH, "/signin/storage");
  assert.equal(await fixture.api.checkPiStorageAccess(), true);
  assert.equal(fixture.requests.length, 1);
  assertAnonymousProbes(fixture.requests);
});

test("a fresh cookie challenge is confirmed by a second request", async () => {
  const fixture = storageFixture({ responses: [available(false), available(true)] });
  assert.equal(await fixture.api.checkPiStorageAccess(), true);
  assert.equal(fixture.requests.length, 2);
  assertAnonymousProbes(fixture.requests);
});

test("blocked storage returns false after bounded challenge attempts", async () => {
  const fixture = storageFixture({ responses: [available(false)] });
  assert.equal(await fixture.api.checkPiStorageAccess(), false);
  assert.equal(fixture.requests.length, 2);
  assertAnonymousProbes(fixture.requests);
});

for (const [name, result] of [
  ["failed response", { response: { ok: false, status: 503 }, body: { available: true } }],
  ["missing body flag", { response: { ok: true, status: 200 }, body: {} }],
  ["string flag", available("true")],
  ["numeric flag", available(1)],
  ["null body", { response: { ok: true, status: 200 }, body: null }],
  ["transport failure", new TypeError("Probe unavailable")],
]) test(`storage readiness fails closed for ${name}`, async () => {
  const fixture = storageFixture({ responses: [result] });
  assert.equal(await fixture.api.checkPiStorageAccess(), false);
  assert.ok(fixture.requests.length >= 1 && fixture.requests.length <= 2);
  assertAnonymousProbes(fixture.requests);
});

test("storage permission is requested synchronously in the initiating user gesture", async () => {
  let activeGesture = true, permissionCalls = 0, finishPermission;
  const permission = new Promise(resolve => { finishPermission = resolve; });
  const fixture = storageFixture({ responses: [available(true)], requestStorageAccess() {
    assert.equal(activeGesture, true);
    assert.equal(this, fixture.document);
    permissionCalls++;
    return permission;
  } });
  const pending = fixture.api.requestPiStorageAccess();
  activeGesture = false;
  assert.equal(permissionCalls, 1);
  assert.equal(fixture.requests.length, 0);
  finishPermission();
  assert.equal(await pending, true);
  assert.equal(fixture.requests.length, 1);
  assertAnonymousProbes(fixture.requests);
});

test("permission grant is not treated as proof that a session cookie will round-trip", async () => {
  let calls = 0;
  const fixture = storageFixture({ responses: [available(false)], requestStorageAccess() { calls++; return Promise.resolve(); } });
  assert.equal(await fixture.api.requestPiStorageAccess(), false);
  assert.equal(calls, 1);
  assert.equal(fixture.requests.length, 2);
});

test("permission rejection returns false without an unhandled rejection", async () => {
  const fixture = storageFixture({ responses: [available(false)], requestStorageAccess() { return Promise.reject(new Error("Permission denied")); } });
  assert.equal(await fixture.api.requestPiStorageAccess(), false);
  assert.ok(fixture.requests.length <= 2);
});

test("synchronous permission errors fail closed", async () => {
  const fixture = storageFixture({ requestStorageAccess() { throw new Error("Permission unavailable"); } });
  assert.equal(await fixture.api.requestPiStorageAccess(), false);
});

test("browsers without the permission API can still confirm browser-managed cookie support", async () => {
  const fixture = storageFixture({ responses: [available(false), available(true)] });
  assert.equal(await fixture.api.requestPiStorageAccess(), true);
  assert.equal(fixture.requests.length, 2);
  assertAnonymousProbes(fixture.requests);
});

test("simultaneous readiness checks share the same in-flight cookie challenge", async () => {
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const fixture = storageFixture({ responses: [pending] });
  const first = fixture.api.checkPiStorageAccess();
  const second = fixture.api.checkPiStorageAccess();
  assert.equal(first, second);
  assert.equal(fixture.requests.length, 1);
  finish(available(true));
  assert.equal(await first, true);
  assert.equal(await second, true);
  assert.equal(fixture.requests.length, 1);
});

test("permission grant runs a fresh challenge after an older pre-grant probe completes", async () => {
  let finishOldProbe;
  const oldResponse = new Promise(resolve => { finishOldProbe = resolve; });
  const fixture = storageFixture({
    responses: [available(false), oldResponse, available(true)],
    requestStorageAccess() { return Promise.resolve(); },
  });
  const beforeGrant = fixture.api.checkPiStorageAccess();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fixture.requests.length, 2);
  const afterGrant = fixture.api.requestPiStorageAccess();
  finishOldProbe(available(false));
  assert.equal(await beforeGrant, false);
  assert.equal(await afterGrant, true);
  assert.equal(fixture.requests.length, 3);
});
