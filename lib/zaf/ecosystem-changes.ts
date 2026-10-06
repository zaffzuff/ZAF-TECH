import { getUnifiedObservation } from "@/lib/zaf/observation-engine";
import { getEcosystemSnapshotHistory, isEcosystemHistoryConfigured } from "@/lib/zaf/ecosystem-history";

type StoredPayload = {
  apps?: { totalCount?: number | null };
  sources?: Array<{ id: string; label: string; status: string }>;\n  news?: Array<{ title: string; url: string; publishedAt: string | null }>;
  signals?: Array<{
    id: string;
    title: string;
    kind: string;
    detail?: string;
    detailTr?: string;
    sourceUrl?: string | null;
    detectedAt?: string;
  }>;
  defi?: {
    launchpad?: { status: string };
    dex?: { status: string };
    amm?: { status: string };
    mainnetTrading?: { status: string };
  };
};

export type EcosystemChange = {
  type: "app_count" | "source_status" | "signal_added" | "signal_removed" | "defi_status" | "official_update";
  key: string;
  title: string;
  detail: string;
  detailTr: string;
  previous: string | number | null;
  current: string | number | null;
  category?: "app_count" | "source_status" | "signal_added" | "signal_removed" | "defi_status";
  sourceUrl?: string | null;
  observedAt?: string | null;
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
      generatedAt: current?.generatedAt ?? new Date().toISOString(),
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
        category: "source_status",
        sourceUrl: source.url,
        observedAt: source.checkedAt,
      });
    }
  }

  const previousNews = new Map((previous.news ?? []).map(item => [item.url, item]));
  for (const item of current.news ?? []) {
    if (!previousNews.has(item.url)) {
      changes.push({
        type: "official_update",
        key: item.url,
        title: item.title,
        detail: "A new publication was observed on the official Pi Network blog.",
        detailTr: "Pi Network resmi blogunda yeni bir yayın gözlemlendi.",
        previous: null,
        current: item.title,
        category: "official_update",
        sourceUrl: item.url,
        observedAt: item.publishedAt ?? current.generatedAt,
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
        detail: signal.detail ?? "The signal is present in the current snapshot but was not present in the previous stored snapshot.",
        detailTr: signal.detailTr ?? "Bu sinyal mevcut snapshot'ta var ancak önceki kayıtlı snapshot'ta yoktu.",
        previous: null,
        current: signal.kind,
        category: "signal_added",
        sourceUrl: signal.sourceUrl ?? null,
        observedAt: signal.detectedAt ?? current.generatedAt,
      });
    }
  }
  for (const signal of previous.signals ?? []) {
    if (!currentSignals.has(signal.id)) {
      changes.push({
        type: "signal_removed",
        key: signal.id,
        title: signal.title,
        detail: signal.detail ?? "The signal is no longer present in the current snapshot.",
        detailTr: signal.detailTr ?? "Bu sinyal mevcut snapshot'ta artık bulunmuyor.",
        previous: signal.kind,
        current: null,
        category: "signal_removed",
        sourceUrl: signal.sourceUrl ?? null,
        observedAt: signal.detectedAt ?? history[0].generatedAt,
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
        category: "defi_status",
        sourceUrl: null,
        observedAt: current.generatedAt,
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
