import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function entryFixture({ userAgent = "PiBrowser", topLevel = false, hostApp = "pi-browser", authenticate } = {}) {
  const cache = new Map(), storage = new Map(), states = [], effects = [], navigations = [], requests = [], calls = [], logs = [];
  let cursor = 0;
  const window = {
    parent: {}, crypto: webcrypto,
    location: { origin: "https://zaf-tech.vercel.app", pathname: "/", search: "", assign: url => navigations.push(url), reload: () => calls.push("reload") },
    dispatchEvent() {},
  };
  if (topLevel) window.parent = window;
  const sdk = { getPiHostAppInfo: async () => { calls.push("host"); return { hostApp }; },
    authenticate: async scopes => { calls.push("authenticate"); assert.deepEqual(Array.from(scopes), ["username"]); return authenticate ? authenticate() : { accessToken: "private-fixture-token", user: { username: "untrusted-name" } }; },
  };
  const context = vm.createContext({
    window, Event, URL, Uint8Array, navigator: { userAgent },
    process: { env: { NEXT_PUBLIC_PI_SIGNIN_CLIENT_ID: "public-fixture-client" } },
    console: { error: (...args) => logs.push(args), warn: (...args) => logs.push(args) },
    sessionStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
  });
  const mocks = {
    "@/lib/zaf/client-request": { requestJson: async (url, options) => { requests.push({ url, options }); return { response: { ok: true, status: 200 }, body: { user: { username: "server-verified" } } }; } },
    "@/lib/zaf/pi/session-state": { refreshPiSession: async () => {} },
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
  return { calls, effects, requests, logs, storage, navigations, states, window, load,
    render(locale = "en") { cursor = 0; return Component({ locale }); },
  };
}

function descendants(value) {
  if (!value || typeof value !== "object") return [];
  const children = value.props?.children;
  return [value, ...(Array.isArray(children) ? children : [children]).flatMap(descendants)];
}

async function clickSignIn(component) {
  component.props.children[0].props.onClick();
  await new Promise(resolve => setImmediate(resolve));
}

test("direct top-level Pi Browser offers the registered app without starting the native bridge", async () => {
  const fixture = entryFixture({ topLevel: true });
  const initial = fixture.render();
  fixture.effects[1]();
  await clickSignIn(initial);
  const updated = fixture.render();
  const links = descendants(updated).filter(node => node.type === "a");
  assert.equal(links.length, 1);
  assert.equal(links[0].props.href, "https://zaftechpu0455.pinet.com");
  assert.match(links[0].props.children, /Open ZAF Tech in Pi/);
  assert.deepEqual(fixture.calls, []);
  assert.deepEqual(fixture.navigations, []);
  assert.deepEqual(fixture.requests, []);
  assert.equal(fixture.load("@/lib/zaf/pi/oauth").isPiSignInBusy(), false);
});

test("canonical entry is a fixed user-activated link and ignores attacker URL parameters", async () => {
  const fixture = entryFixture({ topLevel: true });
  fixture.window.location.search = "?returnTo=https://attacker.example&piAppUrl=javascript:alert(1)";
  await clickSignIn(fixture.render("tr"));
  const link = descendants(fixture.render("tr")).find(node => node.type === "a");
  assert.equal(link.props.href, "https://zaftechpu0455.pinet.com");
  assert.equal(new URL(link.props.href).origin, "https://zaftechpu0455.pinet.com");
  assert.match(link.props.children, /ZAF Tech'i Pi'de aç/);
  assert.deepEqual(fixture.navigations, []);
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
  assert.equal(fixture.requests.length, 1);
  assert.equal(fixture.requests[0].url, "/api/zaf/pi/auth");
  assert.equal(JSON.parse(fixture.requests[0].options.body).accessToken, "private-fixture-token");
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
  assert.equal(fixture.requests.length, 1);
  assert.equal(fixture.requests[0].url, "/api/zaf/pi/auth");
  assert.equal(fixture.navigations.length, 0);
});

test("ordinary top-level web browser retains OAuth rather than the Pi entry prompt", async () => {
  const fixture = entryFixture({ userAgent: "Chrome", topLevel: true, hostApp: "browser" });
  await clickSignIn(fixture.render());
  assert.equal(fixture.navigations.length, 1);
  assert.equal(new URL(fixture.navigations[0]).origin, "https://accounts.pinet.com");
  assert.equal(descendants(fixture.render()).some(node => node.type === "a" && node.props.href === "https://zaftechpu0455.pinet.com"), false);
  assert.equal(fixture.requests.length, 0);
});

test("framed native consent timeout offers one explicit canonical recovery link", async () => {
  const fixture = entryFixture({ authenticate: () => { throw new Error("Pi Browser did not respond to the sign-in request within 45 seconds."); } });
  await clickSignIn(fixture.render());
  const rendered = descendants(fixture.render());
  assert.equal(rendered.filter(node => node.props?.className?.includes("zaf-pi-status-bubble")).length, 1);
  const links = rendered.filter(node => node.type === "a");
  assert.equal(links.length, 1);
  assert.equal(links[0].props.href, "https://zaftechpu0455.pinet.com");
  assert.equal(fixture.navigations.length, 0);
  assert.equal(fixture.requests.length, 0);
  assert.equal(fixture.load("@/lib/zaf/pi/oauth").isPiSignInBusy(), false);
});
