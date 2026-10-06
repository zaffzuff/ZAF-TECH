import { getEcosystemAppObservations } from "@/lib/zaf/ecosystem-app-observations";
import { getEcosystemStakingOverview } from "@/lib/zaf/ecosystem-staking";
import { getTestnetAssets } from "@/lib/zaf/testnet-assets";
import { getDefiObservation } from "@/lib/zaf/defi-observation";
import { getLaunchpadObservation } from "@/lib/zaf/launchpad-observation";
import { toDirectoryApp } from "@/lib/zaf/app-directory";
import type { ZafNetworkScope } from "@/lib/zaf/network-scope";

export type EcosystemGraphNodeType = "network" | "app" | "asset" | "pool" | "launch" | "evidence";

export type EcosystemGraphNode = {
  id: string;
  type: EcosystemGraphNodeType;
  label: string;
  networkScope: ZafNetworkScope;
  status: "observed" | "published-evidence";
  detail: string;
  href: string | null;
  metadata: Record<string, string | number | null>;
};

export type EcosystemGraphEdge = {
  id: string;
  from: string;
  to: string;
  relation: string;
  networkScope: ZafNetworkScope;
  status: "observed" | "published-evidence";
};

function safeLabel(value: string, fallback = "Unknown") {
  const normalized = value.trim();
  return normalized.length ? normalized : fallback;
}

function assetId(networkScope: "testnet", assetType: string | null, assetCode: string | null, issuer: string | null) {
  return ["asset", networkScope, assetType ?? "unknown", assetCode ?? "unknown", issuer ?? "native"].join(":");
}

function addEdge(edges: Map<string, EcosystemGraphEdge>, edge: EcosystemGraphEdge) {
  if (edge.from === edge.to) return;
  edges.set(edge.id, edge);
}

export async function getEcosystemGraph(options?: { maxApps?: number; maxAssets?: number; maxPools?: number; maxNodes?: number }) {
  const maxApps = Math.min(Math.max(Math.floor(options?.maxApps ?? 35), 5), 80);
  const maxAssets = Math.min(Math.max(Math.floor(options?.maxAssets ?? 45), 5), 100);
  const maxPools = Math.min(Math.max(Math.floor(options?.maxPools ?? 18), 5), 50);
  const maxNodes = Math.min(Math.max(Math.floor(options?.maxNodes ?? 120), 30), 220);

  const [appsResult, assetsResult, defiResult] = await Promise.allSettled([
    getEcosystemAppObservations(120),
    getTestnetAssets(maxAssets),
    getDefiObservation(80),
  ]);

  const apps = appsResult.status === "fulfilled" ? appsResult.value : null;
  const assets = assetsResult.status === "fulfilled" ? assetsResult.value : null;
  const defi = defiResult.status === "fulfilled" ? defiResult.value : null;
  const launchpad = getLaunchpadObservation();
  const staking = getEcosystemStakingOverview();

  const nodes = new Map<string, EcosystemGraphNode>();
  const edges = new Map<string, EcosystemGraphEdge>();

  const networkNodes: Array<{ id: string; label: string; scope: ZafNetworkScope; detail: string }> = [
    { id: "network:mainnet", label: "Mainnet", scope: "mainnet", detail: "Shared network scope for observations explicitly sourced from Pi Mainnet." },
    { id: "network:testnet", label: "Testnet", scope: "testnet", detail: "Shared network scope for Pi Testnet assets, DeFi and Launchpad observations." },
    { id: "network:unknown", label: "Unknown", scope: "unknown", detail: "Network scope is not established by the current source." },
  ];

  for (const network of networkNodes) {
    nodes.set(network.id, {
      id: network.id,
      type: "network",
      label: network.label,
      networkScope: network.scope,
      status: "observed",
      detail: network.detail,
      href: null,
      metadata: {},
    });
  }

  if (apps) {
    for (const app of apps.apps.slice(0, maxApps)) {
      const directoryApp = toDirectoryApp(app, apps.generatedAt);
      const nodeId = "app:" + directoryApp.slug;
      const scope = directoryApp.networkScope;
      nodes.set(nodeId, {
        id: nodeId,
        type: "app",
        label: safeLabel(app.name),
        networkScope: scope,
        status: "observed",
        detail: app.url,
        href: app.url,
        metadata: {
          category: directoryApp.category,
          observationCount: app.observationCount,
          firstSeenAt: app.firstSeenAt,
          lastSeenAt: app.lastSeenAt,
        },
      });
      addEdge(edges, {
        id: nodeId + "->network:" + scope,
        from: nodeId,
        to: "network:" + scope,
        relation: "observed-in",
        networkScope: scope,
        status: "observed",
      });
    }
  }

  if (assets?.available) {
    for (const asset of assets.assets.slice(0, maxAssets)) {
      const nodeId = assetId("testnet", asset.assetType, asset.assetCode, asset.assetIssuer);
      nodes.set(nodeId, {
        id: nodeId,
        type: "asset",
        label: asset.assetCode === "—" ? safeLabel(asset.assetType) : safeLabel(asset.assetCode),
        networkScope: "testnet",
        status: "observed",
        detail: asset.assetIssuer ?? "Native or issuer not exposed",
        href: asset.tomlUrl,
        metadata: {
          assetType: asset.assetType,
          amount: asset.amount,
          accounts: asset.numAccounts,
          trades: asset.numTrades,
          liquidityPools: asset.numLiquidityPools,
        },
      });
      addEdge(edges, {
        id: nodeId + "->network:testnet",
        from: nodeId,
        to: "network:testnet",
        relation: "observed-on",
        networkScope: "testnet",
        status: "observed",
      });
    }
  }

  if (defi) {
    for (const pool of defi.sources.liquidityPools.records.slice(0, maxPools)) {
      const poolId = "pool:" + pool.poolId;
      nodes.set(poolId, {
        id: poolId,
        type: "pool",
        label: pool.poolId.slice(0, 14),
        networkScope: "testnet",
        status: "observed",
        detail: "Pi Testnet liquidity pool",
        href: null,
        metadata: {
          feePercent: pool.feeBp == null ? null : pool.feeBp / 100,
          totalShares: pool.totalShares,
          observedTrades: pool.observedTrades,
          lastModifiedLedger: pool.lastModifiedLedger,
        },
      });
      addEdge(edges, {
        id: poolId + "->network:testnet",
        from: poolId,
        to: "network:testnet",
        relation: "pool-on",
        networkScope: "testnet",
        status: "observed",
      });
      for (const reserve of pool.reserves) {
        const id = assetId("testnet", reserve.asset.assetType, reserve.asset.assetCode, reserve.asset.issuer);
        if (!nodes.has(id) && nodes.size < maxNodes) {
          nodes.set(id, {
            id,
            type: "asset",
            label: safeLabel(reserve.asset.label),
            networkScope: "testnet",
            status: "observed",
            detail: reserve.asset.issuer ?? "Issuer not exposed",
            href: null,
            metadata: { reserveAmount: reserve.amount },
          });
        }
        addEdge(edges, {
          id: poolId + "->" + id,
          from: poolId,
          to: id,
          relation: "reserve-asset",
          networkScope: "testnet",
          status: "observed",
        });
      }
    }

    for (const pair of defi.pairActivity.slice(0, 30)) {
      const baseId = assetId("testnet", pair.base.assetType, pair.base.assetCode, pair.base.issuer);
      const counterId = assetId("testnet", pair.counter.assetType, pair.counter.assetCode, pair.counter.issuer);
      if (nodes.has(baseId) && nodes.has(counterId)) {
        addEdge(edges, {
          id: "pair:" + pair.pairKey,
          from: baseId,
          to: counterId,
          relation: "observed-pair",
          networkScope: "testnet",
          status: "observed",
        });
      }
    }
  }

  const launchpadNodeId = "launchpad:testnet";
  nodes.set(launchpadNodeId, {
    id: launchpadNodeId,
    type: "launch",
    label: "Launchpad",
    networkScope: "testnet",
    status: "observed",
    detail: "Pi Launchpad Testnet stage.",
    href: launchpad.currentOfficialStatus.sourceUrl,
    metadata: {
      stage: launchpad.currentOfficialStatus.stage,
      mainnetStatus: launchpad.currentOfficialStatus.mainnetStatus,
    },
  });
  addEdge(edges, {
    id: launchpadNodeId + "->network:testnet",
    from: launchpadNodeId,
    to: "network:testnet",
    relation: "testnet-stage",
    networkScope: "testnet",
    status: "observed",
  });

  for (const launch of launchpad.launches) {
    const id = "launch-token:" + launch.id;
    nodes.set(id, {
      id,
      type: "launch",
      label: launch.token,
      networkScope: "testnet",
      status: "published-evidence",
      detail: launch.project,
      href: launch.sourceUrl,
      metadata: {
        publishedAt: launch.publishedAt,
        participation: launch.participationSummary,
        tokenSupply: launch.tokenSupplySummary,
      },
    });
    addEdge(edges, {
      id: id + "->" + launchpadNodeId,
      from: id,
      to: launchpadNodeId,
      relation: "launch-token",
      networkScope: "testnet",
      status: "published-evidence",
    });
  }

  for (const evidence of staking.publishedEvidence) {
    const appSlug = toDirectoryApp({ name: evidence.app, url: "https://ecosystem.pinet.com/" }, evidence.observedAt).slug;
    const evidenceId = "evidence:staking:" + appSlug;
    nodes.set(evidenceId, {
      id: evidenceId,
      type: "evidence",
      label: "Staking Evidence",
      networkScope: "mainnet",
      status: "published-evidence",
      detail: evidence.note,
      href: evidence.sourceUrl,
      metadata: {
        app: evidence.app,
        amountPi: evidence.amountPi,
        observedAt: evidence.observedAt,
      },
    });
    addEdge(edges, {
      id: evidenceId + "->network:mainnet",
      from: evidenceId,
      to: "network:mainnet",
      relation: "published-mainnet-evidence",
      networkScope: "mainnet",
      status: "published-evidence",
    });
    const appId = "app:" + appSlug;
    if (nodes.has(appId)) {
      addEdge(edges, {
        id: evidenceId + "->" + appId,
        from: evidenceId,
        to: appId,
        relation: "published-staking-evidence",
        networkScope: "mainnet",
        status: "published-evidence",
      });
    }
  }

  const networkPriority: Record<ZafNetworkScope, number> = { mainnet: 0, testnet: 1, unknown: 2 };
  const typePriority: Record<EcosystemGraphNodeType, number> = { network: 0, app: 1, asset: 2, pool: 3, launch: 4, evidence: 5 };
  const orderedNodes = [...nodes.values()]
    .sort((a, b) => networkPriority[a.networkScope] - networkPriority[b.networkScope] || typePriority[a.type] - typePriority[b.type] || a.label.localeCompare(b.label))
    .slice(0, maxNodes);

  const allowedIds = new Set(orderedNodes.map(node => node.id));
  const orderedEdges = [...edges.values()].filter(edge => allowedIds.has(edge.from) && allowedIds.has(edge.to)).slice(0, maxNodes * 3);

  const counts = {
    nodes: orderedNodes.length,
    edges: orderedEdges.length,
    apps: orderedNodes.filter(node => node.type === "app").length,
    assets: orderedNodes.filter(node => node.type === "asset").length,
    pools: orderedNodes.filter(node => node.type === "pool").length,
    launches: orderedNodes.filter(node => node.type === "launch").length,
    evidence: orderedNodes.filter(node => node.type === "evidence").length,
  };

  return {
    generatedAt: new Date().toISOString(),
    nodes: orderedNodes,
    edges: orderedEdges,
    counts,
    sourceStates: {
      apps: apps ? "observed" : "unavailable",
      testnetAssets: assets?.available ? "observed" : "unavailable",
      defi: defi?.summary.state ?? "unavailable",
      launchpad: "published-evidence" as const,
      staking: "published-evidence" as const,
    },
    notes: [
      "The graph connects only relationships supported by the selected public sources.",
      "Network scope is never inferred from an app name or URL alone.",
      "Published evidence is visually distinct from live observations.",
      "Missing or unavailable data is not converted into negative claims about the underlying feature.",
    ],
  };
}
