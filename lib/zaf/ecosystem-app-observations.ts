import { getEcosystemSnapshot } from "@/lib/zaf/ecosystem";
import { getEcosystemSnapshotHistory } from "@/lib/zaf/ecosystem-history";

export type EcosystemAppObservation = {
  name: string;
  url: string;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  observationCount: number;
  seenInPreviousSnapshot: boolean;
  currentlyObserved: boolean;
};

type StoredSnapshot = {
  generatedAt?: unknown;
  payload?: unknown;
};

function snapshotApps(snapshot: StoredSnapshot) {
  const payload = snapshot.payload;
  if (!payload || typeof payload !== "object") return [];
  const apps = (payload as Record<string, unknown>).apps;
  if (!apps || typeof apps !== "object") return [];
  const items = (apps as Record<string, unknown>).items;
  if (!Array.isArray(items)) return [];
  return items.filter((item): item is { name: string; url: string } => {
    if (!item || typeof item !== "object") return false;
    const value = item as Record<string, unknown>;
    return typeof value.name === "string" && typeof value.url === "string" && value.url.length > 0;
  });
}

export async function getEcosystemAppObservations(limit = 100) {
  const current = await getEcosystemSnapshot();
  const history = (await getEcosystemSnapshotHistory(50)) as StoredSnapshot[];
  const currentGeneratedAt = current.generatedAt;
  const currentItems = current.apps.items;

  const previousSnapshot = history
    .filter(item => typeof item.generatedAt === "string" && item.generatedAt < currentGeneratedAt)
    .sort((a, b) => String(b.generatedAt).localeCompare(String(a.generatedAt)))[0] ?? null;
  const previousUrls = new Set(snapshotApps(previousSnapshot ?? {}).map(item => item.url));

  const byUrl = new Map<string, EcosystemAppObservation>();

  for (const item of currentItems) {
    let firstSeenAt: string | null = null;
    let lastSeenAt: string | null = currentGeneratedAt;
    let observationCount = 1;

    for (const stored of history) {
      const generatedAt = typeof stored.generatedAt === "string" ? stored.generatedAt : null;
      if (!generatedAt) continue;
      const found = snapshotApps(stored).some(candidate => candidate.url === item.url);
      if (!found) continue;
      observationCount += 1;
      if (firstSeenAt == null || generatedAt < firstSeenAt) firstSeenAt = generatedAt;
      if (lastSeenAt == null || generatedAt > lastSeenAt) lastSeenAt = generatedAt;
    }

    if (firstSeenAt == null) firstSeenAt = currentGeneratedAt;

    byUrl.set(item.url, {
      name: item.name,
      url: item.url,
      firstSeenAt,
      lastSeenAt,
      observationCount,
      seenInPreviousSnapshot: previousUrls.has(item.url),
      currentlyObserved: true,
    });
  }

  const notPresent = new Map<string, EcosystemAppObservation>();
  const previousItems = snapshotApps(previousSnapshot ?? {});
  for (const item of previousItems) {
    if (byUrl.has(item.url)) continue;
    notPresent.set(item.url, {
      name: item.name,
      url: item.url,
      firstSeenAt: null,
      lastSeenAt: previousSnapshot && typeof previousSnapshot.generatedAt === "string" ? previousSnapshot.generatedAt : null,
      observationCount: 1,
      seenInPreviousSnapshot: true,
      currentlyObserved: false,
    });
  }

  const apps = [...byUrl.values()].sort((a, b) => a.name.localeCompare(b.name)).slice(0, Math.max(1, Math.min(limit, 200)));
  const newApps = previousSnapshot ? apps.filter(app => !app.seenInPreviousSnapshot) : [];
  const notPresentInLatest = [...notPresent.values()].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 100);

  return {
    generatedAt: currentGeneratedAt,
    configured: history.length > 0,
    currentCount: currentItems.length,
    previousSnapshotAt: previousSnapshot && typeof previousSnapshot.generatedAt === "string" ? previousSnapshot.generatedAt : null,
    historicalSnapshotCount: history.length,
    apps,
    newApps,
    notPresentInLatest,
  };
}
