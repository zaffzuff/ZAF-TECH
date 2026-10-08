"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/zaf/i18n";
import { intlLocale } from "@/lib/zaf/i18n";
import { ZafComingSoon } from "@/components/zaf-coming-soon";

type LaunchpadEvidence = {
  id: string;
  token: string;
  project: string;
  networkScope: "testnet";
  phase: "completed-testnet-launch";
  publishedAt: string;
  participationSummary: string;
  tokenSupplySummary: string;
  observedDesignNotes: string[];
  sourceUrl: string;
};

type Payload = {
  generatedAt: string;
  networkScope: "testnet";
  sourceState: "published-evidence" | "unavailable";
  live: { available: false; source: null; note: string };
  currentOfficialStatus: {
    stage: "testnet-iteration";
    mainnetStatus: "not-observed";
    sourceUrl: string;
    sourceDate: string;
  };
  launches: LaunchpadEvidence[];
  notes: string[];
};

export function ZafLaunchpadObservatory({ locale, tr }: { locale: Locale; tr: (en: string, trText: string) => string; }) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/zaf/launchpad?network=testnet", { cache: "no-store" });
        const body = await response.json();
        if (active) setData(response.ok ? body : null);
      } catch {
        if (active) setData(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const launches = data?.launches ?? [];

  return (
    <section className="mt-5 sm:mt-7">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">{tr("Launchpad Observatory", "Launchpad Gözlem Merkezi")}</h2>
        <p className="text-[11px] text-muted-foreground">{tr("A read-only observation layer separating published Pi Launchpad evidence from live launch data.", "Yayınlanmış Pi Launchpad kanıtlarını canlı launch verisinden ayıran salt-okunur gözlem katmanı.")}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="text-xl font-bold text-foreground">{loading ? "…" : "Testnet"}</div>
          <div className="mt-1 text-[10px] font-medium text-foreground">{tr("Current Scope", "Mevcut Kapsam")}</div>
          <div className="mt-1 text-[9px] text-muted-foreground">{tr("Officially described stage", "Resmi olarak tanımlanan aşama")}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="text-xl font-bold ty-nums text-foreground">{loading ? "…" : launches.length.toLocaleString(intlLocale(locale))}</div>
          <div className="mt-1 text-[10px] font-medium text-foreground">{tr("Published Test Tokens", "Yayınlanmış Test Tokenları")}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="text-xl font-bold text-foreground">{loading ? "…" : tr("No Feed", "Akış Yok")}</div>
          <div className="mt-1 text-[10px] font-medium text-foreground">{tr("Live Launchpad Feed", "Canlı Launchpad Akışı")}</div>
          <div className="mt-1 text-[9px] text-muted-foreground">{tr("No direct public API wired", "Doğrudan herkese açık API bağlı değil")}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="text-xl font-bold text-foreground">{loading ? "…" : tr("Not Observed", "Gözlemlenmedi")}</div>
          <div className="mt-1 text-[10px] font-medium text-foreground">{tr("Mainnet Launchpad", "Mainnet Launchpad")}</div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-foreground">{tr("Published Launch Evidence", "Yayınlanmış Launch Kanıtları")}</div>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{tr("These records summarize figures and mechanics published by Pi Network. They are not reconstructed from live chain transactions.", "Bu kayıtlar Pi Network tarafından yayınlanan rakam ve mekanizmaların özetidir. Canlı zincir işlemlerinden yeniden oluşturulmamıştır.")}</p>
          </div>
          <span className="rounded-full border border-border px-2 py-1 text-[9px] text-muted-foreground">published-evidence</span>
        </div>

        <div className="mt-3 space-y-3">
          {launches.map(launch => (
            <article key={launch.id} className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="break-words text-sm font-semibold text-foreground">{launch.token}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">{launch.project}</div>
                </div>
                <span className="rounded-full border border-border px-2 py-0.5 text-[9px] text-muted-foreground">Testnet</span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="text-[9px] font-medium text-muted-foreground">{tr("Participation Evidence", "Katılım Kanıtı")}</div>
                  <div className="mt-1 text-[10px] leading-relaxed text-foreground">{launch.participationSummary}</div>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="text-[9px] font-medium text-muted-foreground">{tr("Token Evidence", "Token Kanıtı")}</div>
                  <div className="mt-1 text-[10px] leading-relaxed text-foreground">{launch.tokenSupplySummary}</div>
                </div>
              </div>
              <div className="mt-3">
                <div className="text-[9px] font-medium text-muted-foreground">{tr("Observed Design Notes", "Gözlemlenen Tasarım Notları")}</div>
                <div className="mt-1 space-y-1">{launch.observedDesignNotes.map(note => <div key={note} className="text-[10px] leading-relaxed text-muted-foreground">• {note}</div>)}</div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[9px] text-muted-foreground">
                <span>{new Date(launch.publishedAt).toLocaleDateString(intlLocale(locale))}</span>
                <a href={launch.sourceUrl} target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-2">{tr("Official Source", "Resmi Kaynak")}</a>
              </div>
            </article>
          ))}
          {!launches.length ? <div className="text-[10px] text-muted-foreground">{tr("No published Launchpad evidence is currently loaded.", "Yayınlanmış Launchpad kanıtı şu anda yüklenemedi.")}</div> : null}
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="sr-only">{tr("Mainnet Readiness", "Mainnet Hazırlığı")}</div>
        <div className="space-y-2"><ZafComingSoon locale={locale} title={tr("Mainnet Launchpad Observation", "Mainnet Launchpad Gözlemi")} detail={tr("Mainnet launchpad activity will remain disabled until a reliable public source can be observed.", "Mainnet Launchpad aktivitesi güvenilir bir herkese açık kaynak gözlemlenebilir hale gelene kadar pasif kalacaktır.")} />{data?.currentOfficialStatus ? <a href={data.currentOfficialStatus.sourceUrl} target="_blank" rel="noreferrer" className="text-[9px] text-foreground underline underline-offset-2">{tr("Current Official Status Source", "Güncel Resmi Durum Kaynağı")}</a> : null}</div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs font-semibold text-foreground">{tr("Live Data Boundary", "Canlı Veri Sınırı")}</div>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{tr("ZAF TECH currently reports published evidence only. A missing live Launchpad feed is not treated as proof that Launchpad is inactive or unavailable on the network.", "ZAF TECH şu anda yalnızca yayınlanmış kanıtları raporlar. Canlı Launchpad akışının bulunmaması, Launchpad'in ağ üzerinde pasif veya kullanılamaz olduğunun kanıtı olarak kabul edilmez.")}</p>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card p-4 text-[10px] leading-relaxed text-muted-foreground">{tr("Boundary: Testnet tokens are educational/test artifacts. No market cap, USD value, Mainnet supply, or network-wide Launchpad volume is inferred from these published records.", "Sınır: Testnet tokenları eğitim/test amaçlı varlıklardır. Bu yayınlanmış kayıtlardan market cap, USD değeri, Mainnet arzı veya ağ genelindeki Launchpad hacmi çıkarılmaz.")}</div>
    </section>
  );
}
