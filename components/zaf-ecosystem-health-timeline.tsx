"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/zaf/i18n";
import { intlLocale, translate } from "@/lib/zaf/i18n";
import type { ZafSnapshot } from "@/lib/zaf/types";
import type { RadarObservation } from "@/lib/zaf/radar";

type HealthOverview = {
  configured: boolean;
  generatedAt?: string;
  latestCheckedAt: string | null;
  summary: { checked: number; averageScore: number | null; healthy: number; degraded: number; limited: number; offline: number; declining: number; improving: number; stale: number; attention: number } | null;
};

function fmtDate(value: string | null | undefined, locale: Locale) {
  return value ? new Date(value).toLocaleString(intlLocale(locale), { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}

export function ZafEcosystemHealthTimeline({ locale, snapshot, radar }: { locale: Locale; snapshot: ZafSnapshot | null; radar: RadarObservation | null }) {
  const [overview, setOverview] = useState<HealthOverview | null>(null);
  const tr = (en: string, trText: string) => translate(locale, en, trText);

  useEffect(() => {
    let active = true;
    fetch("/api/apps/health/overview", { cache: "no-store" })
      .then(response => response.ok ? response.json() as Promise<HealthOverview> : null)
      .then(value => { if (active) setOverview(value); })
      .catch(() => { if (active) setOverview(null); });
    return () => { active = false; };
  }, []);

  const sourceCoverage = radar ? radar.sourceCoverage.available + "/" + radar.sourceCoverage.total : "—";
  const appSummary = overview?.summary;
  const signals = [
    { label: tr("Network Activity", "Ağ Aktivitesi"), detail: snapshot ? (snapshot.metrics.observedTransactionsPerDay == null ? "—" : Math.round(snapshot.metrics.observedTransactionsPerDay).toLocaleString(intlLocale(locale)) + " tx/day · " + (snapshot.metrics.observedOperationsPerDay == null ? "—" : Math.round(snapshot.metrics.observedOperationsPerDay).toLocaleString(intlLocale(locale)) + " ops/day")) : "—", time: snapshot?.generatedAt ?? null, state: snapshot?.intelligence.activityState ?? "—" },
    { label: tr("Public Source Coverage", "Herkese Açık Kaynak Kapsamı"), detail: sourceCoverage, time: radar?.generatedAt ?? null, state: radar?.confidence.level ?? "—" },
    { label: tr("Stored App Health", "Kayıtlı Uygulama Sağlığı"), detail: appSummary?.averageScore == null ? "—" : appSummary.averageScore + "/100 · " + appSummary.attention + " " + tr("attention", "dikkat"), time: overview?.latestCheckedAt ?? null, state: appSummary ? appSummary.healthy + " " + tr("healthy", "sağlıklı") : "—" },
    { label: tr("Health Movement", "Sağlık Hareketi"), detail: appSummary ? appSummary.declining + " " + tr("declining", "gerileyen") + " · " + appSummary.improving + " " + tr("improving", "iyileşen") : "—", time: overview?.latestCheckedAt ?? null, state: appSummary?.stale ? appSummary.stale + " " + tr("stale", "eski") : tr("Current", "Güncel") },
  ];

  return <div className="mt-3 rounded-xl border border-border bg-card p-4">
    <div className="text-xs font-semibold text-foreground">{tr("Ecosystem Health Timeline", "Ekosistem Sağlık Zaman Çizelgesi")}</div>
    <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{tr("A cross-signal view of observable network activity, public source coverage and stored application health. Values keep their original measurement scope.", "Gözlemlenebilir ağ aktivitesi, herkese açık kaynak kapsamı ve kayıtlı uygulama sağlığının çapraz sinyal görünümüdür. Değerler kendi ölçüm kapsamlarını korur.")}</p>
    <div className="mt-3 space-y-2">
      {signals.map((signal, index) => (
        <div key={signal.label} className="flex gap-3">
          <div className="flex w-4 flex-col items-center">
            <span className="mt-1.5 h-2 w-2 rounded-full bg-foreground" />
            {index < signals.length - 1 ? <span className="mt-1 h-full w-px bg-border" /> : null}
          </div>
          <div className="min-w-0 flex-1 rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 break-words text-[10px] font-semibold text-foreground">{signal.label}</div>
              <div className="shrink-0 text-[9px] text-muted-foreground">{fmtDate(signal.time, locale)}</div>
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">{signal.detail}</div>
            <div className="mt-1 text-[9px] text-muted-foreground">{signal.state}</div>
          </div>
        </div>
      ))}
    </div>
    <div className="mt-3 rounded-lg border border-border bg-background p-3 text-[9px] leading-relaxed text-muted-foreground">
      {tr("Node Connector diagnostics and wallet analytics are intentionally not merged into this ecosystem-wide timeline: Node data is local-machine scoped and wallet data is address scoped.", "Node Connector tanılamaları ve cüzdan analitiği bu ekosistem geneli zaman çizelgesine bilinçli olarak birleştirilmez: Node verisi yerel makine kapsamındadır, cüzdan verisi ise adres kapsamındadır.")}
    </div>
  </div>;
}
