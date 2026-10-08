"use client";

import type { Locale } from "@/lib/zaf/i18n";
import type { RadarObservation, RadarSignal } from "@/lib/zaf/radar";
import type { ZafSnapshot } from "@/lib/zaf/types";

type PulseChange = {
  type: string;
  title: string;
  detail: string;
  detailTr: string;
  category?: string;
};

type PulseChanges = { hasBaseline: boolean; changes: PulseChange[] };

type EcosystemPulseData = {
  generatedAt: string;
  apps: { totalCount: number | null };
  officialSignals?: Array<{
    title: string;
    value: string;
    observedAt: string;
    sourceUrl: string;
  }>;
};

function tx(locale: Locale, en: string, tr: string) {
  return locale === "tr" ? tr : en;
}

function observationTime(value: string | null | undefined, locale: Locale) {
  if (!value) return "—";
  const match = value.match(/^(\\d{4})-(\\d{2})-(\\d{2})T(\\d{2}):(\\d{2})/);
  if (!match) return "—";
  const [, year, month, day, hour, minute] = match;
  return locale === "tr"
    ? `${day}.${month}.${year} ${hour}:${minute} UTC`
    : `${year}-${month}-${day} ${hour}:${minute} UTC`;
}

function activityLabel(value: string, locale: Locale) {
  if (locale === "tr") {
    if (value === "rising") return "Yükseliyor";
    if (value === "falling") return "Düşüyor";
    if (value === "stable") return "Sabit";
    if (value === "insufficient-data") return "Yetersiz Veri";
  }
  if (value === "rising") return "Rising";
  if (value === "falling") return "Falling";
  if (value === "stable") return "Stable";
  if (value === "insufficient-data") return "Insufficient Data";
  return value;
}

function signalTitle(signal: RadarSignal, locale: Locale) {
  const labels: Record<string, [string, string]> = {
    "transaction-pace": ["Observed Transaction Pace", "Gözlemlenen İşlem Temposu"],
    "operation-pace": ["Observed Operation Pace", "Gözlemlenen Operasyon Temposu"],
    "transaction-success": ["Transaction Success Rate", "İşlem Başarı Oranı"],
    "ledger-throughput": ["Ledger Throughput", "Ledger İşlem Yoğunluğu"],
    "source-coverage": ["Public Source Coverage", "Herkese Açık Kaynak Kapsamı"],
    "protocol": ["Protocol Observation", "Protokol Gözlemi"],
  };
  return labels[signal.id]?.[locale === "tr" ? 1 : 0] ?? signal.title;
}

function changeLabel(value: number | null, locale: Locale) {
  if (value == null) return tx(locale, "No rolling comparison", "Hareketli karşılaştırma yok");
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function metricValue(value: number | null, locale: Locale, digits = 0) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(locale === "tr" ? "tr-TR" : "en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function Icon({ kind, size = 18 }: { kind: "pulse" | "rising" | "signal" | "new" | "watch" | "network"; size?: number }) {
  const body = {
    pulse: <><path d="M3 12h4l2.1-6 3.2 12 2.1-6H21" /><path d="M3 5v14M21 5v14" opacity=".35" /></>,
    rising: <><path d="M4 17 10 11l4 3 6-7" /><path d="M15 7h5v5" /></>,
    signal: <><circle cx="12" cy="12" r="2" /><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4" /><path d="M4.8 4.8a10.2 10.2 0 0 0 0 14.4M19.2 4.8a10.2 10.2 0 0 1 0 14.4" /></>,
    new: <><path d="M12 3v18M3 12h18" /><circle cx="12" cy="12" r="8.5" /></>,
    watch: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
    network: <><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /><path d="m10 7 4 4M10 17l4-4" /><circle cx="17" cy="7" r="3" /></>,
  }[kind];
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{body}</svg>;
}

function Sparkline({ rising }: { rising: boolean }) {
  return (
    <svg className="zaf-sparkline" viewBox="0 0 120 28" preserveAspectRatio="none" aria-hidden="true">
      <path d={rising ? "M1 23 L18 22 L34 20 L48 21 L63 15 L77 16 L91 10 L104 12 L119 4" : "M1 10 L18 13 L34 9 L48 15 L63 12 L77 18 L91 15 L104 21 L119 19"} />
    </svg>
  );
}

function StatusBadge({ state, locale }: { state: string; locale: Locale }) {
  const text = activityLabel(state, locale);
  const tone = state === "rising" ? "positive" : state === "falling" ? "negative" : "neutral";
  return <span className={`zaf-pulse-status zaf-pulse-status-${tone}`}>{text}</span>;
}

function NumberMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="zaf-pulse-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

export function ZafPulse({
  locale,
  snapshot,
  radar,
  changes,
  ecosystem,
  onOpenRadar,
  onOpenDiscover,
}: {
  locale: Locale;
  snapshot: ZafSnapshot | null;
  radar: RadarObservation | null;
  changes: PulseChanges | null;
  ecosystem: EcosystemPulseData | null;
  onOpenRadar: () => void;
  onOpenDiscover: () => void;
}) {
  const total = radar?.sourceCoverage.total ?? 0;
  const available = radar?.sourceCoverage.available ?? 0;
  const coverage = total ? Math.round((available / total) * 100) : 0;
  const activity = snapshot?.intelligence.activityState ?? "insufficient-data";
  const activityDisplay = activityLabel(activity, locale);

  const movement = (radar?.signals ?? [])
    .filter(signal => ["transaction-pace", "operation-pace", "transaction-success"].includes(signal.id))
    .sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0));

  const latestOfficial = [...(ecosystem?.officialSignals ?? [])]
    .filter(signal => signal.observedAt)
    .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt))[0] ?? null;

  const changesToShow = (changes?.changes ?? []).slice(0, 3);
  const topOperation = snapshot?.metrics.topOperationType
    ? snapshot.metrics.topOperationType.replace(/_/g, " ")
    : "—";

  const brief = (() => {
    const txPerDay = radar?.dailyTransactions;
    const opsPerDay = radar?.dailyOperations;
    const success = snapshot?.metrics.transactionSuccessRate;
    const txChange = radar?.signals.find(s => s.id === "transaction-pace")?.changePercent ?? null;
    const opChange = radar?.signals.find(s => s.id === "operation-pace")?.changePercent ?? null;
    if (txPerDay != null && opsPerDay != null && success != null) {
      return txChange == null
        ? tx(locale, `Mainnet is currently observable at about ${metricValue(txPerDay, locale)} transactions and ${metricValue(opsPerDay, locale)} operations per day, with a ${success.toFixed(1)}% observed transaction success rate.`, `Mainnet şu anda yaklaşık ${metricValue(txPerDay, locale)} işlem ve ${metricValue(opsPerDay, locale)} operasyon/gün seviyesinde gözlemleniyor; gözlemlenen işlem başarı oranı %${success.toFixed(1)}.`)
        : tx(locale, `The latest rolling window shows a ${changeLabel(txChange, locale)} transaction-pace move and ${changeLabel(opChange, locale)} operation-pace move.`, `Son hareketli pencere işlem temposunda ${changeLabel(txChange, locale)} ve operasyon temposunda ${changeLabel(opChange, locale)} değişim gösteriyor.`);
    }
    return tx(locale, "Live Mainnet observations are still forming. The dashboard will surface concrete movements as the observation window fills.", "Canlı Mainnet gözlemleri hâlâ oluşuyor. Gözlem penceresi doldukça dashboard somut hareketleri gösterecek.");
  })();

  return (
    <section className="zaf-pulse mt-5 sm:mt-7">
      <div className="zaf-pulse-hero">
        <div className="zaf-pulse-kicker">
          <span className="zaf-signal-mark"><Icon kind="pulse" size={15} /></span>
          <span>{tx(locale, "PI MAINNET · BLOCKCHAIN · WEB3 · LIVE OBSERVATION", "PI MAINNET · BLOCKCHAIN · WEB3 · CANLI GÖZLEM")}</span>
        </div>
        <h1 className="zaf-pulse-title mt-3">{tx(locale, "What is changing across Pi right now?", "Pi ekosisteminde şu anda ne değişiyor?")}</h1>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {tx(locale, "ZAF TECH turns Pi blockchain activity, ecosystem apps, official developments, and Web3 signals into an observable daily brief. It shows what changed, how much, and where to inspect it.", "ZAF TECH; Pi blockchain aktivitesini, ekosistem uygulamalarını, resmi gelişmeleri ve Web3 sinyallerini günlük okunabilir bir özete dönüştürür. Ne değiştiğini, ne kadar değiştiğini ve nereden incelenebileceğini gösterir.")}
        </p>

        <div className="zaf-pulse-brief mt-5">
          <div className="zaf-pulse-brief-head">
            <div>
              <span className="zaf-pulse-brief-kicker">{tx(locale, "LIVE ECOSYSTEM BRIEF", "CANLI EKOSİSTEM ÖZETİ")}</span>
              <strong>{activityDisplay}</strong>
            </div>
            <StatusBadge state={activity} locale={locale} />
          </div>
          <p>{brief}</p>
        </div>

        <div className="zaf-pulse-metrics mt-4">
          <NumberMetric label={tx(locale, "Transactions / day", "İşlem / gün")} value={metricValue(radar?.dailyTransactions ?? null, locale)} detail={tx(locale, "Observed Mainnet pace", "Gözlemlenen Mainnet temposu")} />
          <NumberMetric label={tx(locale, "Operations / day", "Operasyon / gün")} value={metricValue(radar?.dailyOperations ?? null, locale)} detail={tx(locale, "Observed Mainnet pace", "Gözlemlenen Mainnet temposu")} />
          <NumberMetric label={tx(locale, "Success rate", "Başarı oranı")} value={snapshot?.metrics.transactionSuccessRate == null ? "—" : `${snapshot.metrics.transactionSuccessRate.toFixed(1)}%`} detail={tx(locale, "Current observed sample", "Mevcut gözlem örneği")} />
          <NumberMetric label={tx(locale, "Apps observed", "Gözlemlenen uygulama")} value={metricValue(ecosystem?.apps.totalCount ?? null, locale)} detail={tx(locale, "Current ecosystem source", "Mevcut ekosistem kaynağı")} />
        </div>

        <div className="zaf-pulse-source-line mt-3">
          <span>{tx(locale, "Coverage", "Kapsam")} {coverage}%</span>
          <span>·</span>
          <span>{tx(locale, "Latest observation", "Son gözlem")} {observationTime(radar?.generatedAt ?? snapshot?.generatedAt, locale)}</span>
          <span>·</span>
          <span>{tx(locale, "Latest ledger", "Son ledger")} {snapshot?.latestLedger?.sequence ?? "—"}</span>
        </div>
      </div>

      <div className="zaf-pulse-grid mt-3">
        <article className="zaf-pulse-card zaf-pulse-card-rising">
          <div className="zaf-pulse-card-head">
            <div className="zaf-pulse-label"><span className="zaf-icon-rising"><Icon kind="rising" size={16} /></span>{tx(locale, "What's Moving", "Ne Değişiyor")}</div>
            <button type="button" onClick={onOpenRadar} className="zaf-pulse-link">{tx(locale, "Full analysis", "Tam analiz")}</button>
          </div>
          {movement.length ? movement.map(signal => (
            <div key={signal.id} className="zaf-pulse-signal">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="truncate text-xs font-semibold text-foreground">{signalTitle(signal, locale)}</div>
                  <StatusBadge state={signal.state} locale={locale} />
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {signal.changePercent == null ? tx(locale, "Current observed value", "Mevcut gözlemlenen değer") : changeLabel(signal.changePercent, locale)}
                  {signal.value != null ? ` · ${typeof signal.value === "number" ? metricValue(signal.value, locale, signal.id === "transaction-success" ? 1 : 0) : signal.value}` : ""}
                </div>
              </div>
              <Sparkline rising={signal.state === "rising"} />
            </div>
          )) : <div className="zaf-pulse-empty">{tx(locale, "Concrete movement signals are not available yet.", "Somut hareket sinyalleri henüz oluşmadı.")}</div>}
        </article>

        <article className="zaf-pulse-card">
          <div className="zaf-pulse-card-head">
            <div className="zaf-pulse-label"><span className="zaf-icon-signal"><Icon kind="network" size={16} /></span>{tx(locale, "Network Snapshot", "Ağ Özeti")}</div>
            <button type="button" onClick={onOpenRadar} className="zaf-pulse-link">{tx(locale, "Inspect", "İncele")}</button>
          </div>
          <div className="zaf-pulse-fact-grid">
            <div><span>{tx(locale, "Latest ledger", "Son ledger")}</span><strong>{snapshot?.latestLedger?.sequence ?? "—"}</strong></div>
            <div><span>{tx(locale, "Protocol", "Protokol")}</span><strong>{snapshot?.metrics.latestProtocolVersion == null ? "—" : `v${snapshot.metrics.latestProtocolVersion}`}</strong></div>
            <div><span>{tx(locale, "Top operation", "Baskın operasyon")}</span><strong>{topOperation}</strong></div>
            <div><span>{tx(locale, "Active sources", "Aktif kaynak")}</span><strong>{available}/{total || "—"}</strong></div>
          </div>
        </article>

        <article className="zaf-pulse-card">
          <div className="zaf-pulse-card-head">
            <div className="zaf-pulse-label"><span className="zaf-icon-new"><Icon kind="new" size={16} /></span>{tx(locale, "Latest Ecosystem Update", "Son Ekosistem Gelişmesi")}</div>
            <button type="button" onClick={onOpenDiscover} className="zaf-pulse-link">{tx(locale, "Discover", "Keşfet")}</button>
          </div>
          {latestOfficial ? (
            <>
              <div className="zaf-pulse-big-number">{latestOfficial.value}</div>
              <div className="mt-2 text-xs font-semibold leading-snug text-foreground ty-clamp-2">{latestOfficial.title}</div>
              <div className="mt-2 text-[10px] text-muted-foreground">{observationTime(latestOfficial.observedAt, locale)}</div>
              <a href={latestOfficial.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-[10px] font-semibold text-foreground underline underline-offset-2">{tx(locale, "Open official source", "Resmi kaynağı aç")}</a>
            </>
          ) : <div className="zaf-pulse-empty">{tx(locale, "No official ecosystem update is currently exposed by the source.", "Kaynakta şu anda görünür bir resmi ekosistem gelişmesi bulunmuyor.")}</div>}
        </article>

        <article className="zaf-pulse-card">
          <div className="zaf-pulse-card-head">
            <div className="zaf-pulse-label"><span className="zaf-icon-watch"><Icon kind="watch" size={16} /></span>{tx(locale, "What Changed", "Ne Değişti")}</div>
            <button type="button" onClick={onOpenRadar} className="zaf-pulse-link">{tx(locale, "View changes", "Değişiklikleri aç")}</button>
          </div>
          {changesToShow.length ? changesToShow.map(change => (
            <div key={change.type + change.title} className="zaf-pulse-list-row">
              <span className="zaf-signal-ring" />
              <div className="min-w-0">
                <div className="ty-clamp-2 text-xs font-medium text-foreground">{change.title}</div>
                <div className="mt-1 ty-clamp-2 text-[10px] leading-relaxed text-muted-foreground">{locale === "tr" ? change.detailTr : change.detail}</div>
              </div>
            </div>
          )) : <div className="zaf-pulse-empty">{tx(locale, "No stored snapshot difference is available yet.", "Henüz karşılaştırılabilir kayıtlı snapshot farkı bulunmuyor.")}</div>}
        </article>
      </div>

      <div className="zaf-pulse-data-strip mt-3">
        <div>
          <span>{tx(locale, "Activity sample", "Aktivite örneği")}</span>
          <strong>{metricValue(snapshot?.metrics.recentTransactions ?? null, locale)} tx · {metricValue(snapshot?.metrics.recentOperations ?? null, locale)} ops</strong>
        </div>
        <div>
          <span>{tx(locale, "Top operation", "Baskın operasyon")}</span>
          <strong className="capitalize">{topOperation}</strong>
        </div>
        <div>
          <span>{tx(locale, "Observation confidence", "Gözlem güven seviyesi")}</span>
          <strong>{radar?.confidence.score ?? 0}%</strong>
        </div>
        <button type="button" onClick={onOpenRadar}>{tx(locale, "Open analysis center", "Analiz merkezini aç")}</button>
      </div>
    </section>
  );
}
