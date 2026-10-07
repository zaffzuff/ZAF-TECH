"use client";

import type { Locale } from "@/lib/zaf/i18n";
import type { RadarObservation } from "@/lib/zaf/radar";
import type { ZafSnapshot } from "@/lib/zaf/types";

type PulseChange = {
  type: string;
  title: string;
  detail: string;
  detailTr: string;
  category?: string;
};

type PulseChanges = { hasBaseline: boolean; changes: PulseChange[] };

function tx(locale: Locale, en: string, tr: string) { return locale === "tr" ? tr : en; }

function Icon({ kind, size = 18 }: { kind: "pulse" | "rising" | "signal" | "new" | "watch"; size?: number }) {
  const body = {
    pulse: <><path d="M3 12h4l2.1-6 3.2 12 2.1-6H21" /><path d="M3 5v14M21 5v14" opacity=".35" /></>,
    rising: <><path d="M4 17 10 11l4 3 6-7" /><path d="M15 7h5v5" /></>,
    signal: <><circle cx="12" cy="12" r="2" /><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4" /><path d="M4.8 4.8a10.2 10.2 0 0 0 0 14.4M19.2 4.8a10.2 10.2 0 0 1 0 14.4" /></>,
    new: <><path d="M12 3v18M3 12h18" /><circle cx="12" cy="12" r="8.5" /></>,
    watch: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  }[kind];
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{body}</svg>;
}

function Sparkline({ rising }: { rising: boolean }) {
  return <svg className="zaf-sparkline" viewBox="0 0 120 28" preserveAspectRatio="none" aria-hidden="true"><path d={rising ? "M1 23 L18 22 L34 20 L48 21 L63 15 L77 16 L91 10 L104 12 L119 4" : "M1 10 L18 13 L34 9 L48 15 L63 12 L77 18 L91 15 L104 21 L119 19"} /></svg>;
}

export function ZafPulse({ locale, snapshot, radar, changes, onOpenRadar, onOpenDiscover }: {
  locale: Locale;
  snapshot: ZafSnapshot | null;
  radar: RadarObservation | null;
  changes: PulseChanges | null;
  onOpenRadar: () => void;
  onOpenDiscover: () => void;
}) {
  const rising = radar?.signals.filter(s => s.state === "rising").slice(0, 2) ?? [];
  const early = changes?.changes.filter(c => c.category === "signal_added" || c.category === "app_count").slice(0, 3) ?? [];
  const watch = changes?.changes.filter(c => c.category === "source_status" || c.category === "defi_status").slice(0, 2) ?? [];
  const total = radar?.sourceCoverage.total ?? 0;
  const available = radar?.sourceCoverage.available ?? 0;
  const coverage = total ? Math.round((available / total) * 100) : 0;
  const activity = snapshot?.intelligence.activityState ?? "—";

  return <section className="zaf-pulse mt-5 sm:mt-7">
    <div className="zaf-pulse-hero">
      <div className="zaf-pulse-kicker"><span className="zaf-signal-mark"><Icon kind="pulse" size={15} /></span><span>{tx(locale, "PI ECOSYSTEM · OBSERVED", "PI EKOSİSTEMİ · GÖZLEMLENEN")}</span></div>
      <h1 className="zaf-pulse-title mt-3">{tx(locale, "See what is changing across the Pi ecosystem.", "Pi ekosisteminde nelerin değiştiğini görün.")}</h1>
      <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">{tx(locale, "ZAF TECH turns public observations into clear ecosystem signals. It does not predict the future or manufacture hype.", "ZAF TECH herkese açık gözlemleri anlaşılır ekosistem sinyallerine dönüştürür. Geleceği tahmin etmez ve yapay heyecan üretmez.")}</p>
      <div className="zaf-pulse-metrics mt-5">
        <div><span>{tx(locale, "Activity", "Aktivite")}</span><strong>{activity}</strong></div>
        <div><span>{tx(locale, "Coverage", "Kapsam")}</span><strong>{coverage}%</strong></div>
        <div><span>{tx(locale, "Operations", "Operasyon")}</span><strong>{snapshot?.metrics.recentOperations?.toLocaleString() ?? "—"}</strong></div>
      </div>
    </div>

    <div className="zaf-pulse-grid mt-3">
      <article className="zaf-pulse-card zaf-pulse-card-rising">
        <div className="zaf-pulse-card-head"><div className="zaf-pulse-label"><span className="zaf-icon-rising"><Icon kind="rising" size={16} /></span>{tx(locale, "Rising Now", "Şu Anda Yükselen")}</div><button type="button" onClick={onOpenRadar} className="zaf-pulse-link">{tx(locale, "Radar", "Radar")}</button></div>
        {rising.length ? rising.map(s => <div key={s.id} className="zaf-pulse-signal"><div className="min-w-0"><div className="truncate text-xs font-semibold text-foreground">{s.title}</div><div className="mt-1 text-[10px] text-muted-foreground">{s.changePercent == null ? tx(locale, "Observed movement", "Gözlemlenen hareket") : (s.changePercent >= 0 ? "+" : "") + s.changePercent.toFixed(1) + "%"}</div></div><Sparkline rising /></div>) : <div className="zaf-pulse-empty">{tx(locale, "No rising signal meets the current observation threshold.", "Mevcut gözlem eşiğini karşılayan yükselen sinyal yok.")}</div>}
      </article>

      <article className="zaf-pulse-card">
        <div className="zaf-pulse-card-head"><div className="zaf-pulse-label"><span className="zaf-icon-signal"><Icon kind="signal" size={16} /></span>{tx(locale, "Early Signal", "Erken Sinyal")}</div><button type="button" onClick={onOpenRadar} className="zaf-pulse-link">{tx(locale, "Inspect", "İncele")}</button></div>
        {early.length ? early.map(c => <div key={c.type + c.title} className="zaf-pulse-list-row"><span className="zaf-signal-dot" /><div className="min-w-0"><div className="truncate text-xs font-medium text-foreground">{c.title}</div><div className="mt-0.5 truncate text-[10px] text-muted-foreground">{locale === "tr" ? c.detailTr : c.detail}</div></div></div>) : <div className="zaf-pulse-empty">{tx(locale, "A baseline is still forming. Early signals appear after enough observations.", "Temel veri hâlâ oluşuyor. Yeterli gözlemden sonra erken sinyaller görünür.")}</div>}
      </article>

      <article className="zaf-pulse-card">
        <div className="zaf-pulse-card-head"><div className="zaf-pulse-label"><span className="zaf-icon-new"><Icon kind="new" size={16} /></span>{tx(locale, "Latest Activity", "Son Aktivite")}</div><button type="button" onClick={onOpenDiscover} className="zaf-pulse-link">{tx(locale, "Discover", "Keşfet")}</button></div>
        <div className="zaf-pulse-big-number">{snapshot?.metrics.recentTransactions?.toLocaleString() ?? "—"}</div>
        <div className="text-[10px] text-muted-foreground">{tx(locale, "Transactions observed in the current sample", "Mevcut örnekte gözlemlenen işlemler")}</div>
        <Sparkline rising={activity === "rising"} />
      </article>

      <article className="zaf-pulse-card">
        <div className="zaf-pulse-card-head"><div className="zaf-pulse-label"><span className="zaf-icon-watch"><Icon kind="watch" size={16} /></span>{tx(locale, "Watch", "İzle")}</div><button type="button" onClick={onOpenRadar} className="zaf-pulse-link">{tx(locale, "View", "Görüntüle")}</button></div>
        {watch.length ? watch.map(c => <div key={c.type + c.title} className="zaf-pulse-list-row"><span className="zaf-signal-ring" /><div className="min-w-0"><div className="truncate text-xs font-medium text-foreground">{c.title}</div><div className="mt-0.5 truncate text-[10px] text-muted-foreground">{locale === "tr" ? c.detailTr : c.detail}</div></div></div>) : <div className="zaf-pulse-empty">{tx(locale, "Nothing requires special attention in the current public observations.", "Mevcut herkese açık gözlemlerde özel dikkat gerektiren bir durum yok.")}</div>}
      </article>
    </div>

    <div className="zaf-pulse-footer mt-3">
      <div><span className="zaf-confidence-bar"><span style={{ width: String(radar?.confidence.score ?? 0) + "%" }} /></span><span>{tx(locale, "Observation confidence", "Gözlem güven seviyesi")} {radar?.confidence.score ?? 0}%</span></div>
      <button type="button" onClick={onOpenRadar}>{tx(locale, "Open full intelligence view", "Tam istihbarat görünümünü aç")}</button>
    </div>
  </section>;
}
