import { getEcosystemSnapshot } from "@/lib/zaf/ecosystem";
import { getEcosystemSnapshotHistory } from "@/lib/zaf/ecosystem-history";

export type EcosystemAppObservation = {
  name: string;
  url: string;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  observationCount: number;
  seenInPreviousSnapshot: boolean;
  currentlyObserved: boolean | null;
};

type SnapshotApp = { name: string; url: string };
type StoredSnapshot = {
  generatedAt?: unknown;
  payload?: unknown;
  observedAppCount?: unknown;
  sourceAvailable?: unknown;
};
type NormalizedSnapshot = {
  snapshot: StoredSnapshot;
  generatedAt: string;
  timestamp: number;
  apps: SnapshotApp[];
  observedAppCount: number | null;
};

function normalizeTimestamp(value: unknown): string | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function snapshotApps(snapshot: StoredSnapshot): SnapshotApp[] {
  const payload = snapshot.payload;
  if (!payload || typeof payload !== "object") return [];
  const apps = (payload as Record<string, unknown>).apps;
  if (!apps || typeof apps !== "object") return [];
  const items = (apps as Record<string, unknown>).items;
  if (!Array.isArray(items)) return [];
  return items.filter((item): item is SnapshotApp => {
    if (!item || typeof item !== "object") return false;
    const value = item as Record<string, unknown>;
    return typeof value.name === "string" && typeof value.url === "string" && value.url.length > 0;
  });
}

function snapshotObservedAppCount(snapshot: StoredSnapshot): number | null {
  if (typeof snapshot.observedAppCount === "number" && Number.isFinite(snapshot.observedAppCount)) {
    return snapshot.observedAppCount;
  }
  const payload = snapshot.payload;
  if (!payload || typeof payload !== "object") return null;
  const apps = (payload as Record<string, unknown>).apps;
  if (!apps || typeof apps !== "object") return null;
  const totalCount = (apps as Record<string, unknown>).totalCount;
  return typeof totalCount === "number" && Number.isFinite(totalCount) ? totalCount : null;
}

function isCompleteSnapshot(observedAppCount: number | null, apps: SnapshotApp[]) {
  return observedAppCount !== null && observedAppCount === apps.length;
}

export async function getEcosystemAppObservations(limit = 100) {
  const current = await getEcosystemSnapshot();
  const history = (await getEcosystemSnapshotHistory(50)) as StoredSnapshot[];
  const currentGeneratedAt = current.generatedAt;
  const currentTimestamp = Date.parse(currentGeneratedAt);
  const currentItems = current.apps.items;
  const currentIsComplete = Number.isFinite(currentTimestamp)
    && current.apps.sourceAvailable
    && isCompleteSnapshot(current.apps.totalCount, currentItems);

  // postgres returns TIMESTAMPTZ values as Date objects, not necessarily strings.
  // Normalize them before comparison so historical snapshots are not silently lost.
  const historyEntries: NormalizedSnapshot[] = history
    .map((snapshot): NormalizedSnapshot | null => {
      const generatedAt = normalizeTimestamp(snapshot.generatedAt);
      if (!generatedAt) return null;
      const timestamp = Date.parse(generatedAt);
      return {
        snapshot,
        generatedAt,
        timestamp,
        apps: snapshotApps(snapshot),
        observedAppCount: snapshotObservedAppCount(snapshot),
      };
    })
    .filter((entry): entry is NormalizedSnapshot => entry !== null && entry.timestamp < currentTimestamp)
    .sort((a, b) => b.timestamp - a.timestamp);

  // Never infer removals from an empty or truncated scrape. A comparison baseline
  // is usable only when the current and previous app snapshots contain every
  // record represented by their observed counts.
  const previousSnapshot = currentIsComplete
    ? historyEntries.find(entry => isCompleteSnapshot(entry.observedAppCount, entry.apps)) ?? null
    : null;
  const previousUrls = new Set((previousSnapshot?.apps ?? []).map(item => item.url));
  const currentUrls = new Set(currentItems.map(item => item.url));

  const byUrl = new Map<string, {
    name: string;
    url: string;
    firstSeenAt: string;
    lastSeenAt: string;
    observationCount: number;
  }>();

  function addObservation(item: SnapshotApp, generatedAt: string) {
    const existing = byUrl.get(item.url);
    if (!existing) {
      byUrl.set(item.url, {
        name: item.name,
        url: item.url,
        firstSeenAt: generatedAt,
        lastSeenAt: generatedAt,
        observationCount: 1,
      });
      return;
    }
    existing.observationCount += 1;
    const time = Date.parse(generatedAt);
    if (time < Date.parse(existing.firstSeenAt)) existing.firstSeenAt = generatedAt;
    if (time >= Date.parse(existing.lastSeenAt)) {
      existing.lastSeenAt = generatedAt;
      existing.name = item.name;
    }
  }

  // Retain actual historical evidence even while the current source only exposes
  // a dynamically rendered shell and therefore cannot produce a complete list.
  for (const entry of historyEntries) {
    for (const item of entry.apps) addObservation(item, entry.generatedAt);
  }
  for (const item of currentItems) addObservation(item, currentGeneratedAt);

  const apps: EcosystemAppObservation[] = [...byUrl.values()]
    .map(item => ({
      ...item,
      seenInPreviousSnapshot: previousSnapshot ? previousUrls.has(item.url) : false,
      currentlyObserved: currentUrls.has(item.url) ? true : currentIsComplete ? false : null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, Math.max(1, Math.min(limit, 200)));

  const newApps = previousSnapshot
    ? apps.filter(app => app.currentlyObserved === true && !app.seenInPreviousSnapshot)
    : [];

  const notPresentInLatest = previousSnapshot
    ? [...previousUrls]
        .filter(url => !currentUrls.has(url))
        .map(url => byUrl.get(url))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .map(item => ({
          ...item,
          seenInPreviousSnapshot: true,
          currentlyObserved: false,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 100)
    : [];

  return {
    generatedAt: currentGeneratedAt,
    configured: history.length > 0,
    // Null means the scraper could not establish a reliable current count; it does
    // not mean that the Pi ecosystem currently contains zero apps.
    currentCount: currentIsComplete ? currentItems.length : currentItems.length > 0 ? currentItems.length : null,
    previousSnapshotAt: previousSnapshot?.generatedAt ?? null,
    historicalSnapshotCount: history.length,
    apps,
    newApps,
    notPresentInLatest,
  };
}
