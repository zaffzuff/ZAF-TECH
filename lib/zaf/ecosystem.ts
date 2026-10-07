
export const ECOSYSTEM_SOURCES = {
  ecosystemInterface: "https://ecosystem.pinet.com/",
  ecosystemAppPlatform: "https://ecosystem-fzu6gx2rh2n94wpw.piappengine.com/",
  officialBlog: "https://minepi.com/blog/",
  officialDevelopers: "https://developers.minepi.com/",
} as const;

export type EcosystemSourceStatus = {
  id: keyof typeof ECOSYSTEM_SOURCES;
  label: string;
  url: string;
  status: "available" | "unavailable";
  checkedAt: string;
  detail: string;
};

export type EcosystemNewsItem = {
  title: string;
  url: string;
  publishedAt: string | null;
};

export type OfficialEcosystemSignal = {
  id: string;
  title: string;
  value: string;
  detail: string;
  detailTr: string;
  observedAt: string;
  sourceUrl: string;
};

export type EcosystemSignal = {
  id: string;
  category: "apps" | "defi" | "official" | "mainnet" | "node" | "pioneer";
  kind: "new" | "updated" | "observed" | "changed" | "unavailable";
  title: string;
  detail: string;
  detailTr: string;
  detectedAt: string;
  sourceUrl: string | null;
};

export type EcosystemSnapshot = {
  generatedAt: string;
  sources: EcosystemSourceStatus[];
  apps: {
    sourceAvailable: boolean;
    mainnetCount: number | null;
    testnetCount: number | null;
    totalCount: number | null;
    items: Array<{ name: string; url: string }>;
    note: string;
  };
  news: EcosystemNewsItem[];
  officialSignals: OfficialEcosystemSignal[];
  signals: EcosystemSignal[];
  defi: {
    launchpad: { status: "testnet"; sourceUrl: string; latestUpdate: EcosystemNewsItem | null };
    dex: { status: "testnet"; sourceUrl: string; latestUpdate: EcosystemNewsItem | null };
    amm: { status: "testnet"; sourceUrl: string; latestUpdate: EcosystemNewsItem | null };
    mainnetTrading: { status: "restricted"; detail: string };
  };
};

const APP_SOURCE = ECOSYSTEM_SOURCES.ecosystemAppPlatform;
const DEFI_SOURCES = {
  launchpad: "https://minepi.com/blog/pi-launchpad/",
  dexAmm: "https://minepi.com/blog/dex-amm-token-creation/",
  dexUpdate: "https://minepi.com/blog/dex-amm-update/",
} as const;

function absoluteUrl(value: string) {
  try {
    return new URL(value, APP_SOURCE).toString();
  } catch {
    return value;
  }
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

async function fetchText(url: string, timeoutMs = 8_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "ZAF-TECH-Ecosystem-Intelligence/1.0" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function inspectSource(
  id: keyof typeof ECOSYSTEM_SOURCES,
  label: string,
  url: string,
  detail: string,
): Promise<EcosystemSourceStatus> {
  try {
    await fetchText(url);
    return { id, label, url, status: "available", checkedAt: new Date().toISOString(), detail };
  } catch (error) {
    return {
      id,
      label,
      url,
      status: "unavailable",
      checkedAt: new Date().toISOString(),
      detail: error instanceof Error ? error.message : "Source unavailable",
    };
  }
}

async function readEcosystemApps() {
  try {
    const html = await fetchText(APP_SOURCE);
    const items = new Map<string, { name: string; url: string }>();
    const linkPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    while ((match = linkPattern.exec(html)) && items.size < 200) {
      const url = absoluteUrl(match[1]);
      const name = stripHtml(match[2]);
      if (!name || name.length < 2 || name.length > 100) continue;
      if (!/^https?:/i.test(url)) continue;
      if (/^(privacy|terms|support|share|explore the ecosystem|what is pinet)$/i.test(name)) continue;
      items.set(url, { name, url });
    }
    return {
      sourceAvailable: true,
      mainnetCount: null,
      testnetCount: null,
      totalCount: items.size || null,
      items: [...items.values()].slice(0, 100),
      note: items.size
        ? "Observed directly from the public Pi Ecosystem source."
        : "The source is reachable, but app records are rendered dynamically and are not exposed in the initial HTML response.",
    };
  } catch (error) {
    return {
      sourceAvailable: false,
      mainnetCount: null,
      testnetCount: null,
      totalCount: null,
      items: [],
      note: error instanceof Error ? error.message : "Ecosystem source unavailable",
    };
  }
}

async function readOfficialNews() {
  try {
    const html = await fetchText(ECOSYSTEM_SOURCES.officialBlog);
    const items = new Map<string, EcosystemNewsItem>();
    const pattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) && items.size < 20) {
      const url = absoluteUrl(match[1]);
      const title = stripHtml(match[2]);
      if (!url.includes("minepi.com/blog/") || title.length < 8 || title.length > 180) continue;
      if (/^(blog|read more|previous post|next post)$/i.test(title)) continue;
      items.set(url, { title, url, publishedAt: null });
    }
    return [...items.values()].slice(0, 8);
  } catch {
    return [];
  }
}

export async function getEcosystemSnapshot(): Promise<EcosystemSnapshot> {
  const generatedAt = new Date().toISOString();
  const [ecosystemInterface, appData, news] = await Promise.all([
    inspectSource(
      "ecosystemInterface",
      "Pi Ecosystem Interface",
      ECOSYSTEM_SOURCES.ecosystemInterface,
      "Official curated Mainnet/Testnet ecosystem directory.",
    ),
    readEcosystemApps(),
    readOfficialNews(),
  ]);

  const defiNews = news.filter((item) => /launchpad|dex|amm|liquidity|token/i.test(item.title));
  const launchpadUpdate = defiNews.find((item) => /launchpad/i.test(item.title)) ?? null;
  const dexUpdate = defiNews.find((item) => /dex|amm|liquidity/i.test(item.title)) ?? null;
  const defi = {
    launchpad: { status: "testnet" as const, sourceUrl: DEFI_SOURCES.launchpad, latestUpdate: launchpadUpdate },
    dex: { status: "testnet" as const, sourceUrl: DEFI_SOURCES.dexUpdate, latestUpdate: dexUpdate },
    amm: { status: "testnet" as const, sourceUrl: DEFI_SOURCES.dexAmm, latestUpdate: dexUpdate },
    mainnetTrading: { status: "restricted" as const, detail: "Official Pi documentation currently describes DEX/AMM functionality as Testnet-only during the testing phase." },
  };

  const sources: EcosystemSourceStatus[] = [
    ecosystemInterface,
    {
      id: "ecosystemAppPlatform",
      label: "Pi Ecosystem App Platform",
      url: APP_SOURCE,
      status: appData.sourceAvailable ? "available" : "unavailable",
      checkedAt: generatedAt,
      detail: appData.note,
    },
    {
      id: "officialBlog",
      label: "Pi Official Blog",
      url: ECOSYSTEM_SOURCES.officialBlog,
      status: news.length ? "available" : "unavailable",
      checkedAt: generatedAt,
      detail: news.length ? "Official Pi publications observed." : "No publication records were exposed by the source response.",
    },
    {
      id: "officialDevelopers",
      label: "Pi Developer Documentation",
      url: ECOSYSTEM_SOURCES.officialDevelopers,
      status: "available",
      checkedAt: generatedAt,
      detail: "Official developer documentation source.",
    },
  ];

  const officialSignals: OfficialEcosystemSignal[] = [
    {
      id: "ecosystem-quest-started",
      title: "Pi2Day Ecosystem Quest started",
      value: "2.56M started",
      detail: "Official recap reported more than 2.56 million Pioneers started the 2026 Ecosystem Quest.",
      detailTr: "Resmi özete göre 2026 Ekosistem Quest'i 2,56 milyondan fazla Pioneer başlattı.",
      observedAt: "2026-08-05",
      sourceUrl: "https://minepi.com/blog/pi2day-2026-recap/",
    },
    {
      id: "ecosystem-quest-completed",
      title: "Pi2Day Ecosystem Quest completed",
      value: "1.78M completed",
      detail: "Official recap reported more than 1.78 million Pioneers completed every step of the 2026 Ecosystem Quest.",
      detailTr: "Resmi özete göre 2026 Ekosistem Quest'in tüm adımlarını 1,78 milyondan fazla Pioneer tamamladı.",
      observedAt: "2026-08-05",
      sourceUrl: "https://minepi.com/blog/pi2day-2026-recap/",
    },
    {
      id: "solohost-apps",
      title: "SoloHost apps deployed",
      value: "110 apps",
      detail: "Official Pi2Day recap reported 110 community-deployed SoloHost apps at that time.",
      detailTr: "Resmi Pi2Day özetine göre o tarihte topluluk tarafından 110 SoloHost uygulaması dağıtılmıştı.",
      observedAt: "2026-08-05",
      sourceUrl: "https://minepi.com/blog/pi2day-2026-recap/",
    },
    {
      id: "directory-staking-example",
      title: "Ecosystem staking example",
      value: "3.19M Pi staked",
      detail: "Pi reported that CiDi Games received 3.19 million Pi in staked support and over 1.2 million game plays in under one week.",
      detailTr: "Pi, CiDi Games'in 3,19 milyon Pi staking desteği aldığını ve bir haftadan kısa sürede 1,2 milyondan fazla oyun oynandığını bildirdi.",
      observedAt: "2026-06-18",
      sourceUrl: "https://minepi.com/blog/ecosystem-directory-staking/",
    },
    {
      id: "launchpad-slice-commitment",
      title: "SLICE Testnet commitment",
      value: "15.92M Test-Pi",
      detail: "Pi reported more than 242,000 participants committing 15.92 million Test-Pi toward 10 million SLICE Test tokens.",
      detailTr: "Pi, 242.000'den fazla katılımcının 10 milyon SLICE Test tokenı için 15,92 milyon Test-Pi taahhüt ettiğini bildirdi.",
      observedAt: "2026-07-24",
      sourceUrl: "https://minepi.com/blog/launchpad-liquidity-pool/",
    },
    {
      id: "node-pi-desktop-063",
      title: "Pi Desktop 0.6.3 update",
      value: "0.6.3",
      detail: "Pi's September 9, 2026 update described improvements to app discovery, reliability, and developer tooling.",
      detailTr: "Pi'nin 9 Eylül 2026 güncellemesi uygulama keşfi, güvenilirlik ve geliştirici araçlarındaki iyileştirmeleri açıkladı.",
      observedAt: "2026-09-09",
      sourceUrl: "https://minepi.com/blog/solohost-pi-desktop-0-6-3/",
    },
    {
      id: "node-compute-test",
      title: "Distributed computing test",
      value: "5 Node runners",
      detail: "Pi reported an initial distributed-computing test completed with five volunteer Node runners.",
      detailTr: "Pi, beş gönüllü Node runner ile ilk dağıtık hesaplama testinin tamamlandığını bildirdi.",
      observedAt: "2026-08-14",
      sourceUrl: "https://minepi.com/blog/pi-node-0-6-2/",
    },
    {
      id: "pioneer-kyc-update",
      title: "KYC and Mainnet migration update",
      value: "2026-09-26",
      detail: "Pi published an update covering additional KYC and Mainnet migration corner-case handling and related processing paths.",
      detailTr: "Pi, KYC ve Mainnet migrasyonundaki ek köşe durumları ve ilgili işlem yollarını ele alan bir güncelleme yayımladı.",
      observedAt: "2026-09-26",
      sourceUrl: "https://minepi.com/blog/kyc-mainnet-migration-9-26/",
    },
  ];

  const signals: EcosystemSignal[] = [];

  if (appData.totalCount != null) {
    signals.push({
      id: "apps-directory-observed",
      category: "apps",
      kind: "observed",
      title: "Ecosystem directory observed",
      detail: `${appData.totalCount.toLocaleString("en-US")} app records are exposed by the current source response.`,
      detailTr: `${appData.totalCount.toLocaleString("tr-TR")} uygulama kaydı mevcut kaynak yanıtında açığa çıkıyor.`,
      detectedAt: generatedAt,
      sourceUrl: APP_SOURCE,
    });
  } else if (!appData.sourceAvailable) {
    signals.push({
      id: "apps-directory-unavailable",
      category: "apps",
      kind: "unavailable",
      title: "Ecosystem app source unavailable",
      detail: "The current ecosystem app source could not be read.",
      detailTr: "Mevcut ekosistem uygulama kaynağı okunamadı.",
      detectedAt: generatedAt,
      sourceUrl: APP_SOURCE,
    });
  }

  for (const item of news.slice(0, 4)) {
    const isDefi = /launchpad|dex|amm|liquidity|token/i.test(item.title);
    signals.push({
      id: `official-news-${encodeURIComponent(item.url)}`,
      category: isDefi ? "defi" : "official",
      kind: "observed",
      title: item.title,
      detail: isDefi
        ? "Official Pi publication related to an observable DeFi ecosystem layer."
        : "Official Pi publication observed from the public blog source.",
      detailTr: isDefi
        ? "Gözlemlenebilir DeFi ekosistem katmanıyla ilgili resmi Pi yayını."
        : "Herkese açık resmi blog kaynağında resmi Pi yayını gözlemlendi.",
      detectedAt: generatedAt,
      sourceUrl: item.url,
    });
  }

  if (defi.launchpad.latestUpdate) {
    signals.push({
      id: "defi-launchpad-updated",
      category: "defi",
      kind: "observed",
      title: defi.launchpad.latestUpdate.title,
      detail: "An official Launchpad update is present in the current source response.",
      detailTr: "Mevcut kaynak yanıtında resmi bir Launchpad güncellemesi bulunuyor.",
      detectedAt: generatedAt,
      sourceUrl: defi.launchpad.latestUpdate.url,
    });
  }

  if (defi.dex.latestUpdate) {
    signals.push({
      id: "defi-dex-updated",
      category: "defi",
      kind: "observed",
      title: defi.dex.latestUpdate.title,
      detail: "An official DEX/AMM-related update is present in the current source response.",
      detailTr: "Mevcut kaynak yanıtında resmi bir DEX/AMM güncellemesi bulunuyor.",
      detectedAt: generatedAt,
      sourceUrl: defi.dex.latestUpdate.url,
    });
  }

  for (const signal of officialSignals) {
    signals.push({
      id: `official-${signal.id}`,
      category: /node|solohost|compute|desktop/i.test(signal.id) ? "node" : /kyc|migration|pioneer|browser|signin|verify/i.test(signal.id) ? "pioneer" : "official",
      kind: "observed",
      title: signal.title,
      detail: signal.detail,
      detailTr: signal.detailTr,
      detectedAt: signal.observedAt,
      sourceUrl: signal.sourceUrl,
    });
  }

  const snapshot = { generatedAt, sources, apps: appData, news, officialSignals, signals, defi };

  return snapshot;
}
