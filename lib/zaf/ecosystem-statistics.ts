import { getUnifiedObservation } from "@/lib/zaf/observation-engine";
import { getEcosystemSnapshotHistory, isEcosystemHistoryConfigured } from "@/lib/zaf/ecosystem-history";

export type EcosystemStatistics = {
  generatedAt: string;
  current: {
    observedApps: number | null;
    availableSources: number;
    totalSources: number;
    observedSignals: number;
    officialSignals: number;
    defi: { launchpad: string; dex: string; amm: string; mainnetTrading: string };
  };
  history: {
    configured: boolean;
    snapshots: number;
    firstObservedAt: string | null;
    latestObservedAt: string | null;
    appCounts: number[];
  };
};

export async function getEcosystemStatistics(): Promise<EcosystemStatistics> {
  const snapshot = (await getUnifiedObservation()).ecosystem;
  const history = await getEcosystemSnapshotHistory(100);

  return {
    generatedAt: snapshot?.generatedAt ?? new Date().toISOString(),
    current: {
      observedApps: snapshot?.apps.totalCount ?? null,
      availableSources: snapshot?.sources.filter((source) => source.status === "available").length ?? 0,
      totalSources: snapshot?.sources.length ?? 0,
      observedSignals: snapshot?.signals.length ?? 0,
      officialSignals: snapshot?.officialSignals.length ?? 0,
      defi: {
        launchpad: snapshot?.defi.launchpad.status ?? "unavailable",
        dex: snapshot?.defi.dex.status ?? "unavailable",
        amm: snapshot?.defi.amm.status ?? "unavailable",
        mainnetTrading: snapshot?.defi.mainnetTrading.status ?? "unavailable",
      },
    },
    history: {
      configured: isEcosystemHistoryConfigured(),
      snapshots: history.length,
      firstObservedAt: history.length ? history[history.length - 1].generatedAt : null,
      latestObservedAt: history.length ? history[0].generatedAt : null,
      appCounts: history.map((item) => item.observedAppCount).filter((count): count is number => count != null),
    },
  };
}
