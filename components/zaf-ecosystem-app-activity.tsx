"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/zaf/i18n";
import { intlLocale, translate } from "@/lib/zaf/i18n";

type AppObservation = {
  name: string;
  url: string;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  observationCount: number;
  seenInPreviousSnapshot: boolean;
  currentlyObserved: boolean;
};

type ResponsePayload = {
  generatedAt: string;
  configured: boolean;
  currentCount: number;
  previousSnapshotAt: string | null;
  historicalSnapshotCount: number;
  apps: AppObservation[];
  newApps: AppObservation[];
  notPresentInLatest: AppObservation[];
};

function age(value: string | null, locale: Locale) {
  if (!value) return "—";
  const ms = Date.now() - Date.parse(value);
  if (!Number.isFinite(ms)) return "—";
  const min = Math.max(0, Math.floor(ms / 60000));
  if (locale === "tr") return min < 1 ? "Az önce" : min < 60 ? `${min} dk önce` : `${Math.floor(min / 60)} sa önce`;
  return min < 1 ? "Just now" : min < 60 ? `${min}m ago` : `${Math.floor(min / 60)}h ago`;
}

function date(value: string | null, locale: Locale) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toLocaleString(intlLocale(locale)) : "—";
}

export function ZafEcosystemAppActivity({ locale, tr }: { locale: Locale; tr: (en: string, trText: string) => string }) {
  const [data, setData] = useState<ResponsePayload | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/zaf/ecosystem/apps", { cache: "no-store" });
        const body = await response.json();
        if (!active) return;
        setData(response.ok ? body : null);
      } catch {
        if (active) setData(null);
      }
    };
    void load();
    const id = window.setInterval(() => void load(), 60000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  return (
    <section className="mt-5 sm:mt-7">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">{tr("App Activity", "Uygulama Aktivitesi")}</h2>
        <p className="text-[11px] text-muted-foreground">{tr("Tracks changes between persisted public ecosystem snapshots. Missing from one snapshot does not prove an app was removed.", "Kayıtlı herkese açık ekosistem snapshot'ları arasındaki değişimleri izler. Bir snapshot'ta görünmemesi uygulamanın kaldırıldığını kanıtlamaz.")}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-3"><div className="text-xl font-bold ty-nums text-foreground">{data?.currentCount ?? "—"}</div><div className="mt-1 text-[10px] font-medium text-foreground">{tr("Currently Observed", "Şu An Gözlemlenen")}</div></div>
        <div className="rounded-xl border border-border bg-card p-3"><div className="text-xl font-bold ty-nums text-foreground">{data?.newApps.length ?? "—"}</div><div className="mt-1 text-[10px] font-medium text-foreground">{tr("New vs Previous", "Öncekiye Göre Yeni")}</div></div>
        <div className="rounded-xl border border-border bg-card p-3"><div className="text-xl font-bold ty-nums text-foreground">{data?.notPresentInLatest.length ?? "—"}</div><div className="mt-1 text-[10px] font-medium text-foreground">{tr("Not In Latest", "Son Gözlemde Yok")}</div></div>
        <div className="rounded-xl border border-border bg-card p-3"><div className="text-xl font-bold ty-nums text-foreground">{data?.historicalSnapshotCount ?? "—"}</div><div className="mt-1 text-[10px] font-medium text-foreground">{tr("Historical Snapshots", "Tarihsel Snapshot")}</div></div>
      </div>

      {data?.previousSnapshotAt ? (
        <div className="mt-3 rounded-xl border border-border bg-background p-3 text-[10px] text-muted-foreground">
          {tr("Compared with previous persisted snapshot", "Önceki kayıtlı snapshot ile karşılaştırılıyor")}: {date(data.previousSnapshotAt, locale)}
        </div>
      ) : null}

      <div className="mt-3 rounded-xl border border-border bg-card p-4">
        <div className="text-xs font-semibold text-foreground">{tr("Newly Observed Apps", "Yeni Gözlemlenen Uygulamalar")}</div>
        <div className="mt-3 space-y-2">
          {(data?.newApps ?? []).slice(0, 20).map(app => (
            <div key={app.url} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0"><div className="truncate text-[11px] font-semibold text-foreground">{app.name}</div><div className="mt-0.5 truncate text-[9px] text-muted-foreground">{app.url}</div></div>
                <span className="shrink-0 text-[9px] text-muted-foreground">{age(app.firstSeenAt, locale)}</span>
              </div>
            </div>
          ))}
          {!data?.newApps.length ? <div className="text-[10px] text-muted-foreground">{tr("No newly observed apps were detected against the previous snapshot.", "Önceki snapshot'a göre yeni gözlemlenen uygulama tespit edilmedi.")}</div> : null}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card p-4">
        <div className="text-xs font-semibold text-foreground">{tr("Observed App History", "Gözlemlenen Uygulama Geçmişi")}</div>
        <div className="mt-3 space-y-1.5">
          {(data?.apps ?? []).slice(0, 30).map(app => (
            <div key={app.url} className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <div className="truncate text-[11px] font-semibold text-foreground">{app.name}</div>
                <div className="mt-1 truncate text-[9px] text-muted-foreground">{app.url}</div>
              </div>
              <div className="text-right text-[9px] text-muted-foreground">
                <div>{app.observationCount} {tr("snapshots", "snapshot")}</div>
                <div>{tr("First", "İlk")}: {date(app.firstSeenAt, locale)}</div>
                <div>{tr("Last", "Son")}: {date(app.lastSeenAt, locale)}</div>
              </div>
            </div>
          ))}
          {!data?.apps.length ? <div className="text-[10px] text-muted-foreground">{tr("No persisted app observations are available yet.", "Henüz kayıtlı uygulama gözlemi bulunmuyor.")}</div> : null}
        </div>
      </div>

      {data?.notPresentInLatest.length ? (
        <div className="mt-3 rounded-xl border border-border bg-card p-4">
          <div className="text-xs font-semibold text-foreground">{tr("Not Present In Latest Source Response", "Son Kaynak Yanıtında Bulunmayanlar")}</div>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{tr("These apps were present in the previous stored response but are not present in the latest one. This can reflect source filtering, rendering changes or temporary availability; it is not a removal claim.", "Bu uygulamalar önceki kayıtlı yanıtta vardı ancak son yanıtta bulunmuyor. Bu; kaynak filtresi, görüntüleme değişikliği veya geçici erişilebilirlik kaynaklı olabilir; kaldırılma iddiası değildir.")}</p>
          <div className="mt-3 space-y-1.5">
            {data.notPresentInLatest.slice(0, 20).map(app => <div key={app.url} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5"><span className="truncate text-[10px] text-foreground">{app.name}</span><span className="shrink-0 text-[9px] text-muted-foreground">{age(app.lastSeenAt, locale)}</span></div>)}
          </div>
        </div>
      ) : null}

      <div className="mt-3 rounded-xl border border-border bg-card p-4 text-[10px] leading-relaxed text-muted-foreground">
        {translate(locale, "Boundary: app activity is based on the public ecosystem source responses that ZAF TECH can read. It does not claim access to Pi's internal ranking or moderation systems.", "Sınır: uygulama aktivitesi ZAF TECH'in okuyabildiği herkese açık ekosistem kaynak yanıtlarına dayanır. Pi'nin dahili sıralama veya moderasyon sistemlerine erişim iddiası değildir.")}
      </div>
    </section>
  );
}
