import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function entryFixture({ userAgent = "PiBrowser", topLevel = false, hostApp = "pi-browser", authenticate, authStatus = 200, pageSession = "valid", sessionUsername = "server-verified", storageAvailable = true, requestStorageAccess, deleteSession } = {}) {
  const cache = new Map(), storage = new Map(), states = [], effects = [], navigations = [], requests = [], calls = [], logs = [];
  let cursor = 0;
  const window = {
    parent: {}, crypto: webcrypto,
    location: { origin: "https://zaf-tech.vercel.app", pathname: "/", search: "", assign: url => navigations.push(url), reload: () => calls.push("reload") },
    dispatchEvent() {},
  };
  if (topLevel) window.parent = window;
  const document = requestStorageAccess ? { requestStorageAccess } : {};
  window.document = document;
  const sdk = { getPiHostAppInfo: async () => { calls.push("host"); return { hostApp }; },
    authenticate: async scopes => { calls.push("authenticate"); assert.deepEqual(Array.from(scopes), ["username"]); return authenticate ? authenticate() : { accessToken: "private-fixture-token", user: { username: "untrusted-name" } }; },
  };
  const context = vm.createContext({
    window, document, Event, URL, Uint8Array, navigator: { userAgent },
    process: { env: { NEXT_PUBLIC_PI_SIGNIN_CLIENT_ID: "public-fixture-client" } },
    console: { error: (...args) => logs.push(args), warn: (...args) => logs.push(args) },
    sessionStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
  });
  const mocks = {
    "@/components/zaf-overlay": { ZafOverlay: "dialog" },
    "@/lib/zaf/client-request": { requestJson: async (url, options) => {
      requests.push({ url, options });
      let body;
      if (url === "/api/zaf/pi/storage") body = { available: typeof storageAvailable === "function" ? storageAvailable() : storageAvailable };
      else if (url === "/api/zaf/pi/session") {
        if (options.method === "DELETE") { deleteSession?.(); body = { ok: true }; }
        else {
          const username = options.headers?.["X-ZAF-Pi-Session-Transport"] === "memory" && !options.headers.Authorization ? null : typeof sessionUsername === "function" ? sessionUsername() : sessionUsername;
          body = { user: username === null ? null : { username } };
        }
      } else if (url === "/api/zaf/pi/auth") body = { user: { username: "server-verified" }, ...(options.headers?.["X-ZAF-Pi-Session-Transport"] === "memory" ? { session: pageSession === "valid" ? { token: "page-session-fixture-".repeat(6), expiresIn: 1800 } : pageSession } : {}) };
      else throw new Error("Unexpected request " + url);
      const status = url === "/api/zaf/pi/auth" ? authStatus : 200;
      return { response: { ok: status === 200, status }, body };
    } },
    "@/lib/zaf/pi/sdk": {
      loadPiSdk: async () => { calls.push("load"); }, initializePiSdk: async () => { calls.push("init"); return sdk; },
      authenticatePi: pi => pi.authenticate(["username"], () => undefined),
      piReloadRequired: () => false, withPiTimeout: promise => promise,
    },
    "@/lib/zaf/i18n": { translate: (locale, en, tr) => locale === "tr" ? tr : en },
    react: { useEffect: callback => effects.push(callback), useRef: value => ({ current: value }), useState: initial => {
      const index = cursor++; if (states.length <= index) states.push(initial); return [states[index], next => { states[index] = next; }];
    } },
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
  };
  function load(name, parent = path.join(process.cwd(), "fixture.ts")) {
    if (mocks[name]) return mocks[name];
    const base = name.startsWith("@/") ? path.join(process.cwd(), name.slice(2)) : path.resolve(path.dirname(parent), name);
    const file = [base, base + ".ts", base + ".tsx"].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (!file) throw new Error(`Unexpected fixture import: ${name}`);
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const source = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    vm.runInContext(`(function(require,module,exports){${source}\n})`, context, { filename: file })(child => load(child, file), { exports }, exports);
    return exports;
  }
  const Component = load("@/components/zaf-pi-sign-in").ZafPiSignIn;
  return { calls, effects, requests, logs, storage, navigations, states, window, document, load,
    render(locale = "en") { cursor = 0; return Component({ locale }); },
  };
}

function descendants(value) {
  if (!value || typeof value !== "object") return [];
  const children = value.props?.children;
  return [value, ...(Array.isArray(children) ? children : [children]).flatMap(descendants)];
}

function renderedText(value) {
  if (value == null || typeof value === "boolean") return "";
  if (Array.isArray(value)) return value.map(renderedText).join(" ");
  return typeof value === "object" ? renderedText(value.props?.children) : String(value);
}

async function clickSignIn(component) {
  component.props.children[0].props.onClick();
  await new Promise(resolve => setImmediate(resolve));
}

test("direct self-hosted Pi Browser uses native auth and never unsupported web OAuth", async () => {
  const fixture = entryFixture({ topLevel: true });
  const initial = fixture.render();
  fixture.effects[1]();
  await clickSignIn(initial);
  assert.deepEqual(fixture.calls, ["load", "init", "host", "authenticate"]);
  assert.equal(fixture.navigations.length, 0);
  assert.equal(fixture.requests[0].url, "/api/zaf/pi/auth");
  assert.match(renderedText(fixture.render()), /Pi Account Verified/);
  assert.equal(fixture.load("@/lib/zaf/pi/oauth").isPiSignInBusy(), false);
});

test("direct native Pi login ignores attacker URL destinations", async () => {
  const fixture = entryFixture({ topLevel: true });
  fixture.window.location.search = "?returnTo=https://attacker.example&piAppUrl=javascript:alert(1)";
  await clickSignIn(fixture.render("tr"));
  assert.deepEqual(fixture.navigations, []);
  assert.equal(fixture.requests[0].url, "/api/zaf/pi/auth");
});

test("PiNet web host uses existing OAuth even when its browser user agent mentions Pi", async () => {
  const fixture = entryFixture({ hostApp: "pi-net" });
  await clickSignIn(fixture.render());
  assert.deepEqual(fixture.calls, ["load", "init", "host"]);
  assert.equal(fixture.requests.length, 0);
  assert.equal(fixture.navigations.length, 1);
  const url = new URL(fixture.navigations[0]);
  assert.equal(url.origin, "https://accounts.pinet.com");
  assert.equal(url.pathname, "/oauth/authorize");
  assert.equal(url.searchParams.get("scope"), "username");
  assert.equal(url.searchParams.get("redirect_uri"), "https://zaf-tech.vercel.app/signin/callback");
  assert.equal(url.searchParams.get("state").length, 48);
  assert.equal(JSON.stringify([...fixture.storage.values()]).includes("private-fixture-token"), false);
});

for (const hostApp of ["pi-browser", "pi-node"]) test(`registered framed ${hostApp} keeps native App Studio verification`, async () => {
  const fixture = entryFixture({ hostApp });
  await clickSignIn(fixture.render());
  assert.deepEqual(fixture.calls, ["load", "init", "host", "authenticate"]);
  assert.equal(fixture.navigations.length, 0);
  assert.equal(fixture.requests.length, 2);
  assert.equal(fixture.requests[0].url, "/api/zaf/pi/auth");
  assert.equal(JSON.parse(fixture.requests[0].options.body).accessToken, "private-fixture-token");
  assert.equal(fixture.requests[1].url, "/api/zaf/pi/session");
  assert.equal(fixture.requests[1].options.credentials, "same-origin");
  assert.equal(fixture.load("@/lib/zaf/pi/oauth").readPiDisplay().username, "server-verified");
  assert.equal(JSON.stringify([...fixture.storage.values()]).includes("private-fixture-token"), false);
  assert.equal(JSON.stringify(fixture.logs).includes("private-fixture-token"), false);
});

test("registered native consent cancellation can retry without OAuth downgrade", async () => {
  let attempts = 0;
  const fixture = entryFixture({ authenticate: () => { if (++attempts === 1) throw new Error("Consent cancelled"); return { accessToken: "private-fixture-token" }; } });
  await clickSignIn(fixture.render());
  assert.equal(fixture.requests.length, 0);
  assert.equal(fixture.navigations.length, 0);
  await clickSignIn(fixture.render());
  assert.equal(fixture.requests.length, 2);
  assert.equal(fixture.requests[0].url, "/api/zaf/pi/auth");
  assert.equal(fixture.navigations.length, 0);
});

test("ordinary top-level web browser retains OAuth rather than the Pi entry prompt", async () => {
  const fixture = entryFixture({ userAgent: "Chrome", topLevel: true, hostApp: "browser" });
  await clickSignIn(fixture.render());
  assert.equal(fixture.navigations.length, 1);
  assert.equal(new URL(fixture.navigations[0]).origin, "https://accounts.pinet.com");
  assert.equal(descendants(fixture.render()).some(node => node.type === "a" && node.props.href === "https://zaftech3771.pinet.com"), false);
  assert.equal(fixture.requests.length, 0);
});

test("framed native consent timeout offers one explicit canonical recovery link", async () => {
  const fixture = entryFixture({ authenticate: () => { throw new Error("Pi Browser did not respond to the sign-in request within 45 seconds."); } });
  await clickSignIn(fixture.render());
  const rendered = descendants(fixture.render());
  assert.equal(rendered.filter(node => node.type === "dialog").length, 1);
  const links = rendered.filter(node => node.type === "a");
  assert.equal(links.length, 1);
  assert.equal(links[0].props.href, "https://zaftech3771.pinet.com");
  assert.equal(fixture.navigations.length, 0);
  assert.equal(fixture.requests.length, 0);
  assert.equal(fixture.load("@/lib/zaf/pi/oauth").isPiSignInBusy(), false);
});

test("page login still requires a matching server session after native verification", async () => {
  const fixture = entryFixture({ userAgent: "iPhone PiBrowser", sessionUsername: null, storageAvailable: false });
  await clickSignIn(fixture.render());
  const tree = fixture.render();
  assert.equal(fixture.requests.filter(r => r.url === "/api/zaf/pi/storage").length, 2);
  assert.equal(fixture.load("@/lib/zaf/pi/oauth").readPiDisplay(), null);
  assert.doesNotMatch(renderedText(tree), /Pi Verified|Pi Account Verified|Verified username:/);
  assert.match(renderedText(tree), /ZAF-PI-SESSION/);
  assert.equal(fixture.load("@/lib/zaf/pi/page-session").piSessionRequestOptions("GET").headers.Authorization, undefined);
  assert.equal(fixture.navigations.length, 0);
});

for (const sessionUsername of [null, "different-account"]) test(`native verification cannot trust its POST name over ${sessionUsername === null ? "a missing" : "another"} session identity`, async () => {
  const fixture = entryFixture({ sessionUsername });
  await clickSignIn(fixture.render());
  assert.equal(fixture.requests[0].url, "/api/zaf/pi/auth");
  assert.equal(fixture.requests[1].url, "/api/zaf/pi/session");
  assert.equal(fixture.load("@/lib/zaf/pi/oauth").readPiDisplay(), null);
  assert.doesNotMatch(renderedText(fixture.render()), /Pi Verified|Pi Account Verified|Verified username:/);
  assert.match(renderedText(fixture.render()), /ZAF-PI-SESSION/);
});

test("a permission gesture restores the existing server identity without Pi authentication", async () => {
  let granted = false, activeGesture = false, permissionCalls = 0;
  const fixture = entryFixture({
    userAgent: "iPhone PiBrowser", sessionUsername: "restored-server-account", storageAvailable: () => granted,
    requestStorageAccess() {
      assert.equal(activeGesture, true);
      permissionCalls++;
      granted = true;
      return Promise.resolve();
    },
  });
  const access = fixture.load("@/lib/zaf/pi/storage-access");
  assert.equal(await access.checkPiStorageAccess(), false);
  const initial = fixture.render();
  activeGesture = true;
  initial.props.children[0].props.onClick();
  activeGesture = false;
  assert.equal(permissionCalls, 1);
  await new Promise(resolve => setImmediate(resolve));
  const display = fixture.load("@/lib/zaf/pi/oauth").readPiDisplay();
  assert.equal(display.username, "restored-server-account");
  assert.equal(display.current, true);
  assert.equal(access.isPiSessionStorageBlocked(), false);
  assert.deepEqual(fixture.calls, []);
  assert.equal(fixture.requests.some(request => request.url === "/api/zaf/pi/auth"), false);
  assert.equal(fixture.requests.filter(request => request.url === "/api/zaf/pi/session").length, 1);
  assert.match(renderedText(fixture.render()), /Pi Account Verified/);
  assert.equal(fixture.load("@/lib/zaf/pi/oauth").isPiSignInBusy(), false);
});

test("denied storage permission uses a verified page session instead of a Resume loop", async () => {
  let permissionCalls = 0;
  const fixture = entryFixture({
    userAgent: "iPhone PiBrowser", storageAvailable: false,
    requestStorageAccess() { permissionCalls++; return Promise.reject(new Error("User declined")); },
  });
  assert.equal(await fixture.load("@/lib/zaf/pi/storage-access").checkPiStorageAccess(), false);
  const initial = fixture.render();
  assert.doesNotMatch(renderedText(initial), /Resume session/);
  await clickSignIn(initial);
  assert.equal(permissionCalls, 1);
  assert.deepEqual(fixture.calls, ["load", "init", "host", "authenticate"]);
  assert.equal(fixture.load("@/lib/zaf/pi/oauth").readPiDisplay().current, true);
  assert.match(renderedText(fixture.render()), /Pi Account Verified/);
  assert.match(renderedText(fixture.render()), /refresh or close this page/);
  assert.doesNotMatch(renderedText(fixture.render()), /Session help|Resume session/);
  for (const request of fixture.requests.filter(r => r.url !== "/api/zaf/pi/storage")) {
    assert.equal(request.options.credentials, "omit");
    assert.equal(request.options.headers["X-ZAF-Pi-Session-Transport"], "memory");
  }
  assert.deepEqual(fixture.navigations, []);
  const saved = JSON.stringify([...fixture.storage.values()]);
  assert.ok(!saved.includes("private-fixture-token") && !saved.includes("page-session-fixture"));
  assert.ok(!JSON.stringify(fixture.logs).includes("page-session-fixture"));
  const beforePoll = fixture.requests.length;
  await fixture.load("@/lib/zaf/pi/session-state").refreshPiSession();
  assert.deepEqual(fixture.requests.slice(beforePoll).map(r => r.url), ["/api/zaf/pi/session"]);
  assert.equal(fixture.load("@/lib/zaf/pi/oauth").readPiDisplay().current, true);
  assert.equal(fixture.calls.filter(call => call === "authenticate").length, 1);
});

test("blocked cookies do not prevent page signout and a new native login", async () => {
  let permissionCalls = 0;
  const fixture = entryFixture({ userAgent: "iPhone PiBrowser", storageAvailable: false,
    requestStorageAccess() { permissionCalls++; return Promise.reject(new Error("Unavailable")); } });
  await clickSignIn(fixture.render());
  const display = fixture.load("@/lib/zaf/pi/oauth");
  assert.equal(display.readPiDisplay().current, true);
  const before = fixture.requests.length;
  await clickSignIn(fixture.render());
  const signOut = descendants(fixture.render()).find(node => node.type === "button" && renderedText(node) === "Sign out");
  signOut.props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(display.readPiDisplay(), null);
  assert.equal(permissionCalls, 0);
  const logout = fixture.requests.slice(before);
  assert.deepEqual(logout.map(r => r.options.method), ["DELETE", "GET"]);
  assert.match(logout[0].options.headers.Authorization, /^Bearer /);
  assert.equal(logout[1].options.headers.Authorization, undefined);
  assert.ok(logout.every(r => r.options.credentials === "omit"));
  await clickSignIn(fixture.render());
  assert.equal(display.readPiDisplay().current, true);
  assert.equal(fixture.calls.filter(call => call === "authenticate").length, 2);
});

for (const pageSession of [null, {}, {token: "bad", expiresAt: Date.now()+60_000}]) test("malformed page credential cannot establish a login: " + JSON.stringify(pageSession), async () => {
  const fixture = entryFixture({ userAgent: "iPhone PiBrowser", storageAvailable: false, pageSession });
  await clickSignIn(fixture.render());
  assert.equal(fixture.load("@/lib/zaf/pi/oauth").readPiDisplay(), null);
  assert.match(renderedText(fixture.render()), /ZAF-PI-SESSION/);
});

test("blocked iOS sign-out requests permission synchronously before deleting and confirming the session", async () => {
  let available = true, deleted = false, activeGesture = false, permissionCalls = 0, finishPermission;
  const permission = new Promise(resolve => { finishPermission = resolve; });
  const fixture = entryFixture({
    userAgent: "iPhone PiBrowser", storageAvailable: () => available,
    sessionUsername: () => deleted ? null : "server-verified", deleteSession() { deleted = true; },
    requestStorageAccess() { assert.equal(activeGesture, true); permissionCalls++; return permission; },
  });
  await clickSignIn(fixture.render());
  available = false;
  assert.equal(await fixture.load("@/lib/zaf/pi/storage-access").checkPiStorageAccess(), false);
  const signOut = descendants(fixture.render()).find(node => node.type === "button" && renderedText(node) === "Sign out");
  const before = fixture.requests.length;
  activeGesture = true;
  signOut.props.onClick();
  activeGesture = false;
  assert.equal(permissionCalls, 1);
  assert.equal(fixture.requests.length, before);
  assert.equal(deleted, false);
  available = true;
  finishPermission();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(fixture.requests.slice(before).map(request => [request.url, request.options.method]), [
    ["/api/zaf/pi/storage", "GET"], ["/api/zaf/pi/storage", "GET"], ["/api/zaf/pi/session", "DELETE"], ["/api/zaf/pi/session", "GET"],
  ]);
  assert.equal(fixture.load("@/lib/zaf/pi/oauth").readPiDisplay(), null);
  assert.doesNotMatch(renderedText(fixture.render()), /Verified username:|Sign-out failed/);
  assert.equal(fixture.load("@/lib/zaf/pi/oauth").isPiSignInBusy(), false);
});

test("denied storage access during sign-out neither sends DELETE nor claims success", async () => {
  let available = true, permissionCalls = 0;
  const fixture = entryFixture({
    userAgent: "iPhone PiBrowser", storageAvailable: () => available,
    requestStorageAccess() { permissionCalls++; return Promise.reject(new Error("Permission denied")); },
  });
  await clickSignIn(fixture.render());
  available = false;
  assert.equal(await fixture.load("@/lib/zaf/pi/storage-access").checkPiStorageAccess(), false);
  const before = fixture.requests.length;
  descendants(fixture.render()).find(node => node.type === "button" && renderedText(node) === "Sign out").props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(permissionCalls, 1);
  assert.equal(fixture.requests.length, before);
  assert.equal(fixture.requests.some(request => request.options.method === "DELETE"), false);
  assert.equal(fixture.load("@/lib/zaf/pi/oauth").readPiDisplay().username, "server-verified");
  assert.match(renderedText(fixture.render()), /Sign-out failed/);
  assert.equal(fixture.load("@/lib/zaf/pi/oauth").isPiSignInBusy(), false);
});

test("successful DELETE with a remaining server session does not fabricate a successful logout", async () => {
  const fixture = entryFixture();
  await clickSignIn(fixture.render());
  const before = fixture.requests.length;
  descendants(fixture.render()).find(node => node.type === "button" && renderedText(node) === "Sign out").props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(fixture.requests.slice(before).map(request => [request.url, request.options.method]), [
    ["/api/zaf/pi/session", "DELETE"], ["/api/zaf/pi/session", "GET"],
  ]);
  assert.equal(fixture.load("@/lib/zaf/pi/oauth").readPiDisplay().username, "server-verified");
  assert.match(renderedText(fixture.render()), /Sign-out failed/);
  assert.equal(fixture.load("@/lib/zaf/pi/oauth").isPiSignInBusy(), false);
});

test("logout clears the display only after the follow-up GET confirms user null", async () => {
  let deleted = false;
  const fixture = entryFixture({ sessionUsername: () => deleted ? null : "server-verified", deleteSession() { deleted = true; } });
  await clickSignIn(fixture.render());
  const before = fixture.requests.length;
  descendants(fixture.render()).find(node => node.type === "button" && renderedText(node) === "Sign out").props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(fixture.requests.slice(before).map(request => [request.url, request.options.method]), [
    ["/api/zaf/pi/session", "DELETE"], ["/api/zaf/pi/session", "GET"],
  ]);
  assert.equal(fixture.load("@/lib/zaf/pi/oauth").readPiDisplay(), null);
  assert.equal(descendants(fixture.render()).some(node => node.type === "button" && renderedText(node) === "Sign out"), false);
  assert.doesNotMatch(renderedText(fixture.render()), /Sign-out failed|Verified username:/);
  assert.equal(fixture.load("@/lib/zaf/pi/oauth").isPiSignInBusy(), false);
});

test("an immediate historical-name sign-out discovers blocked cookies before any DELETE", async () => {
  let permissionCalls = 0;
  const fixture = entryFixture({
    userAgent: "iPhone PiBrowser", storageAvailable: false,
    requestStorageAccess() { permissionCalls++; return Promise.resolve(); },
  });
  const display = fixture.load("@/lib/zaf/pi/oauth");
  fixture.storage.set(display.PI_SIGNIN_VERIFIED_USERNAME_KEY, JSON.stringify({ username: "historical-account", verifiedAt: Date.now() }));
  // The historical name can hydrate before the page's first cookie probe ends.
  fixture.states[0] = display.readPiDisplay();
  assert.equal(fixture.states[0].current, false);
  assert.equal(fixture.load("@/lib/zaf/pi/storage-access").isPiSessionStorageBlocked(), false);
  await clickSignIn(fixture.render());
  const signOut = descendants(fixture.render()).find(node => node.type === "button" && renderedText(node) === "Sign out");
  signOut.props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(fixture.requests.map(request => [request.url, request.options.method]), [
    ["/api/zaf/pi/storage", "GET"], ["/api/zaf/pi/storage", "GET"],
  ]);
  assert.equal(permissionCalls, 0);
  assert.equal(fixture.load("@/lib/zaf/pi/storage-access").isPiSessionStorageBlocked(), true);
  assert.equal(display.readPiDisplay().username, "historical-account");
  assert.equal(display.readPiDisplay().current, false);
  assert.match(renderedText(fixture.render()), /Sign-out failed/);
  assert.equal(display.isPiSignInBusy(), false);
});

test("generic top-level iOS with a native host uses native authentication", async () => {
  const fixture = entryFixture({ userAgent: "Mozilla/5.0 iPhone", topLevel: true });
  await clickSignIn(fixture.render());
  assert.deepEqual(fixture.calls, ["load", "init", "host", "authenticate"]);
  assert.equal(fixture.requests[0].url, "/api/zaf/pi/auth");
  assert.equal(fixture.navigations.length, 0);
});

test("native upstream 502 offers registered entry without trusting SDK identity or retrying another verifier", async () => {
  const fixture = entryFixture({ authStatus: 502 });
  await clickSignIn(fixture.render());
  const updated = fixture.render();
  assert.match(renderedText(updated), /ZAF-PI-502/);
  const link = descendants(updated).find(node => node.type === "a");
  assert.equal(link.props.href, "https://zaftech3771.pinet.com");
  assert.equal(link.props.target, "_top");
  assert.equal(fixture.requests.length, 1);
  assert.equal(fixture.requests[0].url, "/api/zaf/pi/auth");
  assert.equal(fixture.load("@/lib/zaf/pi/oauth").readPiDisplay(), null);
  assert.equal(fixture.navigations.length, 0);
  assert.equal(JSON.stringify(fixture.logs).includes("private-fixture-token"), false);
});
