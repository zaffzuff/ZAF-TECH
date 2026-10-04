"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/zaf/i18n";
import { intlLocale, translate } from "@/lib/zaf/i18n";

type Sample = {
  observedAt: string;
  available: boolean;
  healthy: boolean;
  ledgerAge?: number | null;
  authenticated?: number | null;
  inbound?: number | null;
  outbound?: number | null;
  pending?: number | null;
  quorumPhase?: string | null;
  intersection?: boolean | null;
  restarts?: number | null;
  listeningPorts?: number | null;
  hostCpuPercent?: number | null;
  hostMemoryUsedPercent?: number | null;
  hostDiskUsedPercent?: number | null;
  hostNetworkReceivedBytes?: number | null;
  hostNetworkSentBytes?: number | null;
  dockerCpuPercent?: number | null;
  dockerMemoryUsedBytes?: number | null;
  dockerMemoryLimitBytes?: number | null;
  dockerMemoryUsedPercent?: number | null;
  dockerNetworkReceivedBytes?: number | null;
  dockerNetworkSentBytes?: number | null;
  dockerPids?: number | null;
  wslAvailable?: boolean | null;
  wslRunningDistros?: number | null;
};

type Payload = {
  version?: string;
  windowDays?: number;
  sampleIntervalSeconds?: number;
  samples?: Sample[];
  error?: string;
};

type WindowHours = 24 | 168 | 720;

type ResourcePayload = {
  host?: {
    cpuPercent?: number | null;
    memory?: { usedPercent?: number | null; usedBytes?: number | null; totalBytes?: number | null };
    disk?: { usedPercent?: number | null; usedBytes?: number | null; totalBytes?: number | null; freeBytes?: number | null; drive?: string };
    network?: { receivedBytes?: number | null; sentBytes?: number | null };
  } | null;
  docker?: {
    cpuPercent?: number | null;
    memory?: { usedPercent?: number | null; usedBytes?: number | null; limitBytes?: number | null };
    network?: { receivedBytes?: number | null; sentBytes?: number | null };
    pids?: number | null;
  } | null;
  wsl?: { available?: boolean; distributions?: Array<{ name: string; state: string; version: number | null }> } | null;
};

function formatBytes(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = value;
  let i = 0;
  while (n >= 1000 && i < units.length - 1) {
    n /= 1000;
    i += 1;
  }
  return (n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)) + " " + units[i];
}

function rateFromSamples(samples: Sample[], rxKey: keyof Sample, txKey: keyof Sample) {
  if (samples.length < 2) return { rx: null, tx: null };
  const current = samples.at(-1);
  const previous = samples.at(-2);
  if (!current || !previous) return { rx: null, tx: null };
  const elapsed = (Date.parse(current.observedAt) - Date.parse(previous.observedAt)) / 1000;
  if (!Number.isFinite(elapsed) || elapsed <= 0) return { rx: null, tx: null };
  const delta = (a: unknown, b: unknown) => typeof a === "number" && typeof b === "number" ? Math.max(0, a - b) / elapsed : null;
  return { rx: delta(current[rxKey], previous[rxKey]), tx: delta(current[txKey], previous[txKey]) };
}

function avg(values: Array<number | null | undefined>) {
  const v = values.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

function pct(samples: Sample[], key: "available" | "healthy") {
  return samples.length ? (samples.filter((s) => s[key]).length / samples.length) * 100 : null;
}

export function ZafNodeHistory({ locale }: { locale: Locale }) {
  const tr = (en: string, trText: string) => translate(locale, en, trText);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [resources, setResources] = useState<ResourcePayload | null>(null);
  const [windowHours, setWindowHours] = useState<WindowHours>(24);

  async function load() {
    const [historyResult, resourceResult] = await Promise.allSettled([
      fetch("http://127.0.0.1:39100/history", { cache: "no-store" }),
      fetch("http://127.0.0.1:39100/resources", { cache: "no-store" }),
    ]);
    if (historyResult.status === "fulfilled" && historyResult.value.ok) {
      setPayload(await historyResult.value.json());
    } else {
      setPayload(null);
    }
    if (resourceResult.status === "fulfilled" && resourceResult.value.ok) {
      setResources(await resourceResult.value.json());
    } else {
      setResources(null);
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const samples = useMemo(() => {
    const cutoff = Date.now() - windowHours * 60 * 60 * 1000;
    return (payload?.samples ?? [])
      .filter((s) => Date.parse(s.observedAt) >= cutoff)
      .sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
  }, [payload, windowHours]);

  const stats = useMemo(() => {
    const restartEvents = samples.reduce((count, sample, index) => {
      if (index === 0) return count;
      const previous = samples[index - 1].restarts;
      const current = sample.restarts;
      return typeof previous === "number" && typeof current === "number" && current > previous
        ? count + current - previous
        : count;
    }, 0);

    const availability = pct(samples, "available");
    const health = pct(samples, "healthy");
    const restartPenalty = Math.min(20, restartEvents * 4);
    const listenerCoverage = samples.length ? (samples.filter((s) => (s.listeningPorts ?? 0) >= 4).length / samples.length) * 10 : 0;
    const stabilityScore = samples.length
      ? Math.round(Math.max(0, Math.min(100, (availability ?? 0) * 0.35 + (health ?? 0) * 0.45 + listenerCoverage - restartPenalty)))
      : null;
    return {
      availability,
      health,
      stabilityScore,
      inbound: avg(samples.map((s) => s.inbound)),
      outbound: avg(samples.map((s) => s.outbound)),
      listeners: avg(samples.map((s) => s.listeningPorts)),
      maxInbound: Math.max(0, ...samples.map((s) => s.inbound ?? 0)),
      maxOutbound: Math.max(0, ...samples.map((s) => s.outbound ?? 0)),
      maxListeners: Math.max(0, ...samples.map((s) => s.listeningPorts ?? 0)),
      restartEvents,
      latestRestartCount: samples.at(-1)?.restarts ?? null,
      healthTransitions: samples.slice(1).reduce((count, sample, index) => count + (sample.healthy !== samples[index].healthy ? 1 : 0), 0),
    };
  }, [samples]);

  const latest = samples.at(-1) ?? null;
  const previous = samples.length > 1 ? samples.at(-2) : null;
  const latestRestarted = Boolean(
    latest &&
    previous &&
    typeof latest.restarts === "number" &&
    typeof previous.restarts === "number" &&
    latest.restarts > previous.restarts
  );
  const latestHealthReasons = latest ? [
    !latest.available ? tr("Connector / Node unavailable", "Connector / Node kullanılamıyor") : null,
    String(latest.quorumPhase || "").toUpperCase() !== "EXTERNALIZE" ? tr("SCP is not EXTERNALIZE", "SCP EXTERNALIZE değil") : null,
    latest.intersection !== true ? tr("Quorum Intersection Is Not True", "Quorum Intersection True Değil") : null,
    latest.ledgerAge == null || latest.ledgerAge >= 10 ? tr("Ledger Age is 10s or higher", "Ledger Yaşı 10s veya daha yüksek") : null,
    (latest.authenticated ?? 0) < 8 ? tr("Fewer Than 8 Authenticated Peers", "8'den Az Authenticated Peer") : null,
  ].filter(Boolean) as string[] : [];
  const hostNetworkRate = rateFromSamples(samples, "hostNetworkReceivedBytes", "hostNetworkSentBytes");
  const chart = samples.slice(-60);
  const maxPeers = Math.max(8, ...chart.flatMap((s) => [s.inbound ?? 0, s.outbound ?? 0]));
  const maxListeners = Math.max(1, ...chart.map((s) => s.listeningPorts ?? 0));

  return (
    <section className="mt-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{tr("Node Performance History", "Node Performans Geçmişi")}</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {tr("Local read-only observations stored by the Connector on this Windows computer.", "Connector tarafından bu Windows bilgisayarda saklanan yerel salt-okunur gözlemler.")}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {([24, 168, 720] as WindowHours[]).map((hours) => (
            <button key={hours} type="button" onClick={() => setWindowHours(hours)}
              className={`rounded-md border px-2.5 py-1.5 text-[10px] font-medium ${windowHours === hours ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:bg-muted"}`}>
              {hours === 24 ? tr("24h", "24s") : hours === 168 ? tr("7d", "7g") : tr("30d", "30g")}
            </button>
          ))}
        </div>
      </div>

      {!payload ? (
        <div className="mt-4 rounded-lg border border-border px-3 py-4 text-[11px] text-muted-foreground">
          {tr("Install and run the current ZAF TECH Node Connector to start collecting Node history.", "Node geçmişini toplamaya başlamak için güncel ZAF TECH Node Connector'ı kurup çalıştırın.")}
        </div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-6">
            {[
              [tr("Availability", "Erişilebilirlik"), stats.availability == null ? "—" : `${stats.availability.toFixed(2)}%`],
              [tr("Healthy", "Sağlıklı"), stats.health == null ? "—" : `${stats.health.toFixed(2)}%`],
              [tr("Avg Incoming", "Ort. Gelen"), stats.inbound == null ? "—" : stats.inbound.toFixed(1)],
              [tr("Avg Outgoing", "Ort. Giden"), stats.outbound == null ? "—" : stats.outbound.toFixed(1)],
              [tr("Samples", "Örnek"), samples.length.toLocaleString()],
              [tr("Stability", "Stabilite"), stats.stabilityScore == null ? "—" : stats.stabilityScore.toString()],
              [tr("Health Changes", "Sağlık Değişimi"), stats.healthTransitions.toLocaleString()],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border px-3 py-3">
                <div className="text-[10px] text-muted-foreground">{label}</div>
                <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-lg border border-border px-3 py-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[10px] text-muted-foreground">{tr("Observation Coverage", "Gözlem Kapsamı")}</div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {samples.length ? `${new Date(samples[0].observedAt).toLocaleString(intlLocale(locale))} → ${new Date(samples.at(-1)?.observedAt ?? samples[0].observedAt).toLocaleString(intlLocale(locale))}` : "—"}
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground">
                {payload.sampleIntervalSeconds ? tr(`Target cadence: ${payload.sampleIntervalSeconds}s`, `Hedef örnekleme: ${payload.sampleIntervalSeconds}s`) : tr("Connector Cadence Unavailable", "Connector Örnekleme Bilgisi Yok")}
              </div>
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground">
              {tr("The selected window is calculated only from samples actually collected by this Connector.", "Seçilen pencere yalnızca bu Connector tarafından gerçekten toplanan örneklerden hesaplanır.")}
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-border px-3 py-3">
            <div className="text-[10px] text-muted-foreground">{tr("Operational Stability", "Operasyonel Stabilite")}</div>
            <div className="mt-1 text-sm font-semibold text-foreground">
              {stats.stabilityScore == null ? "—" : stats.stabilityScore + "/100"}
            </div>
            <div className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              {tr("Derived only from actual Connector samples using availability, healthy samples, listener coverage, and observed restarts.", "Yalnızca gerçek Connector örneklerinden erişilebilirlik, sağlıklı örnekler, dinleyici kapsamı ve gözlenen yeniden başlatmalar kullanılarak türetilir.")}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-3">
            <div className="rounded-lg border border-border p-3">
              <div className="text-[10px] text-muted-foreground">{tr("Node Health Summary", "Node Sağlık Özeti")}</div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                {latest?.healthy ? tr("Healthy", "Sağlıklı") : latest?.available ? tr("Available With Warnings", "Çalışıyor, Uyarılar Var") : tr("Unavailable", "Kullanılamıyor")}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded-md border border-border px-2 py-2">
                  <div className="text-muted-foreground">{tr("Ledger Age", "Ledger Yaşı")}</div>
                  <div className="mt-0.5 font-medium text-foreground">{latest?.ledgerAge != null ? latest.ledgerAge + "s" : "—"}</div>
                </div>
                <div className="rounded-md border border-border px-2 py-2">
                  <div className="text-muted-foreground">{tr("Authenticated", "Authenticated")}</div>
                  <div className="mt-0.5 font-medium text-foreground">{latest?.authenticated ?? "—"}</div>
                </div>
                <div className="rounded-md border border-border px-2 py-2">
                  <div className="text-muted-foreground">SCP</div>
                  <div className="mt-0.5 font-medium text-foreground">{latest?.quorumPhase || "—"}</div>
                </div>
                <div className="rounded-md border border-border px-2 py-2">
                  <div className="text-muted-foreground">{tr("Intersection", "Intersection")}</div>
                  <div className="mt-0.5 font-medium text-foreground">{latest?.intersection == null ? "—" : String(latest.intersection)}</div>
                </div>
              </div>
              {!latest?.healthy && latestHealthReasons.length ? (
                <div className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                  {latestHealthReasons.join(" • ")}
                </div>
              ) : (
                <div className="mt-2 text-[10px] text-muted-foreground">
                  {tr("Current sample meets the configured health indicators.", "Mevcut örnek yapılandırılmış sağlık göstergelerini karşılıyor.")}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border p-3">
              <div className="text-[10px] text-muted-foreground">{tr("Uptime & Restart History", "Çalışma Süresi Ve Yeniden Başlatma Geçmişi")}</div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                {stats.availability == null ? "—" : stats.availability.toFixed(2) + "% " + tr("availability", "erişilebilirlik")}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded-md border border-border px-2 py-2">
                  <div className="text-muted-foreground">{tr("Restarts Observed", "Gözlenen Yeniden Başlatma")}</div>
                  <div className="mt-0.5 font-medium text-foreground">{stats.restartEvents}</div>
                </div>
                <div className="rounded-md border border-border px-2 py-2">
                  <div className="text-muted-foreground">{tr("Docker Count", "Docker Sayacı")}</div>
                  <div className="mt-0.5 font-medium text-foreground">{stats.latestRestartCount ?? "—"}</div>
                </div>
              </div>
              <div className="mt-2 flex h-3 gap-px overflow-hidden rounded-sm border border-border" aria-label={tr("Recent Uptime Timeline", "Son Çalışma Süresi Zaman Çizelgesi")}>
                {chart.map((sample) => (
                  <span
                    key={sample.observedAt}
                    title={sample.healthy ? tr("Healthy", "Sağlıklı") : sample.available ? tr("Available", "Çalışıyor") : tr("Unavailable", "Kullanılamıyor")}
                    className={sample.healthy ? "flex-1 bg-foreground" : sample.available ? "flex-1 bg-muted-foreground/50" : "flex-1 bg-muted"}
                  />
                ))}
              </div>
              {latestRestarted ? (
                <div className="mt-2 text-[10px] text-muted-foreground">{tr("A restart was detected in the latest sample.", "Son örnekte bir yeniden başlatma algılandı.")}</div>
              ) : null}
            </div>

            <div className="rounded-lg border border-border p-3">
              <div className="text-[10px] text-muted-foreground">{tr("Port Health History", "Port Sağlık Geçmişi")}</div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                {latest?.listeningPorts ?? "—"}/10 {tr("Local Listeners", "Yerel Dinleyici")}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded-md border border-border px-2 py-2">
                  <div className="text-muted-foreground">{tr("Average", "Ortalama")}</div>
                  <div className="mt-0.5 font-medium text-foreground">{stats.listeners == null ? "—" : stats.listeners.toFixed(1) + "/10"}</div>
                </div>
                <div className="rounded-md border border-border px-2 py-2">
                  <div className="text-muted-foreground">{tr("Maximum", "Maksimum")}</div>
                  <div className="mt-0.5 font-medium text-foreground">{stats.maxListeners}/10</div>
                </div>
              </div>
              {chart.length > 1 ? (
                <svg viewBox="0 0 600 80" className="mt-2 h-16 w-full" role="img" aria-label={tr("Local Port Listener History", "Yerel Port Dinleyici Geçmişi")}>
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    points={chart.map((s, i) => `${(i / (chart.length - 1)) * 600},${70 - ((s.listeningPorts ?? 0) / maxListeners) * 60}`).join(" ")}
                  />
                </svg>
              ) : (
                <div className="mt-2 text-[10px] text-muted-foreground">{tr("Collecting Port Observations…", "Port Gözlemleri Toplanıyor…")}</div>
              )}
              <div className="mt-1 text-[9px] text-muted-foreground">
                {tr("Local listener checks only; this is not an Internet reachability test.", "Yalnızca Yerel Dinleyici kontrolüdür; Internet erişilebilirlik testi değildir.")}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-3">
            <div className="rounded-lg border border-border p-3">
              <div className="text-[10px] text-muted-foreground">{tr("Host Resources", "Ana Bilgisayar Kaynakları")}</div>
              <div className="mt-1 grid grid-cols-3 gap-2">
                <div><div className="text-[9px] text-muted-foreground">CPU</div><div className="text-sm font-semibold text-foreground">{resources?.host?.cpuPercent != null ? resources.host.cpuPercent.toFixed(1) + "%" : "—"}</div></div>
                <div><div className="text-[9px] text-muted-foreground">RAM</div><div className="text-sm font-semibold text-foreground">{resources?.host?.memory?.usedPercent != null ? resources.host.memory.usedPercent.toFixed(1) + "%" : "—"}</div></div>
                <div><div className="text-[9px] text-muted-foreground">C:</div><div className="text-sm font-semibold text-foreground">{resources?.host?.disk?.usedPercent != null ? resources.host.disk.usedPercent.toFixed(1) + "%" : "—"}</div></div>
              </div>
              <div className="mt-2 text-[9px] text-muted-foreground">
                {resources?.host?.memory?.usedBytes != null && resources?.host?.memory?.totalBytes != null
                  ? formatBytes(resources.host.memory.usedBytes) + " / " + formatBytes(resources.host.memory.totalBytes) + " RAM"
                  : tr("Local Windows Resource Snapshot", "Yerel Windows Kaynak Anlık Görüntüsü")}
              </div>
            </div>

            <div className="rounded-lg border border-border p-3">
              <div className="text-[10px] text-muted-foreground">{tr("Node Container Resources", "Node Container Kaynakları")}</div>
              <div className="mt-1 grid grid-cols-3 gap-2">
                <div><div className="text-[9px] text-muted-foreground">CPU</div><div className="text-sm font-semibold text-foreground">{resources?.docker?.cpuPercent != null ? resources.docker.cpuPercent.toFixed(1) + "%" : "—"}</div></div>
                <div><div className="text-[9px] text-muted-foreground">RAM</div><div className="text-sm font-semibold text-foreground">{resources?.docker?.memory?.usedPercent != null ? resources.docker.memory.usedPercent.toFixed(1) + "%" : "—"}</div></div>
                <div><div className="text-[9px] text-muted-foreground">PIDs</div><div className="text-sm font-semibold text-foreground">{resources?.docker?.pids ?? "—"}</div></div>
              </div>
              <div className="mt-2 text-[9px] text-muted-foreground">
                {resources?.docker?.memory?.usedBytes != null && resources?.docker?.memory?.limitBytes != null
                  ? formatBytes(resources.docker.memory.usedBytes) + " / " + formatBytes(resources.docker.memory.limitBytes) + " RAM"
                  : tr("Docker Stats For The Local Node Container", "Yerel Node Container İçin Docker İstatistikleri")}
              </div>
            </div>

            <div className="rounded-lg border border-border p-3">
              <div className="text-[10px] text-muted-foreground">{tr("Network I/O & WSL", "Ağ I/O Ve WSL")}</div>
              <div className="mt-1 grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded-md border border-border px-2 py-2">
                  <div className="text-muted-foreground">{tr("Host Rate", "Host Hızı")}</div>
                  <div className="mt-0.5 font-medium text-foreground">
                    {hostNetworkRate.rx != null && hostNetworkRate.tx != null
                      ? formatBytes(hostNetworkRate.rx) + "/s ↓ · " + formatBytes(hostNetworkRate.tx) + "/s ↑"
                      : "—"}
                  </div>
                </div>
                <div className="rounded-md border border-border px-2 py-2">
                  <div className="text-muted-foreground">{tr("Node Container", "Node Container")}</div>
                  <div className="mt-0.5 font-medium text-foreground">
                    {resources?.docker?.network?.receivedBytes != null && resources?.docker?.network?.sentBytes != null
                      ? formatBytes(resources.docker.network.receivedBytes) + " ↓ · " + formatBytes(resources.docker.network.sentBytes) + " ↑"
                      : "—"}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-[9px] text-muted-foreground">
                {resources?.wsl?.available
                  ? tr("WSL Active Distributions: " + (resources.wsl.distributions?.filter((d) => d.state === "running").length ?? 0), "WSL Çalışan Dağıtımlar: " + (resources.wsl.distributions?.filter((d) => d.state === "running").length ?? 0))
                  : tr("WSL Not Detected", "WSL Algılanmadı")}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-border p-3">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{tr("Incoming / outgoing peer history", "Gelen / giden peer geçmişi")}</span>
              <span>{tr("Max", "Maks.")}: {stats.maxInbound} / {stats.maxOutbound}</span>
            </div>
            {chart.length > 1 ? (
              <svg viewBox="0 0 600 180" className="mt-2 h-44 w-full" role="img" aria-label={tr("Peer History Chart", "Peer Geçmişi Grafiği")}>
                <line x1="0" y1="160" x2="600" y2="160" stroke="currentColor" strokeOpacity="0.12" />
                <polyline fill="none" stroke="currentColor" strokeWidth="2"
                  points={chart.map((s, i) => `${(i / (chart.length - 1)) * 600},${160 - ((s.inbound ?? 0) / maxPeers) * 140}`).join(" ")} />
                <polyline fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 4" strokeOpacity="0.5"
                  points={chart.map((s, i) => `${(i / (chart.length - 1)) * 600},${160 - ((s.outbound ?? 0) / maxPeers) * 140}`).join(" ")} />
              </svg>
            ) : (
              <div className="flex h-44 items-center justify-center text-[11px] text-muted-foreground">
                {tr("Collecting Enough Observations For The Chart…", "Grafik İçin Yeterli Gözlem Toplanıyor…")}
              </div>
            )}
            <div className="flex gap-4 text-[10px] text-muted-foreground">
              <span>— {tr("Incoming", "Gelen")}</span><span>-- {tr("Outgoing", "Giden")}</span>
            </div>
          </div>

          <div className="mt-3 max-w-full overflow-x-auto rounded-lg border border-border ty-no-scrollbar">
            <table className="w-full min-w-[760px] text-left text-[10px]">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{tr("Time", "Zaman")}</th>
                  <th className="px-3 py-2">{tr("Status", "Durum")}</th>
                  <th className="px-3 py-2">{tr("Incoming", "Gelen")}</th>
                  <th className="px-3 py-2">{tr("Outgoing", "Giden")}</th>
                  <th className="px-3 py-2">{tr("Pending", "Bekleyen")}</th>
                  <th className="px-3 py-2">{tr("Ledger Age", "Ledger Yaşı")}</th>
                  <th className="px-3 py-2">{tr("Listeners", "Dinleyici")}</th>
                  <th className="px-3 py-2">{tr("Restarts", "Yeniden Başlatma")}</th>
                  <th className="px-3 py-2">SCP</th>
                </tr>
              </thead>
              <tbody>
                {samples.slice(-8).reverse().map((s) => (
                  <tr key={s.observedAt} className="border-t border-border">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(s.observedAt).toLocaleString(intlLocale(locale))}</td>
                    <td className="px-3 py-2">{s.healthy ? tr("Healthy", "Sağlıklı") : s.available ? tr("Available", "Çalışıyor") : tr("Unavailable", "Kullanılamıyor")}</td>
                    <td className="px-3 py-2">{s.inbound ?? "—"}</td>
                    <td className="px-3 py-2">{s.outbound ?? "—"}</td>
                    <td className="px-3 py-2">{s.pending ?? "—"}</td>
                    <td className="px-3 py-2">{s.ledgerAge != null ? `${s.ledgerAge}s` : "—"}</td>
                    <td className="px-3 py-2">{s.listeningPorts != null ? `${s.listeningPorts}/10` : "—"}</td>
                    <td className="px-3 py-2">{s.restarts ?? "—"}</td>
                    <td className="px-3 py-2">{s.quorumPhase || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
            {tr(
              "Availability is based on Connector observations. Healthy follows Stellar Core's documented indicators: Synced!, ledger age under 10 seconds, at least 8 authenticated peers, EXTERNALIZE, and quorum intersection true.",
              "Erişilebilirlik Connector gözlemlerine dayanır. Sağlıklı durumu Stellar Core'un belgelenmiş göstergelerini izler: Synced!, 10 saniyenin altında ledger yaşı, en az 8 authenticated peer, EXTERNALIZE ve quorum intersection true."
            )}
          </p>
        </>
      )}
    </section>
  );
}