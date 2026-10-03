import { getUnifiedObservation } from "@/lib/zaf/observation-engine";
import { getEcosystemSnapshotHistory, isEcosystemHistoryConfigured } from "@/lib/zaf/ecosystem-history";

type StoredPayload = {
  apps?: { totalCount?: number | null };
  sources?: Array<{ id: string; label: string; status: string }>;
  signals?: Array<{ id: string; title: string; kind: string }>;
  defi?: {
    launchpad?: { status: string };
    dex?: { status: string };
    amm?: { status: string };
    mainnetTrading?: { status: string };
  };
};

export type EcosystemChange = {
  type: "app_count" | "source_status" | "signal_added" | "signal_removed" | "defi_status";
  key: string;
  title: string;
  detail: string;
  detailTr: string;
  previous: string | number | null;
  current: string | number | null;
};

export type EcosystemChanges = {
  generatedAt: string;
  configured: boolean;
  comparedAt: string | null;
  hasBaseline: boolean;
  changes: EcosystemChange[];
};

function payloadOf(value: unknown): StoredPayload {
  return (value && typeof value === "object" ? value : {}) as StoredPayload;
}

export async function getEcosystemChanges(): Promise<EcosystemChanges> {
  const current = (await getUnifiedObservation()).ecosystem;
  const history = await getEcosystemSnapshotHistory(2);

  if (!current || !history.length) {
    return {
      generatedAt: current.generatedAt,
      configured: isEcosystemHistoryConfigured(),
      comparedAt: null,
      hasBaseline: false,
      changes: [],
    };
  }

  const previous = payloadOf(history[0].payload);
  const changes: EcosystemChange[] = [];

  const previousApps = previous.apps?.totalCount ?? null;
  const currentApps = current.apps.totalCount;
  if (previousApps !== currentApps) {
    changes.push({
      type: "app_count",
      key: "observed-app-count",
      title: "Observed app count changed",
      detail: `Observed app count changed from ${previousApps ?? "unknown"} to ${currentApps ?? "unknown"}.`,
      detailTr: `Gözlemlenen uygulama sayısı ${previousApps ?? "bilinmiyor"} değerinden ${currentApps ?? "bilinmiyor"} değerine değişti.`,
      previous: previousApps,
      current: currentApps,
    });
  }

  const previousSources = new Map((previous.sources ?? []).map(source => [source.id, source]));
  for (const source of current.sources) {
    const old = previousSources.get(source.id);
    if (old && old.status !== source.status) {
      changes.push({
        type: "source_status",
        key: source.id,
        title: `${source.label} status changed`,
        detail: `${source.label} changed from ${old.status} to ${source.status}.`,
        detailTr: `${source.label} durumu ${old.status} değerinden ${source.status} değerine değişti.`,
        previous: old.status,
        current: source.status,
      });
    }
  }

  const previousSignals = new Map((previous.signals ?? []).map(signal => [signal.id, signal]));
  const currentSignals = new Map(current.signals.map(signal => [signal.id, signal]));
  for (const signal of current.signals) {
    if (!previousSignals.has(signal.id)) {
      changes.push({
        type: "signal_added",
        key: signal.id,
        title: signal.title,
        detail: "A new observable signal appeared in the current snapshot.",
        detailTr: "Mevcut snapshot'ta yeni bir gözlemlenebilir sinyal ortaya çıktı.",
        previous: null,
        current: signal.kind,
      });
    }
  }
  for (const signal of previous.signals ?? []) {
    if (!currentSignals.has(signal.id)) {
      changes.push({
        type: "signal_removed",
        key: signal.id,
        title: signal.title,
        detail: "This signal is no longer present in the current snapshot.",
        detailTr: "Bu sinyal mevcut snapshot'ta artık bulunmuyor.",
        previous: signal.kind,
        current: null,
      });
    }
  }

  const defiPairs = [
    ["launchpad", previous.defi?.launchpad?.status, current.defi.launchpad.status],
    ["dex", previous.defi?.dex?.status, current.defi.dex.status],
    ["amm", previous.defi?.amm?.status, current.defi.amm.status],
    ["mainnetTrading", previous.defi?.mainnetTrading?.status, current.defi.mainnetTrading.status],
  ] as const;
  for (const [key, old, next] of defiPairs) {
    if (old != null && old !== next) {
      changes.push({
        type: "defi_status",
        key,
        title: `${key} status changed`,
        detail: `${key} changed from ${old} to ${next}.`,
        detailTr: `${key} durumu ${old} değerinden ${next} değerine değişti.`,
        previous: old,
        current: next,
      });
    }
  }

  return {
    generatedAt: current.generatedAt,
    configured: isEcosystemHistoryConfigured(),
    comparedAt: history[0].generatedAt,
    hasBaseline: true,
    changes: changes.slice(0, 50),
  };
}
