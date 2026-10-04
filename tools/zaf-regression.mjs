import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "lib/zaf/observation-engine.ts",
  "lib/zaf/observation-history.ts",
  "app/api/zaf/observations/route.ts",
  "app/api/zaf/observations/history/route.ts",
  "app/api/zaf/observations/changes/route.ts",
  "lib/zaf/observation-changes.ts",
  "app/api/zaf/ledger/[sequence]/route.ts",
  "app/api/zaf/search/route.ts",
  "app/api/zaf/radar/route.ts",
  "lib/zaf/node-health.ts",
  "lib/zaf/wallet-analytics.ts",
];

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error("Missing required v1.1 file: " + file);
}

const removedStandalonePages = [
  "app/observatory/page.tsx",
  "app/search/page.tsx",
  "app/node-health/page.tsx",
  "app/node-alerts/page.tsx",
  "app/wallet-observatory/page.tsx",
];
for (const file of removedStandalonePages) {
  if (fs.existsSync(path.join(root, file))) throw new Error("Redundant standalone page returned: " + file);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (packageJson.scripts?.regression !== "node tools/zaf-regression.mjs") {
  throw new Error("Regression script is not wired into package.json");
}

const app = fs.readFileSync(path.join(root, "components/zaf-tech-app.tsx"), "utf8");
const forbiddenVisibleTerms = [
  "Pi Ecosystem Intelligence",
  "Pi Ekosistem İstihbaratı",
  "gelecekteki Node istihbaratı özellikleri",
];
for (const term of forbiddenVisibleTerms) {
  if (app.includes(term)) throw new Error("Forbidden visible terminology remains: " + term);
}

const engine = fs.readFileSync(path.join(root, "lib/zaf/observation-engine.ts"), "utf8");
for (const token of ["Promise.allSettled", "CACHE_TTL_MS", "confidenceFor", "healthFor"]) {
  if (!engine.includes(token)) throw new Error("Unified observation engine regression: " + token);
}

const workflow = fs.readFileSync(path.join(root, ".github/workflows/build-web-app.yml"), "utf8");
if (!workflow.includes("npm run regression")) throw new Error("CI regression gate is missing");

console.log("ZAF TECH v1.1 regression checks passed.");
