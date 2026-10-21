"use client";

import { translateObservationReason } from "@/lib/zaf/observation-copy";
import type { ZafSnapshot } from "@/lib/zaf/types";
import type { LiveObservationFreshness } from "@/lib/zaf/use-observation-freshness";
import { intlLocale, translate, type Locale } from "@/lib/zaf/i18n";

export function ZafObservationStatus({ snapshot, locale, loading, freshness: evidence, showDetails = false }: { snapshot: ZafSnapshot | null; locale: Locale; loading: boolean; freshness: LiveObservationFreshness; showDetails?: boolean }) {
  const tr = (en: string, turkish: string) => translate(locale, en, turkish);
  const state = evidence.state;
  const label = loading ? tr("Checking observations", "Gözlemler kontrol ediliyor")
    : state === "fresh" ? tr("Recent ledger observed", "Yeni ledger gözlemlendi")
    : state === "aging" ? translateObservationReason(locale, "Observation awaiting update")
    : state === "stale" ? tr("Data delayed · last observation", "Veri gecikmeli · son gözlem")
    : tr("Currentness unknown", "Güncellik bilinmiyor");
  const time = (value?: string | null) => value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString(intlLocale(locale), { timeZone: "UTC", dateStyle: "short", timeStyle: "medium" }) + " UTC" : "—";
  return <div className="mt-3 text-[11px] text-muted-foreground">
    <div role="status" className="flex flex-wrap items-center justify-end gap-2">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${loading || state === "unknown" ? "bg-muted-foreground" : state === "fresh" ? "bg-ty-active" : "bg-amber-500"}`} aria-hidden="true" />
      <span>{label}</span>
      {evidence.ready && evidence.generatedAt ? <span>· {evidence.ageSeconds}s</span> : null}
    </div>
    {showDetails ? <details key="home-source" className="mt-2 rounded-xl border border-border bg-card p-3">
      <summary className="cursor-pointer font-medium text-foreground">{tr("Source, time and sample", "Kaynak, zaman ve örneklem")}</summary>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <div><dt>{tr("Source", "Kaynak")}</dt><dd><a className="underline" href="https://api.mainnet.minepi.com/" target="_blank" rel="noreferrer">Pi Mainnet Horizon</a></dd></div>
        <div><dt>{tr("Collected", "Toplandı")}</dt><dd>{time(snapshot?.generatedAt)}</dd></div>
        <div><dt>{tr("Latest ledger closed", "Son ledger kapanışı")}</dt><dd>{time(snapshot?.latestLedger?.closedAt)}</dd></div>
        <div><dt>{tr("Sample", "Örneklem")}</dt><dd>{snapshot ? `${snapshot.recentLedgers.length} ledgers · ${snapshot.transactions.length} tx · ${snapshot.operations.length} ops` : "—"}</dd></div>
      </dl>
      <p className="mt-3">{tr("Daily rates are extrapolated from the ledger sample, not a full day's count. Source reachability does not establish directory coverage or app safety. Delayed data remains visible with its original time.", "Günlük hızlar ledger örneğinden hesaplanır; tam gün toplamı değildir. Kaynağın erişilebilir olması dizin kapsamını veya uygulama güvenliğini kanıtlamaz. Gecikmiş veri özgün zamanı ile gösterilir.")}</p>
    </details> : null}
  </div>;
}
