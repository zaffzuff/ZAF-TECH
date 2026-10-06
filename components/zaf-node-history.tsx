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

function label(locale: Locale, value: "Healthy" | "Available" | "Available With Warnings" | "Unavailable" | "Average" | "Maximum" | "Incoming" | "Outgoing" | "Time" | "Status" | "Pending" | "Restarts" | "Incoming / outgoing peer history") {
  const labels: Record<typeof value, [string, string, string, string, string, string, string, string, string]> = {
    Healthy: ["Healthy", "Sağlıklı", "Saludable", "健康", "Sano", "Sain", "Gesund", "Saudável", "Здоровый"],
    Available: ["Available", "Çalışıyor", "Disponible", "可用", "Disponibile", "Disponible", "Verfügbar", "Disponível", "Доступно"],
    "Available With Warnings": ["Available With Warnings", "Çalışıyor, Uyarılar Var", "Disponible con advertencias", "可用但有警告", "Disponibile con avvisi", "Disponible avec avertissements", "Verfügbar mit Warnungen", "Disponível com avisos", "Доступно с предупреждениями"],
    Unavailable: ["Unavailable", "Kullanılamıyor", "No disponible", "不可用", "Non disponibile", "Indisponible", "Nicht verfügbar", "Indisponível", "Недоступно"],
    Average: ["Average", "Ortalama", "Promedio", "平均", "Media", "Moyenne", "Durchschnitt", "Média", "Среднее"],
    Maximum: ["Maximum", "Maksimum", "Máximo", "最大值", "Massimo", "Maximum", "Maximum", "Máximo", "Максимум"],
    Incoming: ["Incoming", "Gelen", "Entrante", "传入", "In entrata", "Entrant", "Eingehend", "Recebido", "Входящий"],
    Outgoing: ["Outgoing", "Giden", "Saliente", "传出", "In uscita", "Sortant", "Ausgehend", "Enviado", "Исходящий"],
    Time: ["Time", "Zaman", "Hora", "时间", "Ora", "Heure", "Zeit", "Hora", "Время"],
    Status: ["Status", "Durum", "Estado", "状态", "Stato", "Statut", "Status", "Status", "Статус"],
    Pending: ["Pending", "Bekleyen", "Pendiente", "待处理", "In attesa", "En attente", "Ausstehend", "Pendente", "Ожидает"],
    Restarts: ["Restarts", "Yeniden Başlatma", "Reinicios", "重启", "Riavvii", "Redémarrages", "Neustarts", "Reinícios", "Перезапуски"],
    "Incoming / outgoing peer history": ["Incoming / outgoing peer history", "Gelen / giden peer geçmişi", "Historial de peers entrantes / salientes", "传入 / 传出节点历史", "Cronologia peer in entrata / uscita", "Historique des pairs entrants / sortants", "Verlauf eingehender / ausgehender Peers", "Histórico de peers recebidos / enviados", "История входящих / исходящих пиров"],
  };
  const index = locale === "tr" ? 1 : locale === "es" ? 2 : locale === "zh" ? 3 : locale === "it" ? 4 : locale === "fr" ? 5 : locale === "de" ? 6 : locale === "pt" ? 7 : locale === "ru" ? 8 : 0;
  return labels[value][index];
}

function historyLabel(locale: Locale, value: "24h" | "7d" | "30d" | "Availability" | "Avg Incoming" | "Avg Outgoing" | "Samples" | "Stability" | "Health Changes" | "Observation Coverage" | "Connector Cadence Unavailable" | "Operational Stability" | "Node Health Summary" | "Ledger Age" | "Authenticated" | "Intersection" | "Uptime & Restart History" | "availability" | "Restarts Observed" | "Docker Count" | "Recent Uptime Timeline" | "Port Health History" | "Local Listeners" | "Local Port Listener History" | "Collecting Port Observations…" | "Host Resources" | "Local Windows Resource Snapshot" | "Node Container Resources" | "Network I/O & WSL" | "Host Rate" | "WSL Not Detected" | "Max" | "Peer History Chart" | "Collecting Enough Observations For The Chart…" | "Listeners" | "Connector / Node unavailable" | "SCP is not EXTERNALIZE" | "Quorum Intersection Is Not True" | "Ledger Age is 10s or higher" | "Fewer Than 8 Authenticated Peers" | "Node Performance History") {
  const labels: Record<typeof value, [string,string,string,string,string,string,string,string,string]> = {
    "24h":["24h","24s","24 h","24小时","24h","24 h","24 Std.","24h","24ч"], "7d":["7d","7g","7 d","7天","7g","7 j","7 Tg.","7d","7д"], "30d":["30d","30g","30 d","30天","30g","30 j","30 Tg.","30d","30д"],
    "Availability":["Availability","Erişilebilirlik","Disponibilidad","可用性","Disponibilità","Disponibilité","Verfügbarkeit","Disponibilidade","Доступность"],
    "Avg Incoming":["Avg Incoming","Ort. Gelen","Prom. entrante","平均传入","Media entrata","Moy. entrant","Ø eingehend","Méd. recebido","Ср. входящий"],
    "Avg Outgoing":["Avg Outgoing","Ort. Giden","Prom. saliente","平均传出","Media uscita","Moy. sortant","Ø ausgehend","Méd. enviado","Ср. исходящий"],
    Samples:["Samples","Örnekler","Muestras","样本","Campioni","Échantillons","Stichproben","Amostras","Образцы"],
    Stability:["Stability","Stabilite","Estabilidad","稳定性","Stabilità","Stabilité","Stabilität","Estabilidade","Стабильность"],
    "Health Changes":["Health Changes","Sağlık Değişimleri","Cambios de salud","健康变化","Cambiamenti salute","Évolutions de santé","Gesundheitsänderungen","Alterações de saúde","Изменения здоровья"],
    "Observation Coverage":["Observation Coverage","Gözlem Kapsamı","Cobertura de observación","观测覆盖率","Copertura osservazioni","Couverture d’observation","Beobachtungsabdeckung","Cobertura de observação","Охват наблюдений"],
    "Connector Cadence Unavailable":["Connector Cadence Unavailable","Connector Örnekleme Bilgisi Yok","Cadencia del Connector no disponible","Connector 采样频率不可用","Cadenza Connector non disponibile","Cadence du Connector indisponible","Connector-Takt nicht verfügbar","Cadência do Connector indisponível","Частота Connector недоступна"],
    "Operational Stability":["Operational Stability","Operasyonel Stabilite","Estabilidad operativa","运行稳定性","Stabilità operativa","Stabilité opérationnelle","Betriebsstabilität","Estabilidade operacional","Операционная стабильность"],
    "Node Health Summary":["Node Health Summary","Node Sağlık Özeti","Resumen de salud del Node","Node 健康摘要","Riepilogo salute Node","Résumé de santé du Node","Node-Gesundheitsübersicht","Resumo de saúde do Node","Сводка состояния Node"],
    "Ledger Age":["Ledger Age","Ledger Yaşı","Antigüedad del ledger","账本年龄","Età del ledger","Âge du ledger","Ledger-Alter","Idade do ledger","Возраст леджера"],
    Authenticated:["Authenticated","Doğrulanmış","Autenticados","已认证","Autenticati","Authentifiés","Authentifiziert","Autenticados","Аутентифицированные"],
    Intersection:["Intersection","Kesişim","Intersección","交集","Intersezione","Intersection","Schnittmenge","Interseção","Пересечение"],
    "Uptime & Restart History":["Uptime & Restart History","Çalışma Süresi Ve Yeniden Başlatma Geçmişi","Historial de actividad y reinicios","运行时间和重启历史","Cronologia uptime e riavvii","Historique de disponibilité et redémarrages","Betriebszeit- und Neustartverlauf","Histórico de atividade e reinícios","История работы и перезапусков"],
    availability:["availability","erişilebilirlik","disponibilidad","可用性","disponibilità","disponibilité","Verfügbarkeit","disponibilidade","доступность"],
    "Restarts Observed":["Restarts Observed","Gözlenen Yeniden Başlatmalar","Reinicios observados","检测到的重启","Riavvii osservati","Redémarrages observés","Beobachtete Neustarts","Reinícios observados","Наблюдаемые перезапуски"],
    "Docker Count":["Docker Count","Docker Sayacı","Conteo Docker","Docker 计数","Conteggio Docker","Compteur Docker","Docker-Anzahl","Contagem Docker","Счётчик Docker"],
    "Recent Uptime Timeline":["Recent Uptime Timeline","Son Çalışma Süresi Zaman Çizelgesi","Cronología reciente de actividad","近期运行时间线","Cronologia uptime recente","Chronologie récente de disponibilité","Letzter Betriebszeitverlauf","Linha do tempo recente","Недавняя шкала работы"],
    "Port Health History":["Port Health History","Port Sağlık Geçmişi","Historial de salud de puertos","端口健康历史","Cronologia salute porte","Historique santé des ports","Port-Gesundheitsverlauf","Histórico de saúde das portas","История состояния портов"],
    "Local Listeners":["Local Listeners","Yerel Dinleyiciler","Escuchas locales","本地监听","Listener locali","Écouteurs locaux","Lokale Listener","Listeners locais","Локальные слушатели"],
    "Local Port Listener History":["Local Port Listener History","Yerel Port Dinleyici Geçmişi","Historial de listeners de puertos locales","本地端口监听历史","Cronologia listener porte locali","Historique des écouteurs de ports locaux","Verlauf lokaler Port-Listener","Histórico de listeners locais","История локальных слушателей портов"],
    "Collecting Port Observations…":["Collecting Port Observations…","Port Gözlemleri Toplanıyor…","Recopilando observaciones de puertos…","正在收集端口观测…","Raccolta osservazioni porte…","Collecte des observations de ports…","Portbeobachtungen werden gesammelt…","Coletando observações de portas…","Сбор наблюдений портов…"],
    "Host Resources":["Host Resources","Ana Bilgisayar Kaynakları","Recursos del host","主机资源","Risorse host","Ressources hôte","Host-Ressourcen","Recursos do host","Ресурсы хоста"],
    "Local Windows Resource Snapshot":["Local Windows Resource Snapshot","Yerel Windows Kaynak Anlık Görüntüsü","Instantánea de recursos de Windows local","本地 Windows 资源快照","Snapshot risorse Windows locali","Instantané des ressources Windows locales","Lokaler Windows-Ressourcen-Snapshot","Instantâneo de recursos do Windows local","Снимок ресурсов локальной Windows"],
    "Node Container Resources":["Node Container Resources","Node Container Kaynakları","Recursos del contenedor Node","Node 容器资源","Risorse container Node","Ressources du conteneur Node","Node-Container-Ressourcen","Recursos do contêiner Node","Ресурсы контейнера Node"],
    "Network I/O & WSL":["Network I/O & WSL","Ağ I/O Ve WSL","E/S de red y WSL","网络 I/O 与 WSL","I/O rete e WSL","E/S réseau et WSL","Netzwerk-I/O & WSL","I/O de rede e WSL","Сетевой I/O и WSL"],
    "Host Rate":["Host Rate","Host Hızı","Tasa del host","主机速率","Velocità host","Débit hôte","Host-Rate","Taxa do host","Скорость хоста"],
    "WSL Not Detected":["WSL Not Detected","WSL Algılanmadı","WSL no detectado","未检测到 WSL","WSL non rilevato","WSL non détecté","WSL nicht erkannt","WSL não detectado","WSL не обнаружен"],
    Max:["Max","Maks.","Máx.","最大","Max","Max.","Max.","Máx.","Макс."],
    "Peer History Chart":["Peer History Chart","Peer Geçmişi Grafiği","Gráfico del historial de peers","Peer 历史图表","Grafico cronologia peer","Graphique historique des pairs","Peer-Verlaufsdiagramm","Gráfico do histórico de peers","График истории пиров"],
    "Collecting Enough Observations For The Chart…":["Collecting Enough Observations For The Chart…","Grafik İçin Yeterli Gözlem Toplanıyor…","Recopilando observaciones suficientes para el gráfico…","正在收集足够的观测以生成图表…","Raccolta di osservazioni sufficienti per il grafico…","Collecte d’observations suffisantes pour le graphique…","Es werden genügend Beobachtungen für das Diagramm gesammelt…","Coletando observações suficientes para o gráfico…","Собирается достаточно наблюдений для графика"],
    Listeners:["Listeners","Dinleyiciler","Listeners","监听器","Listener","Écouteurs","Listener","Listeners","Слушатели"],
    "Connector / Node unavailable":["Connector / Node unavailable","Connector / Node kullanılamıyor","Connector / Node no disponible","Connector / Node 不可用","Connector / Node non disponibile","Connector / Node indisponible","Connector / Node nicht verfügbar","Connector / Node indisponível","Connector / Node недоступен"],
    "SCP is not EXTERNALIZE":["SCP is not EXTERNALIZE","SCP EXTERNALIZE değil","SCP no está en EXTERNALIZE","SCP 不是 EXTERNALIZE","SCP non è EXTERNALIZE","SCP n’est pas EXTERNALIZE","SCP ist nicht EXTERNALIZE","SCP não está em EXTERNALIZE","SCP не EXTERNALIZE"],
    "Quorum Intersection Is Not True":["Quorum Intersection Is Not True","Quorum Intersection True Değil","La intersección del quórum no es verdadera","Quorum 交集不为真","L’intersezione del quorum non è vera","L’intersection du quorum n’est pas vraie","Quorum-Intersection ist nicht wahr","A interseção do quórum não é verdadeira","Пересечение кворума не истинно"],
    "Ledger Age is 10s or higher":["Ledger Age is 10s or higher","Ledger Yaşı 10s veya daha yüksek","La antigüedad del ledger es de 10 s o más","账本年龄为 10 秒或更高","L’età del ledger è di 10s o superiore","L’âge du ledger est de 10 s ou plus","Ledger-Alter beträgt 10 s oder mehr","A idade do ledger é de 10 s ou mais","Возраст леджера 10 с или выше"],
    "Fewer Than 8 Authenticated Peers":["Fewer Than 8 Authenticated Peers","8'den Az Authenticated Peer","Menos de 8 peers autenticados","少于 8 个已认证 peer","Meno di 8 peer autenticati","Moins de 8 pairs authentifiés","Weniger als 8 authentifizierte Peers","Menos de 8 peers autenticados","Менее 8 аутентифицированных пиров"],
    "Node Performance History":["Node Performance History","Node Performans Geçmişi","Historial de rendimiento del Node","Node 性能历史","Cronologia prestazioni Node","Historique des performances du Node","Node-Leistungsverlauf","Histórico de desempenho do Node","История производительности Node"],
  };
  const index=locale==="tr"?1:locale==="es"?2:locale==="zh"?3:locale==="it"?4:locale==="fr"?5:locale==="de"?6:locale==="pt"?7:locale==="ru"?8:0;
  return labels[value][index];
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
    !latest.available ? historyLabel(locale, "Connector / Node unavailable") : null,
    String(latest.quorumPhase || "").toUpperCase() !== "EXTERNALIZE" ? historyLabel(locale, "SCP is not EXTERNALIZE") : null,
    latest.intersection !== true ? historyLabel(locale, "Quorum Intersection Is Not True") : null,
    latest.ledgerAge == null || latest.ledgerAge >= 10 ? historyLabel(locale, "Ledger Age is 10s or higher") : null,
    (latest.authenticated ?? 0) < 8 ? historyLabel(locale, "Fewer Than 8 Authenticated Peers") : null,
  ].filter(Boolean) as string[] : [];
  const hostNetworkRate = rateFromSamples(samples, "hostNetworkReceivedBytes", "hostNetworkSentBytes");
  const chart = samples.slice(-60);
  const maxPeers = Math.max(8, ...chart.flatMap((s) => [s.inbound ?? 0, s.outbound ?? 0]));
  const maxListeners = Math.max(1, ...chart.map((s) => s.listeningPorts ?? 0));

  return (
    <section className="mt-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{historyLabel(locale, "Node Performance History")}</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {tr("Local read-only observations stored by the Connector on this Windows computer.", "Connector tarafından bu Windows bilgisayarda saklanan yerel salt-okunur gözlemler.")}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {([24, 168, 720] as WindowHours[]).map((hours) => (
            <button key={hours} type="button" onClick={() => setWindowHours(hours)}
              className={`rounded-md border px-2.5 py-1.5 text-[10px] font-medium ${windowHours === hours ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:bg-muted"}`}>
              {hours === 24 ? historyLabel(locale, "24h") : hours === 168 ? historyLabel(locale, "7d") : historyLabel(locale, "30d")}
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
              [historyLabel(locale, "Availability"), stats.availability == null ? "—" : `${stats.availability.toFixed(2)}%`],
              [label(locale, "Healthy"), stats.health == null ? "—" : `${stats.health.toFixed(2)}%`],
              [historyLabel(locale, "Avg Incoming"), stats.inbound == null ? "—" : stats.inbound.toFixed(1)],
              [historyLabel(locale, "Avg Outgoing"), stats.outbound == null ? "—" : stats.outbound.toFixed(1)],
              [historyLabel(locale, "Samples"), samples.length.toLocaleString()],
              [historyLabel(locale, "Stability"), stats.stabilityScore == null ? "—" : stats.stabilityScore.toString()],
              [historyLabel(locale, "Health Changes"), stats.healthTransitions.toLocaleString()],
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
                <div className="text-[10px] text-muted-foreground">{historyLabel(locale, "Observation Coverage")}</div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {samples.length ? `${new Date(samples[0].observedAt).toLocaleString(intlLocale(locale))} → ${new Date(samples.at(-1)?.observedAt ?? samples[0].observedAt).toLocaleString(intlLocale(locale))}` : "—"}
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground">
                {payload.sampleIntervalSeconds ? tr(`Target cadence: ${payload.sampleIntervalSeconds}s`, `Hedef örnekleme: ${payload.sampleIntervalSeconds}s`) : historyLabel(locale, "Connector Cadence Unavailable")}
              </div>
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground">
              {tr("The selected window is calculated only from samples actually collected by this Connector.", "Seçilen pencere yalnızca bu Connector tarafından gerçekten toplanan örneklerden hesaplanır.")}
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-border px-3 py-3">
            <div className="text-[10px] text-muted-foreground">{historyLabel(locale, "Operational Stability")}</div>
            <div className="mt-1 text-sm font-semibold text-foreground">
              {stats.stabilityScore == null ? "—" : stats.stabilityScore + "/100"}
            </div>
            <div className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              {tr("Derived only from actual Connector samples using availability, healthy samples, listener coverage, and observed restarts.", "Yalnızca gerçek Connector örneklerinden erişilebilirlik, sağlıklı örnekler, dinleyici kapsamı ve gözlenen yeniden başlatmalar kullanılarak türetilir.")}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-3">
            <div className="rounded-lg border border-border p-3">
              <div className="text-[10px] text-muted-foreground">{historyLabel(locale, "Node Health Summary")}</div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                {latest?.healthy ? label(locale, "Healthy") : latest?.available ? label(locale, "Available With Warnings") : label(locale, "Unavailable")}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded-md border border-border px-2 py-2">
                  <div className="text-muted-foreground">{historyLabel(locale, "Ledger Age")}</div>
                  <div className="mt-0.5 font-medium text-foreground">{latest?.ledgerAge != null ? latest.ledgerAge + "s" : "—"}</div>
                </div>
                <div className="rounded-md border border-border px-2 py-2">
                  <div className="text-muted-foreground">{historyLabel(locale, "Authenticated")}</div>
                  <div className="mt-0.5 font-medium text-foreground">{latest?.authenticated ?? "—"}</div>
                </div>
                <div className="rounded-md border border-border px-2 py-2">
                  <div className="text-muted-foreground">SCP</div>
                  <div className="mt-0.5 font-medium text-foreground">{latest?.quorumPhase || "—"}</div>
                </div>
                <div className="rounded-md border border-border px-2 py-2">
                  <div className="text-muted-foreground">{historyLabel(locale, "Intersection")}</div>
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
              <div className="text-[10px] text-muted-foreground">{historyLabel(locale, "Uptime & Restart History")}</div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                {stats.availability == null ? "—" : stats.availability.toFixed(2) + "% " + historyLabel(locale, "availability")}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded-md border border-border px-2 py-2">
                  <div className="text-muted-foreground">{historyLabel(locale, "Restarts Observed")}</div>
                  <div className="mt-0.5 font-medium text-foreground">{stats.restartEvents}</div>
                </div>
                <div className="rounded-md border border-border px-2 py-2">
                  <div className="text-muted-foreground">{historyLabel(locale, "Docker Count")}</div>
                  <div className="mt-0.5 font-medium text-foreground">{stats.latestRestartCount ?? "—"}</div>
                </div>
              </div>
              <div className="mt-2 flex h-3 gap-px overflow-hidden rounded-sm border border-border" aria-label={historyLabel(locale, "Recent Uptime Timeline")}>
                {chart.map((sample) => (
                  <span
                    key={sample.observedAt}
                    title={sample.healthy ? label(locale, "Healthy") : sample.available ? label(locale, "Available") : label(locale, "Unavailable")}
                    className={sample.healthy ? "flex-1 bg-foreground" : sample.available ? "flex-1 bg-muted-foreground/50" : "flex-1 bg-muted"}
                  />
                ))}
              </div>
              {latestRestarted ? (
                <div className="mt-2 text-[10px] text-muted-foreground">{tr("A restart was detected in the latest sample.", "Son örnekte bir yeniden başlatma algılandı.")}</div>
              ) : null}
            </div>

            <div className="rounded-lg border border-border p-3">
              <div className="text-[10px] text-muted-foreground">{historyLabel(locale, "Port Health History")}</div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                {latest?.listeningPorts ?? "—"}/10 {historyLabel(locale, "Local Listeners")}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded-md border border-border px-2 py-2">
                  <div className="text-muted-foreground">{label(locale, "Average")}</div>
                  <div className="mt-0.5 font-medium text-foreground">{stats.listeners == null ? "—" : stats.listeners.toFixed(1) + "/10"}</div>
                </div>
                <div className="rounded-md border border-border px-2 py-2">
                  <div className="text-muted-foreground">{label(locale, "Maximum")}</div>
                  <div className="mt-0.5 font-medium text-foreground">{stats.maxListeners}/10</div>
                </div>
              </div>
              {chart.length > 1 ? (
                <svg viewBox="0 0 600 80" className="mt-2 h-16 w-full" role="img" aria-label={historyLabel(locale, "Local Port Listener History")}>
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    points={chart.map((s, i) => `${(i / (chart.length - 1)) * 600},${70 - ((s.listeningPorts ?? 0) / maxListeners) * 60}`).join(" ")}
                  />
                </svg>
              ) : (
                <div className="mt-2 text-[10px] text-muted-foreground">{historyLabel(locale, "Collecting Port Observations…")}</div>
              )}
              <div className="mt-1 text-[9px] text-muted-foreground">
                {tr("Local listener checks only; this is not an Internet reachability test.", "Yalnızca Yerel Dinleyici kontrolüdür; Internet erişilebilirlik testi değildir.")}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-3">
            <div className="rounded-lg border border-border p-3">
              <div className="text-[10px] text-muted-foreground">{historyLabel(locale, "Host Resources")}</div>
              <div className="mt-1 grid grid-cols-3 gap-2">
                <div><div className="text-[9px] text-muted-foreground">CPU</div><div className="text-sm font-semibold text-foreground">{resources?.host?.cpuPercent != null ? resources.host.cpuPercent.toFixed(1) + "%" : "—"}</div></div>
                <div><div className="text-[9px] text-muted-foreground">RAM</div><div className="text-sm font-semibold text-foreground">{resources?.host?.memory?.usedPercent != null ? resources.host.memory.usedPercent.toFixed(1) + "%" : "—"}</div></div>
                <div><div className="text-[9px] text-muted-foreground">C:</div><div className="text-sm font-semibold text-foreground">{resources?.host?.disk?.usedPercent != null ? resources.host.disk.usedPercent.toFixed(1) + "%" : "—"}</div></div>
              </div>
              <div className="mt-2 text-[9px] text-muted-foreground">
                {resources?.host?.memory?.usedBytes != null && resources?.host?.memory?.totalBytes != null
                  ? formatBytes(resources.host.memory.usedBytes) + " / " + formatBytes(resources.host.memory.totalBytes) + " RAM"
                  : historyLabel(locale, "Local Windows Resource Snapshot")}
              </div>
            </div>

            <div className="rounded-lg border border-border p-3">
              <div className="text-[10px] text-muted-foreground">{historyLabel(locale, "Node Container Resources")}</div>
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
              <div className="text-[10px] text-muted-foreground">{historyLabel(locale, "Network I/O & WSL")}</div>
              <div className="mt-1 grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded-md border border-border px-2 py-2">
                  <div className="text-muted-foreground">{historyLabel(locale, "Host Rate")}</div>
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
                  : historyLabel(locale, "WSL Not Detected")}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-border p-3">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{label(locale, "Incoming / outgoing peer history")}</span>
              <span>{historyLabel(locale, "Max")}: {stats.maxInbound} / {stats.maxOutbound}</span>
            </div>
            {chart.length > 1 ? (
              <svg viewBox="0 0 600 180" className="mt-2 h-44 w-full" role="img" aria-label={historyLabel(locale, "Peer History Chart")}>
                <line x1="0" y1="160" x2="600" y2="160" stroke="currentColor" strokeOpacity="0.12" />
                <polyline fill="none" stroke="currentColor" strokeWidth="2"
                  points={chart.map((s, i) => `${(i / (chart.length - 1)) * 600},${160 - ((s.inbound ?? 0) / maxPeers) * 140}`).join(" ")} />
                <polyline fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 4" strokeOpacity="0.5"
                  points={chart.map((s, i) => `${(i / (chart.length - 1)) * 600},${160 - ((s.outbound ?? 0) / maxPeers) * 140}`).join(" ")} />
              </svg>
            ) : (
              <div className="flex h-44 items-center justify-center text-[11px] text-muted-foreground">
                {historyLabel(locale, "Collecting Enough Observations For The Chart…")}
              </div>
            )}
            <div className="flex gap-4 text-[10px] text-muted-foreground">
              <span>— {label(locale, "Incoming")}</span><span>-- {label(locale, "Outgoing")}</span>
            </div>
          </div>

          <div className="mt-3 max-w-full overflow-x-auto rounded-lg border border-border ty-no-scrollbar">
            <table className="w-full min-w-[760px] text-left text-[10px]">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{label(locale, "Time")}</th>
                  <th className="px-3 py-2">{label(locale, "Status")}</th>
                  <th className="px-3 py-2">{label(locale, "Incoming")}</th>
                  <th className="px-3 py-2">{label(locale, "Outgoing")}</th>
                  <th className="px-3 py-2">{label(locale, "Pending")}</th>
                  <th className="px-3 py-2">{historyLabel(locale, "Ledger Age")}</th>
                  <th className="px-3 py-2">{historyLabel(locale, "Listeners")}</th>
                  <th className="px-3 py-2">{label(locale, "Restarts")}</th>
                  <th className="px-3 py-2">SCP</th>
                </tr>
              </thead>
              <tbody>
                {samples.slice(-8).reverse().map((s) => (
                  <tr key={s.observedAt} className="border-t border-border">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(s.observedAt).toLocaleString(intlLocale(locale))}</td>
                    <td className="px-3 py-2">{s.healthy ? label(locale, "Healthy") : s.available ? label(locale, "Available") : label(locale, "Unavailable")}</td>
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