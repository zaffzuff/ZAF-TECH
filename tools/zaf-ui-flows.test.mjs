import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const response = (body, status = 200) => ({ response: { ok: status >= 200 && status < 300, status }, body });
const observation = url => ({ url, reachable: true, responseTimeMs: 123, https: true, redirect: false, checkedAt: "2026-10-19T00:00:00Z" });
const app = { name: "Fixture", url: "https://fixture.example/", category: "Tools", networkScope: "unknown", status: "unknown" };

// Render the actual component/event handlers with persistent hook cells. Deferred
// requests intentionally ignore AbortSignal so stale-result guards are exercised.
function harness(requestJson) {
  const cells = [], effects = [], cleanups = [], modules = new Map();
  let cursor = 0;
  const react = {
    useState(initial) { const index = cursor++; if (!(index in cells)) cells[index] = typeof initial === "function" ? initial() : initial; return [cells[index], value => { cells[index] = typeof value === "function" ? value(cells[index]) : value; }]; },
    useRef(initial) { const index = cursor++; if (!(index in cells)) cells[index] = { current: initial }; return cells[index]; },
    useCallback(callback) { cursor++; return callback; },
    useMemo(callback) { cursor++; return callback(); },
    useEffect(callback, dependencies) { const index = cursor++; const old = cells[index]; if (!old || dependencies?.some((value, i) => value !== old[i])) { cells[index] = dependencies ?? []; effects.push({ index, callback }); } },
  };
  function load(name, parent = root) {
    if (name === "react") return react;
    if (name === "react/jsx-runtime") return jsx;
    if (name === "@/lib/zaf/client-request") return { requestJson };
    if (name === "@/lib/zaf/i18n") return { translate: (_locale, en) => en, intlLocale: () => "en-US" };
    if (name === "next/navigation") return { useRouter: () => ({ push() {} }) };
    if (name.startsWith("next/") || name.startsWith("@/components/")) return new Proxy({}, { get: (_target, key) => key === "__esModule" ? true : () => null });
    if (!name.startsWith("@/") && !name.startsWith(".")) return require(name);
    const base = name.startsWith("@/") ? path.join(root, name.slice(2)) : path.resolve(parent, name);
    const file = [base, base + ".ts", base + ".tsx"].find(file => fs.existsSync(file) && fs.statSync(file).isFile());
    if (!file) throw new Error("Missing module " + name);
    if (modules.has(file)) return modules.get(file).exports;
    let source = fs.readFileSync(file, "utf8");
    if (file.endsWith("zaf-tech-app.tsx")) source += "\nexport { SearchPanel };\n";
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
    const module = { exports: {} }; modules.set(file, module);
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(dependency => load(dependency, path.dirname(file)), module, module.exports);
    return module.exports;
  }
  // Component dependencies are stubbed, but the component under test is real.
  function directComponent(file, name) {
    const relative = "./" + file;
    return load(relative, root)[name];
  }
  return {
    component: directComponent,
    render(Component, props) { cursor = 0; return Component(props); },
    effects() { for (const { index, callback } of effects.splice(0)) { cleanups[index]?.(); cleanups[index] = callback(); } },
    cleanup() { for (const cleanup of cleanups) cleanup?.(); },
  };
}

function nodes(tree, predicate) {
  if (tree == null || typeof tree === "boolean") return [];
  if (Array.isArray(tree)) return tree.flatMap(child => nodes(child, predicate));
  if (typeof tree !== "object") return [];
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}
function text(tree) {
  if (tree == null || typeof tree === "boolean") return "";
  if (Array.isArray(tree)) return tree.map(text).join(" ");
  return typeof tree === "object" ? text(tree.props?.children) : String(tree);
}
const find = (tree, type, label) => nodes(tree, node => node.type === type && (!label || text(node).includes(label)))[0];

for (const failure of ["rate-limit", "network", "invalid-body"]) test(`app details report ${failure} without inventing a target outage`, async () => {
  const h = harness(async () => {
    if (failure === "network") throw new Error("Connection failed");
    return failure === "rate-limit" ? response({ error: "Too many requests" }, 429) : response({ error: "Invalid data" });
  });
  const Component = h.component("components/zaf-app-details.tsx", "AppDetails");
  h.render(Component, { app }); h.effects(); await tick();
  const tree = h.render(Component, { app });
  const message = nodes(tree, node => node.props?.role === "status").map(text).join(" ");
  assert.match(message, failure === "rate-limit" ? /Too many requests/ : /could not be completed/);
  assert.doesNotMatch(text(tree), /undefined ms|0 ms|Offline/);
  h.cleanup();
});

test("URL edits discard old checks even when the old server response finishes later", async () => {
  const pending = deferred();
  const h = harness(() => pending.promise);
  const Component = h.component("components/zaf-app-health.tsx", "ZafAppHealth");
  const props = { locale: "en" };
  let tree = h.render(Component, props); h.effects();
  find(tree, "input").props.onChange({ target: { value: "https://first.example/" } });
  tree = h.render(Component, props);
  const running = find(tree, "button", "Check URL").props.onClick();
  tree = h.render(Component, props);
  find(tree, "input").props.onChange({ target: { value: "https://second.example/" } });
  pending.resolve(response(observation("https://first.example/")));
  await running; await tick();
  tree = h.render(Component, props);
  assert.equal(find(tree, "input").props.value, "https://second.example/");
  assert.doesNotMatch(text(tree), /123 ms/);
  h.cleanup();
});

test("switching app history cannot attach a late earlier history to the newly selected URL", async () => {
  const firstHistory = deferred(), secondHistory = deferred();
  const batch = { checked: 2, summary: { online: 2, offline: 0 }, results: ["first", "second"].map(name => ({ name, url: `https://${name}.example/`, score: { score: 100, status: "healthy" }, trend: { direction: "stable" }, check: observation(`https://${name}.example/`) })) };
  const h = harness(url => {
    if (url === "/api/apps/health") return Promise.resolve(response(batch));
    if (url.includes("/history?url=")) return url.includes("first") ? firstHistory.promise : secondHistory.promise;
    return Promise.resolve(response({ points: [] }));
  });
  const Component = h.component("components/zaf-app-health.tsx", "ZafAppHealth");
  const props = { locale: "en" };
  let tree = h.render(Component, props); h.effects();
  find(tree, "button", "Run Ecosystem Check").props.onClick(); await tick();
  tree = h.render(Component, props);
  find(tree, "button", "first").props.onClick();
  find(tree, "button", "second").props.onClick();
  secondHistory.resolve(response({ records: [{ checkedAt: "2026-10-19T00:00:00Z", reachable: true, responseTimeMs: 222 }] })); await tick();
  firstHistory.resolve(response({ records: [{ checkedAt: "2026-10-19T00:00:00Z", reachable: true, responseTimeMs: 999 }] })); await tick();
  tree = h.render(Component, props);
  assert.match(text(tree), /222\s+ms/); assert.doesNotMatch(text(tree), /999\s+ms/);
  h.cleanup();
});

test("search does not claim no matches until submitted, and edits invalidate late results", async () => {
  const pending = deferred();
  const h = harness(() => pending.promise);
  const Component = h.component("components/zaf-tech-app.tsx", "SearchPanel");
  const props = { locale: "en", tr: en => en, onNavigate() {} };
  let tree = h.render(Component, props); h.effects();
  find(tree, "input").props.onChange({ target: { value: "Pi" } });
  tree = h.render(Component, props);
  assert.doesNotMatch(text(tree), /No matching/);
  find(tree, "button").props.onClick();
  tree = h.render(Component, props);
  find(tree, "input").props.onChange({ target: { value: "Other" } });
  pending.resolve(response({ results: [{ type: "source", title: "Old Pi result", href: "https://fixture.example", detail: "Fixture" }] })); await tick();
  tree = h.render(Component, props);
  assert.doesNotMatch(text(tree), /Old Pi result|No matching/);
  h.cleanup();
});

test("a completed empty search displays its actual empty result", async () => {
  const h = harness(async () => response({ results: [] }));
  const Component = h.component("components/zaf-tech-app.tsx", "SearchPanel");
  const props = { locale: "en", tr: en => en, onNavigate() {} };
  let tree = h.render(Component, props); h.effects();
  find(tree, "input").props.onChange({ target: { value: "Nonexistent" } });
  tree = h.render(Component, props); find(tree, "button").props.onClick(); await tick();
  assert.match(text(h.render(Component, props)), /No matching observable results/);
  h.cleanup();
});
