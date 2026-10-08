"use client";

import Image from "next/image";
import type React from "react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ZafSnapshot } from "@/lib/zaf/types";
import type { RadarObservation } from "@/lib/zaf/radar";
import type { Locale } from "@/lib/zaf/i18n";
import { intlLocale, translate } from "@/lib/zaf/i18n";
import { LanguageSelector } from "@/components/zaf-language-selector";
import { ZafEcosystemNavigation, ZAF_SECTION_TABS, type ZafSection } from "@/components/zaf-ecosystem-navigation";
import { ZafNodeCompute } from "@/components/zaf-node-compute";
import { ZafAppHealth } from "@/components/zaf-app-health";
import { ZafEcosystemHealthTimeline } from "@/components/zaf-ecosystem-health-timeline";
import { ZafEcosystemAppActivity } from "@/components/zaf-ecosystem-app-activity";
import { ZafEcosystemStaking } from "@/components/zaf-ecosystem-staking";
import { ZafTestnetAssets } from "@/components/zaf-testnet-assets";
import { ZafDefiObservatory } from "@/components/zaf-defi-observatory";
import { ZafLaunchpadObservatory } from "@/components/zaf-launchpad-observatory";
import { ZafEcosystemGraph } from "@/components/zaf-ecosystem-graph";
import { ZafDeveloperTools } from "@/components/zaf-developer-tools";
import { ZafWalletIntelligence } from "@/components/zaf-wallet-intelligence";
import { APP_CATEGORIES, toDirectoryApp, type AppCategory } from "@/lib/zaf/app-directory";

type AppItem = { name: string; url: string };
type SearchResult = { type: "app" | "source" | "signal" | "ledger"; title: string; detail: string; href: string };
type LedgerObservation = {
  sequence: string;
  hash: string | null;
  closedAt: string | null;
  protocolVersion: number | null;
  transactionCount: number | null;
  operationCount: number | null;
  successfulTransactionCount: number | null;
  failedTransactionCount: number | null;
  successfulOperationCount: number | null;
  baseFeeInStroops: number | null;
  baseReserveInStroops: number | null;
  source: string;
};
type EcosystemPayload = {
  generatedAt: string;
  apps: { sourceAvailable: boolean; totalCount: number | null; items: AppItem[]; note: string };
  sources: Array<{ label: string; status: string; url: string; detail: string }>;
};

function number(value: number | null | undefined, digits = 0, locale: Locale = "en") {
  return value == null || !Number.isFinite(value) ? "—" : value.toLocaleString(intlLocale(locale), { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
function displayStatus(value: string | null | undefined, locale: Locale) {
  if (!value) return "—";
  const normalized = value.replace(/[_-]+/g, " ").trim().toLowerCase();
  const known: Record<string, [string, string, string, string, string, string, string, string, string]> = {
    online: ["Online", "Çevrimiçi", "En Línea", "在线", "Online", "En Ligne", "Online", "Online", "Онлайн"],
    offline: ["Offline", "Çevrimdışı", "Fuera De Línea", "离线", "Offline", "Hors Ligne", "Offline", "Offline", "Офлайн"],
    available: ["Available", "Kullanılabilir", "Disponible", "可用", "Disponibile", "Disponible", "Verfügbar", "Disponível", "Доступно"],
    unavailable: ["Unavailable", "Kullanılamıyor", "No Disponible", "不可用", "Non Disponibile", "Indisponible", "Nicht Verfügbar", "Indisponível", "Недоступно"],
    error: ["Error", "Hata", "Error", "错误", "Errore", "Erreur", "Fehler", "Erro", "Ошибка"],
    active: ["Active", "Aktif", "Activo", "活跃", "Attivo", "Actif", "Aktiv", "Ativo", "Активно"],
    "not configured": ["Not Configured", "Yapılandırılmadı", "No Configurado", "未配置", "Non Configurato", "Non Configuré", "Nicht Konfiguriert", "Não Configurado", "Не Настроено"],
    rising: ["Rising", "Yükseliyor", "Subiendo", "上升", "In Aumento", "En Hausse", "Steigend", "Em Alta", "Растёт"],
    stable: ["Stable", "Sabit", "Estable", "稳定", "Stabile", "Stable", "Stabil", "Estável", "Стабильно"],
    falling: ["Falling", "Düşüyor", "Bajando", "下降", "In Calo", "En Baisse", "Fallend", "Em Queda", "Падает"],
    observed: ["Observed", "Gözlemlendi", "Observado", "已观测", "Osservato", "Observé", "Beobachtet", "Observado", "Наблюдается"],
    unverified: ["Unverified", "Doğrulanmadı", "No Verificado", "未验证", "Non Verificato", "Non Vérifié", "Nicht Verifiziert", "Não Verificado", "Не Проверено"],
    limited: ["Limited", "Sınırlı", "Limitado", "有限", "Limitato", "Limité", "Begrenzt", "Limitado", "Ограничено"],
    high: ["High", "Yüksek", "Alta", "高", "Alta", "Élevée", "Hoch", "Alta", "Высокая"],
    medium: ["Medium", "Orta", "Media", "中", "Media", "Moyenne", "Mittel", "Média", "Средняя"],
    low: ["Low", "Düşük", "Baja", "低", "Bassa", "Faible", "Niedrig", "Baixa", "Низкая"],
  };
  const pair = known[normalized];
  if (pair) return pair[locale === "tr" ? 1 : locale === "es" ? 2 : locale === "zh" ? 3 : locale === "it" ? 4 : locale === "fr" ? 5 : locale === "de" ? 6 : locale === "pt" ? 7 : locale === "ru" ? 8 : 0];
  const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  return label;
}
function age(value: string | null | undefined, locale: Locale) {
  if (!value) return "—";
  const ms = Date.now() - Date.parse(value);
  if (!Number.isFinite(ms)) return "—";
  const min = Math.floor(ms / 60000);
  if (locale === "tr") return min < 1 ? "Az Önce" : min < 60 ? `${min} Dk Önce` : `${Math.floor(min / 60)} Sa Önce`;
  if (locale === "es") return min < 1 ? "Ahora Mismo" : min < 60 ? `${min} Min Antes` : `${Math.floor(min / 60)} H Antes`;
  if (locale === "zh") return min < 1 ? "刚刚" : min < 60 ? `${min} 分钟前` : `${Math.floor(min / 60)} 小时前`;
  if (locale === "it") return min < 1 ? "Proprio Ora" : min < 60 ? `${min} Min Fa` : `${Math.floor(min / 60)} Ore Fa`;
  if (locale === "fr") return min < 1 ? "À L’Instant" : min < 60 ? `${min} Min Plus Tôt` : `${Math.floor(min / 60)} H Plus Tôt`;
  if (locale === "de") return min < 1 ? "Gerade eben" : min < 60 ? `Vor ${min} Min.` : `Vor ${Math.floor(min / 60)} Std.`;
  if (locale === "pt") return min < 1 ? "Agora mesmo" : min < 60 ? `Há ${min} min` : `Há ${Math.floor(min / 60)} h`;
  if (locale === "ru") return min < 1 ? "Только что" : min < 60 ? `${min} мин назад` : `${Math.floor(min / 60)} ч назад`;
  return min < 1 ? "Just Now" : min < 60 ? `${min}m Ago` : `${Math.floor(min / 60)}h Ago`;
}
function radarSignalTitle(id: string, locale: Locale) {
  const labels: Record<string, [string, string, string, string, string, string, string, string, string]> = {
    "transaction-pace": ["Observed Transaction Pace", "Gözlemlenen İşlem Temposu", "Ritmo de Transacciones Observado", "已观测交易速率", "Ritmo Transazioni Osservato", "Rythme des Transactions Observé", "Beobachtete Transaktionsrate", "Ritmo de Transações Observado", "Наблюдаемый темп транзакций"],
    "operation-pace": ["Observed Operation Pace", "Gözlemlenen Operasyon Temposu", "Ritmo de Operaciones Observado", "已观测操作速率", "Ritmo Operazioni Osservato", "Rythme des Opérations Observé", "Beobachtete Operationsrate", "Ritmo de Operações Observado", "Наблюдаемый темп операций"],
    "transaction-success": ["Transaction Success Rate", "İşlem Başarı Oranı", "Tasa de Éxito de Transacciones", "交易成功率", "Tasso di Successo delle Transazioni", "Taux de Réussite des Transactions", "Transaktionserfolgsrate", "Taxa de Sucesso das Transações", "Успешность транзакций"],
    "ledger-throughput": ["Ledger Throughput", "Ledger Verimi", "Rendimiento del Ledger", "Ledger 吞吐量", "Throughput del Ledger", "Débit du Ledger", "Ledger-Durchsatz", "Throughput do Ledger", "Пропускная способность Ledger"],
    "source-coverage": ["Public Source Coverage", "Herkese Açık Kaynak Kapsamı", "Cobertura de Fuentes Públicas", "公共来源覆盖率", "Copertura delle Fonti Pubbliche", "Couverture des Sources Publiques", "Abdeckung Öffentlicher Quellen", "Cobertura de Fontes Públicas", "Охват публичных источников"],
    "protocol": ["Protocol Observation", "Protokol Gözlemi", "Observación del Protocolo", "协议观测", "Osservazione del Protocollo", "Observation du Protocole", "Protokollbeobachtung", "Observação do Protocolo", "Наблюдение за протоколом"],
  };
  const index = locale === "tr" ? 1 : locale === "es" ? 2 : locale === "zh" ? 3 : locale === "it" ? 4 : locale === "fr" ? 5 : locale === "de" ? 6 : locale === "pt" ? 7 : locale === "ru" ? 8 : 0;
  return labels[id]?.[index] ?? id;
}
function ecosystemChangeLabel(category: EcosystemChangePayload["changes"][number]["category"], locale: Locale) {
  const labels = {
    app_count: locale === "tr" ? "Uygulama sayısı değişti" : "App count changed",
    source_status: locale === "tr" ? "Kaynak durumu değişti" : "Source status changed",
    signal_added: locale === "tr" ? "Yeni gözlemlendi" : "Newly observed",
    signal_removed: locale === "tr" ? "Artık gözlemlenmiyor" : "No longer observed",
    defi_status: locale === "tr" ? "DeFi durumu değişti" : "DeFi status changed",
  } as const;
  return labels[category ?? "signal_added"] ?? (locale === "tr" ? "Değişiklik" : "Change");
}

function radarSignalValue(id: string, value: number | string | null, locale: Locale) {
  if (value == null) return "—";
  if (id === "source-coverage" || typeof value === "string") return value;
  if (id === "transaction-success") return number(value, 1, locale) + "%";
  if (id === "ledger-throughput") return number(value, 2, locale);
  if (id === "protocol") return "v" + value;
  return number(value, 0, locale);
}

function categoryLabel(category: AppCategory, locale: Locale) {
  const labels: Record<AppCategory, [string, string, string, string, string, string, string, string, string]> = {
    AI: ["AI", "YZ", "IA", "AI", "IA", "IA", "KI", "IA", "ИИ"],
    Business: ["Business", "İş", "Negocios", "商业", "Business", "Entreprise", "Business", "Negócios", "Бизнес"],
    Commerce: ["Commerce", "Ticaret", "Comercio", "商业", "Commercio", "Commerce", "Handel", "Comércio", "Торговля"],
    Community: ["Community", "Topluluk", "Comunidad", "社区", "Comunità", "Communauté", "Community", "Comunidade", "Сообщество"],
    DeFi: ["DeFi", "DeFi", "DeFi", "DeFi", "DeFi", "DeFi", "DeFi", "DeFi", "DeFi"],
    Education: ["Education", "Eğitim", "Educación", "教育", "Istruzione", "Éducation", "Bildung", "Educação", "Образование"],
    Games: ["Games", "Oyunlar", "Juegos", "游戏", "Giochi", "Jeux", "Spiele", "Jogos", "Игры"],
    Social: ["Social", "Sosyal", "Social", "社交", "Social", "Social", "Sozial", "Social", "Социальные"],
    Tools: ["Tools", "Araçlar", "Herramientas", "工具", "Strumenti", "Outils", "Werkzeuge", "Ferramentas", "Инструменты"],
    Other: ["Other", "Diğer", "Otros", "其他", "Altro", "Autre", "Sonstige", "Outros", "Другое"],
  };
  const index = locale === "tr" ? 1 : locale === "es" ? 2 : locale === "zh" ? 3 : locale === "it" ? 4 : locale === "fr" ? 5 : locale === "de" ? 6 : locale === "pt" ? 7 : locale === "ru" ? 8 : 0;
  return labels[category][index];
}

function Card({ title, value, detail }: { title: string; value: string; detail?: string }) {
  return <div className="rounded-xl border border-border bg-card p-3 sm:p-4"><div className="text-xl font-bold ty-nums text-foreground sm:text-2xl">{value}</div><div className="mt-1 text-xs font-medium text-foreground">{title}</div>{detail ? <div className="mt-1 text-[11px] text-muted-foreground">{detail}</div> : null}</div>;
}
function External({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-2">{children}</a>;
}
function searchTypeLabel(type: SearchResult["type"], locale: Locale) {
  const labels: Record<SearchResult["type"], [string, string]> = {
    app: ["App", "Uygulama"],
    source: ["Source", "Kaynak"],
    signal: ["Signal", "Sinyal"],
    ledger: ["Ledger", "Ledger"],
  };
  return labels[type][locale === "tr" ? 1 : 0];
}

function SearchIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>;
}

function searchPlaceholder(locale: Locale) {
  const values: Record<Locale, string> = {
    en: "Search",
    tr: "Ara",
    es: "Buscar",
    zh: "搜索",
    it: "Cerca",
    fr: "Rechercher",
    de: "Suchen",
    pt: "Pesquisar",
    ru: "Поиск",
  };
  return values[locale] ?? values.en;
}

function SearchPanel({ locale, tr, onNavigate, mobile = false, compact = false }: { locale: Locale; tr: (en: string, trText: string) => string; onNavigate: (href: string) => void; mobile?: boolean; compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  async function submit() {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/zaf/search?q=" + encodeURIComponent(q), { cache: "no-store" });
      const body = await response.json();
      setResults(Array.isArray(body?.results) ? body.results : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  const resultsView = query.trim().length >= 2 && (results.length || (!loading && !results.length)) ? (
    results.length ? (
      <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-auto rounded-xl border border-border bg-card p-1 shadow-lg">
        {results.slice(0, 8).map(result => (
          <button key={result.type + result.href + result.title} type="button" onClick={() => onNavigate(result.href)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-muted">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground">{result.title}</span>
              <span className="shrink-0 text-[9px] text-muted-foreground">{searchTypeLabel(result.type, locale)}</span>
            </div>
            <div className="mt-0.5 truncate text-[9px] text-muted-foreground">{result.detail}</div>
          </button>
        ))}
      </div>
    ) : (
      <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-border bg-card p-3 text-[10px] text-muted-foreground">
        {tr("No matching observable results.", "Eşleşen gözlemlenebilir sonuç bulunamadı.")}
      </div>
    )
  ) : null;

  if (mobile) {
    return (
      <div className="relative zaf-mobile-search">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label={tr("Open search", "Aramayı aç")}
          title={tr("Search", "Ara")}
          className="zaf-mobile-header-icon rounded-lg border border-border bg-card p-2 text-foreground"
        >
          <SearchIcon size={16} />
        </button>
        {mobileOpen ? (
          <div className="zaf-mobile-search-panel absolute right-0 top-full z-50 mt-2 w-[min(86vw,360px)] rounded-xl border border-border bg-card p-2 shadow-xl">
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") void submit(); if (e.key === "Escape") setMobileOpen(false); }}
                placeholder={tr("Search ecosystem…", "Ekosistemde ara…")}
                aria-label={tr("Global Search", "Genel Arama")}
                className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
              <button type="button" onClick={() => setMobileOpen(false)} className="rounded-lg border border-border px-2.5 py-2 text-xs text-muted-foreground" aria-label={tr("Close search", "Aramayı kapat")}>×</button>
            </div>
            {resultsView}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`relative w-full sm:max-w-sm lg:max-w-lg ${compact ? "zaf-desktop-search" : ""}`}>
      <div className="relative">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") void submit(); }}
          placeholder={searchPlaceholder(locale)}
          aria-label={tr("Global Search", "Genel Arama")}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 pr-9 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={loading}
          aria-label={tr("Search", "Ara")}
          title={tr("Search", "Ara")}
          className="absolute right-1 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <SearchIcon size={15} />
        </button>
      </div>
      {resultsView}
    </div>
  );
}


function AppDirectoryView({ apps, sourceOnline, generatedAt, note, locale, tr }: { apps: AppItem[]; sourceOnline: boolean; generatedAt?: string; note?: string; locale: Locale; tr: (en: string, trText: string) => string }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"All" | AppCategory>("All");
  const directoryApps = useMemo(() => apps.map(app => toDirectoryApp(app, generatedAt ?? new Date().toISOString())), [apps, generatedAt]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return directoryApps.filter(app => {
      const matchesQuery = !q || app.name.toLowerCase().includes(q) || app.url.toLowerCase().includes(q);
      const matchesCategory = category === "All" || app.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [directoryApps, query, category]);

  return (
    <section className="mt-5 sm:mt-7">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">{tr("Pi App Directory", "Pi Uygulama Dizini")}</h2>
        <p className="text-[11px] text-muted-foreground">{tr("Structured discovery of applications observed from the public Pi ecosystem source.", "Herkese açık Pi ekosistem kaynağında gözlemlenen uygulamaların yapılandırılmış keşfi.")}</p>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Card title={tr("Observed", "Gözlemlenen")} value={directoryApps.length ? number(directoryApps.length, 0, locale) : "—"} detail={tr("Current Source Response", "Mevcut Kaynak Yanıtı")} />
        <Card title={tr("Matching", "Eşleşen")} value={directoryApps.length ? number(filtered.length, 0, locale) : "—"} detail={tr("Current Filters", "Mevcut Filtreler")} />
        <Card title={tr("Source", "Kaynak")} value={displayStatus(sourceOnline ? "online" : "offline", locale)} detail={age(generatedAt, locale)} />
      </div>
      <div className="rounded-xl border border-border bg-card p-3">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder={tr("Search apps or URLs…", "Uygulama veya URL ara…")} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring" />
        <div className="mt-2 overflow-x-auto ty-no-scrollbar">
          <div className="flex min-w-max gap-1">
            <button type="button" onClick={() => setCategory("All")} className={`rounded-md border px-2.5 py-1.5 text-[10px] font-medium ${category === "All" ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground"}`}>{tr("All", "Tümü")}</button>
            {APP_CATEGORIES.map(item => <button key={item} type="button" onClick={() => setCategory(item)} className={`rounded-md border px-2.5 py-1.5 text-[10px] font-medium ${category === item ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground"}`}>{categoryLabel(item, locale)}</button>)}
          </div>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {filtered.map(app => (
          <article key={app.url} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-xs font-semibold text-foreground">{app.name}</h3>
                <p className="mt-1 truncate text-[10px] text-muted-foreground">{app.url}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <a href={`/ecosystem/${app.slug}`} className="rounded-md bg-foreground px-2.5 py-1.5 text-[10px] font-medium text-background">{tr("Details", "Detay")}</a>
                <a href={app.url} target="_blank" rel="noreferrer" className="rounded-md border border-border px-2.5 py-1.5 text-[10px] font-medium text-foreground hover:bg-muted">{tr("Open", "Aç")}</a>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-border px-2 py-0.5 text-[9px] text-muted-foreground">{categoryLabel(app.category, locale)}</span>
              <span className="rounded-full border border-border px-2 py-0.5 text-[9px] text-muted-foreground">{tr("Pi Features: Not Verified", "Pi Özellikleri: Doğrulanmadı")}</span>
            </div>
          </article>
        ))}
      </div>
      {!filtered.length ? <div className="mt-3 rounded-xl border border-border bg-card p-4 text-[11px] text-muted-foreground">{apps.length ? tr("No applications match the current filters.", "Mevcut filtrelerle eşleşen uygulama yok.") : note}</div> : null}
      <div className="mt-3 rounded-xl border border-border bg-card p-3 text-[10px] leading-relaxed text-muted-foreground">
        {tr("Category is a ZAF TECH classification based on the public app name/URL signal, not an official Pi category. Pi Authentication, Pi Payments, PiNet, network and health fields remain unverified until a dedicated observable check confirms them.", "Kategori, herkese açık uygulama adı/URL sinyaline dayalı ZAF TECH sınıflandırmasıdır; resmi Pi kategorisi değildir. Pi Authentication, Pi Payments, PiNet, ağ ve sağlık alanları özel bir gözlemlenebilir kontrol doğrulayana kadar doğrulanmamış olarak kalır.")}
      </div>
    </section>
  );
}



function ObservatoryExplorerView({ apps, sources, snapshot, locale, tr }: {
  apps: AppItem[];
  sources: EcosystemPayload["sources"];
  snapshot: ZafSnapshot | null;
  locale: Locale;
  tr: (en: string, trText: string) => string;
}) {
  const availableSources = sources.filter(source => source.status === "available").length;

  return (
    <section className="mt-5 sm:mt-7">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">{tr("Ecosystem Explorer", "Ekosistem Explorer")}</h2>
        <p className="text-[11px] text-muted-foreground">{tr("Explore the public ecosystem sources, current network observations, and applications currently observable by ZAF TECH.", "ZAF TECH tarafından şu anda gözlemlenebilen herkese açık ekosistem kaynaklarını, güncel ağ gözlemlerini ve uygulamaları keşfedin.")}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card title={tr("Observed Apps", "Gözlemlenen Uygulamalar")} value={number(apps.length, 0, locale)} />
        <Card title={tr("Public Sources", "Herkese Açık Kaynaklar")} value={sources.length.toString()} detail={tr("Available Sources", "Kullanılabilir Kaynaklar") + ": " + availableSources} />
        <Card title={tr("Latest Ledger", "Son Ledger")} value={snapshot?.latestLedger?.sequence?.toString() ?? "—"} />
        <Card title={tr("Protocol", "Protokol")} value={snapshot?.metrics.latestProtocolVersion != null ? `v${snapshot.metrics.latestProtocolVersion}` : "—"} />
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card p-4">
        <div className="text-xs font-semibold text-foreground">{tr("Network", "Ağ")}</div>
        <p className="mt-1 text-[10px] text-muted-foreground">{tr("A compact, descriptive pulse built only from the current observable sample. It is not a network-wide health score.", "Yalnızca mevcut gözlemlenebilir örnekten oluşturulan kısa ve açıklayıcı ağ görünümüdür. Ağ geneli sağlık puanı değildir.")}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Card title={tr("Transactions", "İşlemler")} value={number(snapshot?.metrics.recentTransactions, 0, locale)} detail={tr("Current Sample", "Mevcut Örnek")} />
          <Card title={tr("Operations", "Operasyonlar")} value={number(snapshot?.metrics.recentOperations, 0, locale)} detail={tr("Current Sample", "Mevcut Örnek")} />
          <Card title={tr("Daily Transactions", "Günlük İşlemler")} value={number(snapshot?.metrics.observedTransactionsPerDay, 0, locale)} detail={tr("Observed Daily Pace", "Gözlemlenen Günlük Tempo")} />
          <Card title={tr("Daily Operations", "Günlük Operasyonlar")} value={number(snapshot?.metrics.observedOperationsPerDay, 0, locale)} detail={tr("Observed Daily Pace", "Gözlemlenen Günlük Tempo")} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          <span>{tr("Activity State", "Aktivite Durumu")}: {displayStatus(snapshot?.intelligence.activityState, locale)}</span>
          <span>•</span>
          <span>{tr("Updated", "Güncellendi")} {age(snapshot?.generatedAt, locale)}</span>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card p-4">
        <div className="text-xs font-semibold text-foreground">{tr("Public Ecosystem Sources", "Herkese Açık Ekosistem Kaynakları")}</div>
        <p className="mt-1 text-[10px] text-muted-foreground">{tr("Each source is listed with its observable status and last collection time. Source availability does not mean the underlying content is verified by ZAF TECH.", "Her kaynak gözlemlenebilir durumu ve son toplama zamanı ile listelenir. Kaynağın kullanılabilir olması, içeriğinin ZAF TECH tarafından doğrulandığı anlamına gelmez.")}</p>
        <div className="mt-3 space-y-2">
          {sources.length ? sources.map(source => (
            <div key={source.url} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0">                <div className="text-[11px] font-semibold text-foreground">{source.label}</div>
                <div className="mt-1 break-all text-[10px] text-muted-foreground">{source.detail}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">{displayStatus(source.status, locale)}</div>
              </div>
              <a href={source.url} target="_blank" rel="noreferrer" className="shrink-0 rounded-md border border-border px-2.5 py-1.5 text-[10px] font-medium text-foreground hover:bg-muted">{tr("Open Source", "Kaynağı Aç")}</a>
            </div>
          )) : (
            <div className="text-[10px] text-muted-foreground">{tr("No public sources are currently available.", "Şu anda kullanılabilir herkese açık kaynak yok.")}</div>
          )}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card p-4">
        <div className="text-xs font-semibold text-foreground">{tr("Observed Applications", "Gözlemlenen Uygulamalar")}</div>
        <div className="mt-3 space-y-2">
          {apps.slice(0, 10).map(app => (
            <div key={app.url} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-foreground">{app.name}</div>
                <div className="mt-1 truncate text-[10px] text-muted-foreground">{app.url}</div>
              </div>
              <a href={app.url} target="_blank" rel="noreferrer" className="shrink-0 rounded-md border border-border px-2.5 py-1.5 text-[10px] font-medium text-foreground hover:bg-muted">{tr("Open", "Aç")}</a>
            </div>
          ))}
          {!apps.length ? <div className="text-[10px] text-muted-foreground">{tr("No observed applications are currently available.", "Şu anda gözlemlenen uygulama yok.")}</div> : null}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card p-4">
        <div className="text-xs font-semibold text-foreground">{tr("Verification Boundary", "Doğrulama Sınırı")}</div>
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{tr("ZAF TECH separates observation from verification. A reachable URL, public source response, blockchain record, or local node signal is evidence that the signal was observed; it is not proof of ownership, safety, legitimacy, future behavior, or undisclosed backend activity.", "ZAF TECH gözlem ile doğrulamayı birbirinden ayırır. Erişilebilir URL, herkese açık kaynak yanıtı, blockchain kaydı veya yerel node sinyali sinyalin gözlemlendiğine kanıttır; sahiplik, güvenlik, meşruiyet, gelecekteki davranış veya açıklanmamış backend faaliyetlerinin kanıtı değildir.")}</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-3">
            <div className="text-[10px] font-semibold text-foreground">{tr("Observable", "Gözlemlenebilir")}</div>
            <div className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{tr("Public URLs, HTTP responses, public Mainnet records, ecosystem metadata, source availability, and local Node Connector diagnostics.", "Herkese açık URL'ler, HTTP yanıtları, public Mainnet kayıtları, ekosistem metaverileri, kaynak erişilebilirliği ve yerel Node Connector tanılamaları.")}</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-[10px] font-semibold text-foreground">{tr("Not Verified", "Doğrulanmadı")}</div>
            <div className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{tr("Private user activity, ownership claims, undisclosed operations, application security, financial legitimacy, and future plans.", "Özel kullanıcı etkinliği, sahiplik iddiaları, açıklanmamış işlemler, uygulama güvenliği, finansal meşruiyet ve gelecekteki planlar.")}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ZafTechApp() {
  const [locale, setLocale] = useState<Locale>("en");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [section, setSection] = useState<ZafSection>("overview");
  const [subtab, setSubtab] = useState("Ecosystem");
  const [snapshot, setSnapshot] = useState<ZafSnapshot | null>(null);
  const [ecosystem, setEcosystem] = useState<EcosystemPayload | null>(null);
  const [radarChanges, setRadarChanges] = useState<EcosystemChangePayload | null>(null);
  const [radarData, setRadarData] = useState<RadarObservation | null>(null);
  const [observationMeta, setObservationMeta] = useState<{ generatedAt: string; freshness: { state: string; ageSeconds: number }; confidence: { score: number; level: string }; errors: string[] }>({ generatedAt: "", freshness: { state: "unknown", ageSeconds: 0 }, confidence: { score: 0, level: "low" }, errors: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [ledgerObservation, setLedgerObservation] = useState<LedgerObservation | null>(null);
  const [deepLinkReady, setDeepLinkReady] = useState(false);
  const router = useRouter();

  const tr = (en: string, trText: string) => translate(locale, en, trText);

  useEffect(() => {
    let active = true;
    fetch("/api/zaf/ecosystem/changes", { cache: "no-store" })
      .then(response => response.ok ? response.json() : null)
      .then(value => { if (active) setRadarChanges(value); })
      .catch(() => { if (active) setRadarChanges(null); });
    return () => { active = false; };
  }, [refreshNonce]);

  useEffect(() => {
    let active = true;
    fetch("/api/zaf/radar", { cache: "no-store" })
      .then(response => response.ok ? response.json() as Promise<RadarObservation> : null)
      .then(value => { if (active) setRadarData(value); })
      .catch(() => { if (active) setRadarData(null); });
    return () => { active = false; };
  }, [refreshNonce]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedSection = params.get("section") as ZafSection | null;
    if (requestedSection && Object.prototype.hasOwnProperty.call(ZAF_SECTION_TABS, requestedSection)) {
      setSection(requestedSection);
      const requestedSubtab = params.get("subtab");
      const allowed = ZAF_SECTION_TABS[requestedSection];
      setSubtab(requestedSubtab && allowed.includes(requestedSubtab) ? requestedSubtab : (allowed[0] ?? ""));
    }
    const requestedLedger = params.get("ledger");
    if (requestedLedger && /^\d{1,12}$/.test(requestedLedger)) {
      void fetch("/api/zaf/ledger/" + requestedLedger, { cache: "no-store" })
        .then(response => response.ok ? response.json() as Promise<LedgerObservation> : null)
        .then(value => setLedgerObservation(value))
        .catch(() => setLedgerObservation(null));
    }
    setDeepLinkReady(true);
  }, []);

  useEffect(() => {
    if (!deepLinkReady) return;
    const params = new URLSearchParams(window.location.search);
    params.set("section", section);
    if (subtab) params.set("subtab", subtab);
    window.history.replaceState(null, "", "/?" + params.toString());
  }, [deepLinkReady, section, subtab]);

  useEffect(() => {
    const t = window.localStorage.getItem("zaf-tech-theme-v1");
    if (t === "light" || t === "dark") setTheme(t);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    window.localStorage.setItem("zaf-tech-theme-v1", theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const load = useCallback(async (force = false) => {
    setRefreshing(true);
    try {
      const response = await fetch(force ? "/api/zaf/observations?force=1" : "/api/zaf/observations", { cache: "no-store" });
      if (!response.ok) throw new Error("ZAF TECH observation request failed");
      const observation = await response.json();
      if (!observation?.network && !observation?.ecosystem) throw new Error("No usable observation returned");
      setSnapshot(observation.network ?? null);
      setEcosystem(observation.ecosystem ?? null);
      setObservationMeta({
        generatedAt: observation.generatedAt ?? "",
        freshness: observation.freshness ?? { state: "unknown", ageSeconds: 0 },
        confidence: observation.confidence ?? { score: 0, level: "low" },
        errors: Array.isArray(observation.errors) ? observation.errors : [],
      });
      setLoadError(null);
      if (force) setRefreshNonce(value => value + 1);
    } catch {
      setLoadError("DATA_REQUEST_FAILED");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60000);
    return () => window.clearInterval(id);
  }, [load]);

  const apps = ecosystem?.apps.items ?? [];
  const sourceOnline = ecosystem?.apps.sourceAvailable ?? false;
  const navigateResult = useCallback((href: string) => { if (href.startsWith("/")) router.push(href); else window.open(href, "_blank", "noopener,noreferrer"); }, [router]);

  return (
    <div className="min-h-screen bg-background">
      <main className="zaf-main-shell mx-auto w-full max-w-3xl px-4 pb-10">
        <header className="border-b border-border pb-5 pt-7">
          <div className="zaf-desktop-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Image src="/zaf-tech-logo.png" alt="ZAF TECH" width={44} height={44} className="h-11 w-11 shrink-0 object-contain" priority />
              <div className="min-w-0">
                <div className="text-2xl font-bold tracking-tight ty-brand-text">ZAF TECH</div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tr("Pi Ecosystem Observatory", "Pi Ekosistem Gözlem Merkezi")}</p>
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              <SearchPanel locale={locale} tr={tr} onNavigate={navigateResult} compact />
              <LanguageSelector locale={locale} onChange={setLocale} />
              <button type="button" onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="rounded-lg border border-border bg-card px-2.5 py-2 text-xs font-medium text-foreground">{theme === "light" ? `☾ ${tr("Dark", "Koyu")}` : `☀ ${tr("Light", "Açık")}`}</button>
              <button type="button" onClick={() => void load(true)} disabled={refreshing} className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground disabled:opacity-50">{refreshing ? tr("Refreshing…", "Yenileniyor…") : tr("Refresh", "Yenile")}</button>
            </div>
          </div>
          <div className="zaf-mobile-header flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Image src="/zaf-tech-logo.png" alt="ZAF TECH" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" priority />
              <div className="min-w-0">
                <div className="text-xl font-bold tracking-tight ty-brand-text">ZAF TECH</div>
                <p className="mt-0.5 truncate text-[9px] leading-tight text-muted-foreground">{tr("Pi Ecosystem Observatory", "Pi Ekosistem Gözlem Merkezi")}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <SearchPanel locale={locale} tr={tr} onNavigate={navigateResult} mobile />
              <LanguageSelector locale={locale} onChange={setLocale} className="zaf-mobile-language" />
              <button type="button" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label={tr("Theme", "Tema")} title={theme === "light" ? tr("Dark", "Koyu") : tr("Light", "Açık")} className="zaf-mobile-header-icon rounded-lg border border-border bg-card p-2 text-xs text-foreground">{theme === "light" ? "☾" : "☀"}</button>
              <button type="button" onClick={() => void load(true)} disabled={refreshing} aria-label={tr("Refresh", "Yenile")} title={tr("Refresh", "Yenile")} className="zaf-mobile-header-icon rounded-lg border border-border bg-card p-2 text-xs text-foreground disabled:opacity-50">{refreshing ? "…" : "↻"}</button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground">{tr("Pi Network", "Pi Network")}</span>
            <span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground">{tr("Mainnet", "Mainnet")}</span>
            <span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground">{tr("Read-only", "Salt-okunur")}</span>
            <span className={`rounded-full border px-2.5 py-1 ${sourceOnline ? "border-ty-active/40 text-foreground" : "border-border text-muted-foreground"}`}>{sourceOnline ? tr("Ecosystem Source Online", "Ekosistem Kaynağı Çevrimiçi") : tr("Source Unavailable", "Kaynak Kullanılamıyor")}</span>
          </div>
          <ZafEcosystemNavigation locale={locale} section={section} subtab={subtab} onSectionChange={(next) => { setSection(next); const first = ZAF_SECTION_TABS[next][0] ?? ""; setSubtab(first); }} onSubtabChange={setSubtab} />
          <div className="mt-2 flex items-center justify-end gap-3 text-[10px] text-muted-foreground">
            <span><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-ty-active" />{tr("Live Observations", "Canlı Gözlemler")}</span>
            <span>{tr("Updated", "Güncellendi")} {age(snapshot?.generatedAt, locale)}</span>
          </div>
        </header>

        {loading ? <div className="py-12 text-center text-sm text-muted-foreground">{tr("Loading Ecosystem Observatory…", "Ekosistem Gözlemleri Yükleniyor…")}</div> : null}
        {!loading && loadError ? (
          <div className="mt-5 rounded-xl border border-border bg-card p-5 text-center sm:mt-7">
            <div className="text-sm font-semibold text-foreground">{tr("Unable To Load Current Data", "Güncel Veriler Yüklenemedi")}</div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{tr("The public data sources did not return a usable response. Retry when the source is available.", "Herkese açık veri kaynakları kullanılabilir bir yanıt döndürmedi. Kaynak kullanılabilir olduğunda tekrar deneyin.")}</p>
            <button type="button" onClick={() => void load(true)} disabled={refreshing} className="mt-3 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground disabled:opacity-50">{refreshing ? tr("Retrying…", "Tekrar Deneniyor…") : tr("Retry", "Tekrar Dene")}</button>
          </div>
        ) : null}

        {!loading && !loadError && section === "overview" && subtab === "Ecosystem" ? (
          <section className="mt-5 sm:mt-7">
            <div className="mb-3"><h2 className="text-sm font-semibold text-foreground">{tr("Pi Ecosystem Observatory", "Pi Ekosistem Gözlem Merkezi")}</h2><p className="text-[11px] text-muted-foreground">{tr("A read-only technology layer for discovering observable Pi ecosystem data, applications and Node infrastructure.", "Gözlemlenebilir Pi ekosistem verilerini, uygulamaları ve Node altyapısını keşfetmek için salt-okunur teknoloji katmanı.")}</p></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Card title={tr("Observed Apps", "Gözlemlenen Uygulamalar")} value={number(ecosystem?.apps.totalCount, 0, locale)} detail={tr("Current Public Source Response", "Mevcut Herkese Açık Kaynak Yanıtı")} />
              <Card title={tr("Recent Ledgers", "Son Ledger'lar")} value={number(snapshot?.metrics.recentLedgerCount, 0, locale)} detail={tr("Pi Mainnet Observation Window", "Pi Mainnet Gözlem Penceresi")} />
              <Card title={tr("Transactions", "İşlemler")} value={number(snapshot?.metrics.recentTransactions, 0, locale)} detail={tr("Current Sample", "Mevcut Örnek")} />
              <Card title={tr("Protocol", "Protokol")} value={snapshot?.metrics.latestProtocolVersion != null ? `v${snapshot.metrics.latestProtocolVersion}` : "—"} detail={tr("Latest Observed Ledger", "Son Gözlemlenen Ledger")} />
            </div>
            <div className="mt-3 rounded-xl border border-border bg-card p-4">
              <div className="text-xs font-semibold text-foreground">{tr("Current Ecosystem Coverage", "Mevcut Ekosistem Kapsamı")}</div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Card title={tr("Available Sources", "Kullanılabilir Kaynaklar")} value={ecosystem ? `${ecosystem.sources.filter(source => source.status === "online" || source.status === "available").length}/${ecosystem.sources.length}` : "—"} detail={tr("Public Sources", "Herkese Açık Kaynaklar")} />
                <Card title={tr("Apps", "Uygulamalar")} value={number(ecosystem?.apps.totalCount, 0, locale)} detail={tr("Currently Observed", "Şu Anda Gözlemlenen")} />
                <Card title={tr("Freshness", "Tazelik")} value={displayStatus(observationMeta.freshness.state, locale)} detail={observationMeta.freshness.ageSeconds + "s"} />
                <Card title={tr("Observation Errors", "Gözlem Hataları")} value={String(observationMeta.errors.length)} detail={observationMeta.errors.length ? tr("Review source status", "Kaynak durumunu inceleyin") : tr("No source errors", "Kaynak hatası yok")} />
              </div>
            </div>
            <ZafEcosystemHealthTimeline locale={locale} snapshot={snapshot} radar={radarData} />

            <div className="mt-3 rounded-xl border border-border bg-card p-4">
              <div className="text-xs font-semibold text-foreground">{tr("What ZAF TECH Does", "ZAF TECH Ne Yapar")}</div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{tr("ZAF TECH is an independent, read-only technology project. It observes public ecosystem sources and local Node diagnostics; it does not represent Pi Core Team and does not assign subjective network health scores.", "ZAF TECH bağımsız, salt-okunur bir teknoloji projesidir. Herkese açık ekosistem kaynaklarını ve yerel Node teşhislerini gözlemler; Pi Core Team'i temsil etmez ve öznel ağ sağlık puanları üretmez.")}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-[11px]"><External href="https://minepi.com/developers/">{tr("Pi Developers", "Pi Geliştiricileri")}</External><External href="https://developers.minepi.com/">{tr("Developer Docs", "Geliştirici Dokümanları")}</External><External href="https://ecosystem.pinet.com/">{tr("Pi Ecosystem", "Pi Ekosistemi")}</External></div>
            </div>
          </section>
        ) : null}

        {!loading && section === "apps" && subtab === "App Health" ? <ZafAppHealth locale={locale} /> : null}
        {!loading && section === "apps" && subtab === "App Activity" ? <ZafEcosystemAppActivity locale={locale} tr={tr} /> : null}
        {!loading && section === "apps" && subtab === "Staking" ? <ZafEcosystemStaking locale={locale} tr={tr} /> : null}
        {!loading && section === "testnet" && subtab === "Assets" ? <ZafTestnetAssets locale={locale} tr={tr} /> : null}
        {!loading && section === "defi" && subtab === "Launchpad" ? <ZafLaunchpadObservatory locale={locale} tr={tr} /> : null}
        {!loading && section === "defi" && subtab !== "Launchpad" ? <ZafDefiObservatory locale={locale} tr={tr} view={subtab as "Overview" | "DEX" | "AMM & Pools" | "Tokens"} /> : null}

        {!loading && section === "apps" && subtab === "App Directory" ? <AppDirectoryView apps={apps} sourceOnline={sourceOnline} generatedAt={ecosystem?.generatedAt} note={ecosystem?.apps.note} locale={locale} tr={tr} /> : null}

        {!loading && section === "intelligence" && subtab === "Radar" ? (
          <section className="mt-5 sm:mt-7">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-foreground">{tr("Ecosystem Radar", "Ekosistem Radarı")}</h2>
              <p className="text-[11px] text-muted-foreground">{tr("A compact daily view of observed Mainnet activity and meaningful ecosystem changes.", "Gözlemlenen Mainnet aktivitesi ve anlamlı ekosistem değişikliklerinin kısa günlük görünümü.")}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Card title={tr("Activity State", "Aktivite Durumu")} value={displayStatus(snapshot?.intelligence.activityState, locale)} detail={tr("Descriptive, Not Predictive", "Tanımlayıcı, Tahmin Edici Değil")} />
              <Card title={tr("Daily Pace", "Günlük Tempo")} value={number(snapshot?.metrics.observedTransactionsPerDay, 0, locale)} detail={tr("Observed Transactions / Day", "Gözlemlenen İşlem / Gün")} />
              <Card title={tr("Daily Operations", "Günlük Operasyonlar")} value={number(snapshot?.metrics.observedOperationsPerDay, 0, locale)} detail={tr("Observed Operations / Day", "Gözlemlenen Operasyon / Gün")} />
              <Card title={tr("Source Coverage", "Kaynak Kapsamı")} value={ecosystem ? `${ecosystem.sources.filter(source => source.status === "online" || source.status === "available").length}/${ecosystem.sources.length}` : "—"} detail={tr("Public Sources", "Herkese Açık Kaynaklar")} />
              <Card title={tr("Sample-Window Transaction Change", "Örneklem Penceresi İşlem Değişimi")} value={snapshot?.intelligence.transactionChangePercent != null ? `${snapshot.intelligence.transactionChangePercent > 0 ? "+" : ""}${snapshot.intelligence.transactionChangePercent.toFixed(1)}%` : "—"} detail={tr("Within current 100-ledger sample", "Mevcut 100-ledger örneği içinde")} />
            </div>

            <div className="mt-3 rounded-xl border border-border bg-card p-4">
              <div className="text-xs font-semibold text-foreground">{tr("Ecosystem Changes", "Ekosistem Değişiklikleri")}</div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {tr("Differences observed between the current ecosystem snapshot and the latest stored snapshot. A new observation does not mean the underlying event happened today.", "Mevcut ekosistem snapshot'ı ile en son kayıtlı snapshot arasındaki farklardır. Yeni gözlemlenmesi, olayın bugün gerçekleştiği anlamına gelmez.")}
              </p>
              {radarChanges?.hasBaseline && radarChanges.comparedAt ? (
                <div className="mt-2 rounded-lg border border-border bg-background px-3 py-2 text-[10px] text-muted-foreground">
                  {tr("Compared with stored snapshot", "Karşılaştırılan kayıtlı snapshot")}: {age(radarChanges.comparedAt, locale)}
                </div>
              ) : null}
              <div className="mt-3 space-y-2">
                {radarChanges?.changes?.length ? radarChanges.changes.slice(0, 6).map(change => (
                  <div key={`${change.type}-${change.title}`} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 break-words text-[11px] font-semibold text-foreground">{change.title}</div>
                      <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[9px] text-muted-foreground">
                        {ecosystemChangeLabel(change.category, locale)}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{locale === "tr" ? change.detailTr : translate(locale, change.detail, change.detailTr)}</div>
                    {(change.previous != null || change.current != null) ? <div className="mt-2 text-[10px] text-muted-foreground">{String(change.previous ?? "—")} → {String(change.current ?? "—")}</div> : null}
                    {change.sourceUrl ? <div className="mt-2"><a href={change.sourceUrl} target="_blank" rel="noreferrer" className="text-[10px] font-medium text-foreground underline underline-offset-2">{tr("Open source", "Kaynağı aç")}</a></div> : null}
                  </div>
                )) : (
                  <div className="rounded-lg border border-border p-3 text-[10px] text-muted-foreground">
                    {radarChanges?.hasBaseline ? tr("No ecosystem differences detected between the two stored snapshots.", "İki kayıtlı snapshot arasında ekosistem farkı tespit edilmedi.") : tr("A historical ecosystem baseline is not available yet.", "Henüz tarihsel ekosistem temel snapshot'ı bulunmuyor.")}
                  </div>
                )}
              </div>
            </div>


            <div className="mt-3 rounded-xl border border-border bg-card p-4">
              <div className="text-xs font-semibold text-foreground">{tr("Real Activity Radar", "Gerçek Aktivite Radarı")}</div>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{tr("These signals are calculated from the current public Mainnet sample and stored observations. No predictive model or invented network-wide score is used.", "Bu sinyaller mevcut herkese açık Mainnet örneği ve kayıtlı gözlemlerden hesaplanır. Tahmin modeli veya uydurma ağ geneli skoru kullanılmaz.")}</p>
              <div className="mt-2 rounded-lg border border-border bg-background px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
                {tr("Important: percentage changes in this panel compare the current observed sample with a 30-minute rolling median built from stored observations that are at least five minutes old. They are not network-wide activity changes and do not mean that total Pi Network usage changed by the displayed percentage.", "Önemli: Bu paneldeki yüzde değişimleri mevcut gözlemlenen örneği, en az beş dakika eski kayıtlı gözlemlerden oluşturulan 30 dakikalık hareketli medyan ile karşılaştırır. Bunlar ağ geneli aktivite değişimi değildir ve Pi Network toplam kullanımının gösterilen yüzde kadar değiştiği anlamına gelmez.")}
              </div>
              {radarData?.baselineSampleCount ? (
                <div className="mt-2 text-[10px] text-muted-foreground">
                  {tr("Rolling baseline", "Hareketli temel")}: {radarData.baselineWindowMinutes} {tr("min", "dk")} · {radarData.baselineSampleCount} {tr("stored points", "kayıtlı nokta")}
                </div>
              ) : null}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(radarData?.signals ?? []).map(signal => (
                  <div key={signal.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 break-words text-[11px] font-semibold text-foreground">{radarSignalTitle(signal.id, locale)}</div>
                      <span className="rounded-full border border-border px-2 py-0.5 text-[9px] text-muted-foreground">{displayStatus(signal.state, locale)}</span>
                    </div>
                    <div className="mt-2 flex items-end justify-between gap-3">
                      <div className="text-lg font-bold ty-nums text-foreground">{radarSignalValue(signal.id, signal.value, locale)}</div>
                      <div className="text-[10px] text-muted-foreground">{tr("Confidence", "Güven")}: {displayStatus(signal.confidence.level, locale)} · {signal.confidence.score}/100</div>
                    </div>
                    {signal.changePercent != null ? <div className="mt-1 text-[10px] text-muted-foreground">{signal.changePercent >= 0 ? "+" : ""}{signal.changePercent.toFixed(1)}% {tr("vs 30-minute rolling median", "30 dakikalık hareketli medyana göre")}</div> : null}
                    <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{locale === "tr" ? signal.detailTr : translate(locale, signal.detail, signal.detailTr)}</p>
                  </div>
                ))}
                {!radarData?.signals?.length ? <div className="rounded-lg border border-border p-3 text-[10px] text-muted-foreground">{tr("Radar signals are currently unavailable.", "Radar sinyalleri şu anda kullanılamıyor.")}</div> : null}
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-border bg-card p-4">
              <div className="text-xs font-semibold text-foreground">{tr("Signal Confidence", "Sinyal Güveni")}</div>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{tr("Confidence reflects data availability, sample size, observation freshness and, where applicable, the presence of a stored historical baseline. It is not probability and not a prediction.", "Güven; veri kullanılabilirliği, örneklem büyüklüğü, gözlem tazeliği ve uygun olduğunda kayıtlı tarihsel temel değerin varlığını yansıtır. Olasılık veya tahmin değildir.")}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Card title={tr("Overall", "Genel")} value={radarData ? radarData.confidence.score + "/100" : "—"} detail={displayStatus(radarData?.confidence.level, locale)} />
                <Card title={tr("Data Health", "Veri Sağlığı")} value={radarData ? radarData.health.score + "/100" : "—"} detail={displayStatus(radarData?.health.status, locale)} />
                <Card title={tr("Public Sources", "Herkese Açık Kaynaklar")} value={radarData ? radarData.sourceCoverage.available + "/" + radarData.sourceCoverage.total : "—"} />
                <Card title={tr("Activity State", "Aktivite Durumu")} value={displayStatus(radarData?.activityState, locale)} detail={tr("Observed, Not Predictive", "Gözlemlenen, Tahmin Edici Değil")} />
              </div>
              {radarData?.confidence.reasons.length ? (
                <div className="mt-3 rounded-lg border border-border p-3">
                  <div className="text-[10px] font-medium text-foreground">{tr("Why The Confidence Is At This Level", "Bu Güven Seviyesinin Nedeni")}</div>
                  <div className="mt-2 space-y-1">
                    {radarData.confidence.reasons.slice(0, 5).map(reason => <div key={reason} className="text-[10px] leading-relaxed text-muted-foreground">• {reason}</div>)}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-3 rounded-xl border border-border bg-card p-4">
              <div className="text-xs font-semibold text-foreground">{tr("Important Ecosystem Signals", "Önemli Ekosistem Sinyalleri")}</div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Card title={tr("Observed Apps", "Gözlemlenen Uygulamalar")} value={number(ecosystem?.apps.totalCount, 0, locale)} detail={tr("Current Observation", "Mevcut Gözlem")} />
                <Card title={tr("Available Sources", "Kullanılabilir Kaynaklar")} value={ecosystem ? `${ecosystem.sources.filter(source => source.status === "online" || source.status === "available").length}/${ecosystem.sources.length}` : "—"} detail={tr("Public Sources", "Herkese Açık Kaynaklar")} />
                <Card title={tr("Latest Ledger", "Son Ledger")} value={snapshot?.latestLedger?.sequence?.toString() ?? "—"} detail={tr("Observed Network Signal", "Gözlemlenen Ağ Sinyali")} />
                <Card title={tr("Protocol", "Protokol")} value={snapshot?.metrics.latestProtocolVersion != null ? `v${snapshot.metrics.latestProtocolVersion}` : "—"} detail={tr("Latest Observed", "Son Gözlemlenen")} />
              </div>
              <div className="mt-3 space-y-2">
                {ecosystem?.sources.filter(source => source.status !== "online" && source.status !== "available").slice(0, 3).map(source => (
                  <div key={source.url} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <span className="min-w-0 flex-1 break-words text-[10px] text-muted-foreground">{source.label}</span>
                    <span className="text-[10px] font-medium text-foreground">{displayStatus(source.status, locale)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-border bg-card p-4">
              <div className="text-xs font-semibold text-foreground">{tr("Measurement Boundary", "Ölçüm Sınırı")}</div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{tr("Daily pace values are derived from the latest observed Mainnet ledger window and normalized to a 24-hour period. Changes and ecosystem signals are limited to public sources and stored observations; they are not forecasts or full-network measurements.", "Günlük tempo değerleri son gözlemlenen Mainnet ledger penceresinden türetilir ve 24 saatlik döneme normalize edilir. Değişiklikler ve ekosistem sinyalleri herkese açık kaynaklar ve kayıtlı gözlemlerle sınırlıdır; bunlar tahmin veya tüm ağ ölçümü değildir.")}</p>
            </div>
          </section>
        ) : null}
        {!loading && section === "node" ? <ZafNodeCompute locale={locale} data={snapshot} subtab={subtab} /> : null}

        {!loading && section === "wallet" ? <ZafWalletIntelligence locale={locale} /> : null}

        {!loading && section === "intelligence" && subtab === "Activity Signals" ? <ObservatoryStatisticsView locale={locale} tr={tr} refreshNonce={refreshNonce} currentProtocol={snapshot?.metrics.latestProtocolVersion ?? null} currentObservedAt={snapshot?.generatedAt ?? null} /> : null}
        {!loading && section === "intelligence" && subtab === "Graph" ? <ZafEcosystemGraph locale={locale} tr={tr} /> : null}

        {!loading && section === "intelligence" && subtab === "Explorer" ? <ObservatoryExplorerView apps={apps} sources={ecosystem?.sources ?? []} snapshot={snapshot} locale={locale} tr={tr} /> : null}

        {!loading && section === "overview" && subtab === "Network" ? (
          <section className="mt-5 sm:mt-7">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-foreground">{tr("Pi Network", "Pi Network")}</h2>
              <p className="text-[11px] text-muted-foreground">{tr("Observable Mainnet data from Pi Mainnet Horizon. This is a read-only view, not a claim of full-network coverage.", "Pi Mainnet Horizon üzerinden gözlemlenen Mainnet verileri. Bu salt-okunur görünüm tüm ağın eksiksiz temsili olduğu iddiasında değildir.")}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Card title={tr("Network", "Ağ")} value={snapshot?.network ?? "—"} detail={tr("Observed Source", "Gözlemlenen Kaynak")} />
              <Card title={tr("Protocol", "Protokol")} value={snapshot?.metrics.latestProtocolVersion != null ? `v${snapshot.metrics.latestProtocolVersion}` : "—"} detail={tr("Latest Observed Ledger", "Son Gözlemlenen Ledger")} />
              <Card title={tr("Latest Ledger", "Son Ledger")} value={snapshot?.latestLedger?.sequence ?? "—"} detail={snapshot?.latestLedger?.closedAt ? age(snapshot.latestLedger.closedAt, locale) : "—"} />
              <Card title={tr("Data Status", "Veri Durumu")} value={displayStatus(snapshot?.error ? "error" : snapshot?.latestLedger ? "available" : "unavailable", locale)} detail={snapshot?.error ?? tr("Pi Mainnet Horizon response observed.", "Pi Mainnet Horizon yanıtı gözlemlendi.")} />
            </div>
            {ledgerObservation ? (
              <div className="mt-3 rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 text-xs font-semibold text-foreground">{tr("Linked Ledger Observation", "Bağlantılı Ledger Gözlemi")}</div>
                  <button type="button" onClick={() => { setLedgerObservation(null); const params = new URLSearchParams(window.location.search); params.delete("ledger"); window.history.replaceState(null, "", "/?" + params.toString()); }} className="text-[10px] text-muted-foreground underline underline-offset-2">{tr("Clear", "Temizle")}</button>
                </div>
                <div className="mt-2 break-all font-mono text-[10px] text-muted-foreground">Ledger {ledgerObservation.sequence} · {ledgerObservation.hash ?? "—"}</div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Card title={tr("Protocol", "Protokol")} value={ledgerObservation.protocolVersion == null ? "—" : "v" + ledgerObservation.protocolVersion} />
                  <Card title={tr("Transactions", "İşlemler")} value={number(ledgerObservation.transactionCount, 0, locale)} />
                  <Card title={tr("Operations", "Operasyonlar")} value={number(ledgerObservation.operationCount, 0, locale)} />
                  <Card title={tr("Successful", "Başarılı")} value={number(ledgerObservation.successfulTransactionCount, 0, locale)} />
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground">{tr("Closed", "Kapanış")}: {ledgerObservation.closedAt ? new Date(ledgerObservation.closedAt).toLocaleString(intlLocale(locale)) : "—"} · {tr("Failed", "Başarısız")}: {number(ledgerObservation.failedTransactionCount, 0, locale)}</div>
              </div>
            ) : null}

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Card title={tr("Transactions", "İşlemler")} value={number(snapshot?.metrics.recentTransactions, 0, locale)} detail={tr("Current Sample", "Mevcut Örnek")} />
              <Card title={tr("Operations", "Operasyonlar")} value={number(snapshot?.metrics.recentOperations, 0, locale)} detail={tr("Current Sample", "Mevcut Örnek")} />
              <Card title={tr("Daily Transactions", "Günlük İşlemler")} value={number(snapshot?.metrics.observedTransactionsPerDay, 0, locale)} detail={tr("Observed Daily Pace", "Gözlemlenen Günlük Tempo")} />
              <Card title={tr("Daily Operations", "Günlük Operasyonlar")} value={number(snapshot?.metrics.observedOperationsPerDay, 0, locale)} detail={tr("Observed Daily Pace", "Gözlemlenen Günlük Tempo")} />
            </div>
            <div className="mt-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground">{tr("Network Activity Detail", "Ağ Aktivite Detayı")}</div>
                  <p className="mt-1 text-[10px] text-muted-foreground">{tr("Observed Mainnet activity metrics from the current ledger sample.", "Mevcut ledger örneğinden gözlemlenen Mainnet aktivite metrikleri.")}</p>
                </div>
                <span className="text-[10px] text-muted-foreground">{displayStatus(snapshot?.intelligence.activityState, locale)}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Card title={tr("Transaction Change", "İşlem Değişimi")} value={snapshot?.intelligence.transactionChangePercent == null ? "—" : (snapshot.intelligence.transactionChangePercent > 0 ? "+" : "") + snapshot.intelligence.transactionChangePercent.toFixed(1) + "%"} detail={tr("Vs Previous Observation", "Önceki Gözleme Göre")} />
                <Card title={tr("Operation Change", "Operasyon Değişimi")} value={snapshot?.intelligence.operationChangePercent == null ? "—" : (snapshot.intelligence.operationChangePercent > 0 ? "+" : "") + snapshot.intelligence.operationChangePercent.toFixed(1) + "%"} detail={tr("Vs Previous Observation", "Önceki Gözleme Göre")} />
                <Card title={tr("Success Rate", "Başarı Oranı")} value={snapshot?.metrics.transactionSuccessRate == null ? "—" : snapshot.metrics.transactionSuccessRate.toFixed(1) + "%"} detail={tr("Observed Transactions", "Gözlemlenen İşlemler")} />
                <Card title={tr("Ops / Transaction", "Operasyon / İşlem")} value={snapshot?.metrics.averageOperationsPerTransaction == null ? "—" : snapshot.metrics.averageOperationsPerTransaction.toFixed(2)} detail={tr("Observed Average", "Gözlemlenen Ortalama")} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Card title={tr("Ledger Close Time", "Ledger Kapanış Süresi")} value={snapshot?.metrics.avgLedgerCloseSeconds == null ? "—" : snapshot.metrics.avgLedgerCloseSeconds.toFixed(2) + "s"} detail={tr("Observed Average", "Gözlemlenen Ortalama")} />
                <Card title={tr("Ledger Interval Variation", "Ledger Aralık Değişimi")} value={snapshot?.metrics.ledgerIntervalCoefficientVariationPercent == null ? "—" : snapshot.metrics.ledgerIntervalCoefficientVariationPercent.toFixed(1) + "%"} detail={tr("Coefficient Of Variation", "Varyasyon Katsayısı")} />
                <Card title={tr("Empty Ledgers", "Boş Ledger'lar")} value={snapshot?.metrics.emptyLedgerRatePercent == null ? "—" : snapshot.metrics.emptyLedgerRatePercent.toFixed(1) + "%"} detail={tr("Observed Sample", "Gözlemlenen Örnek")} />
                <Card title={tr("Ledger Activity", "Ledger Aktivitesi")} value={snapshot?.metrics.ledgerActivityRatePerMinute == null ? "—" : snapshot.metrics.ledgerActivityRatePerMinute.toFixed(2)} detail={tr("Ledgers / Minute", "Ledger / Dakika")} />
              </div>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="text-xs font-semibold text-foreground">{tr("Operation Distribution", "Operasyon Dağılımı")}</div>
                <p className="mt-1 text-[10px] text-muted-foreground">{tr("Observed operation types in the current sample.", "Mevcut örnekte gözlemlenen operasyon türleri.")}</p>
                <div className="mt-3 space-y-2">
                  {(snapshot?.metrics.operationTypeDistribution ?? []).slice(0, 6).map(item => (
                    <div key={item.type} className="flex items-center justify-between gap-3 text-[10px]">
                      <span className="min-w-0 break-words text-muted-foreground">{item.type}</span>
                      <span className="shrink-0 font-medium text-foreground">{number(item.count, 0, locale)} · {item.percentage.toFixed(1)}%</span>
                    </div>
                  ))}
                  {!snapshot?.metrics.operationTypeDistribution?.length ? <div className="text-[10px] text-muted-foreground">{tr("No operation distribution is available.", "Operasyon dağılımı bulunmuyor.")}</div> : null}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="text-xs font-semibold text-foreground">{tr("Protocol Distribution", "Protokol Dağılımı")}</div>
                <p className="mt-1 text-[10px] text-muted-foreground">{tr("Protocol versions observed across the current ledger sample.", "Mevcut ledger örneğinde gözlemlenen protokol sürümleri.")}</p>
                <div className="mt-3 space-y-2">
                  {(snapshot?.metrics.protocolVersionDistribution ?? []).slice(0, 6).map(item => (
                    <div key={item.version} className="flex items-center justify-between gap-3 text-[10px]">
                      <span className="min-w-0 break-words text-muted-foreground">v{item.version}</span>
                      <span className="shrink-0 font-medium text-foreground">{number(item.count, 0, locale)} · {item.percentage.toFixed(1)}%</span>
                    </div>
                  ))}
                  {!snapshot?.metrics.protocolVersionDistribution?.length ? <div className="text-[10px] text-muted-foreground">{tr("No protocol distribution is available.", "Protokol dağılımı bulunmuyor.")}</div> : null}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-border bg-card p-4">
              <div className="text-xs font-semibold text-foreground">{tr("Observation Status", "Gözlem Durumu")}</div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Card title={tr("Freshness", "Tazelik")} value={displayStatus(observationMeta.freshness.state, locale)} detail={observationMeta.freshness.ageSeconds + "s"} />
                <Card title={tr("Confidence", "Güven")} value={String(observationMeta.confidence.score)} detail={observationMeta.confidence.level} />
                <Card title={tr("Latest Ledger Hash", "Son Ledger Hash")} value={snapshot?.latestLedger?.hash ? snapshot.latestLedger.hash.slice(0, 10) + "…" : "—"} detail={tr("Observed Mainnet Record", "Gözlemlenen Mainnet Kaydı")} />
                <Card title={tr("Observation Errors", "Gözlem Hataları")} value={String(observationMeta.errors.length)} detail={observationMeta.errors.length ? tr("Source issues reported", "Kaynak sorunları bildirildi") : tr("No source errors", "Kaynak hatası yok")} />
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-border bg-card p-4">
              <div className="text-xs font-semibold text-foreground">{tr("Network Measurement Boundary", "Ağ Ölçüm Sınırı")}</div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{tr("ZAF TECH reads public Mainnet Horizon data and reports the observed sample. Daily values are normalized from the observed ledger window; they are not a complete calendar-day count.", "ZAF TECH herkese açık Mainnet Horizon verisini okur ve gözlemlenen örneği raporlar. Günlük değerler gözlemlenen ledger penceresinden normalize edilir; tam bir takvim günü toplamı değildir.")}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
                <External href="https://api.mainnet.minepi.com">{tr("Pi Mainnet Horizon", "Pi Mainnet Horizon")}</External>
                <span className="text-muted-foreground">{tr("Updated", "Güncellendi")} {age(snapshot?.generatedAt, locale)}</span>\n                {snapshot?.latestLedger?.sequence ? <a className="underline underline-offset-2" href={"/api/zaf/ledger/" + snapshot.latestLedger.sequence} target="_blank" rel="noreferrer">{tr("Ledger JSON", "Ledger JSON")}</a> : null}
              </div>
            </div>
          </section>
        ) : null}

        {!loading && section === "overview" && subtab === "Tools" ? <ZafDeveloperTools locale={locale} /> : null}

        <footer className="mt-8 border-t border-border pt-4 text-[10px] leading-relaxed text-muted-foreground">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <span>ZAF TECH · Pi Ecosystem Observatory</span>
            <span>{tr("Independent community-developed technology project", "Bağımsız topluluk geliştirimi teknoloji projesi")}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            <a href="/about" className="underline underline-offset-2">{tr("About", "Hakkında")}</a>
            <a href="/privacy" className="underline underline-offset-2">{tr("Privacy", "Gizlilik")}</a>
          </div>
        </footer>
      </main>
    </div>
  );
}


type EcosystemTrendPayload = {
  configured: boolean;
  points: Array<{
    day: string;
    generatedAt: string;
    observedAppCount: number | null;
    sourceAvailable: boolean;
    availableSources: number;
    totalSources: number;
    signalCount: number;
  }>;
};

function TrendView({ points, locale, tr }: { points: EcosystemTrendPayload["points"]; locale: Locale; tr: (en: string, trText: string) => string }) {
  const recent = points.slice(-14);
  const latest = recent.at(-1) ?? null;
  const previous = recent.at(-2) ?? null;
  const week = recent.slice(-7);
  const delta = (current: number | null | undefined, prior: number | null | undefined) => current != null && prior != null ? current - prior : null;
  const deltaLabel = (value: number | null) => value == null ? "—" : `${value > 0 ? "+" : ""}${number(value, 0, locale)}`;

  return (
    <div className="mt-3 rounded-xl border border-border bg-card p-4">
      <div className="text-xs font-semibold text-foreground">{tr("Daily Trend", "Günlük Trend")}</div>
      <p className="mt-1 text-[10px] text-muted-foreground">{tr("Latest stored observation for each UTC day.", "Her UTC günü için en son kayıtlı gözlem.")}</p>
      {latest ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Card title={tr("Current Day", "Mevcut Gün")} value={latest.observedAppCount == null ? "—" : number(latest.observedAppCount, 0, locale)} detail={tr("Observed Apps", "Gözlemlenen Uygulamalar")} />
          <Card title={tr("Previous Day", "Önceki Gün")} value={previous?.observedAppCount == null ? "—" : number(previous.observedAppCount, 0, locale)} detail={tr("Observed Apps", "Gözlemlenen Uygulamalar")} />
          <Card title={tr("App Change", "Uygulama Değişimi")} value={deltaLabel(delta(latest.observedAppCount, previous?.observedAppCount))} detail={tr("Compared With Previous Day", "Önceki Günle Karşılaştırma")} />
          <Card title={tr("7-Day Trend", "7 Günlük Trend")} value={week.length.toLocaleString(intlLocale(locale))} detail={tr("Stored Daily Points", "Kayıtlı Günlük Nokta")} />
        </div>
      ) : null}
      <div className="mt-3 space-y-1.5">
        {recent.length ? recent.map((point) => (
          <div key={point.day} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-[10px]">
            <span className="text-muted-foreground">{new Date(point.day + "T00:00:00Z").toLocaleDateString(intlLocale(locale), { year: "numeric", month: "short", day: "2-digit" })}</span>
            <span className="text-foreground">{point.observedAppCount ?? "—"} {tr("apps", "uygulama")}</span>
            <span className="text-muted-foreground">{point.signalCount} {tr("signals", "sinyal")}</span>
          </div>
        )) : (
          <div className="text-[10px] text-muted-foreground">{tr("No stored daily trend points yet.", "Henüz kayıtlı günlük trend noktası yok.")}</div>
        )}
      </div>
      {latest && new Date(latest.day + "T00:00:00Z").toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10) ? (
        <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">{tr("The current-day point may be partial because it represents the latest stored observation, not a completed UTC day.", "Mevcut gün noktası, tamamlanmış bir UTC günü değil en son kayıtlı gözlemi temsil ettiği için kısmi olabilir.")}</p>
      ) : null}
    </div>
  );
}

type EcosystemStatisticsPayload = {
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

type EcosystemChangePayload = {
  configured: boolean;
  comparedAt: string | null;
  hasBaseline: boolean;
  changes: Array<{
    type: string;
    title: string;
    detail: string;
    detailTr: string;
    previous: string | number | null;
    current: string | number | null;
    category?: "app_count" | "source_status" | "signal_added" | "signal_removed" | "defi_status";
    sourceUrl?: string | null;
    observedAt?: string | null;
  }>;
};

type ObservationHistoryPayload = {
  configured: boolean;
  count: number;
  points: Array<{
    generatedAt: string;
    freshnessState: string;
    confidenceScore: number | null;
    networkLedger: string | null;
    protocolVersion: number | null;
    observedTransactions: number | null;
    observedOperations: number | null;
    dailyTransactions: number | null;
    dailyOperations: number | null;
    observedApps: number | null;
    availableSources: number;
    totalSources: number;
  }>;
};

type ObservationChangePayload = {
  generatedAt: string;
  baselineAt: string | null;
  hasBaseline: boolean;
  changes: Array<{
    type: string;
    direction: "up" | "down" | "changed" | "stable";
    title: string;
    detail: string;
    detailTr: string;
    previous: string | number | null;
    current: string | number | null;
    percent: number | null;
  }>;
};

type ObservationTimelinePayload = {
  configured: boolean;
  points: Array<{
    generatedAt: string;
    baselineAt: string | null;
    activity: "rising" | "falling" | "stable" | "insufficient-data";
    transactionChangePercent: number | null;
    operationChangePercent: number | null;
    observedTransactions: number | null;
    observedOperations: number | null;
    dailyTransactions: number | null;
    dailyOperations: number | null;
    observedApps: number | null;
    availableSources: number;
    totalSources: number;
    confidenceScore: number | null;
    freshnessState: string;
    ledger: string | null;
    protocolVersion: number | null;
  }>;
};

type HistoryRange = "24h" | "7d" | "30d";

function historyLimit(range: HistoryRange) {
  return range === "24h" ? 288 : range === "7d" ? 2016 : 8640;
}

function sampleHistoryPoints(points: ObservationHistoryPayload["points"], maxPoints = 48) {
  if (points.length <= maxPoints) return points;
  return Array.from({ length: maxPoints }, (_, index) => {
    const position = Math.round((index * (points.length - 1)) / (maxPoints - 1));
    return points[position];
  });
}

function periodPercentChange(current: number | null | undefined, start: number | null | undefined) {
  if (current == null || start == null || start === 0) return null;
  return ((current - start) / Math.abs(start)) * 100;
}

function averageHistoryValue(points: ObservationHistoryPayload["points"], key: "dailyTransactions" | "dailyOperations") {
  const values = points.map(point => point[key]).filter((value): value is number => value != null && Number.isFinite(value));
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function ObservatoryStatisticsView({ locale, tr, refreshNonce, currentProtocol, currentObservedAt }: { locale: Locale; tr: (en: string, trText: string) => string; refreshNonce: number; currentProtocol: number | null; currentObservedAt: string | null }) {
  const [data, setData] = useState<EcosystemStatisticsPayload | null>(null);
  const [changes, setChanges] = useState<EcosystemChangePayload | null>(null);
  const [trends, setTrends] = useState<EcosystemTrendPayload | null>(null);
  const [history, setHistory] = useState<ObservationHistoryPayload | null>(null);
  const [observationChanges, setObservationChanges] = useState<ObservationChangePayload | null>(null);
  const [timeline, setTimeline] = useState<ObservationTimelinePayload | null>(null);
  const [historyRange, setHistoryRange] = useState<HistoryRange>("24h");
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/zaf/ecosystem/statistics", { cache: "no-store" }).then(response => response.ok ? response.json() : null),
      fetch("/api/zaf/ecosystem/changes", { cache: "no-store" }).then(response => response.ok ? response.json() : null),
      fetch("/api/zaf/ecosystem/trends", { cache: "no-store" }).then(response => response.ok ? response.json() : null),
      fetch("/api/zaf/observations/history?limit=" + historyLimit(historyRange), { cache: "no-store" }).then(response => response.ok ? response.json() : null),
      fetch("/api/zaf/observations/changes", { cache: "no-store" }).then(response => response.ok ? response.json() : null),
      fetch("/api/zaf/observations/timeline", { cache: "no-store" }).then(response => response.ok ? response.json() : null),
    ])
      .then(([statistics, changeData, trendData, historyData, observationChangeData, timelineData]) => {
        if (!active) return;
        setData(statistics);
        setChanges(changeData);
        setTrends(trendData);
        setHistory(historyData);
        setObservationChanges(observationChangeData);
        setTimeline(timelineData);
      })
      .catch(() => {
        if (!active) return;
        setData(null);
        setChanges(null);
      })
      .finally(() => { if (active) setLoadingStats(false); });
    return () => { active = false; };
  }, [refreshNonce, historyRange]);

  if (loadingStats) return <div className="py-10 text-center text-xs text-muted-foreground">{tr("Loading Statistics…", "İstatistikler Yükleniyor…")}</div>;

  return (
    <section className="mt-5 sm:mt-7">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">{tr("Activity Signals", "Aktivite Sinyalleri")}</h2>
        <p className="text-[11px] text-muted-foreground">{tr("Current observations, stored snapshots and detected changes from public ecosystem sources.", "Herkese açık ekosistem kaynaklarından mevcut gözlemler, kayıtlı snapshot'lar ve tespit edilen değişiklikler.")}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card title={tr("Observed Apps", "Gözlemlenen Uygulamalar")} value={number(data?.current.observedApps, 0, locale)} />
        <Card title={tr("Available Sources", "Kullanılabilir Kaynaklar")} value={data ? `${data.current.availableSources}/${data.current.totalSources}` : "—"} />
        <Card title={tr("Observed Signals", "Gözlemlenen Sinyaller")} value={number(data?.current.observedSignals, 0, locale)} />
        <Card title={tr("Official Signals", "Resmi Sinyaller")} value={number(data?.current.officialSignals, 0, locale)} />
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card p-4">
        <div className="text-xs font-semibold text-foreground">{tr("Observation Metadata", "Gözlem Metaverisi")}</div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Card title={tr("Generated", "Üretildi")} value={age(data?.generatedAt, locale)} />
          <Card title={tr("Snapshots", "Snapshot'lar")} value={number(data?.history.snapshots, 0, locale)} />
          <Card title={tr("First Stored", "İlk Kayıt")} value={age(data?.history.firstObservedAt, locale)} />
          <Card title={tr("Latest Stored", "Son Kayıt")} value={age(data?.history.latestObservedAt, locale)} />
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-semibold text-foreground">{tr("Historical Data", "Tarihsel Veri")}</div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {history?.configured
                ? tr("Real observations stored in five-minute buckets. No synthetic history is generated.", "Beş dakikalık aralıklarda kaydedilen gerçek gözlemler. Yapay tarihsel veri üretilmez.")
                : tr("Historical storage is not configured. Live observations remain available.", "Tarihsel depolama yapılandırılmamış. Canlı gözlemler kullanılmaya devam eder.")}
            </p>
          </div>
          <div className="flex shrink-0 gap-1 rounded-lg border border-border p-1">
            {(["24h", "7d", "30d"] as HistoryRange[]).map(range => (
              <button
                key={range}
                type="button"
                onClick={() => setHistoryRange(range)}
                className={`rounded-md px-2.5 py-1 text-[10px] font-medium ${historyRange === range ? "bg-foreground text-background" : "text-muted-foreground"}`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Card title={tr("Current Transactions", "Mevcut İşlemler")} value={number(history?.points[0]?.dailyTransactions, 0, locale)} detail={tr("Observed / Day", "Gözlemlenen / Gün")} />
          <Card title={tr("Peak Transactions", "Zirve İşlemler")} value={number(history?.points.reduce((max, point) => point.dailyTransactions != null ? Math.max(max, point.dailyTransactions) : max, 0) || null, 0, locale)} detail={tr("Selected Range", "Seçilen Aralık")} />
          <Card title={tr("Current Operations", "Mevcut Operasyonlar")} value={number(history?.points[0]?.dailyOperations, 0, locale)} detail={tr("Observed / Day", "Gözlemlenen / Gün")} />
          <Card title={tr("Stored Points", "Kayıtlı Noktalar")} value={number(history?.count, 0, locale)} detail={historyRange} />
        </div>
        {history?.points.length ? (
          <div className="mt-3 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
              <span>{tr("Observed Transaction Pace", "Gözlemlenen İşlem Temposu")}</span>
              <span>{tr("Representative stored points", "Temsilci kayıtlı noktalar")}: {sampleHistoryPoints(history.points).length}</span>
            </div>
            <div className="mt-3 flex h-24 items-end gap-1 overflow-x-auto">
              {sampleHistoryPoints([...history.points].reverse()).map((point, index, points) => {
                const maxTx = Math.max(...points.map(item => item.dailyTransactions ?? 0), 1);
                const height = point.dailyTransactions == null ? 8 : Math.max(8, (point.dailyTransactions / maxTx) * 100);
                return (
                  <div
                    key={point.generatedAt + index}
                    title={`${number(point.dailyTransactions, 0, locale)} tx/day · ${new Date(point.generatedAt).toLocaleString(intlLocale(locale))}`}
                    className="min-w-[7px] flex-1 rounded-t-sm bg-foreground/70"
                    style={{ height: height + "%" }}
                  />
                );
              })}
            </div>
            <div className="mt-2 flex justify-between gap-2 text-[9px] text-muted-foreground">
              <span>{age(history.points.at(-1)?.generatedAt, locale)}</span>
              <span>{age(history.points[0]?.generatedAt, locale)}</span>
            </div>
            <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">
              {tr("The chart uses sampled persisted observations from the selected range. It does not fill gaps or estimate missing points.", "Grafik, seçilen aralıktaki örneklenmiş kayıtlı gözlemleri kullanır. Eksik noktaları doldurmaz veya tahmin etmez.")}
            </p>
          </div>
        ) : null}
        <div className="mt-3 space-y-1.5">
          {(history?.points ?? []).slice(0, 12).map((point) => (
            <div key={point.generatedAt} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-[10px]">
              <span className="text-muted-foreground">{age(point.generatedAt, locale)}</span>
              <span className="text-foreground">{number(point.dailyTransactions, 0, locale)} {tr("tx/day", "işlem/gün")}</span>
              <span className="text-muted-foreground">{number(point.observedApps, 0, locale)} {tr("apps", "uygulama")}</span>
            </div>
          ))}
          {!history?.points.length ? <div className="text-[10px] text-muted-foreground">{tr("No persisted observation points are available yet.", "Henüz kayıtlı gözlem noktası bulunmuyor.")}</div> : null}
        </div>
      </div>

      {history?.points.length ? (() => {
        const latest = history.points[0];
        const start = history.points[history.points.length - 1];
        const txChange = periodPercentChange(latest.dailyTransactions, start.dailyTransactions);
        const opChange = periodPercentChange(latest.dailyOperations, start.dailyOperations);
        const avgTx = averageHistoryValue(history.points, "dailyTransactions");
        const avgOp = averageHistoryValue(history.points, "dailyOperations");
        const startCoverage = start.totalSources > 0 ? start.availableSources / start.totalSources : null;
        const latestCoverage = latest.totalSources > 0 ? latest.availableSources / latest.totalSources : null;
        const coverageDelta = startCoverage != null && latestCoverage != null ? (latestCoverage - startCoverage) * 100 : null;
        const trendLabel = txChange == null && opChange == null
          ? tr("Insufficient data for a period direction.", "Dönem yönü için yeterli veri yok.")
          : txChange != null && opChange != null
            ? txChange > 3 && opChange > 3
              ? tr("Both observed activity rates increased across the selected range.", "Seçilen aralıkta her iki gözlemlenen aktivite temposu da arttı.")
              : txChange < -3 && opChange < -3
                ? tr("Both observed activity rates decreased across the selected range.", "Seçilen aralıkta her iki gözlemlenen aktivite temposu da azaldı.")
                : tr("Observed activity rates moved in different or smaller directions across the selected range.", "Seçilen aralıkta gözlemlenen aktivite tempoları farklı veya daha sınırlı yönlerde hareket etti.")
            : tr("Only one activity rate is available for period comparison.", "Dönem karşılaştırması için yalnızca bir aktivite temposu kullanılabilir.");
        return (
          <div className="mt-3 rounded-xl border border-border bg-card p-4">
            <div className="text-xs font-semibold text-foreground">{tr("Period Trend Analysis", "Dönem Trend Analizi")}</div>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{tr("Compares the earliest and latest persisted observations in the selected range. This is a measured period comparison, not a forecast.", "Seçilen aralıktaki en eski ve en yeni kayıtlı gözlemleri karşılaştırır. Bu ölçülmüş bir dönem karşılaştırmasıdır; tahmin değildir.")}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Card title={tr("Transactions Change", "İşlem Değişimi")} value={txChange == null ? "—" : (txChange >= 0 ? "+" : "") + txChange.toFixed(1) + "%"} detail={tr("Start → Latest", "Başlangıç → Son")} />
              <Card title={tr("Operations Change", "Operasyon Değişimi")} value={opChange == null ? "—" : (opChange >= 0 ? "+" : "") + opChange.toFixed(1) + "%"} detail={tr("Start → Latest", "Başlangıç → Son")} />
              <Card title={tr("Source Coverage", "Kaynak Kapsamı")} value={coverageDelta == null ? "—" : (coverageDelta >= 0 ? "+" : "") + coverageDelta.toFixed(0) + " pp"} detail={(start.availableSources + "/" + start.totalSources) + " → " + (latest.availableSources + "/" + latest.totalSources)} />
              <Card title={tr("Average Pace", "Ortalama Tempo")} value={avgTx == null ? "—" : number(avgTx, 0, locale)} detail={avgOp == null ? tr("Transactions / day", "İşlem / gün") : number(avgOp, 0, locale) + " " + tr("ops/day", "op/gün")} />
            </div>
            <div className="mt-3 rounded-lg border border-border bg-background p-3">
              <div className="text-[10px] font-medium text-foreground">{tr("Measured Direction", "Ölçülen Yön")}</div>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{trendLabel}</p>
              <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">{tr("The displayed changes compare persisted observations only. They do not represent total network usage or a completed calendar-day count.", "Gösterilen değişimler yalnızca kayıtlı gözlemleri karşılaştırır. Toplam ağ kullanımını veya tamamlanmış bir takvim günü toplamını temsil etmez.")}</p>
            </div>
          </div>
        );
      })() : null}

      {history?.points.length ? (
        <div className="mt-3 rounded-xl border border-border bg-card p-4">
          <div className="text-xs font-semibold text-foreground">{tr("Measurement Evidence", "Ölçüm Kanıtı")}</div>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            {tr("This panel records what ZAF TECH actually stored for the selected period. It does not invent missing observations or infer unseen network activity.", "Bu panel, ZAF TECH'in seçilen dönem için gerçekten kaydettiği verileri gösterir. Eksik gözlemler uydurulmaz ve görülmeyen ağ aktivitesi çıkarımla tamamlanmaz.")}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Card title={tr("Stored Points", "Kayıtlı Noktalar")} value={number(history.count, 0, locale)} detail={tr("Five-minute buckets", "Beş dakikalık aralıklar")} />
            <Card title={tr("Observed Window", "Gözlem Penceresi")} value={history.points.length > 1 ? age(history.points.at(-1)?.generatedAt, locale) : "—"} detail={history.points.length > 1 ? tr("Oldest stored point", "En eski kayıtlı nokta") : tr("Single point", "Tek nokta")} />
            <Card title={tr("Latest Stored", "Son Kayıt")} value={age(history.points[0]?.generatedAt, locale)} detail={history.points[0]?.freshnessState ?? "—"} />
            <Card title={tr("Source Coverage", "Kaynak Kapsamı")} value={history.points[0] ? history.points[0].availableSources + "/" + history.points[0].totalSources : "—"} detail={tr("Latest stored point", "Son kayıtlı nokta")} />
          </div>
          <div className="mt-3 rounded-lg border border-border bg-background p-3">
            <div className="grid gap-2 text-[10px] text-muted-foreground sm:grid-cols-2">
              <div><span className="font-medium text-foreground">{tr("Range start", "Aralık başlangıcı")}:</span> {history.points.at(-1) ? new Date(history.points.at(-1)!.generatedAt).toLocaleString(intlLocale(locale)) : "—"}</div>
              <div><span className="font-medium text-foreground">{tr("Range end", "Aralık sonu")}:</span> {history.points[0] ? new Date(history.points[0].generatedAt).toLocaleString(intlLocale(locale)) : "—"}</div>
              <div><span className="font-medium text-foreground">{tr("Historical storage", "Tarihsel depolama")}:</span> {history.configured ? tr("Configured", "Yapılandırılmış") : tr("Not configured", "Yapılandırılmadı")}</div>
              <div><span className="font-medium text-foreground">{tr("Synthetic data", "Yapay veri")}:</span> {tr("None", "Yok")}</div>
            </div>
          </div>
        </div>
      ) : null}

      {history?.points.length ? (() => {
        const protocolPoints = history.points.filter(point => point.protocolVersion != null);
        const latestStoredProtocol = protocolPoints[0]?.protocolVersion ?? null;
        const previousStoredPoint = latestStoredProtocol == null ? null : protocolPoints.slice(1).find(point => point.protocolVersion !== latestStoredProtocol) ?? null;
        let latestProtocolTransition: { from: number; to: number; observedAt: string; previousObservedAt: string | null } | null = null;
        for (let index = protocolPoints.length - 2; index >= 0; index -= 1) {
          const older = protocolPoints[index + 1];
          const newer = protocolPoints[index];
          if (older.protocolVersion !== newer.protocolVersion) {
            latestProtocolTransition = {
              from: older.protocolVersion as number,
              to: newer.protocolVersion as number,
              observedAt: newer.generatedAt,
              previousObservedAt: older.generatedAt,
            };
            break;
          }
        }
        const liveStoredGap = currentProtocol != null && latestStoredProtocol != null && currentProtocol !== latestStoredProtocol;
        return (
          <div className="mt-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-foreground">{tr("Protocol Observation", "Protokol Gözlemi")}</div>
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{tr("Protocol versions actually observed in persisted Mainnet snapshots. A transition is shown only when the stored protocol value changed between observations.", "Kayıtlı Mainnet snapshot'larında gerçekten gözlemlenen protokol sürümleri. Geçiş yalnızca kayıtlı gözlemler arasındaki protokol değeri değiştiğinde gösterilir.")}</p>
              </div>
              <span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground">{currentProtocol == null ? (latestStoredProtocol == null ? "—" : `v${latestStoredProtocol}`) : `v${currentProtocol}`}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Card title={tr("Current Observed", "Mevcut Gözlenen")} value={currentProtocol == null ? (latestStoredProtocol == null ? "—" : `v${latestStoredProtocol}`) : `v${currentProtocol}`} detail={currentObservedAt ? age(currentObservedAt, locale) : "—"} />
              <Card title={tr("Previous Stored", "Önceki Kayıtlı")} value={previousStoredPoint?.protocolVersion == null ? "—" : `v${previousStoredPoint.protocolVersion}`} detail={tr("Latest distinct prior value", "Son farklı önceki değer")} />
              <Card title={tr("Recorded Transitions", "Kayıtlı Geçişler")} value={protocolPoints.reduce((count, point, index) => count + (index > 0 && point.protocolVersion !== protocolPoints[index - 1].protocolVersion ? 1 : 0), 0).toLocaleString(intlLocale(locale))} detail={tr("Within selected history range", "Seçilen tarih aralığında")} />
              <Card title={tr("Protocol Points", "Protokol Noktaları")} value={protocolPoints.length.toLocaleString(intlLocale(locale))} detail={tr("Persisted observations", "Kayıtlı gözlemler")} />
            </div>
            {liveStoredGap ? (
              <div className="mt-3 rounded-lg border border-border bg-background p-3 text-[10px] leading-relaxed text-muted-foreground">
                {tr(
                  `The live observation is v${currentProtocol}, while the newest persisted protocol point is v${latestStoredProtocol}. The history will reflect the newer value after the next persisted snapshot.`,
                  `Canlı gözlem v${currentProtocol}, en yeni kayıtlı protokol noktası ise v${latestStoredProtocol}. Yeni değer bir sonraki kayıtlı snapshot sonrasında tarihçeye yansır.`
                )}
              </div>
            ) : null}
            {latestProtocolTransition ? (
              <div className="mt-3 rounded-lg border border-border bg-background p-3">
                <div className="text-[10px] font-medium text-foreground">{tr("Latest Recorded Change", "Son Kayıtlı Değişim")}</div>
                <div className="mt-1 text-base font-bold ty-nums text-foreground">v{latestProtocolTransition.from} → v{latestProtocolTransition.to}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {tr("Observed", "Gözlemlendi")}: {new Date(latestProtocolTransition.observedAt).toLocaleString(intlLocale(locale))}
                  {latestProtocolTransition.previousObservedAt ? ` · ${tr("Previous point", "Önceki nokta")}: ${age(latestProtocolTransition.previousObservedAt, locale)}` : ""}
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-lg border border-border bg-background p-3 text-[10px] leading-relaxed text-muted-foreground">
                {tr("No protocol transition has been recorded in the selected history range yet. ZAF TECH does not infer a change from a single current sample.", "Seçilen tarih aralığında henüz protokol geçişi kaydedilmedi. ZAF TECH tek bir güncel örnekten değişim çıkarmaz.")}
              </div>
            )}
            <div className="mt-3 space-y-1.5">
              {protocolPoints.slice(0, 8).map(point => (
                <div key={point.generatedAt + "-" + point.protocolVersion} className="grid grid-cols-[1fr_auto_auto] gap-2 text-[10px]">
                  <span className="text-muted-foreground">{age(point.generatedAt, locale)}</span>
                  <span className="font-medium text-foreground">v{point.protocolVersion}</span>
                  <span className="text-muted-foreground">{point.networkLedger ? `#${point.networkLedger}` : "—"}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[9px] leading-relaxed text-muted-foreground">{tr("Boundary: this is the protocol version observed in public Mainnet data. It does not mean every Pi Node has upgraded and it does not inspect your local Docker node.", "Sınır: bu, herkese açık Mainnet verisinde gözlemlenen protokol sürümüdür. Her Pi Node'un yükseltildiği anlamına gelmez ve yerel Docker Node'unuzu incelemez.")}</p>
          </div>
        );
      })() : null}

      <div className="mt-3 rounded-xl border border-border bg-card p-4">
        <div className="text-xs font-semibold text-foreground">{tr("Observation Timeline", "Gözlem Zaman Çizelgesi")}</div>
        <p className="mt-1 text-[10px] text-muted-foreground">{tr("Historical observation points and measured activity direction. Only persisted observations are shown.", "Tarihsel gözlem noktaları ve ölçülen aktivite yönü. Yalnızca kayıtlı gözlemler gösterilir.")}</p>
        <div className="mt-3 space-y-2">
          {(timeline?.points ?? []).slice(0, 12).map((point) => (
            <div key={point.generatedAt} className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-border p-3">
              <div>
                <div className="text-[11px] font-semibold text-foreground">
                  {age(point.generatedAt, locale)}
                  <span className="ml-2 font-normal text-muted-foreground">
                    {displayStatus(point.activity, locale)}
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {tr("Transactions", "İşlemler")}: {number(point.dailyTransactions, 0, locale)}
                  {" · "}
                  {tr("Operations", "Operasyonlar")}: {number(point.dailyOperations, 0, locale)}
                  {" · "}
                  {tr("Apps", "Uygulamalar")}: {number(point.observedApps, 0, locale)}
                </div>
              </div>
              <div className="text-right text-[10px] text-muted-foreground">
                {point.confidenceScore == null ? "—" : number(point.confidenceScore, 0, locale) + "%"}
                <div className="mt-1">{point.ledger ?? "—"}</div>
              </div>
            </div>
          ))}
          {!timeline?.points.length ? <div className="text-[10px] text-muted-foreground">{tr("No historical timeline points are available yet.", "Henüz tarihsel zaman çizelgesi noktası bulunmuyor.")}</div> : null}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-foreground">{tr("Real Change Detection", "Gerçek Değişim Tespiti")}</div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {observationChanges?.hasBaseline
                ? tr("Compared with a five-minute historical baseline.", "Beş dakikalık tarihsel temel ile karşılaştırılıyor.")
                : tr("A five-minute historical baseline is not available yet.", "Henüz beş dakikalık tarihsel karşılaştırma temeli bulunmuyor.")}
            </p>
          </div>
          <span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground">
            {number(observationChanges?.changes.length, 0, locale)} {tr("changes", "değişiklik")}
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {observationChanges?.changes.slice(0, 8).map((change) => (
            <div key={change.type + "-" + change.title} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 break-words text-[11px] font-semibold text-foreground">{change.title}</div>
                {change.percent != null ? <span className="text-[10px] font-medium text-foreground">{change.percent > 0 ? "+" : ""}{change.percent.toFixed(1)}%</span> : null}
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{locale === "tr" ? change.detailTr : translate(locale, change.detail, change.detailTr)}</p>
            </div>
          ))}
          {observationChanges?.hasBaseline && !observationChanges.changes.length ? (
            <div className="rounded-lg border border-border p-3 text-[10px] text-muted-foreground">{tr("No measurable changes were detected between the current observation and the historical baseline.", "Mevcut gözlem ile tarihsel temel arasında ölçülebilir değişiklik tespit edilmedi.")}</div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-foreground">{tr("Detected Changes", "Tespit Edilen Değişiklikler")}</div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {changes?.hasBaseline
                ? `${tr("Compared with", "Karşılaştırma")}: ${age(changes.comparedAt, locale)}`
                : tr("A baseline is not available yet.", "Henüz karşılaştırılacak bir temel snapshot yok.")}
            </p>
          </div>
          <span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground">{number(changes?.changes.length, 0, locale)} {tr("changes", "değişiklik")}</span>
        </div>
        <div className="mt-3 space-y-2">
          {changes?.changes.slice(0, 8).map(change => (
            <div key={`${change.type}-${change.title}`} className="rounded-lg border border-border p-3">
              <div className="min-w-0 break-words text-[11px] font-semibold text-foreground">{change.title}</div>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{locale === "tr" ? change.detailTr : translate(locale, change.detail, change.detailTr)}</p>
              {(change.previous != null || change.current != null) ? (
                <div className="mt-2 text-[10px] text-muted-foreground">
                  {String(change.previous ?? "—")} → {String(change.current ?? "—")}
                </div>
              ) : null}
            </div>
          ))}
          {changes?.hasBaseline && !changes.changes.length ? (
            <div className="rounded-lg border border-border p-3 text-[10px] text-muted-foreground">{tr("No changes detected between the current observation and the latest stored snapshot.", "Mevcut gözlem ile son kayıtlı snapshot arasında değişiklik tespit edilmedi.")}</div>
          ) : null}
          {!changes?.hasBaseline ? (
            <div className="rounded-lg border border-border p-3 text-[10px] leading-relaxed text-muted-foreground">{tr("Changes will appear after at least one scheduled or persisted snapshot is available.", "En az bir zamanlanmış veya kaydedilmiş snapshot oluştuğunda değişiklikler burada görünecek.")}</div>
          ) : null}
        </div>
      </div>

      <TrendView points={trends?.points ?? []} locale={locale} tr={tr} />

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card title="Launchpad" value={displayStatus(data?.current.defi.launchpad, locale)} />
        <Card title="DEX" value={displayStatus(data?.current.defi.dex, locale)} />
        <Card title="AMM" value={displayStatus(data?.current.defi.amm, locale)} />
        <Card title={tr("Mainnet Trading", "Mainnet İşlemleri")} value={displayStatus(data?.current.defi.mainnetTrading, locale)} />
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card p-4">
        <div className="text-xs font-semibold text-foreground">{tr("Data Boundary", "Veri Sınırı")}</div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{tr("Observatory metrics are derived from public ecosystem responses and stored snapshots. They describe what ZAF TECH could observe at collection time; missing, unavailable or unverified signals are not inferred.", "Gözlem Merkezi metrikleri herkese açık ekosistem yanıtlarından ve kayıtlı snapshotlardan üretilir. Veriler, ZAF TECH'in toplama anında gözlemleyebildiği durumu tanımlar; eksik, kullanılamayan veya doğrulanmamış sinyaller çıkarımla tamamlanmaz.")}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground"><span>{tr("Read-only", "Salt-okunur")}</span><span>•</span><span>{tr("Public Sources", "Herkese Açık Kaynaklar")}</span><span>•</span><span>{tr("Historical Data", "Tarihsel Veri")}</span></div>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card p-4">
        <div className="text-xs font-semibold text-foreground">{tr("Historical Snapshots", "Tarihsel Snapshot'lar")}</div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Card title={tr("Stored Snapshots", "Kayıtlı Snapshot'lar")} value={number(data?.history.snapshots, 0, locale)} />
          <Card title={tr("Storage", "Depolama")} value={displayStatus(data?.history.configured ? "active" : "not configured", locale)} detail={tr("DATABASE_URL", "DATABASE_URL")} />
          <Card title={tr("First Snapshot", "İlk Snapshot")} value={age(data?.history.firstObservedAt, locale)} />
          <Card title={tr("Latest Snapshot", "Son Snapshot")} value={age(data?.history.latestObservedAt, locale)} />
        </div>
        {!data?.history.configured ? <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">{tr("Historical storage is optional. Live observations remain available while DATABASE_URL is not configured.", "Tarihsel depolama isteğe bağlıdır. DATABASE_URL yapılandırılmamış olsa da canlı gözlemler kullanılabilir.")}</p> : null}
      </div>
    </section>
  );
}
