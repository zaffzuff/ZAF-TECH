"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/zaf/i18n";
import { intlLocale } from "@/lib/zaf/i18n";
import { ZafComingSoon } from "@/components/zaf-coming-soon";

type StakingResponse = {
  generatedAt: string;
  availability: {
    network: "mainnet";
    rankingRelation: string;
    broadPublicFeed: "not-observed";
    developerApiScope: "app-specific-whitelist";
  };
  publishedEvidence: Array<{
    app: string;
    amountPi: number;
    observedAt: string;
    sourceUrl: string;
    note: string;
  }>;
  nextDataTargets: string[];
};

export function ZafEcosystemStaking({ locale, tr }: { locale: Locale; tr: (en: string, trText: string) => string }) {
  const [data, setData] = useState<StakingResponse | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/zaf/ecosystem/staking", { cache: "no-store" });
        const body = await response.json();
        if (active) setData(response.ok ? body : null);
      } catch {
        if (active) setData(null);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  return (
    <section className="mt-5 sm:mt-7">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">{tr("Ecosystem Directory Staking", "Ekosistem Dizini Staking")}</h2>
        <p className="text-[11px] text-muted-foreground">{tr("A dedicated observability layer for app-support staking, ranking signals and historical staking evidence.", "Uygulama destek staking'i, sıralama sinyalleri ve tarihsel staking kanıtları için özel gözlem katmanı.")}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-3"><div className="text-xl font-bold text-foreground">{data?.availability.network === "mainnet" ? "Mainnet" : "—"}</div><div className="mt-1 text-[10px] font-medium text-foreground">{tr("Staking Network", "Staking Ağı")}</div></div>
        <div className="rounded-xl border border-border bg-card p-3"><div className="text-xl font-bold text-foreground">{data?.availability.rankingRelation ? tr("Observed", "Gözlemlenen") : "—"}</div><div className="mt-1 text-[10px] font-medium text-foreground">{tr("Ranking Relationship", "Sıralama İlişkisi")}</div></div>
        <div className="rounded-xl border border-border bg-card p-3"><div className="text-xl font-bold text-foreground">{data?.availability.broadPublicFeed === "not-observed" ? tr("Limited", "Sınırlı") : "—"}</div><div className="mt-1 text-[10px] font-medium text-foreground">{tr("Broad Public Feed", "Genel Herkese Açık Akış")}</div></div>
        <div className="rounded-xl border border-border bg-card p-3"><div className="text-xl font-bold text-foreground">{data?.publishedEvidence.length ?? "—"}</div><div className="mt-1 text-[10px] font-medium text-foreground">{tr("Published Evidence", "Yayınlanmış Kanıt")}</div></div>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card p-4">
        <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{tr("Coming Soon target", "Yaklaşan hedef")}</div>
        <div className="text-xs font-semibold text-foreground">{tr("Live Data Boundary", "Canlı Veri Sınırı")}</div>
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
          {tr("Pi documents that Ecosystem Directory Staking affects an app or service's directory ranking. The current developer staking-data API is app-specific and initially whitelist-gated, so ZAF TECH does not assume it can query a complete ecosystem-wide stake feed.", "Pi belgelerine göre Ecosystem Directory Staking bir uygulama veya hizmetin dizin sıralamasını etkiler. Mevcut geliştirici staking-data API'si uygulamaya özeldir ve başlangıçta whitelist gerektirir; bu nedenle ZAF TECH tüm ekosistemi kapsayan bir stake akışını varmış gibi kabul etmez.")}
        </p>
        <div className="mt-3 rounded-lg border border-border bg-background p-3 text-[10px] leading-relaxed text-muted-foreground">
          <ZafComingSoon locale={locale} title={tr("Per-App Staking Observation", "Uygulama Bazlı Staking Gözlemi")} detail={tr("Per-app stake, effective stake, ranking changes and historical staking trends will be enabled when a public, verifiable source is available.", "Uygulama bazlı stake, effective stake, sıralama değişimleri ve tarihsel staking trendleri herkese açık, doğrulanabilir bir kaynak bulunduğunda etkinleştirilecektir.")} />
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card p-4">
        <div className="text-xs font-semibold text-foreground">{tr("Published Staking Evidence", "Yayınlanmış Staking Kanıtları")}</div>
        <div className="mt-3 space-y-2">
          {(data?.publishedEvidence ?? []).map(item => (
            <div key={item.app + item.observedAt} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="break-words text-[11px] font-semibold text-foreground">{item.app}</div>
                  <div className="mt-1 text-xs font-bold ty-nums text-foreground">{item.amountPi.toLocaleString(intlLocale(locale))} Pi</div>
                </div>
                <span className="text-[9px] text-muted-foreground">{new Date(item.observedAt).toLocaleDateString(intlLocale(locale))}</span>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{item.note}</p>
              <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[10px] font-medium text-foreground underline underline-offset-2">{tr("Open Official Source", "Resmi Kaynağı Aç")}</a>
            </div>
          ))}
          {!data?.publishedEvidence.length ? <div className="text-[10px] text-muted-foreground">{tr("No published staking evidence loaded.", "Yüklenmiş yayınlanmış staking kanıtı yok.")}</div> : null}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card p-4">
        <div className="text-xs font-semibold text-foreground">{tr("Next Observable Targets", "Sonraki Gözlemlenebilir Hedefler")}</div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(data?.nextDataTargets ?? []).map(target => <div key={target} className="rounded-lg border border-border p-3 text-[10px] text-muted-foreground">{target}</div>)}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card p-4 text-[10px] leading-relaxed text-muted-foreground">
        {tr("Boundary: staking amount and ranking values are not invented when a verifiable ecosystem-wide public feed is unavailable. Historical official statements remain labeled as published evidence rather than live measurements.", "Sınır: doğrulanabilir bir ekosistem-geneli herkese açık akış yoksa staking miktarı ve sıralama değerleri uydurulmaz. Tarihsel resmi açıklamalar canlı ölçüm değil, yayınlanmış kanıt olarak etiketlenir.")}
      </div>
    </section>
  );
}
