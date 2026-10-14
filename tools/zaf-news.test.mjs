import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Compile the actual TypeScript modules in memory, without needing a new runner.
const modules = new Map();
function load(name) {
  if (modules.has(name)) return modules.get(name);
  const source = fs.readFileSync(new URL(`../lib/zaf/${name}.ts`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  const run = vm.runInThisContext(`(function(require, module, exports) { ${compiled}\n})`, { filename: name + ".ts" });
  run(dependency => load(dependency.replace(/^\.\//, "")), module, module.exports);
  modules.set(name, module.exports);
  return module.exports;
}
const { parseOfficialNewsRss, parseOfficialNewsHtml } = load("official-news-parser");
const { createOfficialNewsReader, OFFICIAL_NEWS_FEED, OFFICIAL_NEWS_BLOG } = load("official-news");
const rssItem = (slug, title, date) => `<item><title>${title}</title><link>https://minepi.com/blog/${slug}/</link><pubDate>${date}</pubDate></item>`;
const oldDate = "Thu, 17 Sep 2026 21:02:41 +0000";
const newDate = "Thu, 08 Oct 2026 21:42:07 +0000";
const feed = `<rss><channel><title>Navigation</title><link>https://minepi.com/blog/</link>${rssItem("older", "Older announcement", oldDate)}${rssItem("newer", "Latest &#038; official &#x2019; news", newDate)}</channel></rss>`;
const article = `<article><h3><a href="/blog/fallback/">Fallback &amp; announcement</a></h3><span>October 8, 2026</span></article>`;

test("RSS selects by publication date, decodes entities and excludes channel navigation", () => {
  const news = parseOfficialNewsRss(feed);
  assert.equal(news.length, 2);
  assert.equal(news[0].url, "https://minepi.com/blog/newer/");
  assert.equal(news[0].title, "Latest & official ’ news");
  assert.equal(news[0].publishedAt, "2026-10-08T21:42:07.000Z");
});

test("RSS handles CDATA and deduplicates canonical article links", () => {
  const xml = `<rss>${rssItem("same", "<![CDATA[An &amp; announcement]]>", oldDate)}<item><title>Updated title</title><link>https://minepi.com/blog/same?ref=new#top</link><pubDate>${newDate}</pubDate></item></rss>`;
  const news = parseOfficialNewsRss(xml);
  assert.equal(news.length, 1);
  assert.equal(news[0].title, "Updated title");
  assert.equal(parseOfficialNewsRss(`<rss>${rssItem("cdata", "<![CDATA[An &amp; announcement]]>", oldDate)}</rss>`)[0].title, "An & announcement");
});

test("untrusted, undated, paginated and invalid-date links cannot become latest news", () => {
  const invalid = ["https://minepi.com.evil.example/blog/fake/", "https://evil.example/minepi.com/blog/fake/", "http://minepi.com/blog/fake/", "https://minepi.com/blog/page/2/", "https://minepi.com/blog/feed/", "https://minepi.com/blog/"];
  const xml = invalid.map(url => `<item><title>Fake announcement</title><link>${url}</link><pubDate>${newDate}</pubDate></item>`).join("");
  assert.deepEqual(parseOfficialNewsRss(`<rss>${xml}${rssItem("undated", "Undated announcement", "")}${rssItem("invalid", "Invalid announcement", "not-a-date")}</rss>`), []);
});

test("HTML fallback reads article headings and dates, ignoring unrelated page links", () => {
  const html = `<a href="https://minepi.com/blog/wrong/">Wrong navigation</a>${article}<article><h2><a href="https://minepi.com/blog/older/">Older announcement</a></h2><time datetime="2026-09-17T21:02:41Z"></time></article>`;
  const news = parseOfficialNewsHtml(html);
  assert.equal(news.length, 2);
  assert.equal(news[0].url, "https://minepi.com/blog/fallback/");
  assert.equal(news[0].publishedAt, "2026-10-08T00:00:00.000Z");
});

test("unreadable or empty RSS falls back to the dated official blog", async () => {
  for (const broken of ["<html>Not a feed</html>", null]) {
    const urls = [];
    const read = createOfficialNewsReader(async url => {
      urls.push(url);
      if (url === OFFICIAL_NEWS_FEED) { if (broken === null) throw new Error("HTTP 503"); return broken; }
      return article;
    });
    const result = await read();
    assert.deepEqual(urls, [OFFICIAL_NEWS_FEED, OFFICIAL_NEWS_BLOG]);
    assert.equal(result.metadata.status, "available");
    assert.equal(result.metadata.mode, "html");
    assert.equal(result.items[0].url, "https://minepi.com/blog/fallback/");
  }
});

test("a failed refresh preserves original dates and reports a separate failed check time", async () => {
  let time = Date.parse("2026-10-14T09:00:00Z");
  let fail = false;
  const read = createOfficialNewsReader(async () => { if (fail) throw new Error("Timeout"); return feed; }, () => time);
  const successful = await read();
  fail = true;
  time += 5 * 60_000;
  const failed = await read();
  assert.deepEqual(failed.items, successful.items);
  assert.equal(failed.metadata.status, "unavailable");
  assert.equal(failed.metadata.stale, true);
  assert.equal(failed.metadata.lastSuccessfulAt, successful.metadata.lastSuccessfulAt);
  assert.equal(failed.metadata.checkedAt, "2026-10-14T09:05:00.000Z");
  fail = false;
  time += 60_000;
  const recovered = await read();
  assert.equal(recovered.metadata.status, "available");
  assert.equal(recovered.metadata.stale, false);
  assert.equal(recovered.metadata.lastSuccessfulAt, "2026-10-14T09:06:00.000Z");
});

test("a cold instance restores persisted evidence when both sources fail", async () => {
  const read = createOfficialNewsReader(async () => { throw new Error("Unavailable"); });
  const result = await read(async () => ({ items: parseOfficialNewsRss(feed), lastSuccessfulAt: "2026-10-13T03:00:00Z", sourceUrl: OFFICIAL_NEWS_FEED, mode: "rss" }));
  assert.equal(result.metadata.stale, true);
  assert.equal(result.metadata.status, "unavailable");
  assert.equal(result.metadata.lastSuccessfulAt, "2026-10-13T03:00:00Z");
  assert.equal(result.items[0].url, "https://minepi.com/blog/newer/");
});

test("complete source failure without history yields no invented publication", async () => {
  const read = createOfficialNewsReader(async () => { throw new Error("Unavailable"); });
  const result = await read(async () => { throw new Error("Database unavailable"); });
  assert.deepEqual(result.items, []);
  assert.equal(result.metadata.status, "unavailable");
  assert.equal(result.metadata.stale, false);
  assert.equal(result.metadata.lastSuccessfulAt, null);
});

test("concurrent reads share one request and respect the five-minute cache", async () => {
  let calls = 0;
  let time = 0;
  const read = createOfficialNewsReader(async () => { calls++; await Promise.resolve(); return feed; }, () => time);
  const results = await Promise.all([read(), read(), read()]);
  assert.equal(calls, 1);
  assert.equal(results[0], results[1]);
  time += 299_999;
  await read();
  assert.equal(calls, 1);
  time++;
  await read();
  assert.equal(calls, 2);
});

test("scheduled collection requires authorization and reuses the collected ecosystem for app checks", async () => {
  const calls = [];
  const ecosystem = { newsMetadata: { status: "available" }, apps: { items: [] } };
  const observation = { generatedAt: "2026-10-14T03:00:00Z", ecosystem, network: { latestLedger: { sequence: "100" } }, errors: [] };
  const dependencies = {
    "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    "@/lib/zaf/observation-engine": { getUnifiedObservation: async options => { assert.equal(options.force, true); calls.push("observe"); return observation; } },
    "@/lib/zaf/app-health-runner": { runEcosystemHealthChecks: async value => { assert.equal(value, ecosystem); calls.push("health"); return { checked: 2 }; } },
    "@/lib/zaf/rate-limit": { cleanupZafRateLimits: async () => { calls.push("cleanup"); return 0; } },
    "@/lib/zaf/monitor-status": { saveMonitorRun: async () => true },
  };
  const source = fs.readFileSync(new URL("../app/api/apps/health/cron/route.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function(require, module, exports) { ${compiled}\n})`)(name => dependencies[name], module, module.exports);
  const previousSecret = process.env.CRON_SECRET;
  try {
    delete process.env.CRON_SECRET;
    assert.equal((await module.exports.GET(new Request("http://localhost/cron"))).status, 401);
    process.env.CRON_SECRET = "test-only-scheduled-secret";
    assert.equal((await module.exports.GET(new Request("http://localhost/cron"))).status, 401);
    assert.deepEqual(calls, []);
    const result = await module.exports.GET(new Request("http://localhost/cron", { headers: { authorization: "Bearer test-only-scheduled-secret" } }));
    assert.equal(result.status, 200);
    assert.deepEqual(calls, ["observe", "health", "cleanup"]);
    assert.equal(result.body.observation.networkObserved, true);
    assert.equal(result.body.observation.news.status, "available");
    assert.equal(result.body.checked, 2);
  } finally {
    if (previousSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousSecret;
  }
});
