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

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (packageJson.scripts?.regression !== "node tools/zaf-regression.mjs") {
  throw new Error("Regression script is not wired into package.json");
}

const app = fs.readFileSync(path.join(root, "components/zaf-tech-app.tsx"), "utf8");
const globalCss = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");
for (const token of ["overflow-wrap: anywhere", ".zaf-main-shell :where(.flex > *, .grid > *)", ".zaf-desktop-search"]) {
  if (!globalCss.includes(token)) throw new Error("Locale-safe UI containment regression: " + token);
}
for (const file of ["app/error.tsx", "app/global-error.tsx", "app/not-found.tsx", "app/loading.tsx"]) {
  if (!fs.existsSync(path.join(root, file))) throw new Error("Missing global runtime boundary: " + file);
}
const aboutPage = fs.readFileSync(path.join(root, "app/about/page.tsx"), "utf8");
for (const token of ["English, Turkish, Spanish, Chinese, Italian, French, German, Portuguese and Russian", "Pi authentication, payments", "Sonraki Aşama"]) {
  if (!aboutPage.includes(token)) throw new Error("About page scope regression: " + token);
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

const radar = fs.readFileSync(path.join(root, "lib/zaf/radar.ts"), "utf8");
for (const token of ["getRadarObservation", "getRollingObservationBaseline", "sampleConfidence", "transaction-pace", "operation-pace", "source-coverage"]) {
  if (!radar.includes(token)) throw new Error("Radar regression: " + token);
}

const observationHistory = fs.readFileSync(path.join(root, "lib/zaf/observation-history.ts"), "utf8");
for (const token of ["function median", "getRollingObservationBaseline", "DOUBLE PRECISION", "daily_transactions"]) {
  if (!observationHistory.includes(token)) throw new Error("Observation history regression: " + token);
}

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

const appHealthHistorySchema = fs.readFileSync(path.join(root, "lib/zaf/app-check-history.ts"), "utf8");
if (!appHealthHistorySchema.includes("appChecksSchemaReady")) throw new Error("App Health schema initialization regression");

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

const observationHistorySchema = fs.readFileSync(path.join(root, "lib/zaf/observation-history.ts"), "utf8");
if (!observationHistorySchema.includes("observationSchemaReady")) throw new Error("Observation schema initialization regression");

const observationHistoryRoute = fs.readFileSync(path.join(root, "app/api/zaf/observations/history/route.ts"), "utf8");
if (!observationHistoryRoute.includes("1000")) throw new Error("Historical observation route safety limit regression");




const workflow = fs.readFileSync(path.join(root, ".github/workflows/build-web-app.yml"), "utf8");
if (!workflow.includes("npm run regression")) throw new Error("CI regression gate is missing");

const apiSecurityRoutes = {
  "app/api/apps/check/route.ts": ["rateLimit", "checkAppHealth", "Cache-Control"],
  "app/api/apps/health/route.ts": ["getLatestAppChecks", "Cache-Control"],
  "app/api/apps/health/cron/route.ts": ["CRON_SECRET", "authorization", "no-store"],
  "app/api/zaf/observations/route.ts": ["getUnifiedObservation", "Cache-Control"],
  "app/api/zaf/observations/cron/route.ts": ["CRON_SECRET", "saveObservationSnapshot", "no-store"],
  "app/api/zaf/defi/route.ts": ["getDefiObservation", "Cache-Control"],
  "app/api/zaf/defi/cron/route.ts": ["CRON_SECRET", "saveDefiSnapshot", "no-store"],
  "app/api/zaf/wallet/route.ts": ["rateLimit", "getZafWallet", "Cache-Control"],
  "app/api/zaf/search/route.ts": ["rateLimit", "getUnifiedObservation", "Cache-Control"],
  "app/api/tools/transaction/route.ts": ["rateLimit", "AbortController", "Cache-Control"],
};

for (const [file, tokens] of Object.entries(apiSecurityRoutes)) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  for (const token of tokens) {
    if (!source.includes(token)) throw new Error("API security invariant regression in " + file + ": " + token);
  }
}

const publicObservationRoute = fs.readFileSync(path.join(root, "app/api/zaf/observations/route.ts"), "utf8");
if (/[?&]force|searchParams.*force|force\s*[:=]/.test(publicObservationRoute)) {
  throw new Error("Public observation route must not expose a force-refresh switch");
}
if (publicObservationRoute.includes("saveObservationSnapshot")) {
  throw new Error("Public observation route must remain read-only");
}

const publicHealthRoute = fs.readFileSync(path.join(root, "app/api/apps/health/route.ts"), "utf8");
if (publicHealthRoute.includes("runEcosystemHealthChecks")) {
  throw new Error("Public app health route must not trigger live ecosystem health checks");
}

const publicDefiRoute = fs.readFileSync(path.join(root, "app/api/zaf/defi/route.ts"), "utf8");
if (publicDefiRoute.includes("saveDefiSnapshot")) {
  throw new Error("Public DeFi route must remain read-only");
}

const vercelConfig = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
for (const cron of vercelConfig.crons ?? []) {
  if (!/^0 3 \* \* \*$/.test(cron.schedule)) {
    throw new Error("Vercel Hobby-safe cron regression: " + cron.schedule);
  }
}

const piTypes = fs.readFileSync(path.join(root, "lib/pi/types.ts"), "utf8");
if (/accessToken\s*:\s*string/.test(piTypes.match(/interface PiUser[\\s\\S]*?\\n}\\n/)?.[0] ?? "")) {
  throw new Error("Pi user model must not expose accessToken");
}
const piService = fs.readFileSync(path.join(root, "lib/pi/pi-service.ts"), "utf8");
if (piService.includes("window.Pi") || piService.includes("Pi.init") || piService.includes("createPayment")) {
  throw new Error("Pi service boundary must remain SDK-free before integration enablement");
}
const piConfig = fs.readFileSync(path.join(root, "lib/pi/pi-config.ts"), "utf8");
if (!piConfig.includes("PI_FEATURES_ENABLED = false")) {
  throw new Error("Pi features must remain disabled during foundation freeze");
}

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
