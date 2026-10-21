import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(`lib/zaf/${name}.ts`, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(`(function(require,exports){${source}\n})`, {})(dependency => load(dependency.replace("./", "")), exports);
  cache.set(name, exports);
  return exports;
}
const { formatAmount, formatAssetAmount } = load("amount-format");
const { summarizeClaimConditions } = load("wallet-claim-summary");
const { translate, localeLabels } = load("i18n");
const { translateObservationReason } = load("observation-copy");
const { radarDetail } = load("radar-copy");
const locales = ["en", "tr", "es", "zh", "it", "fr", "de", "pt", "ru"];

test("native and credit amounts preserve units, seven decimals and unknown values", () => {
  assert.equal(formatAmount(314159.8831291, "π"), "314.159,8831291 π");
  assert.equal(formatAmount(null, "π"), "—");
  assert.equal(formatAmount(NaN, "π"), "—");
  assert.equal(formatAssetAmount(12.5, { assetType: "credit_alphanum4", assetCode: "USD", label: "USD" }), "12,5 USD");
  assert.equal(formatAssetAmount(12.5, { assetType: "native", assetCode: null, label: "Pi" }), "12,5 π");
});
test("claim summary distinguishes actual time locks from satisfied conditions", () => {
  const result = summarizeClaimConditions([
    { amountPi: 10, canClaimNow: false, unlockAt: "2027-01-01T00:00:00Z" },
    { amountPi: 3.5, canClaimNow: true, unlockAt: null },
  ], "2026-10-20T12:00:00Z");
  assert.equal(result.lockedPi, 10);
  assert.equal(result.claimableNowPi, 3.5);
});
test("expired, unknown or malformed claim conditions never become invented locked totals", () => {
  for (const item of [
    { amountPi: 10, canClaimNow: false, unlockAt: null },
    { amountPi: 10, canClaimNow: false, unlockAt: "2026-01-01T00:00:00Z" },
    { amountPi: 10, canClaimNow: null, unlockAt: "2027-01-01T00:00:00Z" },
    { amountPi: null, canClaimNow: true },
    { amountPi: NaN, canClaimNow: true },
  ]) assert.equal(summarizeClaimConditions([item], "2026-10-20T12:00:00Z"), null);
  assert.equal(summarizeClaimConditions([], "2026-10-20"), null);
});
test("all nine locales translate directory, confidence reasons and dynamic radar data", () => {
  const directory = "The source is reachable, but app records are rendered dynamically and are not exposed in the initial HTML response.";
  const reasons = ["Latest Mainnet ledger observed.", "A substantial ledger sample is available.", "2/3 public ecosystem sources responded.", "1 observation source error occurred."];
  for (const locale of locales.filter(value => value !== "en")) {
    assert.notEqual(translate(locale, directory), directory, locale);
    for (const reason of reasons) assert.notEqual(translateObservationReason(locale, reason), reason, locale);
    const text = radarDetail({ id: "transaction-pace", value: 500, changePercent: 2.5 }, locale);
    assert.ok(!text.includes("Change against"), locale);
  }
  assert.equal(localeLabels.tr, "Türkçe");
  assert.equal(localeLabels.es, "Español");
});
test("boundary sentences start with an uppercase letter in all alphabetic locales", () => {
  const key = "Boundary: staking amount and ranking values are not invented when a verifiable ecosystem-wide public feed is unavailable. Historical official statements remain labeled as published evidence rather than live measurements.";
  for (const locale of locales) {
    const value = translate(locale, key, "Sınır: doğrulanabilir veri yoksa değer uydurulmaz.");
    const letter = value.match(/[:：]\s*(\p{L})/u)?.[1];
    assert.ok(letter, locale);
    assert.equal(letter, letter.toLocaleUpperCase(locale), locale);
  }
});

test("local Node diagnostic explanations are translated in all nine locales", () => {
  const { calculateNodeHealth } = load("node-health");
  const { nodeHealthReason } = load("node-health-copy");
  const base = { available: true, synced: true, ledgerAgeSeconds: 2, authenticatedPeers: 8, listeningPorts: 5, quorumPhase: "EXTERNALIZE", intersection: true, restarts: 1 };
  const samples = [base, { ...base, available: false }, { ...base, synced: false, ledgerAgeSeconds: 20, authenticatedPeers: 5 }, { ...base, ledgerAgeSeconds: 60, authenticatedPeers: 1 }];
  for (const input of samples) for (const reason of calculateNodeHealth(input).reasons) {
    for (const locale of locales.filter(value => value !== "en")) assert.notEqual(nodeHealthReason(locale, reason), reason, locale + ": " + reason);
  }
});
