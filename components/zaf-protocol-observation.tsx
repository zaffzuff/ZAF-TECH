"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/zaf/i18n";
import { intlLocale } from "@/lib/zaf/i18n";

type ProtocolHistoryPoint = {
  generatedAt: string;
  protocolVersion: number;
  networkLedger: string | null;
};

type ProtocolTransition = {
  from: number;
  to: number;
  observedAt: string;
  previousObservedAt: string | null;
};

type ProtocolHistoryResponse = {
  points: ProtocolHistoryPoint[];
  transitions: ProtocolTransition[];
  latestStoredProtocol: number | null;
  previousStoredProtocol: number | null;
};

type Props = {
  locale: Locale;
  currentProtocol: number | null;
  currentObservedAt: string | null;
  tr: (en: string, trText: string) => string;
};

function age(value: string | null, locale: Locale) {
  if (!value) return "—";
  const ms = Date.now() - Date.parse(value);
  if (!Number.isFinite(ms)) return "—";
  const min = Math.max(0, Math.floor(ms / 60000));
  if (locale === "tr") return min < 1 ? "Az Önce" : min < 60 ? `${min} dk önce` : `${Math.floor(min / 60)} sa önce`;
  return min < 1 ? "Just Now" : min < 60 ? `${min}m ago` : `${Math.floor(min / 60)}h ago`;
}

function formatObservedAt(value: string | null, locale: Locale) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleString(intlLocale(locale));
}

export function ZafProtocolObservation({ locale, currentProtocol, currentObservedAt, tr }: Props) {
  const [history, setHistory] = useState<ProtocolHistoryResponse | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch("/api/zaf/protocol-history", { cache: "no-store" });
        const body = await response.json();
        if (active) {
          setHistory({
            points: Array.isArray(body?.points) ? body.points : [],
            transitions: Array.isArray(body?.transitions) ? body.transitions : [],
            latestStoredProtocol: typeof body?.latestStoredProtocol === "number" ? body.latestStoredProtocol : null,
            previousStoredProtocol: typeof body?.previousStoredProtocol === "number" ? body.previousStoredProtocol : null,
          });
        }
      } catch {
        if (active) setHistory(null);
      }
    };

    void load();
    const id = window.setInterval(() => void load(), 60000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  const effectiveProtocol = currentProtocol ?? history?.latestStoredProtocol ?? null;
  const hasLiveStoredGap = currentProtocol != null && history?.latestStoredProtocol != null && currentProtocol !== history.latestStoredProtocol;
  const latestTransition = history?.transitions.at(-1) ?? null;

  return (
    <div className="mt-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-foreground">{tr("Protocol Observation", "Protokol Gözlemi")}</div>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            {tr(
              "Tracks protocol versions actually observed in ZAF TECH's persisted Mainnet snapshots.",
              "ZAF TECH'in kayıtlı Mainnet snapshot'larında gerçekten gözlemlenen protokol sürümlerini takip eder."
            )}
          </p>
        </div>
        <span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground">
          {effectiveProtocol == null ? "—" : `v${effectiveProtocol}`}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border border-border p-3">
          <div className="text-lg font-bold ty-nums text-foreground">{effectiveProtocol == null ? "—" : `v${effectiveProtocol}`}</div>
          <div className="mt-1 text-[10px] font-medium text-foreground">{tr("Current Observed", "Mevcut Gözlenen")}</div>
          <div className="mt-1 text-[9px] text-muted-foreground">{age(currentObservedAt, locale)}</div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-lg font-bold ty-nums text-foreground">{history?.previousStoredProtocol == null ? "—" : `v${history.previousStoredProtocol}`}</div>
          <div className="mt-1 text-[10px] font-medium text-foreground">{tr("Previous Stored", "Önceki Kayıtlı")}</div>
          <div className="mt-1 text-[9px] text-muted-foreground">{tr("Latest distinct prior value", "Son farklı önceki değer")}</div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-lg font-bold ty-nums text-foreground">{history?.transitions.length ?? 0}</div>
          <div className="mt-1 text-[10px] font-medium text-foreground">{tr("Recorded Transitions", "Kayıtlı Geçişler")}</div>
          <div className="mt-1 text-[9px] text-muted-foreground">{tr("In loaded history", "Yüklenen geçmişte")}</div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-lg font-bold ty-nums text-foreground">{history?.points.length ?? 0}</div>
          <div className="mt-1 text-[10px] font-medium text-foreground">{tr("Protocol Points", "Protokol Noktaları")}</div>
          <div className="mt-1 text-[9px] text-muted-foreground">{tr("Stored observations", "Kayıtlı gözlemler")}</div>
        </div>
      </div>

      {hasLiveStoredGap ? (
        <div className="mt-3 rounded-lg border border-border bg-background p-3 text-[10px] leading-relaxed text-muted-foreground">
          {tr(
            `The live observation is v${currentProtocol}, while the newest persisted protocol point is v${history?.latestStoredProtocol}. The history will reflect the newer value after the next persisted snapshot.`,
            `Canlı gözlem v${currentProtocol}, en yeni kayıtlı protokol noktası ise v${history?.latestStoredProtocol}. Yeni değer bir sonraki kayıtlı snapshot sonrasında tarihçeye yansır.`
          )}
        </div>
      ) : null}

      {latestTransition ? (
        <div className="mt-3 rounded-lg border border-border bg-background p-3">
          <div className="text-[10px] font-medium text-foreground">{tr("Latest Recorded Change", "Son Kayıtlı Değişim")}</div>
          <div className="mt-1 text-base font-bold ty-nums text-foreground">
            v{latestTransition.from} → v{latestTransition.to}
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            {tr("Observed", "Gözlemlendi")}: {formatObservedAt(latestTransition.observedAt, locale)}
            {latestTransition.previousObservedAt ? ` · ${tr("Previous point", "Önceki nokta")}: ${age(latestTransition.previousObservedAt, locale)}` : ""}
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-border bg-background p-3 text-[10px] leading-relaxed text-muted-foreground">
          {tr(
            "No protocol transition has been recorded in the loaded history yet. ZAF TECH does not infer a change from a single current sample.",
            "Yüklenen geçmişte henüz protokol geçişi kaydedilmedi. ZAF TECH tek bir güncel örnekten değişim çıkarmaz."
          )}
        </div>
      )}

      <div className="mt-3 rounded-lg border border-border p-3">
        <div className="text-[10px] font-medium text-foreground">{tr("Recent Protocol Observations", "Son Protokol Gözlemleri")}</div>
        <div className="mt-2 space-y-1.5">
          {(history?.points ?? []).slice(0, 8).map(point => (
            <div key={point.generatedAt} className="grid grid-cols-[1fr_auto_auto] gap-2 text-[10px]">
              <span className="text-muted-foreground">{age(point.generatedAt, locale)}</span>
              <span className="font-medium text-foreground">v{point.protocolVersion}</span>
              <span className="text-muted-foreground">{point.networkLedger ? `#${point.networkLedger}` : "—"}</span>
            </div>
          ))}
          {!history?.points.length ? (
            <div className="text-[10px] text-muted-foreground">
              {tr("No persisted protocol observations are available yet.", "Henüz kayıtlı protokol gözlemi bulunmuyor.")}
            </div>
          ) : null}
        </div>
      </div>

      <p className="mt-3 text-[9px] leading-relaxed text-muted-foreground">
        {tr(
          "Boundary: this panel reports protocol versions observed in public Mainnet data. It does not mean every Pi Node has upgraded, and it does not inspect your local Docker node.",
          "Sınır: bu panel herkese açık Mainnet verisinde gözlemlenen protokol sürümlerini raporlar. Her Pi Node'un yükseltildiği anlamına gelmez ve yerel Docker Node'unuzu incelemez."
        )}
      </p>
    </div>
  );
}
