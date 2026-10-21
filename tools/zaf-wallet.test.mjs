import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));
const ADDRESS = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const OTHER_ADDRESS = "GBZXN7PIRZGNMHCGZT3N6FXHMWEBSSFXNR3B2H2IYJ3ZODIB54K64FMW";
const page = records => ({ _embedded: { records } });
const account = { account_id: ADDRESS, balances: [{ asset_type: "native", balance: "12.0000000" }], sequence: "1", subentry_count: 0 };
const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

function walletFixture({ claimables = page([]), transactions = page([]), operations = page([]), accountResponse = account } = {}) {
  const responses = { claimables, transactions, operations, account: accountResponse };
  const modules = new Map();
  const fetch = async url => {
    const name = url.includes("/claimable_balances") ? "claimables" : url.includes("/transactions?") ? "transactions" : url.includes("/operations?") ? "operations" : "account";
    const value = responses[name];
    if (value instanceof Error) throw value;
    return value?.status ? json(value.body, value.status) : json(value);
  };
  function load(name) {
    if (modules.has(name)) return modules.get(name);
    const file = path.join(root, "lib/zaf", name + ".ts");
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const module = { exports: {} };
    const run = vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { fetch, AbortController, setTimeout, clearTimeout, Date }, { filename: file });
    run(dependency => load(dependency.replace(/^\.\//, "")), module, module.exports);
    modules.set(name, module.exports);
    return module.exports;
  }
  return load("wallet-client").getZafWallet;
}

test("wallet rejects an invalid checksum before querying Horizon", async () => {
  await assert.rejects(walletFixture()('G' + 'A'.repeat(55)), /Invalid Pi wallet address/);
});

test("successful empty sources are reported as observed zero values", async () => {
  const value = await walletFixture()(ADDRESS);
  assert.equal(value.exists, true);
  assert.equal(value.accountBalancePi, 12);
  assert.equal(value.observableClaimablePi, 0);
  assert.equal(value.sources.claimableBalances, "available");
  assert.equal(value.sources.transactions, "available");
  assert.equal(value.sources.operations, "available");
  assert.equal(value.error, null);
});

test("a malformed claim amount remains unknown rather than becoming zero Pi", async () => {
  const value = await walletFixture({ claimables: page([{ id: "invalid", asset: "native", amount: "invalid", claimants: [{ destination: ADDRESS, predicate: { unconditional: true } }] }]) })(ADDRESS);
  assert.equal(value.observableClaimablePi, null);
  assert.equal(value.lockup.items[0].amountPi, null);
});

test("a failed claimable source stays unknown while the account remains usable", async () => {
  const value = await walletFixture({ claimables: { status: 503, body: { title: "Service Unavailable" } } })(ADDRESS);
  assert.equal(value.exists, true);
  assert.equal(value.accountBalancePi, 12);
  assert.equal(value.observableClaimablePi, null);
  assert.equal(value.lockup, null);
  assert.equal(value.sources.claimableBalances, "unavailable");
  assert.equal(value.sources.transactions, "available");
});

test("failed and malformed activity sources are distinguished from empty activity", async () => {
  const value = await walletFixture({ transactions: new Error("Source timed out"), operations: {} })(ADDRESS);
  assert.equal(value.exists, true);
  assert.equal(value.sources.transactions, "unavailable");
  assert.equal(value.sources.operations, "unavailable");
  assert.equal(value.transactions.length, 0);
  assert.equal(value.operations.length, 0);
});

test("an invalid account body cannot become a successful wallet lookup", async () => {
  const value = await walletFixture({ accountResponse: {} })(ADDRESS);
  assert.equal(value.exists, null);
  assert.equal(value.accountBalancePi, null);
  assert.match(value.error, /invalid account response/);
});

test("missing accounts remain distinct from an unavailable source", async () => {
  const missing = await walletFixture({ accountResponse: { status: 404, body: { title: "Not Found" } } })(ADDRESS);
  const unavailable = await walletFixture({ accountResponse: { status: 503, body: { title: "Service Unavailable" } } })(ADDRESS);
  assert.equal(missing.exists, false);
  assert.equal(missing.error, null);
  assert.equal(unavailable.exists, null);
  assert.match(unavailable.error, /Service Unavailable/);
});

test("credit token amounts are never mislabeled as native Pi", async () => {
  const value = await walletFixture({ operations: page([
    { id: "credit", asset_type: "credit_alphanum4", asset_code: "USD", amount: "50.0000000" },
    { id: "native", asset_type: "native", amount: "2.0000000" },
  ]) })(ADDRESS, "testnet");
  assert.equal(value.operations[0].amountPi, null);
  assert.equal(value.operations[1].amountPi, 2);
  assert.equal(value.networkScope, "testnet");
});

function balance(predicate, extra = {}) {
  return { id: "balance-1", amount: "100.0000000", asset: "native", claimants: [{ destination: OTHER_ADDRESS, predicate: { unconditional: true } }, { destination: ADDRESS, predicate }], ...extra };
}

test("claimable unlock uses the matching claimant and NOT(BEFORE) semantics", async () => {
  const value = await walletFixture({ claimables: page([balance({ not: { abs_before: "2020-01-01T00:00:00Z" } })]) })(ADDRESS);
  assert.equal(value.lockup.items[0].unlockAt, "2020-01-01T00:00:00.000Z");
  assert.equal(value.lockup.items[0].canClaimNow, true);
  assert.equal(value.lockup.items[0].createdAt, null);
});

test("BEFORE is a deadline, not an unlock time, with camelCase Horizon fields", async () => {
  const value = await walletFixture({ claimables: page([balance({ absBefore: "2080-01-01T00:00:00Z" })]) })(ADDRESS);
  assert.equal(value.lockup.items[0].unlockAt, null);
  assert.equal(value.lockup.items[0].canClaimNow, true);
});

test("relative predicates without creation time remain unknown", async () => {
  const value = await walletFixture({ claimables: page([balance({ not: { rel_before: "60" } }, { last_modified_time: "2020-01-01T00:00:00Z" })]) })(ADDRESS);
  assert.equal(value.lockup.items[0].unlockAt, null);
  assert.equal(value.lockup.items[0].canClaimNow, null);
});

test("compound predicates preserve known boolean results without guessing unknown clauses", async () => {
  const value = await walletFixture({ claimables: page([
    balance({ and: [{ unconditional: true }, { not: { absBefore: "2080-01-01T00:00:00Z" } }] }),
    { ...balance({ or: [{ unconditional: true }, { relBefore: "60" }] }), id: "balance-2" },
  ]) })(ADDRESS);
  assert.equal(value.lockup.items[0].canClaimNow, false);
  assert.equal(value.lockup.items[1].canClaimNow, true);
  assert.equal(value.lockup.items[0].unlockAt, null);
});
