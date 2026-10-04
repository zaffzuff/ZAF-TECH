"use client";

import Image from "next/image";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import type { ZafSnapshot } from "@/lib/zaf/types";
import type { Locale } from "@/lib/zaf/i18n";
import { intlLocale, translate } from "@/lib/zaf/i18n";
import { LanguageSelector } from "@/components/zaf-language-selector";
import { ZafEcosystemNavigation, ZAF_SECTION_TABS, type ZafSection } from "@/components/zaf-ecosystem-navigation";
import { ZafNodeCompute } from "@/components/zaf-node-compute";
import { ZafAppHealth } from "@/components/zaf-app-health";
import { ZafDeveloperTools } from "@/components/zaf-developer-tools";
import { ZafWalletIntelligence } from "@/components/zaf-wallet-intelligence";
import { APP_CATEGORIES, toDirectoryApp, type AppCategory } from "@/lib/zaf/app-directory";
import { useMemo } from "react";

type AppItem = { name: string; url: string };
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
  const [observationMeta, setObservationMeta] = useState<{ generatedAt: string; freshness: { state: string; ageSeconds: number }; confidence: { score: number; level: string }; errors: string[] }>({ generatedAt: "", freshness: { state: "unknown", ageSeconds: 0 }, confidence: { score: 0, level: "low" }, errors: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const tr = (en: string, trText: string) => translate(locale, en, trText);

  useEffect(() => {
    let active = true;
    fetch("/api/zaf/ecosystem/changes", { cache: "no-store" })
      .then(response => response.ok ? response.json() : null)
      .then(value => { if (active) setRadarChanges(value); })
      .catch(() => { if (active) setRadarChanges(null); });
    return () => { active = false; };
  }, []);

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

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/zaf/observations", { cache: "no-store" });
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

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 pb-10">
        <header className="border-b border-border pb-5 pt-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Image src="/zaf-tech-logo.png" alt="ZAF TECH" width={44} height={44} className="h-11 w-11 shrink-0 object-contain" priority />
              <div className="min-w-0">
                <div className="text-2xl font-bold tracking-tight ty-brand-text">ZAF TECH</div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tr("Pi Ecosystem Observatory", "Pi Ekosistem Gözlem Merkezi")}</p>
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              <LanguageSelector locale={locale} onChange={setLocale} />
              <button type="button" onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="rounded-lg border border-border bg-card px-2.5 py-2 text-xs font-medium text-foreground">{theme === "light" ? `☾ ${tr("Dark", "Koyu")}` : `☀ ${tr("Light", "Açık")}`}</button>
              <button type="button" onClick={() => void load()} disabled={refreshing} className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground disabled:opacity-50">{refreshing ? tr("Refreshing…", "Yenileniyor…") : tr("Refresh", "Yenile")}</button>
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
            <button type="button" onClick={() => void load()} disabled={refreshing} className="mt-3 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground disabled:opacity-50">{refreshing ? tr("Retrying…", "Tekrar Deneniyor…") : tr("Retry", "Tekrar Dene")}</button>
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
              <div className="text-xs font-semibold text-foreground">{tr("What ZAF TECH Does", "ZAF TECH Ne Yapar")}</div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{tr("ZAF TECH is an independent, read-only technology project. It observes public ecosystem sources and local Node diagnostics; it does not represent Pi Core Team and does not assign subjective network health scores.", "ZAF TECH bağımsız, salt-okunur bir teknoloji projesidir. Herkese açık ekosistem kaynaklarını ve yerel Node teşhislerini gözlemler; Pi Core Team'i temsil etmez ve öznel ağ sağlık puanları üretmez.")}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-[11px]"><External href="https://minepi.com/developers/">{tr("Pi Developers", "Pi Geliştiricileri")}</External><External href="https://developers.minepi.com/">{tr("Developer Docs", "Geliştirici Dokümanları")}</External><External href="https://ecosystem.pinet.com/">{tr("Pi Ecosystem", "Pi Ekosistemi")}</External></div>
            </div>
          </section>
        ) : null}

        {!loading && section === "apps" && subtab === "App Health" ? <ZafAppHealth locale={locale} /> : null}

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
            </div>

            <div className="mt-3 rounded-xl border border-border bg-card p-4">
              <div className="text-xs font-semibold text-foreground">{tr("Daily Changes", "Günlük Değişiklikler")}</div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {tr("Changes are compared with the latest stored ecosystem snapshot. They describe observed differences only.", "Değişiklikler son kayıtlı ekosistem snapshot'ı ile karşılaştırılır. Yalnızca gözlemlenen farklılıkları açıklar.")}
              </p>
              <div className="mt-3 space-y-2">
                {radarChanges?.changes?.length ? radarChanges.changes.slice(0, 6).map(change => (                  <div key={`${change.type}-${change.title}`} className="rounded-lg border border-border p-3">
                    <div className="text-[11px] font-semibold text-foreground">{change.title}</div>
                    <div className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{locale === "tr" ? change.detailTr : translate(locale, change.detail, change.detailTr)}</div>
                    {(change.previous != null || change.current != null) ? <div className="mt-2 text-[10px] text-muted-foreground">{String(change.previous ?? "—")} → {String(change.current ?? "—")}</div> : null}
                  </div>
                )) : (
                  <div className="rounded-lg border border-border p-3 text-[10px] text-muted-foreground">
                    {radarChanges?.hasBaseline ? tr("No meaningful ecosystem changes detected.", "Anlamlı bir ekosistem değişikliği tespit edilmedi.") : tr("A baseline is not available yet.", "Henüz karşılaştırılacak bir temel snapshot yok.")}
                  </div>
                )}
              </div>
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
                    <span className="text-[10px] text-muted-foreground">{source.label}</span>
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

        {!loading && section === "intelligence" && subtab === "Activity Signals" ? <ObservatoryStatisticsView locale={locale} tr={tr} /> : null}

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
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Card title={tr("Transactions", "İşlemler")} value={number(snapshot?.metrics.recentTransactions, 0, locale)} detail={tr("Current Sample", "Mevcut Örnek")} />
              <Card title={tr("Operations", "Operasyonlar")} value={number(snapshot?.metrics.recentOperations, 0, locale)} detail={tr("Current Sample", "Mevcut Örnek")} />
              <Card title={tr("Daily Transactions", "Günlük İşlemler")} value={number(snapshot?.metrics.observedTransactionsPerDay, 0, locale)} detail={tr("Observed Daily Pace", "Gözlemlenen Günlük Tempo")} />
              <Card title={tr("Daily Operations", "Günlük Operasyonlar")} value={number(snapshot?.metrics.observedOperationsPerDay, 0, locale)} detail={tr("Observed Daily Pace", "Gözlemlenen Günlük Tempo")} />
            </div>
            <div className="mt-3 rounded-xl border border-border bg-card p-4">
              <div className="text-xs font-semibold text-foreground">{tr("Network Measurement Boundary", "Ağ Ölçüm Sınırı")}</div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{tr("ZAF TECH reads public Mainnet Horizon data and reports the observed sample. Daily values are normalized from the observed ledger window; they are not a complete calendar-day count.", "ZAF TECH herkese açık Mainnet Horizon verisini okur ve gözlemlenen örneği raporlar. Günlük değerler gözlemlenen ledger penceresinden normalize edilir; tam bir takvim günü toplamı değildir.")}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
                <External href="https://api.mainnet.minepi.com">{tr("Pi Mainnet Horizon", "Pi Mainnet Horizon")}</External>
                <span className="text-muted-foreground">{tr("Updated", "Güncellendi")} {age(snapshot?.generatedAt, locale)}</span>
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
  }>;
};

function ObservatoryStatisticsView({ locale, tr }: { locale: Locale; tr: (en: string, trText: string) => string }) {
  const [data, setData] = useState<EcosystemStatisticsPayload | null>(null);
  const [changes, setChanges] = useState<EcosystemChangePayload | null>(null);
  const [trends, setTrends] = useState<EcosystemTrendPayload | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/zaf/ecosystem/statistics", { cache: "no-store" }).then(response => response.ok ? response.json() : null),
      fetch("/api/zaf/ecosystem/changes", { cache: "no-store" }).then(response => response.ok ? response.json() : null),
      fetch("/api/zaf/ecosystem/trends", { cache: "no-store" }).then(response => response.ok ? response.json() : null),
    ])
      .then(([statistics, changeData, trendData]) => {
        if (!active) return;
        setData(statistics);
        setChanges(changeData);
        setTrends(trendData);
      })
      .catch(() => {
        if (!active) return;
        setData(null);
        setChanges(null);
      })
      .finally(() => { if (active) setLoadingStats(false); });
    return () => { active = false; };
  }, []);

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
        <div className="flex items-center justify-between gap-3">
          <div>
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
              <div className="text-[11px] font-semibold text-foreground">{change.title}</div>
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
