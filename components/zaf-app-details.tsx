"use client";

import Image from "next/image";
import Link from "next/link";
import type { DirectoryApp } from "@/lib/zaf/app-directory";
import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/lib/zaf/i18n";
import { intlLocale, translate } from "@/lib/zaf/i18n";
import { LanguageSelector } from "@/components/zaf-language-selector";

function displayStatus(value: string | null | undefined, locale: Locale) {
  if (!value) return "—";
  const normalized = value.replace(/[_-]+/g, " ").trim().toLowerCase();
  const labels: Record<string, Record<Locale, string>> = {
    unknown: { en: "Not Checked", es: "No Comprobado", tr: "Kontrol Edilmedi", zh: "未检查", it: "Non Controllato", fr: "Non Vérifié", de: "Nicht Geprüft", pt: "Não Verificado", ru: "Не Проверено" },
    online: { en: "Online", es: "En Línea", tr: "Çevrimiçi", zh: "在线", it: "Online", fr: "En Ligne", de: "Online", pt: "Online", ru: "Онлайн" },
    offline: { en: "Offline", es: "Fuera De Línea", tr: "Çevrimdışı", zh: "离线", it: "Offline", fr: "Hors Ligne", de: "Offline", pt: "Offline", ru: "Офлайн" },
    available: { en: "Available", es: "Disponible", tr: "Kullanılabilir", zh: "可用", it: "Disponibile", fr: "Disponible", de: "Verfügbar", pt: "Disponível", ru: "Доступно" },
    unavailable: { en: "Unavailable", es: "No Disponible", tr: "Kullanılamıyor", zh: "不可用", it: "Non Disponibile", fr: "Indisponible", de: "Nicht Verfügbar", pt: "Indisponível", ru: "Недоступно" },
    improving: { en: "Improving", es: "Mejorando", tr: "İyileşiyor", zh: "改善中", it: "In Miglioramento", fr: "En Amélioration", de: "Verbesserung", pt: "Melhorando", ru: "Улучшается" },
    declining: { en: "Declining", es: "Empeorando", tr: "Geriliyor", zh: "Düşüyor", it: "In Peggioramento", fr: "En Dégradation", de: "Rückläufig", pt: "Em Queda", ru: "Снижается" },
    stable: { en: "Stable", es: "Estable", tr: "Sabit", zh: "稳定", it: "Stabile", fr: "Stable", de: "Stabil", pt: "Estável", ru: "Стабильно" },
    insufficient: { en: "Insufficient Data", es: "Datos Insuficientes", tr: "Yetersiz Veri", zh: "数据不足", it: "Dati Insufficienti", fr: "Données Insuffisantes", de: "Daten Unzureichend", pt: "Dados Insuficientes", ru: "Недостаточно Данных" },
    fresh: { en: "Fresh", es: "Reciente", tr: "Taze", zh: "新鲜", it: "Recente", fr: "Récent", de: "Frisch", pt: "Recente", ru: "Свежие" },
    aging: { en: "Aging", es: "Envejeciendo", tr: "Yaşlanıyor", zh: "正在变旧", it: "Invecchiando", fr: "Alterando", de: "Alternd", pt: "Envelhecendo", ru: "Устаревает" },
    stale: { en: "Stale", es: "Eski", tr: "Bayat", zh: "陈旧", it: "Obsoleto", fr: "Stale", de: "Veraltet", pt: "Desatualizado", ru: "Устаревшие" },
    old: { en: "Old", es: "Antiguo", tr: "Eski", zh: "很旧", it: "Vecchio", fr: "Ancien", de: "Alt", pt: "Antigo", ru: "Старые" },
    mainnet: { en: "Mainnet", es: "Mainnet", tr: "Mainnet", zh: "主网", it: "Mainnet", fr: "Mainnet", de: "Mainnet", pt: "Mainnet", ru: "Mainnet" },
    testnet: { en: "Testnet", es: "Testnet", tr: "Testnet", zh: "测试网", it: "Testnet", fr: "Testnet", de: "Testnet", pt: "Testnet", ru: "Testnet" },
  };
  return labels[normalized]?.[locale] ?? normalized.replace(/^./, char => char.toUpperCase());
}
type AppHealthResult = {
  url: string;
  status?: number | null;
  reachable: boolean;
  responseTimeMs: number;
  https: boolean;
  redirect: boolean;
  checkedAt: string;
  error?: string | null;
  score?: number;
  healthStatus?: "healthy" | "degraded" | "limited" | "offline";
};

type AppTrendSummary = {
  checks: number;
  reachable: number;
  offline: number;
  reachabilityRate: number | null;
  online: number;
  onlineRate: number | null;
  averageResponseTimeMs: number | null;
  averageHealthScore: number | null;
  minimumHealthScore: number | null;
  maximumHealthScore: number | null;
  firstHealthScore: number | null;
  latestHealthScore: number | null;
  firstHealthStatus: "healthy" | "degraded" | "limited" | "offline" | null;
  latestHealthStatus: "healthy" | "degraded" | "limited" | "offline" | null;
  healthScoreDelta: number | null;
  trendDirection: "improving" | "stable" | "declining" | "insufficient";
  trendDelta: number | null;
  freshness: { state: "fresh" | "aging" | "stale" | "old" | "unknown"; ageSeconds: number | null };
  dataConfidence: { score: number; level: "high" | "medium" | "low" | "insufficient"; checks: number; observedWindowMinutes: number | null; cadenceStabilityScore: number };
  transitions: number;
  healthStatusTransitions: number;
  firstCheckedAt: string | null;
  lastCheckedAt: string | null;
};

type AppHealthTrendPoint = {
  checkedAt: string;
  reachable: boolean;
  responseTimeMs: number;
  status: number | null;
  https: boolean;
  redirect: boolean;
  score: number;
  healthStatus: "healthy" | "degraded" | "limited" | "offline";
};

function verification(value: DirectoryApp["piAuthentication"], locale: Locale) {
  return value === "verified"
    ? translate(locale, "Verified", "Doğrulandı")
    : translate(locale, "Not Verified", "Doğrulanmadı");
}

export function AppDetails({ app }: { app: DirectoryApp }) {
  const [locale, setLocale] = useState<Locale>("en");
  const [health, setHealth] = useState<AppHealthResult | null>(null);
  const [trendSummary, setTrendSummary] = useState<AppTrendSummary | null>(null);
  const [trendPoints, setTrendPoints] = useState<AppHealthTrendPoint[]>([]);
  const [healthLoading, setHealthLoading] = useState(false);

  const checkHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const response = await fetch("/api/apps/check?url=" + encodeURIComponent(app.url), { cache: "no-store" });
      const result = await response.json();
      setHealth(result);
      if (response.ok) {
        const trendResponse = await fetch("/api/apps/health/trend?url=" + encodeURIComponent(app.url), { cache: "no-store" });
        if (trendResponse.ok) {
          const trend = await trendResponse.json();
          setTrendSummary(trend.summary ?? null);
          setTrendPoints(Array.isArray(trend.points) ? trend.points : []);
        }
      }
    } catch {
      setTrendSummary(null);
      setTrendPoints([]);
      setHealth({
        url: app.url,
        reachable: false,
        responseTimeMs: 0,
        https: app.url.startsWith("https://"),
        redirect: false,
        checkedAt: new Date().toISOString(),
        error: "Request failed",
      });
    } finally {
      setHealthLoading(false);
    }
  }, [app.url]);

  useEffect(() => { void checkHealth(); }, [checkHealth]);

  const tr = (en: string, trText: string) => translate(locale, en, trText);
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 pb-10">
        <header className="border-b border-border pb-5 pt-7">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="text-xs font-medium text-muted-foreground hover:text-foreground">{tr("← Back To ZAF TECH", "← ZAF TECH'e Dön")}</Link>
            <LanguageSelector locale={locale} onChange={setLocale} />
            <Image src="/zaf-tech-logo.png" alt="ZAF TECH" width={38} height={38} className="h-9 w-9 object-contain" priority />
          </div>
          <div className="mt-6">
            <div className="text-[10px] tracking-wider text-muted-foreground">{tr("Pi App Directory", "Pi Uygulama Dizini")}</div>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground">{app.name}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground">{app.category}</span>
              <span className="rounded-full border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground">{displayStatus(app.networkScope, locale)}</span>
              <span className="rounded-full border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground">{displayStatus(app.status, locale)}</span>
            </div>
          </div>
        </header>

        <section className="mt-5 space-y-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs font-semibold text-foreground">{tr("Application", "Uygulama")}</div>
            <p className="mt-2 break-all text-[11px] text-muted-foreground">{app.url}</p>
            <a href={app.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-lg bg-foreground px-3 py-2 text-[11px] font-medium text-background">{tr("Open Application", "Uygulamayı Aç")}</a>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-foreground">{tr("Live Health Observation", "Canlı Sağlık Gözlemi")}</div>
                <p className="mt-1 text-[10px] text-muted-foreground">{tr("A fresh server-side reachability check of the public application URL.", "Herkese açık uygulama URL'si için güncel sunucu tarafı erişilebilirlik kontrolü.")}</p>
              </div>
              <button type="button" onClick={() => void checkHealth()} disabled={healthLoading} className="rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-medium text-foreground disabled:opacity-50">
                {healthLoading ? tr("Checking…", "Kontrol Ediliyor…") : tr("Check Now", "Şimdi Kontrol Et")}
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">{tr("Reachability", "Erişilebilirlik")}</div><div className="mt-1 text-xs font-semibold text-foreground">{health ? (health.reachable ? tr("Reachable", "Erişilebilir") : tr("Offline", "Çevrimdışı")) : "—"}</div></div>
              <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">{tr("Response", "Yanıt")}</div><div className="mt-1 text-xs font-semibold text-foreground">{health ? health.responseTimeMs + " ms" : "—"}</div></div>
              <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">HTTP</div><div className="mt-1 text-xs font-semibold text-foreground">{health?.status ?? "—"}</div></div>
              <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">HTTPS</div><div className="mt-1 text-xs font-semibold text-foreground">{health ? (health.https ? tr("Yes", "Evet") : tr("No", "Hayır")) : "—"}</div></div>
              <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">{tr("Health Score","Sağlık Skoru")}</div><div className="mt-1 text-xs font-semibold text-foreground">{health?.score == null ? "—" : health.score + "/100"}</div></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
              <span>{tr("Status", "Durum")}: {health?.healthStatus ? displayStatus(health.healthStatus, locale) : "—"}</span>
              <span>•</span>
              <span>{tr("Redirect", "Yönlendirme")}: {health ? (health.redirect ? tr("Yes", "Evet") : tr("No", "Hayır")) : "—"}</span>
              <span>•</span>
              <span>{tr("Checked", "Kontrol")}: {health?.checkedAt ? new Date(health.checkedAt).toLocaleString(intlLocale(locale)) : "—"}</span>
              {health?.error ? <span>• {health.error}</span> : null}
            </div>
            {trendSummary ? (
              <div className="mt-3 border-t border-border pt-3">
                <div className="text-[10px] font-semibold text-foreground">{tr("Stored Health Trend", "Kayıtlı Sağlık Trendi")}</div>
                <div className="mt-1 text-[9px] text-muted-foreground">
                  {tr("Health score and status over stored server-side checks. This measures observable URL/infrastructure behavior only.", "Kayıtlı sunucu tarafı kontrollerinde sağlık skoru ve durum. Bu yalnızca gözlemlenebilir URL/altyapı davranışını ölçer.")}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg border border-border p-2.5"><div className="text-[9px] text-muted-foreground">{tr("Checks", "Kontroller")}</div><div className="mt-1 text-xs font-semibold text-foreground">{trendSummary.checks}</div></div>
                  <div className="rounded-lg border border-border p-2.5"><div className="text-[9px] text-muted-foreground">{tr("Online Rate", "Çevrimiçi Oranı")}</div><div className="mt-1 text-xs font-semibold text-foreground">{trendSummary.onlineRate == null ? "—" : trendSummary.onlineRate + "%"}</div></div>
                  <div className="rounded-lg border border-border p-2.5"><div className="text-[9px] text-muted-foreground">{tr("Avg Health", "Ort. Sağlık")}</div><div className="mt-1 text-xs font-semibold text-foreground">{trendSummary.averageHealthScore == null ? "—" : trendSummary.averageHealthScore + "/100"}</div></div>
                  <div className="rounded-lg border border-border p-2.5"><div className="text-[9px] text-muted-foreground">{tr("Avg Response", "Ort. Yanıt")}</div><div className="mt-1 text-xs font-semibold text-foreground">{trendSummary.averageResponseTimeMs == null ? "—" : trendSummary.averageResponseTimeMs + " ms"}</div></div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg border border-border p-2.5"><div className="text-[9px] text-muted-foreground">{tr("Trend Direction", "Trend Yönü")}</div><div className="mt-1 text-xs font-semibold text-foreground">{displayStatus(trendSummary.trendDirection, locale)}</div></div>
                  <div className="rounded-lg border border-border p-2.5"><div className="text-[9px] text-muted-foreground">{tr("Data Confidence", "Veri Güveni")}</div><div className="mt-1 text-xs font-semibold text-foreground">{trendSummary.dataConfidence.score}/100</div></div>
                  <div className="rounded-lg border border-border p-2.5"><div className="text-[9px] text-muted-foreground">{tr("Freshness", "Tazelik")}</div><div className="mt-1 text-xs font-semibold text-foreground">{displayStatus(trendSummary.freshness.state, locale)}</div></div>
                  <div className="rounded-lg border border-border p-2.5"><div className="text-[9px] text-muted-foreground">{tr("Latest Age", "Son Veri Yaşı")}</div><div className="mt-1 text-xs font-semibold text-foreground">{trendSummary.freshness.ageSeconds == null ? "—" : Math.round(trendSummary.freshness.ageSeconds / 60) + " min"}</div></div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg border border-border p-2.5"><div className="text-[9px] text-muted-foreground">{tr("Latest Health", "Son Sağlık")}</div><div className="mt-1 text-xs font-semibold text-foreground">{trendSummary.latestHealthScore == null ? "—" : trendSummary.latestHealthScore + "/100"}</div></div>
                  <div className="rounded-lg border border-border p-2.5"><div className="text-[9px] text-muted-foreground">{tr("Score Δ", "Skor Δ")}</div><div className="mt-1 text-xs font-semibold text-foreground">{trendSummary.healthScoreDelta == null ? "—" : (trendSummary.healthScoreDelta > 0 ? "+" : "") + trendSummary.healthScoreDelta}</div></div>
                  <div className="rounded-lg border border-border p-2.5"><div className="text-[9px] text-muted-foreground">{tr("Range", "Aralık")}</div><div className="mt-1 text-xs font-semibold text-foreground">{trendSummary.minimumHealthScore == null || trendSummary.maximumHealthScore == null ? "—" : trendSummary.minimumHealthScore + "–" + trendSummary.maximumHealthScore}</div></div>
                  <div className="rounded-lg border border-border p-2.5"><div className="text-[9px] text-muted-foreground">{tr("Status Changes", "Durum Değişimi")}</div><div className="mt-1 text-xs font-semibold text-foreground">{trendSummary.healthStatusTransitions}</div></div>
                </div>

                {trendPoints.length > 0 ? (
                  <div className="mt-3 rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[9px] font-semibold text-foreground">{tr("Health Score Trend", "Sağlık Skoru Trendi")}</div>
                        <div className="mt-0.5 text-[9px] text-muted-foreground">{tr("Earliest → latest stored checks", "En eski → en yeni kayıtlı kontroller")}</div>
                      </div>
                      <div className="text-[9px] text-muted-foreground">{trendPoints.length} {tr("points", "nokta")}</div>
                    </div>
                    <div className="mt-3 flex h-28 items-end gap-px overflow-hidden rounded-md border border-border/60 bg-muted/20 px-1 py-1">
                      {trendPoints.map((point, index) => {
                        const height = Math.max(4, Math.min(100, point.score));
                        const title = point.score + "/100 · " + displayStatus(point.healthStatus, locale) + " · " + new Date(point.checkedAt).toLocaleString(intlLocale(locale));
                        const statusClass =
                          point.healthStatus === "healthy"
                            ? "bg-foreground"
                            : point.healthStatus === "degraded"
                              ? "bg-foreground/70"
                              : point.healthStatus === "limited"
                                ? "bg-foreground/45"
                                : "bg-foreground/25";
                        return (
                          <div key={point.checkedAt + "-" + index} className="flex h-full flex-1 items-end" title={title} aria-label={title}>
                            <div className={"w-full rounded-t-sm " + statusClass} style={{ height: height + "%" }} />
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-[9px] text-muted-foreground">
                      <span className="text-left">{trendPoints[0] ? new Date(trendPoints[0].checkedAt).toLocaleString(intlLocale(locale), { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                      <span className="text-center">{trendPoints.length > 2 ? new Date(trendPoints[Math.floor((trendPoints.length - 1) / 2)].checkedAt).toLocaleString(intlLocale(locale), { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                      <span className="text-right">{trendPoints.at(-1) ? new Date(trendPoints.at(-1)!.checkedAt).toLocaleString(intlLocale(locale), { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[9px] text-muted-foreground">
                      <span>{tr("Health score: 0–100", "Sağlık skoru: 0–100")}</span>
                      <span>{tr("Status changes", "Durum değişimleri")}: {trendSummary.healthStatusTransitions}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[9px] text-muted-foreground sm:grid-cols-4">
                      <span>{tr("Healthy", "Sağlıklı")}: 80–100</span>
                      <span>{tr("Degraded", "Bozulmuş")}: 55–79</span>
                      <span>{tr("Limited", "Sınırlı")}: 0–54</span>
                      <span>{tr("Offline", "Çevrimdışı")}: 0</span>
                    </div>
                    {trendPoints.some((point, index) => index > 0 && point.healthStatus !== trendPoints[index - 1].healthStatus) ? (
                      <div className="mt-3 rounded-lg border border-border p-3">
                        <div className="text-[9px] font-semibold text-foreground">{tr("Status Transition Timeline", "Durum Geçiş Zaman Çizelgesi")}</div>
                        <div className="mt-1 text-[9px] text-muted-foreground">
                          {tr("Observed changes in the calculated health state across stored checks.", "Kayıtlı kontroller boyunca hesaplanan sağlık durumundaki gözlemlenen değişimler.")}
                        </div>
                        <div className="mt-2 space-y-1.5">
                          {trendPoints.map((point, index) => {
                            if (index === 0 || point.healthStatus === trendPoints[index - 1].healthStatus) return null;
                            const previous = trendPoints[index - 1];
                            return (
                              <div key={"transition-" + point.checkedAt + "-" + index} className="flex items-center justify-between gap-3 rounded-md border border-border/70 px-2.5 py-2 text-[9px]">
                                <span className="text-muted-foreground">
                                  {new Date(point.checkedAt).toLocaleString(intlLocale(locale), { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </span>
                                <span className="font-medium text-foreground">
                                  {displayStatus(previous.healthStatus, locale)} → {displayStatus(point.healthStatus, locale)}
                                </span>
                                <span className="text-muted-foreground">{previous.score} → {point.score}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-border p-2.5">
                        <div className="text-[9px] text-muted-foreground">{tr("First → Latest Status", "İlk → Son Durum")}</div>
                        <div className="mt-1 text-xs font-semibold text-foreground">
                          {trendSummary.firstHealthStatus ? displayStatus(trendSummary.firstHealthStatus, locale) : "—"}
                          <span className="mx-1.5 text-muted-foreground">→</span>
                          {trendSummary.latestHealthStatus ? displayStatus(trendSummary.latestHealthStatus, locale) : "—"}
                        </div>
                        <div className="mt-1 text-[9px] text-muted-foreground">
                          {trendSummary.firstHealthScore == null || trendSummary.latestHealthScore == null
                            ? "—"
                            : trendSummary.firstHealthScore + "/100 → " + trendSummary.latestHealthScore + "/100"}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border p-2.5">
                        <div className="text-[9px] text-muted-foreground">{tr("Observed Window", "Gözlemlenen Aralık")}</div>
                        <div className="mt-1 text-xs font-semibold text-foreground">
                          {trendSummary.firstCheckedAt && trendSummary.lastCheckedAt
                            ? Math.max(0, Math.round((new Date(trendSummary.lastCheckedAt).getTime() - new Date(trendSummary.firstCheckedAt).getTime()) / 60000)) + " min"
                            : "—"}
                        </div>
                        <div className="mt-1 text-[9px] text-muted-foreground">
                          {trendSummary.firstCheckedAt && trendSummary.lastCheckedAt
                            ? new Date(trendSummary.firstCheckedAt).toLocaleString(intlLocale(locale), { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) + " → " + new Date(trendSummary.lastCheckedAt).toLocaleString(intlLocale(locale), { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                            : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              [tr("Pi Authentication", "Pi Kimlik Doğrulama"), verification(app.piAuthentication, locale)],
              [tr("Pi Payments", "Pi Ödemeleri"), verification(app.piPayments, locale)],
              [tr("PiNet", "PiNet"), verification(app.piNet, locale)],
              [tr("Network", "Ağ"), displayStatus(app.network, locale)],
              [tr("Status", "Durum"), displayStatus(app.status, locale)],
              [tr("Last Checked", "Son Kontrol"), new Date(app.lastChecked).toLocaleString(intlLocale(locale))],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border bg-card p-3">
                <div className="text-[10px] text-muted-foreground">{label}</div>
                <div className="mt-1 text-xs font-semibold text-foreground">{value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs font-semibold text-foreground">{tr("Verification Boundary", "Doğrulama Sınırı")}</div>
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
              {tr("ZAF TECH does not claim Pi Authentication, Pi Payments, PiNet, Mainnet/Testnet status or application health until the relevant property has been independently verified by an observable check. Category is a ZAF TECH classification based on the public name/URL signal and is not an official Pi category.", "ZAF TECH, ilgili özellik gözlemlenebilir bir kontrolle bağımsız olarak doğrulanmadıkça Pi Kimlik Doğrulama, Pi Ödemeleri, PiNet, Mainnet/Testnet durumu veya uygulama sağlığı hakkında doğrulanmış bir iddiada bulunmaz. Kategori, herkese açık ad/URL sinyaline dayalı bir ZAF TECH sınıflandırmasıdır ve resmi Pi kategorisi değildir.")}
            </p>
          </div>
        </section>

        <footer className="mt-8 border-t border-border pt-4 text-[10px] text-muted-foreground">
          ZAF TECH · {tr("Independent Community-Developed Technology Project", "Bağımsız Topluluk Geliştirmeli Teknoloji Projesi")}
        </footer>
      </div>
    </main>
  );
}
