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
      for (const [sourceUrl, mode, parse] of [
        [OFFICIAL_NEWS_FEED, "rss", parseOfficialNewsRss],
        [OFFICIAL_NEWS_BLOG, "html", parseOfficialNewsHtml],
      ] as const) {
        try {
          const items = parse(await fetchText(sourceUrl));
          if (!items.length) continue;
          const checkedAt = new Date(now()).toISOString();
          cached = { items, metadata: { status: "available", checkedAt, lastSuccessfulAt: checkedAt, sourceUrl, mode, stale: false } };
          expiresAt = now() + 5 * 60_000;
          return cached;
        } catch { /* Try the other official source before using saved evidence. */ }
      }
      const saved = cached?.items.length && cached.metadata.lastSuccessfulAt
        ? { items: cached.items, ...cached.metadata, lastSuccessfulAt: cached.metadata.lastSuccessfulAt }
        : await loadSaved?.().catch(() => null);
      const items = normalizeOfficialNews(saved?.items ?? []);
      cached = {
        items,
        metadata: {
          status: "unavailable", checkedAt: new Date(now()).toISOString(),
          lastSuccessfulAt: items.length ? saved?.lastSuccessfulAt ?? null : null,
          sourceUrl: saved?.sourceUrl ?? OFFICIAL_NEWS_FEED,
          mode: saved?.mode ?? null, stale: items.length > 0,
        },
      };
      expiresAt = now() + 60_000;
      return cached;
    })();
    try { return await pending; } finally { pending = null; }
  };
}

export const readOfficialNews = createOfficialNewsReader();
