import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function sessionFixture(requestJson) {
  const cache = new Map(), storage = new Map(), effects = [], states = [], events = new Map();
  let timer;
  const browser = {
    dispatchEvent(event) { for (const listener of events.get(event.type) || []) listener(); },
    addEventListener(name, listener) { if (!events.has(name)) events.set(name, new Set()); events.get(name).add(listener); },
    removeEventListener(name, listener) { events.get(name)?.delete(listener); },
    setInterval(listener) { timer = listener; return 1; }, clearInterval() {},
  };
  const context = vm.createContext({
    window: browser, Event, console,
    sessionStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    navigator: { userAgent: "Chrome" },
  });
  const mocks = {
    "@/lib/zaf/client-request": { requestJson },
    "@/lib/zaf/i18n": { translate: (_locale, en) => en },
    react: { useEffect: callback => effects.push(callback), useRef: value => ({ current: value }), useState: value => {
      const index = states.length; states.push(value); return [value, next => { states[index] = next; }];
    } },
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
  };
  function load(name, parent = path.join(process.cwd(), "fixture.ts")) {
    if (mocks[name]) return mocks[name];
    const base = name.startsWith("@/") ? path.join(process.cwd(), name.slice(2)) : path.resolve(path.dirname(parent), name);
    const file = [base, base + ".ts", base + ".tsx"].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (!file) throw new Error(`Unexpected fixture import: ${name}`);
    if (cache.has(file)) return cache.get(file);
    const output = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const exports = {}; cache.set(file, exports);
    vm.runInContext(`(function(require,module,exports){${output}\n})`, context, { filename: file })(child => load(child, file), { exports }, exports);
    return exports;
  }
  return { load, storage, effects, states, browser, get timer() { return timer; } };
}

const ok = user => ({ response: { ok: true, status: 200 }, body: { user } });
const flush = () => new Promise(resolve => setImmediate(resolve));

test("reload restores the cookie identity rather than trusting the historical display", async () => {
  const requests = [];
  const fixture = sessionFixture(async (url, options) => { requests.push({ url, options }); return ok({ username: "server-account" }); });
  const display = fixture.load("@/lib/zaf/pi/oauth");
  fixture.storage.set(display.PI_SIGNIN_VERIFIED_USERNAME_KEY, JSON.stringify({ username: "historical-account", verifiedAt: Date.now() }));
  assert.equal(display.readPiDisplay().current, false);
  fixture.load("@/components/zaf-pi-sign-in").ZafPiSignIn({ locale: "en" });
  const cleanup = fixture.effects[0]();
  await flush();
  assert.equal(fixture.states[0].username, "server-account");
  assert.equal(fixture.states[0].current, true);
  assert.equal(requests[0].url, "/api/zaf/pi/session");
  assert.equal(requests[0].options.credentials, "same-origin");
  assert.equal(requests[0].options.cache, "no-store");
  cleanup();
});

test("two responsive headers share one in-flight restoration", async () => {
  let finish, requests = 0;
  const fixture = sessionFixture(() => { requests++; return new Promise(resolve => { finish = resolve; }); });
  const api = fixture.load("@/lib/zaf/pi/session-state");
  const first = api.refreshPiSession(), second = api.refreshPiSession();
  assert.equal(requests, 1);
  assert.equal(first, second);
  finish(ok({ username: "pioneer" }));
  await first;
  assert.equal(fixture.load("@/lib/zaf/pi/oauth").readPiDisplay().current, true);
});

test("missing or expired cookie clears the apparent live user on page resume", async () => {
  let result = ok({ username: "pioneer" });
  const fixture = sessionFixture(async () => result);
  const display = fixture.load("@/lib/zaf/pi/oauth");
  fixture.load("@/components/zaf-pi-sign-in").ZafPiSignIn({ locale: "en" });
  const cleanup = fixture.effects[0]();
  await flush();
  assert.equal(fixture.states[0].current, true);
  result = ok(null);
  fixture.browser.dispatchEvent(new Event("pageshow"));
  await flush();
  assert.equal(fixture.states[0], null);
  assert.equal(fixture.storage.has(display.PI_SIGNIN_VERIFIED_USERNAME_KEY), false);
  cleanup();
});

test("unavailable or malformed session never claims current verification", async () => {
  for (const mode of ["network", "status", "malformed", "invalid-name"]) {
    const fixture = sessionFixture(async () => {
      if (mode === "network") throw new TypeError("private transport detail");
      if (mode === "status") return { response: { ok: false, status: 503 }, body: {} };
      if (mode === "invalid-name") return ok({ username: "x".repeat(101) });
      return { response: { ok: true, status: 200 }, body: {} };
    });
    const display = fixture.load("@/lib/zaf/pi/oauth");
    display.savePiDisplay("historical");
    await fixture.load("@/lib/zaf/pi/session-state").refreshPiSession();
    assert.equal(display.readPiDisplay().username, "historical", mode);
    assert.equal(display.readPiDisplay().current, false, mode);
  }
});

test("late cookie restoration cannot overwrite a newer login or logout", async () => {
  for (const action of ["login", "logout", "failed-login"]) {
    let finish;
    const fixture = sessionFixture(() => new Promise(resolve => { finish = resolve; }));
    const display = fixture.load("@/lib/zaf/pi/oauth");
    display.savePiDisplay("old-account");
    const pending = fixture.load("@/lib/zaf/pi/session-state").refreshPiSession();
    display.acquirePiSignIn(); display.clearPiDisplay();
    if (action === "login") display.savePiDisplay("new-account");
    display.releasePiSignIn();
    finish(ok({ username: "old-account" }));
    await pending;
    assert.equal(display.readPiDisplay()?.username ?? null, action === "login" ? "new-account" : null, action);
  }
});

test("restoration skips an active sign-in and preserves its one-use OAuth state", async () => {
  let calls = 0;
  const fixture = sessionFixture(async () => { calls++; return ok(null); });
  const display = fixture.load("@/lib/zaf/pi/oauth");
  fixture.storage.set(display.PI_SIGNIN_STATE_KEY, "pending-state");
  display.acquirePiSignIn();
  await fixture.load("@/lib/zaf/pi/session-state").refreshPiSession();
  assert.equal(calls, 0);
  assert.equal(fixture.storage.get(display.PI_SIGNIN_STATE_KEY), "pending-state");
  display.releasePiSignIn();
});
