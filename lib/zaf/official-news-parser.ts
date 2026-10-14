export type EcosystemNewsItem = {
  title: string;
  url: string;
  publishedAt: string | null;
};

export type OfficialNewsMetadata = {
  status: "available" | "unavailable";
  checkedAt: string;
  lastSuccessfulAt: string | null;
  sourceUrl: string;
  mode: "rss" | "html" | null;
  stale: boolean;
};

export function decodeNewsText(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp|rsquo|lsquo|rdquo|ldquo|hellip);/gi, (entity, name: string) => {
      const named: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…" };
      if (!name.startsWith("#")) return named[name.toLowerCase()] ?? entity;
      const code = name.toLowerCase().startsWith("#x") ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : entity;
    }).replace(/\s+/g, " ").trim();
}

function officialArticleUrl(value: string) {
  try {
    const url = new URL(decodeNewsText(value), "https://minepi.com/blog/");
    if (url.protocol !== "https:" || url.hostname !== "minepi.com" || url.username || url.password || url.port) return null;
    if (!/^\/blog\/[^/]+\/?$/.test(url.pathname) || /^\/blog\/(?:feed|page)\/?$/.test(url.pathname)) return null;
    url.search = "";
    url.hash = "";
    url.pathname = url.pathname.replace(/\/?$/, "/");
    return url.toString();
  } catch { return null; }
}

export function normalizeOfficialNews(items: EcosystemNewsItem[]) {
  const unique = new Map<string, EcosystemNewsItem>();
  for (const item of items) {
    const url = officialArticleUrl(item.url);
    const title = decodeNewsText(item.title);
    const timestamp = item.publishedAt ? Date.parse(item.publishedAt) : NaN;
    // Undated links cannot establish which publication is latest.
    if (!url || !title || title.length > 300 || !Number.isFinite(timestamp)) continue;
    const publishedAt = new Date(timestamp).toISOString();
    const previous = unique.get(url);
    if (!previous || timestamp > Date.parse(previous.publishedAt!)) unique.set(url, { title, url, publishedAt });
  }
  return [...unique.values()].sort((a, b) => Date.parse(b.publishedAt!) - Date.parse(a.publishedAt!)).slice(0, 20);
}

export function parseOfficialNewsRss(xml: string) {
  const items: EcosystemNewsItem[] = [];
  for (const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const field = (name: string) => decodeNewsText(match[1].match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] ?? "");
    items.push({ title: field("title"), url: field("link"), publishedAt: field("pubDate") || null });
  }
  return normalizeOfficialNews(items);
}

export function parseOfficialNewsHtml(html: string) {
  const items: EcosystemNewsItem[] = [];
  for (const match of html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)) {
    const article = match[1];
    const heading = article.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1] ?? "";
    const link = heading.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const datetime = article.match(/<time\b[^>]*datetime=["']([^"']+)["']/i)?.[1];
    const dateText = article.match(/<span\b[^>]*>\s*([A-Za-z]+ \d{1,2}, \d{4})\s*<\/span>/i)?.[1];
    // The blog listing's calendar dates have no time zone. Preserve them as UTC dates.
    const date = datetime ?? (dateText ? `${dateText} 00:00:00 GMT` : null);
    items.push({ title: link[2], url: link[1], publishedAt: date });
  }
  return normalizeOfficialNews(items);
}
