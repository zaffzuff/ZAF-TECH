import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "lib/zaf/observation-engine.ts",
  "lib/zaf/observation-history.ts",
  "lib/zaf/ecosystem-history.ts",
  "app/api/zaf/observations/route.ts",
  "app/api/zaf/observations/history/route.ts",
  "app/api/zaf/observations/changes/route.ts",
  "lib/zaf/observation-changes.ts",
  "lib/zaf/observation-timeline.ts",
  "app/api/zaf/observations/timeline/route.ts",
  "app/api/zaf/ledger/[sequence]/route.ts",
  "app/api/zaf/search/route.ts",
  "app/api/zaf/radar/route.ts",
  "lib/zaf/radar.ts",
  "lib/zaf/node-health.ts",
  "lib/zaf/wallet-analytics.ts",
  "components/zaf-app-details.tsx",
  "lib/zaf/app-health-score.ts",
  "components/zaf-node-intelligence.tsx",
  "components/zaf-node-history.tsx",
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

const walletAnalytics = fs.readFileSync(path.join(root, "lib/zaf/wallet-analytics.ts"), "utf8");
for (const token of ["activityByDay", "activeDayCount", "getWalletActivityAnalytics"]) {
  if (!walletAnalytics.includes(token)) throw new Error("Wallet analytics regression: " + token);
}


for (const token of ["SearchPanel", "/api/zaf/search", "Global Search", "deepLinkReady", "/api/zaf/ledger/"]) {
  if (!app.includes(token)) throw new Error("Search/deep-link regression: " + token);
}

const radar = fs.readFileSync(path.join(root, "lib/zaf/radar.ts"), "utf8");
for (const token of ["getRadarObservation", "getRollingObservationBaseline", "sampleConfidence", "transaction-pace", "operation-pace", "source-coverage"]) {
  if (!radar.includes(token)) throw new Error("Radar regression: " + token);
}

const observationHistory = fs.readFileSync(path.join(root, "lib/zaf/observation-history.ts"), "utf8");
for (const token of ["function median", "getRollingObservationBaseline", "DOUBLE PRECISION", "daily_transactions"]) {
  if (!observationHistory.includes(token)) throw new Error("Observation history regression: " + token);
}

for (const token of ["30-minute rolling median", "Rolling baseline", "rolling medyana"]) {
  if (!app.includes(token)) throw new Error("Radar UI interpretation regression: " + token);
}

const score = fs.readFileSync(path.join(root, "lib/zaf/app-health-score.ts"), "utf8");
for (const token of ["calculateAppHealthScore", "healthy", "degraded", "offline"]) {
  if (!score.includes(token)) throw new Error("App health score regression: " + token);
}

const appHealthComponent = fs.readFileSync(path.join(root, "components/zaf-app-health.tsx"), "utf8");
for (const token of ["Observable Health Factors", "scoreFactors", "security audit", "ownership verification"]) {
  if (!appHealthComponent.includes(token)) throw new Error("App health UI regression: " + token);
}

const appHealthHistory = fs.readFileSync(path.join(root, "lib/zaf/app-check-history.ts"), "utf8");
for (const token of ["calculateAppHealthScore", "healthStatus", "score: score.score"]) {
  if (!appHealthHistory.includes(token)) throw new Error("App Health trend score regression: " + token);
}

const appHealthTrendModel = fs.readFileSync(path.join(root, "lib/zaf/app-health-trend.ts"), "utf8");
for (const token of ["classifyHealthTrend", "assessHealthData", "freshness", "dataConfidence", "improving", "declining"]) {
  if (!appHealthTrendModel.includes(token)) throw new Error("App Health trend model regression: " + token);
}

const appHealthRunner = fs.readFileSync(path.join(root, "lib/zaf/app-health-runner.ts"), "utf8");
for (const token of ["getAppHealthTrend", "assessHealthTrend", "declining", "improving", "attention"]) {
  if (!appHealthRunner.includes(token)) throw new Error("App Health overview regression: " + token);
}

const appHealthTrendRoute = fs.readFileSync(path.join(root, "app/api/apps/health/trend/route.ts"), "utf8");
for (const token of ["averageHealthScore", "minimumHealthScore", "maximumHealthScore", "firstHealthScore", "latestHealthScore", "firstHealthStatus", "latestHealthStatus", "healthScoreDelta", "healthStatusTransitions", "trendDirection", "dataConfidence", "freshness"]) {
  if (!appHealthTrendRoute.includes(token)) throw new Error("App Health trend summary regression: " + token);
}

const appDetails = fs.readFileSync(path.join(root, "components/zaf-app-details.tsx"), "utf8");
for (const token of ["Avg Health", "Health Score Trend", "Trend Direction", "Data Confidence", "Freshness", "Latest Age", "First → Latest Status", "Observed Window", "Status Transition Timeline", "toLocaleString", "healthStatus"]) {
  if (!appDetails.includes(token)) throw new Error("App Health trend visualization regression: " + token);
}

const appHealthOverview = fs.readFileSync(path.join(root, "components/zaf-app-health.tsx"), "utf8");
for (const token of ["Health Overview", "Health Change Radar", "attention", "Declining", "Improving", "Stale History"]) {
  if (!appHealthOverview.includes(token)) throw new Error("App Health overview UI regression: " + token);
}

for (const token of ["HistoryRange", "24h", "7d", "30d", "sampleHistoryPoints", "historyLimit", "Period Trend Analysis", "periodPercentChange", "averageHistoryValue", "Measurement Evidence", "Synthetic data"]) {
  if (!app.includes(token)) throw new Error("Historical observatory UI regression: " + token);
}

const observationHistoryRoute = fs.readFileSync(path.join(root, "app/api/zaf/observations/history/route.ts"), "utf8");
if (!observationHistoryRoute.includes("10000")) throw new Error("Historical observation route limit regression");


const workflow = fs.readFileSync(path.join(root, ".github/workflows/build-web-app.yml"), "utf8");
if (!workflow.includes("npm run regression")) throw new Error("CI regression gate is missing");

console.log("ZAF TECH v1.1 regression checks passed.");

