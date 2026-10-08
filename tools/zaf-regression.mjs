import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "lib/zaf/observation-engine.ts",
  "lib/zaf/observation-history.ts",
  "lib/zaf/network-scope.ts",
  "lib/zaf/observation-scope.ts",
  "lib/zaf/testnet-assets.ts",
  "lib/zaf/defi-observation.ts",
  "app/api/zaf/defi/route.ts",
  "components/zaf-defi-observatory.tsx",
  "lib/zaf/launchpad-observation.ts",
  "lib/zaf/defi-history.ts",
  "app/api/zaf/defi/history/route.ts",
  "app/api/zaf/launchpad/route.ts",
  "components/zaf-launchpad-observatory.tsx",
  "lib/zaf/ecosystem-graph.ts",
  "app/api/zaf/ecosystem/graph/route.ts",
  "components/zaf-ecosystem-graph.tsx",
  "app/api/zaf/assets/route.ts",
  "components/zaf-testnet-assets.tsx",
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
  "components/zaf-ecosystem-health-timeline.tsx",
  "components/zaf-ecosystem-app-activity.tsx",
  "components/zaf-ecosystem-staking.tsx",
  "lib/zaf/ecosystem-app-observations.ts",
  "lib/zaf/ecosystem-staking.ts",
  "app/api/zaf/ecosystem/apps/route.ts",
  "app/api/zaf/ecosystem/staking/route.ts",
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

const db = fs.readFileSync(path.join(root, "lib/zaf/db.ts"), "utf8");
for (const token of ["getZafDb", "ensureZafSchema", "zaf_schema_migrations", "pg_advisory_xact_lock", "0001_core_history", "zaf_app_checks", "zaf_defi_snapshots", "zaf_ecosystem_snapshots", "zaf_observation_snapshots"]) {
  if (!db.includes(token)) throw new Error("Central DB/migration regression: " + token);
}
for (const file of [
  "lib/zaf/app-check-history.ts",
  "lib/zaf/observation-history.ts",
  "lib/zaf/defi-history.ts",
  "lib/zaf/ecosystem-history.ts",
]) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  if (source.includes('from "postgres"') || source.includes("postgres(")) {
    throw new Error("Direct Postgres client bypass remains in " + file);
  }
  if (!source.includes("ensureZafSchema")) {
    throw new Error("Central schema gate is missing in " + file);
  }
}

const rateLimit = fs.readFileSync(path.join(root, "lib/zaf/rate-limit.ts"), "utf8");
for (const token of ["consumeRateLimit", "enforceRateLimit", "rateLimitHeaders", "cleanupZafRateLimits", "429", "Retry-After", "zaf_rate_limits", "ON CONFLICT (key_hash)"]) {
  if (!rateLimit.includes(token)) throw new Error("Rate-limit foundation regression: " + token);
}
const dbRateLimit = fs.readFileSync(path.join(root, "lib/zaf/db.ts"), "utf8");
for (const token of ["0002_rate_limits", "CREATE TABLE IF NOT EXISTS zaf_rate_limits", "zaf_rate_limits_updated_at_idx"]) {
  if (!dbRateLimit.includes(token)) throw new Error("Rate-limit migration regression: " + token);
}
const rateLimitedRoutes = [
  "app/api/apps/check/route.ts",
  "app/api/zaf/search/route.ts",
  "app/api/zaf/wallet/route.ts",
  "app/api/zaf/radar/route.ts",
  "app/api/zaf/observations/route.ts",
  "app/api/zaf/observations/history/route.ts",
  "app/api/zaf/defi/route.ts",
  "app/api/zaf/assets/route.ts",
  "app/api/zaf/ecosystem/route.ts",
  "app/api/zaf/ecosystem/apps/route.ts",
  "app/api/zaf/launchpad/route.ts",
];
for (const file of rateLimitedRoutes) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  if (!source.includes('from "@/lib/zaf/rate-limit"') || !source.includes("enforceRateLimit")) {
    throw new Error("Rate-limit route coverage regression: " + file);
  }
}
const cronRateLimit = fs.readFileSync(path.join(root, "app/api/apps/health/cron/route.ts"), "utf8");
if (!cronRateLimit.includes("cleanupZafRateLimits")) throw new Error("Rate-limit cleanup cron regression");
const piRuntime = fs.readFileSync(path.join(root, "lib/zaf/pi/runtime.ts"), "utf8");
for (const token of ["PI_SDK_VERSION = \"2.0\"", "PI_SDK_SCRIPT_URL", "PI_PLATFORM_API_DEFAULT", "testnet", "mainnet", "PI_ENVIRONMENT", "PI_NETWORK", "assertPiRuntimeCompatible", "isPiProductionReady"]) {
  if (!piRuntime.includes(token)) throw new Error("Pi runtime matrix regression: " + token);
}
if (!piRuntime.includes("https://api.testnet.minepi.com") || !piRuntime.includes("https://api.mainnet.minepi.com")) {
  throw new Error("Pi runtime Horizon endpoint regression");
}
if (!piRuntime.includes("environment === \"sandbox\" ? network === \"testnet\" : network === \"mainnet\"")) {
  throw new Error("Pi runtime compatibility guard regression");
}
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (packageJson.scripts?.regression !== "node tools/zaf-regression.mjs") {
  throw new Error("Regression script is not wired into package.json");
}
if (packageJson.scripts?.smoke !== "node tools/zaf-smoke.mjs") {
  throw new Error("Smoke script is not wired into package.json");
}
if (!fs.existsSync(path.join(root, "tools/zaf-smoke.mjs"))) {
  throw new Error("Smoke test harness is missing");
}

const vercelConfig = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
if (!Array.isArray(vercelConfig.crons) || !vercelConfig.crons.some(cron => cron.path === "/api/apps/health/cron" && cron.schedule === "0 3 * * *")) {
  throw new Error("Scheduled App Health cron configuration regression");
}
const cronRoute = fs.readFileSync(path.join(root, "app/api/apps/health/cron/route.ts"), "utf8");
if (!cronRoute.includes("CRON_SECRET") || !cronRoute.includes('authorization') || !cronRoute.includes("Unauthorized")) {
  throw new Error("Scheduled App Health cron authorization regression");
}

const app = fs.readFileSync(path.join(root, "components/zaf-tech-app.tsx"), "utf8");
const i18n = fs.readFileSync(path.join(root, "lib/zaf/i18n.ts"), "utf8");
const ruStart = i18n.indexOf("  ru: {");
const ruEnd = i18n.indexOf("\n  },\n", ruStart);
if (ruStart < 0 || ruEnd < 0) throw new Error("Russian translation block is missing");
const ruBlock = i18n.slice(ruStart, ruEnd);
const componentFiles = fs.readdirSync(path.join(root, "components"))
  .filter(file => file.endsWith(".tsx"))
  .map(file => fs.readFileSync(path.join(root, "components", file), "utf8"));
const missingRussianKeys = new Set();
for (const source of componentFiles) {
  for (const match of source.matchAll(/tr\(\s*"([^"]+)"/g)) {
    const key = match[1];
    const linesInRu = ruBlock.split("\n");
    if (!linesInRu.some(line => line.trimStart().startsWith(JSON.stringify(key) + ":"))) missingRussianKeys.add(key);
  }
}
if (missingRussianKeys.size) {
  throw new Error("Russian translation regression: missing keys: " + [...missingRussianKeys].slice(0, 12).join(" | "));
}

function scanTextFiles(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...scanTextFiles(full));
    else if (/\.(tsx?|mjs|css)$/.test(entry.name)) result.push(full);
  }
  return result;
}
for (const base of ["components", "app", "lib/zaf"]) {
  for (const file of scanTextFiles(path.join(root, base))) {
    const source = fs.readFileSync(file, "utf8");
    for (const term of ["İstihbarat", "istihbarat"]) {
      if (source.includes(term)) throw new Error("Forbidden Turkish terminology remains in " + file + ": " + term);
    }
  }
}
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

const nextConfig = fs.readFileSync(path.join(root, "next.config.mjs"), "utf8");
for (const token of [
  "poweredByHeader: false",
  "X-Content-Type-Options",
  "Referrer-Policy",
  "X-Frame-Options",
  "Permissions-Policy",
  "Strict-Transport-Security",
]) {
  if (!nextConfig.includes(token)) throw new Error("Production security header regression: " + token);
}

const styles = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");
for (const token of [
  "Desktop brand lockup",
  ".zaf-desktop-header > div:first-child",
  "width: 88px;",
  "height: 88px;",
  "text-align: right;",
  "white-space: nowrap;",
]) {
  if (!styles.includes(token)) throw new Error("Desktop brand lockup regression: " + token);
}

const radar = fs.readFileSync(path.join(root, "lib/zaf/radar.ts"), "utf8");
for (const token of ["getRadarObservation", "getRollingObservationBaseline", "sampleConfidence", "transaction-pace", "operation-pace", "source-coverage"]) {
  if (!radar.includes(token)) throw new Error("Radar regression: " + token);
}

const observationHistory = fs.readFileSync(path.join(root, "lib/zaf/observation-history.ts"), "utf8");
const dbSchema = fs.readFileSync(path.join(root, "lib/zaf/db.ts"), "utf8");
for (const token of ["function median", "getRollingObservationBaseline", "daily_transactions"]) {
  if (!observationHistory.includes(token)) throw new Error("Observation history regression: " + token);
}
if (!dbSchema.includes("DOUBLE PRECISION")) throw new Error("Central DB schema regression: DOUBLE PRECISION");

for (const token of ["30-minute rolling median", "Rolling baseline", "30 dakikalık hareketli medyana göre"]) {
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
for (const token of ["classifyHealthTrend", "assessHealthData", "freshness", "confidence", "improving", "declining"]) {
  if (!appHealthTrendModel.includes(token)) throw new Error("App Health trend model regression: " + token);
}

const appHealthRunner = fs.readFileSync(path.join(root, "lib/zaf/app-health-runner.ts"), "utf8");
for (const token of ["getAppHealthTrend", "assessHealthTrend", "declining", "improving", "attention"]) {
  if (!appHealthRunner.includes(token)) throw new Error("App Health overview regression: " + token);
}

const appHealthOverviewRoute = fs.readFileSync(path.join(root, "app/api/apps/health/overview/route.ts"), "utf8");
for (const token of ["getLatestAppChecks", "assessHealthTrend", "averageScore", "declining", "attention", "temporarily unavailable"]) {
  if (!appHealthOverviewRoute.includes(token)) throw new Error("App Health overview API regression: " + token);
}

const appHealthTrendRoute = fs.readFileSync(path.join(root, "app/api/apps/health/trend/route.ts"), "utf8");
for (const token of ["averageHealthScore", "minimumHealthScore", "maximumHealthScore", "firstHealthScore", "latestHealthScore", "firstHealthStatus", "latestHealthStatus", "healthScoreDelta", "healthStatusTransitions", "trendDirection", "dataConfidence", "freshness", "temporarily unavailable"]) {
  if (!appHealthTrendRoute.includes(token)) throw new Error("App Health trend summary regression: " + token);
}

const appDetails = fs.readFileSync(path.join(root, "components/zaf-app-details.tsx"), "utf8");
for (const token of ["Avg Health", "Health Score Trend", "Trend Direction", "Data Confidence", "Freshness", "Latest Age", "First → Latest Status", "Observed Window", "Status Transition Timeline", "toLocaleString", "healthStatus"]) {
  if (!appDetails.includes(token)) throw new Error("App Health trend visualization regression: " + token);
}

const ecosystemAppActivity = fs.readFileSync(path.join(root, "components/zaf-ecosystem-app-activity.tsx"), "utf8");
for (const token of ["App Activity", "Newly Observed Apps", "Not Present In Latest Source Response", "does not claim access to Pi's internal ranking or moderation systems"]) {
  if (!ecosystemAppActivity.includes(token)) throw new Error("Ecosystem app activity regression: " + token);
}

const ecosystemStaking = fs.readFileSync(path.join(root, "components/zaf-ecosystem-staking.tsx"), "utf8");
for (const token of ["Ecosystem Directory Staking", "Live Data Boundary", "Published Staking Evidence", "Coming soon target", "Historical official statements"]) {
  if (!ecosystemStaking.includes(token)) throw new Error("Ecosystem staking regression: " + token);
}

const ecosystemAppObservationModel = fs.readFileSync(path.join(root, "lib/zaf/ecosystem-app-observations.ts"), "utf8");
for (const token of ["getEcosystemAppObservations", "firstSeenAt", "observationCount", "notPresentInLatest"]) {
  if (!ecosystemAppObservationModel.includes(token)) throw new Error("Ecosystem app observation model regression: " + token);
}

const ecosystemStakingModel = fs.readFileSync(path.join(root, "lib/zaf/ecosystem-staking.ts"), "utf8");
for (const token of ["EcosystemStakingAvailability", "broadPublicFeed", "app-specific-whitelist", "PublishedStakingEvidence"]) {
  if (!ecosystemStakingModel.includes(token)) throw new Error("Ecosystem staking model regression: " + token);
}

for (const token of ["App Activity", "Staking"]) {
  if (!app.includes(token)) throw new Error("Ecosystem navigation regression: " + token);
}

const appHealthTimeline = fs.readFileSync(path.join(root, "components/zaf-ecosystem-health-timeline.tsx"), "utf8");
for (const token of ["Ecosystem Health Timeline", "Network Activity", "Public Source Coverage", "Stored App Health", "wallet data is address scoped"]) {
  if (!appHealthTimeline.includes(token)) throw new Error("Ecosystem health timeline regression: " + token);
}

const appHealthOverview = fs.readFileSync(path.join(root, "components/zaf-app-health.tsx"), "utf8");
for (const token of ["Health Overview", "Health Change Radar", "Measurement Evidence", "attention", "Declining", "Improving", "Stale History", "Synthetic data: none"]) {
  if (!appHealthOverview.includes(token)) throw new Error("App Health overview UI regression: " + token);
}

for (const token of ["HistoryRange", "24h", "7d", "30d", "sampleHistoryPoints", "historyLimit", "Period Trend Analysis", "periodPercentChange", "averageHistoryValue", "Measurement Evidence", "Synthetic data"]) {
  if (!app.includes(token)) throw new Error("Historical observatory UI regression: " + token);
}

if (!dbSchema.includes("zaf_app_checks")) throw new Error("App Health schema initialization regression");

const networkScope = fs.readFileSync(path.join(root, "lib/zaf/network-scope.ts"), "utf8");
for (const token of ["ZAF_NETWORK_SCOPES", "ZafNetworkScope", "mainnet", "testnet", "unknown"]) {
  if (!networkScope.includes(token)) throw new Error("Network scope model regression: " + token);
}

const appDirectoryScope = fs.readFileSync(path.join(root, "lib/zaf/app-directory.ts"), "utf8");
for (const token of ["ZafNetworkScope", "networkScope", '"unknown"']) {
  if (!appDirectoryScope.includes(token)) throw new Error("App network scope regression: " + token);
}

const walletScope = fs.readFileSync(path.join(root, "lib/zaf/wallet-client.ts"), "utf8");
for (const token of ["networkScope", "mapAssets", "selected.label"]) {
  if (!walletScope.includes(token)) throw new Error("Wallet network scope regression: " + token);
}

const walletTypes = fs.readFileSync(path.join(root, "lib/zaf/types.ts"), "utf8");
for (const token of ["ZafWalletAsset", "networkScope: ZafNetworkScope"]) {
  if (!walletTypes.includes(token)) throw new Error("Wallet asset scope regression: " + token);
}

const testnetAssets = fs.readFileSync(path.join(root, "lib/zaf/testnet-assets.ts"), "utf8");
for (const token of ["getTestnetAssets", "api.testnet.minepi.com", 'networkScope: "testnet"', "numLiquidityPools"]) {
  if (!testnetAssets.includes(token)) throw new Error("Testnet asset regression: " + token);
}

const testnetAssetsRoute = fs.readFileSync(path.join(root, "app/api/zaf/assets/route.ts"), "utf8");
for (const token of ["getTestnetAssets", "Only Testnet asset observations", "networkScope"]) {
  if (!testnetAssetsRoute.includes(token)) throw new Error("Testnet asset API regression: " + token);
}

const defiObservation = fs.readFileSync(path.join(root, "lib/zaf/defi-observation.ts"), "utf8");
for (const token of ["getDefiObservation", "liquidity_pools", "/trades?", 'networkScope: "testnet"', "distinctAssets", "pairActivity", "pairKeyFor", "observedTrades", "poolTradeCounts"]) {
  if (!defiObservation.includes(token)) throw new Error("DeFi observation model regression: " + token);
}

const defiRoute = fs.readFileSync(path.join(root, "app/api/zaf/defi/route.ts"), "utf8");
for (const token of ["getDefiObservation", "Only Testnet DeFi observations", "networkScope"]) {
  if (!defiRoute.includes(token)) throw new Error("DeFi API regression: " + token);
}

const defiUI = fs.readFileSync(path.join(root, "components/zaf-defi-observatory.tsx"), "utf8");
for (const token of ["DeFi Observatory", "Observed Liquidity Pools", "Observed Trades", "DeFi-Observed Tokens", "Observed Pair Activity", "Coming Soon target", "Mainnet Readiness"]) {
  if (!defiUI.includes(token)) throw new Error("DeFi UI regression: " + token);
}

for (const token of ["DeFi", "DEX", "AMM & Pools", "Tokens"]) {
  if (!app.includes(token)) throw new Error("DeFi navigation regression: " + token);
}

const testnetAssetsUI = fs.readFileSync(path.join(root, "components/zaf-testnet-assets.tsx"), "utf8");
for (const token of ["Testnet Assets", "Observed Testnet Assets", "Coming Soon target", "Test-Pi has no real-world value"]) {
  if (!testnetAssetsUI.includes(token)) throw new Error("Testnet asset UI regression: " + token);
}

const walletUI = fs.readFileSync(path.join(root, "components/zaf-wallet-intelligence.tsx"), "utf8");
for (const token of ["Observed Assets", "asset.assetIssuer", "Public asset balances"]) {
  if (!walletUI.includes(token)) throw new Error("Wallet asset UI regression: " + token);
}

if (!dbSchema.includes("zaf_observation_snapshots")) throw new Error("Observation schema initialization regression");

const observationHistoryRoute = fs.readFileSync(path.join(root, "app/api/zaf/observations/history/route.ts"), "utf8");
if (!observationHistoryRoute.includes("10000")) throw new Error("Historical observation route limit regression");




const smokeHarness = fs.readFileSync(path.join(root, "tools/zaf-smoke.mjs"), "utf8");
for (const token of ["fetchWithTimeout", "AbortSignal.timeout", "stopSmokeServer", "process.kill(-child.pid", "Smoke server did not become ready"]) {
  if (!smokeHarness.includes(token)) throw new Error("Deterministic smoke harness regression: " + token);
}

const workflow = fs.readFileSync(path.join(root, ".github/workflows/build-web-app.yml"), "utf8");
if (!workflow.includes("npm run regression")) throw new Error("CI regression gate is missing");

console.log("ZAF TECH v1.1 regression checks passed.");



const launchpadObservation = fs.readFileSync(path.join(root, "lib/zaf/launchpad-observation.ts"), "utf8");
for (const token of ["getLaunchpadObservation", "published-evidence", "IRRA", "SLICE", "Testnet", "Mainnet"]) {
  if (!launchpadObservation.includes(token)) throw new Error("Launchpad observation model regression: " + token);
}

const launchpadRoute = fs.readFileSync(path.join(root, "app/api/zaf/launchpad/route.ts"), "utf8");
for (const token of ["getLaunchpadObservation", "Only Testnet Launchpad observations", "networkScope"]) {
  if (!launchpadRoute.includes(token)) throw new Error("Launchpad API regression: " + token);
}

const launchpadUI = fs.readFileSync(path.join(root, "components/zaf-launchpad-observatory.tsx"), "utf8");
for (const token of ["Launchpad Observatory", "Published Launch Evidence", "Live Launchpad Feed", "Mainnet Readiness", "published-evidence"]) {
  if (!launchpadUI.includes(token)) throw new Error("Launchpad UI regression: " + token);
}

for (const token of ["Launchpad", "ZafLaunchpadObservatory"]) {
  if (!app.includes(token)) throw new Error("Launchpad navigation/mount regression: " + token);
}


const ecosystemGraph = fs.readFileSync(path.join(root, "lib/zaf/ecosystem-graph.ts"), "utf8");
for (const token of ["getEcosystemGraph", "networkScope", "published-staking-evidence", "observed-pair", "launch-token", "Promise.allSettled"]) {
  if (!ecosystemGraph.includes(token)) throw new Error("Ecosystem graph model regression: " + token);
}

const ecosystemGraphRoute = fs.readFileSync(path.join(root, "app/api/zaf/ecosystem/graph/route.ts"), "utf8");
for (const token of ["getEcosystemGraph", "network", "maxNodes", "Cache-Control"]) {
  if (!ecosystemGraphRoute.includes(token)) throw new Error("Ecosystem graph API regression: " + token);
}

const ecosystemGraphUI = fs.readFileSync(path.join(root, "components/zaf-ecosystem-graph.tsx"), "utf8");
for (const token of ["Ecosystem Graph", "Observed relationships", "Network Filter", "Node Type", "selectedNode", "read-only"]) {
  if (!ecosystemGraphUI.includes(token)) throw new Error("Ecosystem graph UI regression: " + token);
}

for (const token of ["Graph", "ZafEcosystemGraph"]) {
  if (!app.includes(token)) throw new Error("Ecosystem graph navigation/mount regression: " + token);
}


const defiHistory = fs.readFileSync(path.join(root, "lib/zaf/defi-history.ts"), "utf8");
for (const token of ["toDefiHistorySnapshot", "saveDefiSnapshot", "getDefiSnapshotHistory", "compareDefiSnapshots", "new-pool", "new-pair"]) {
  if (!defiHistory.includes(token)) throw new Error("DeFi history/alert regression: " + token);
}

const defiHistoryRoute = fs.readFileSync(path.join(root, "app/api/zaf/defi/history/route.ts"), "utf8");
for (const token of ["getDefiSnapshotHistory", "isDefiHistoryConfigured", "no-store"]) {
  if (!defiHistoryRoute.includes(token)) throw new Error("DeFi history API regression: " + token);
}
