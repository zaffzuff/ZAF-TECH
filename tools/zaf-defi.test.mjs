import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));
function compile(relativePath, dependencies = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(root + relativePath, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { AbortController, setTimeout, clearTimeout, Date, Number, ...globals }, { filename: relativePath })(name => dependencies[name], module, module.exports);
  return module.exports;
}
const page = records => ({ _embedded: { records } });
const pool = { id: "pool-1", reserves: [{ asset: "native", amount: "1" }], fee_bp: null, total_shares: null };

test("malformed successful responses are unavailable, never empty source observations", async () => {
  const { getDefiObservation } = compile("lib/zaf/defi-observation.ts", {}, { fetch: async url => ({ ok: true, json: async () => url.includes("/trades?") ? page([]) : {} }) });
  const value = await getDefiObservation();
  assert.equal(value.sources.liquidityPools.state, "unavailable");
  assert.equal(value.sources.trades.state, "empty");
  assert.match(value.sources.liquidityPools.error, /invalid records response/);
});

test("missing numeric pool attributes stay unknown instead of becoming zero", async () => {
  const { getDefiObservation } = compile("lib/zaf/defi-observation.ts", {}, { fetch: async url => ({ ok: true, json: async () => page(url.includes("/trades?") ? [] : [pool]) }) });
  const value = await getDefiObservation();
  assert.equal(value.sources.liquidityPools.records[0].feeBp, null);
  assert.equal(value.sources.liquidityPools.records[0].totalShares, null);
  assert.equal(value.sources.liquidityPools.records[0].reserves[0].amount, 1);
});

function routeFixture({ complete = true, readError = false, writeError = false } = {}) {
  const calls = { read: 0, save: 0, compare: 0 };
  const observation = { networkScope: "testnet", summary: { pools: 1, trades: 0, pairs: 0, distinctAssets: 1, state: "observed" }, sources: { liquidityPools: { state: "observed", records: [pool] }, trades: { state: complete ? "empty" : "unavailable", records: [] } } };
  const route = compile("app/api/zaf/defi/route.ts", {
    "next/server": { NextResponse: { json: (body, options = {}) => new Response(JSON.stringify(body), { status: options.status ?? 200, headers: options.headers }) } },
    "@/lib/zaf/defi-observation": { getDefiObservation: async () => observation },
    "@/lib/zaf/rate-limit": { enforceRateLimit: async () => null },
    "@/lib/zaf/defi-history": {
      isDefiHistoryConfigured: () => true,
      toDefiHistorySnapshot: () => ({ generatedAt: "2026-10-19T00:00:00Z", pools: 1, trades: 0, pairs: 0, distinctAssets: 1, poolIds: ["pool-1"], pairKeys: [] }),
      getLatestDefiSnapshot: async () => { calls.read++; if (readError) throw new Error("private DB detail"); return { generatedAt: "2026-10-18T00:00:00Z" }; },
      saveDefiSnapshot: async () => { calls.save++; if (writeError) throw new Error("private DB detail"); return true; },
      compareDefiSnapshots: () => { calls.compare++; return [{ id: "sample-change" }]; },
    },
  });
  return { calls, get: async query => route.GET({ nextUrl: new URL("https://zaf-tech.vercel.app/api/zaf/defi" + (query ?? "")) }) };
}

test("partial source failures neither poison saved history nor create change alerts", async () => {
  const fixture = routeFixture({ complete: false });
  const response = await fixture.get();
  const value = await response.json();
  assert.equal(response.status, 200);
  assert.equal(value.history.snapshotEligible, false);
  assert.equal(value.history.comparisonAvailable, false);
  assert.equal(value.history.stored, false);
  assert.equal(value.history.alerts.length, 0);
  assert.deepEqual(fixture.calls, { read: 0, save: 0, compare: 0 });
});

test("noncanonical sample limits cannot overwrite or compare the canonical baseline", async () => {
  const fixture = routeFixture();
  const value = await (await fixture.get("?limit=1")).json();
  assert.equal(value.history.snapshotEligible, false);
  assert.deepEqual(fixture.calls, { read: 0, save: 0, compare: 0 });
});

test("complete canonical observations retain normal history comparison and persistence", async () => {
  const fixture = routeFixture();
  const value = await (await fixture.get()).json();
  assert.equal(value.history.snapshotEligible, true);
  assert.equal(value.history.comparisonAvailable, true);
  assert.equal(value.history.stored, true);
  assert.equal(value.history.alerts.length, 1);
  assert.deepEqual(fixture.calls, { read: 1, save: 1, compare: 1 });
});

test("a history database read outage preserves live data without exposing database details", async () => {
  const fixture = routeFixture({ readError: true });
  const response = await fixture.get();
  const value = await response.json();
  assert.equal(response.status, 200);
  assert.equal(value.summary.pools, 1);
  assert.equal(value.history.comparisonAvailable, false);
  assert.match(value.history.error, /Live observations remain available/);
  assert.doesNotMatch(value.history.error, /private DB detail/);
  assert.deepEqual(fixture.calls, { read: 1, save: 0, compare: 0 });
});

test("a history database write outage preserves live data and its valid comparison", async () => {
  const fixture = routeFixture({ writeError: true });
  const response = await fixture.get();
  const value = await response.json();
  assert.equal(response.status, 200);
  assert.equal(value.summary.pools, 1);
  assert.equal(value.history.stored, false);
  assert.equal(value.history.comparisonAvailable, true);
  assert.match(value.history.error, /could not be stored/);
});
