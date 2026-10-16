import { normalizeOfficialNews, parseOfficialNewsHtml, parseOfficialNewsRss } from "./official-news-parser";
import type { EcosystemNewsItem, OfficialNewsMetadata } from "./official-news-parser";

export const OFFICIAL_NEWS_FEED = "https://minepi.com/feed/";
export const OFFICIAL_NEWS_BLOG = "https://minepi.com/blog/";

export type OfficialNewsResult = { items: EcosystemNewsItem[]; metadata: OfficialNewsMetadata };
type SavedNews = { items: EcosystemNewsItem[]; lastSuccessfulAt: string; sourceUrl: string; mode: "rss" | "html" | null };

async function fetchNewsText(url: string) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(8_000),
    headers: { "user-agent": "ZAF-TECH-Ecosystem-Intelligence/1.1" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Official news HTTP ${response.status}`);
  return response.text();
}

// One reader per server instance. Persisted ecosystem snapshots cover cold starts
// when optional database history is configured.
export function createOfficialNewsReader(fetchText = fetchNewsText, now = () => Date.now()) {
  let cached: OfficialNewsResult | null = null;
  let expiresAt = 0;
  let pending: Promise<OfficialNewsResult> | null = null;
  return async function read(loadSaved?: () => Promise<SavedNews | null>): Promise<OfficialNewsResult> {
    if (cached && now() < expiresAt) return cached;
    if (pending) return pending;
    pending = (async () => {
      // RSS may lag behind the blog while still returning HTTP 200. Compare both.
      const candidates = await Promise.all(([
        [OFFICIAL_NEWS_FEED, "rss", parseOfficialNewsRss],
        [OFFICIAL_NEWS_BLOG, "html", parseOfficialNewsHtml],
      ] as const).map(async ([sourceUrl, mode, parse]) => {
        try {
          return { sourceUrl, mode, items: parse(await fetchText(sourceUrl)) };
        } catch { return { sourceUrl, mode, items: [] as EcosystemNewsItem[] }; }
      }));
      const current = normalizeOfficialNews(candidates.flatMap(candidate => candidate.items));
      const saved = cached?.items.length && cached.metadata.lastSuccessfulAt
        ? { items: cached.items, ...cached.metadata, lastSuccessfulAt: cached.metadata.lastSuccessfulAt }
        : await loadSaved?.().catch(() => null);
      const previous = normalizeOfficialNews(saved?.items ?? []);
      const regressed = Boolean(previous[0] && current[0] && Date.parse(previous[0].publishedAt!) > Date.parse(current[0].publishedAt!));
      const sourcesChecked = candidates.map(candidate => ({ url: candidate.sourceUrl, mode: candidate.mode, readable: candidate.items.length > 0, latestPublishedAt: candidate.items[0]?.publishedAt ?? null }));
      if (current.length && !regressed) {
        const selected = candidates.find(candidate => candidate.items.some(item => item.url === current[0].url))!;
        const checkedAt = new Date(now()).toISOString();
        cached = { items: normalizeOfficialNews([...current, ...previous]), metadata: { status: "available", checkedAt, lastSuccessfulAt: checkedAt, sourceUrl: selected.sourceUrl, mode: selected.mode, stale: false, sourcesChecked } };
        expiresAt = now() + 5 * 60_000;
        return cached;
      }
      const items = normalizeOfficialNews([...previous, ...current]);
      cached = {
        items,
        metadata: {
          status: "unavailable", checkedAt: new Date(now()).toISOString(),
          lastSuccessfulAt: items.length ? saved?.lastSuccessfulAt ?? null : null,
          sourceUrl: saved?.sourceUrl ?? OFFICIAL_NEWS_FEED,
          mode: saved?.mode ?? null, stale: items.length > 0,
          sourcesChecked,
        },
      };
      expiresAt = now() + 60_000;
      return cached;
    })();
    try { return await pending; } finally { pending = null; }
  };
}

export const readOfficialNews = createOfficialNewsReader();
