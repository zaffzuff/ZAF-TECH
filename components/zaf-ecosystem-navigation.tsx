"use client";

import { useId } from "react";
import type { Locale } from "@/lib/zaf/i18n";

export type ZafSection = "overview" | "discover" | "network" | "intelligence" | "wallet";

export const ZAF_SECTION_TABS: Record<ZafSection, readonly string[]> = {
  overview: ["Pulse", "Ecosystem"],
  discover: ["App Directory", "App Health", "App Activity", "Staking", "Tools"],
  network: ["Network", "Testnet Assets", "DeFi", "DEX", "AMM & Pools", "Tokens", "Launchpad", "Node", "Node History", "SoloHost", "Compute", "Infrastructure"],
  intelligence: ["Radar", "Trust", "Activity Signals", "Graph", "Explorer"],
  wallet: [],
};

const labels: Record<string, [string, string, string, string, string, string, string, string, string]> = {
  Overview: ["Pulse", "Pulse", "Pulse", "Pulse", "Pulse", "Pulse", "Pulse", "Pulse", "Pulse"],
  Pulse: ["Pulse", "Pulse", "Pulse", "Pulse", "Pulse", "Pulse", "Pulse", "Pulse", "Pulse"],
  Network: ["Network", "Ağ", "Red", "网络", "Rete", "Réseau", "Netzwerk", "Rede", "Сеть"],
  Ecosystem: ["Ecosystem", "Ekosistem", "Ecosistema", "生态系统", "Ecosistema", "Écosystème", "Ökosystem", "Ecossistema", "Экосистема"],
  Tools: ["Tools", "Araçlar", "Herramientas", "工具", "Strumenti", "Outils", "Werkzeuge", "Ferramentas", "Инструменты"],
  Apps: ["Apps", "Uygulamalar", "Aplicaciones", "应用", "App", "Applications", "Apps", "Aplicativos", "Приложения"],
  Testnet: ["Testnet", "Testnet", "Testnet", "测试网", "Testnet", "Testnet", "Testnet", "Testnet", "Тестнет"],
  DeFi: ["DeFi", "DeFi", "DeFi", "DeFi", "DeFi", "DeFi", "DeFi", "DeFi", "DeFi"],
  "App Directory": ["App Directory", "Uygulama Dizini", "Directorio De Apps", "应用目录", "Elenco App", "Annuaire Des Apps", "App-Verzeichnis", "Diretório De Apps", "Каталог Приложений"],
  "App Health": ["App Health", "Uygulama Sağlığı", "Salud De Apps", "应用健康", "Salute App", "Santé Des Apps", "App-Gesundheit", "Saúde Dos Apps", "Состояние Приложений"],
  "App Activity": ["App Activity", "Uygulama Aktivitesi", "Actividad De Apps", "应用活动", "Attività App", "Activité Des Apps", "App-Aktivität", "Atividade De Apps", "Активность Приложений"],
  Assets: ["Assets", "Varlıklar", "Activos", "资产", "Asset", "Actifs", "Vermögenswerte", "Ativos", "Активы"],
  "Testnet Assets": ["Testnet Assets", "Testnet Varlıkları", "Activos De Testnet", "测试网资产", "Asset Testnet", "Actifs Testnet", "Testnet-Assets", "Ativos Testnet", "Активы Тестнета"],
  DEX: ["DEX", "DEX", "DEX", "DEX", "DEX", "DEX", "DEX", "DEX", "DEX"],
  "AMM & Pools": ["AMM & Pools", "AMM & Havuzlar", "AMM Y Pools", "AMM 与池", "AMM & Pool", "AMM & Pools", "AMM & Pools", "AMM & Pools", "AMM и Пулы"],
  Tokens: ["Tokens", "Tokenlar", "Tokens", "代币", "Token", "Tokens", "Token", "Tokens", "Токены"],
  Launchpad: ["Launchpad", "Launchpad", "Launchpad", "Launchpad", "Launchpad", "Launchpad", "Launchpad", "Launchpad", "Лаунчпад"],
  Staking: ["Staking", "Staking", "Staking", "质押", "Staking", "Staking", "Staking", "Staking", "Стейкинг"],
  "Node & Compute": ["Node & Compute", "Node & Hesaplama", "Node Y Cómputo", "节点与计算", "Node E Calcolo", "Node Et Calcul", "Node & Computing", "Node E Computação", "Node И Вычисления"],
  Node: ["Node", "Node", "Node", "节点", "Node", "Node", "Node", "Node", "Node"],
  "Node History": ["Node History", "Node Geçmişi", "Historial Del Node", "节点历史", "Cronologia Node", "Historique Du Node", "Node-Verlauf", "Histórico Do Node", "История Node"],
  SoloHost: ["SoloHost", "SoloHost", "SoloHost", "SoloHost", "SoloHost", "SoloHost", "SoloHost", "SoloHost", "SoloHost"],
  Compute: ["Compute", "Hesaplama", "Cómputo", "计算", "Calcolo", "Calcul", "Berechnung", "Computação", "Вычисления"],
  Infrastructure: ["Infrastructure", "Altyapı", "Infraestructura", "基础设施", "Infrastruttura", "Infrastructure", "Infrastruktur", "Infraestrutura", "Инфраструктура"],
  Observatory: ["Observatory", "Gözlem Merkezi", "Observatorio", "观测中心", "Osservatorio", "Observatoire", "Beobachtungszentrum", "Observatório", "Наблюдательный Центр"],
  Radar: ["Radar", "Radar", "Radar", "雷达", "Radar", "Radar", "Radar", "Radar", "Радар"],
  Trust: ["Trust", "Trust", "Trust", "信任", "Trust", "Confiance", "Vertrauen", "Confiança", "Доверие"],
  "Activity Signals": ["Activity Signals", "Aktivite Sinyalleri", "Señales De Actividad", "活动信号", "Segnali Di Attività", "Signaux D’activité", "Aktivitätssignale", "Sinais De Atividade", "Сигналы Активности"],
  Graph: ["Graph", "Graf", "Gráfico", "图谱", "Grafo", "Graphe", "Graph", "Grafo", "Граф"],
  Explorer: ["Explorer", "Explorer", "Explorador", "浏览器", "Esplora", "Explorateur", "Explorer", "Explorador", "Обозреватель"],
  Wallet: ["Wallet", "Cüzdan", "Billetera", "钱包", "Wallet", "Portefeuille", "Wallet", "Carteira", "Кошелёк"],
  Discover: ["Discover", "Keşfet", "Descubrir", "发现", "Scopri", "Découvrir", "Entdecken", "Descobrir", "Обзор"],
  Intelligence: ["Intelligence", "İstihbarat", "Inteligencia", "智能", "Intelligenza", "Intelligence", "Intelligenz", "Inteligência", "Интеллект"],
  "Network Core": ["Network Core", "Ağ Temeli", "Núcleo De Red", "网络核心", "Nucleo Rete", "Noyau Réseau", "Netzwerk-Kern", "Núcleo Da Rede", "Ядро Сети"],
  Testnet: ["Testnet", "Testnet", "Testnet", "测试网", "Testnet", "Testnet", "Testnet", "Testnet", "Тестнет"],
  "DeFi": ["DeFi", "DeFi", "DeFi", "DeFi", "DeFi", "DeFi", "DeFi", "DeFi", "DeFi"],
  "Node & Compute": ["Node & Compute", "Node & Hesaplama", "Node Y Cómputo", "节点与计算", "Node E Calcolo", "Node Et Calcul", "Node & Computing", "Node E Computação", "Node И Вычисления"],
};

function label(value: string, locale: Locale) {
  const pair = labels[value] ?? [value, value, value, value, value, value, value, value, value];
  const index = locale === "tr" ? 1 : locale === "es" ? 2 : locale === "zh" ? 3 : locale === "it" ? 4 : locale === "fr" ? 5 : locale === "de" ? 6 : locale === "pt" ? 7 : locale === "ru" ? 8 : 0;
  return pair[index];
}

const sectionMeta: Record<ZafSection, { title: string; icon: string }> = {
  overview: { title: "Pulse", icon: "home" },
  discover: { title: "Discover", icon: "apps" },
  network: { title: "Network", icon: "node" },
  intelligence: { title: "Intelligence", icon: "observatory" },
  wallet: { title: "Wallet", icon: "wallet" },
};

function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const uid = useId().replace(/:/g, "");
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const palette: Record<string, [string, string, string]> = {
    home: ["#f3c969", "#fff4d6", "#b9a57a"],
    apps: ["#58b7ff", "#d7efff", "#4d79ff"],
    testnet: ["#54d6ff", "#e5f7ff", "#4a8dff"],
    defi: ["#d66cff", "#f4d9ff", "#7f5cff"],
    node: ["#5fd7ff", "#eefaff", "#3985e8"],
    observatory: ["#79a8ff", "#e9f2ff", "#55d7c6"],
    wallet: ["#e8edf5", "#ffffff", "#b6c2d1"],
  };

  const [start, middle, end] = palette[name] ?? ["#d9e2ee", "#ffffff", "#8fa0b8"];
  const gradientId = `zaf-icon-${name}-${uid}`;
  const glowId = `zaf-glow-${name}-${uid}`;

  const styled = {
    ...common,
    stroke: `url(#${gradientId})`,
    className: "zaf-nav-icon",
  };

  if (name === "home") {
    return (
      <svg {...styled}>
        <defs>
          <linearGradient id={gradientId} x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={start} />
            <stop offset="0.48" stopColor={middle} />
            <stop offset="1" stopColor={end} />
          </linearGradient>
          <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g filter={`url(#${glowId})`}>
          <path d="m3.2 10.2 8.8-6.9 8.8 6.9" />
          <path d="M5.3 9.4V20.2h13.4V9.4" />
          <path d="M9.2 20.2v-5.3h5.6v5.3" />
        </g>
      </svg>
    );
  }

  if (name === "apps") {
    return (
      <svg {...styled}>
        <defs>
          <linearGradient id={gradientId} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={middle} />
            <stop offset="0.45" stopColor={start} />
            <stop offset="1" stopColor={end} />
          </linearGradient>
        </defs>
        <rect x="3.5" y="3.5" width="6" height="6" rx="1.4" />
        <rect x="14.5" y="3.5" width="6" height="6" rx="1.4" />
        <rect x="3.5" y="14.5" width="6" height="6" rx="1.4" />
        <rect x="14.5" y="14.5" width="6" height="6" rx="1.4" />
        <path d="M9.5 6.5h5M9.5 17.5h5M6.5 9.5v5M17.5 9.5v5" opacity=".5" />
      </svg>
    );
  }

  if (name === "testnet") {
    return (
      <svg {...styled}>
        <defs>
          <linearGradient id={gradientId} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={middle} />
            <stop offset=".5" stopColor={start} />
            <stop offset="1" stopColor={end} />
          </linearGradient>
        </defs>
        <path d="m12 3 4.8 2.8v5.6L12 14.2l-4.8-2.8V5.8L12 3Z" />
        <path d="m6.2 10 4.8 2.8v5.6l-4.8-2.8V10Z" />
        <path d="m17.8 10-4.8 2.8v5.6l4.8-2.8V10Z" />
        <path d="m12 3 4.8 2.8L12 8.6 7.2 5.8 12 3Z" fill="currentColor" opacity=".08" stroke="none" />
      </svg>
    );
  }

  if (name === "defi") {
    return (
      <svg {...styled}>
        <defs>
          <linearGradient id={gradientId} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={middle} />
            <stop offset=".5" stopColor={start} />
            <stop offset="1" stopColor={end} />
          </linearGradient>
        </defs>
        <ellipse cx="12" cy="6.6" rx="7.1" ry="3" />
        <path d="M4.9 6.6v5.4c0 1.65 3.18 3 7.1 3s7.1-1.35 7.1-3V6.6" />
        <path d="M4.9 12v5.4c0 1.65 3.18 3 7.1 3s7.1-1.35 7.1-3V12" />
        <path d="m8.1 9.5 1.8 1.8 2.2-2.2 1.8 1.8 2-2" opacity=".9" />
      </svg>
    );
  }

  if (name === "node") {
    return (
      <svg {...styled}>
        <defs>
          <linearGradient id={gradientId} x1="3" y1="4" x2="21" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={middle} />
            <stop offset=".45" stopColor={start} />
            <stop offset="1" stopColor={end} />
          </linearGradient>
        </defs>
        <rect x="4" y="3.8" width="16" height="5" rx="1.5" />
        <rect x="4" y="9.5" width="16" height="5" rx="1.5" />
        <rect x="4" y="15.2" width="16" height="5" rx="1.5" />
        <circle cx="7" cy="6.3" r=".8" fill={start} stroke="none" />
        <circle cx="7" cy="12" r=".8" fill={start} stroke="none" />
        <circle cx="7" cy="17.7" r=".8" fill={start} stroke="none" />
        <path d="M10 6.3h6M10 12h6M10 17.7h6" opacity=".65" />
      </svg>
    );
  }

  if (name === "observatory") {
    return (
      <svg {...styled}>
        <defs>
          <linearGradient id={gradientId} x1="4" y1="20" x2="20" y2="4" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={end} />
            <stop offset=".5" stopColor={start} />
            <stop offset="1" stopColor={middle} />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="7.7" opacity=".55" />
        <circle cx="12" cy="12" r="4" opacity=".75" />
        <path d="M12 4.3v3M12 16.7v3M4.3 12h3M16.7 12h3" opacity=".7" />
        <path d="M12 12 17 7" />
        <circle cx="12" cy="12" r="1.4" fill={middle} stroke="none" />
      </svg>
    );
  }

  if (name === "wallet") {
    return (
      <svg {...styled}>
        <defs>
          <linearGradient id={gradientId} x1="4" y1="5" x2="20" y2="19" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={middle} />
            <stop offset=".5" stopColor={start} />
            <stop offset="1" stopColor={end} />
          </linearGradient>
        </defs>
        <path d="M5 7.4A2.4 2.4 0 0 1 7.4 5H19v14H7.4A2.4 2.4 0 0 1 5 16.6V7.4Z" />
        <path d="M5 8.3h11.8A2.2 2.2 0 0 0 19 6.1" />
        <path d="M14.5 12h4.5" />
        <circle cx="14.4" cy="12" r="1" fill={middle} stroke="none" />
      </svg>
    );
  }

  return <svg {...styled}><circle cx="12" cy="12" r="8" /></svg>;
}

export function ZafEcosystemNavigation({ locale, section, subtab, onSectionChange, onSubtabChange }: {
  locale: Locale;
  section: ZafSection;
  subtab: string;
  onSectionChange: (section: ZafSection) => void;
  onSubtabChange: (subtab: string) => void;
}) {
  const sections: Array<[ZafSection, string]> = [["overview", "Overview"], ["discover", "Discover"], ["network", "Network"], ["intelligence", "Intelligence"], ["wallet", "Wallet"]];
  const subtabs = ZAF_SECTION_TABS[section];
  const networkGroups = [
    { label: "Network Core", items: ["Network"] },
    { label: "Testnet", items: ["Testnet Assets"] },
    { label: "DeFi", items: ["DeFi", "DEX", "AMM & Pools", "Tokens", "Launchpad"] },
    { label: "Node & Compute", items: ["Node", "Node History", "SoloHost", "Compute", "Infrastructure"] },
  ];

  const selectSection = (next: ZafSection) => {
    onSectionChange(next);
    onSubtabChange(ZAF_SECTION_TABS[next][0] ?? "");
  };

  const primaryNav = (
    <div className="zaf-mobile-primary-nav grid grid-cols-5 gap-1 rounded-2xl border border-border bg-card/90 p-1.5">
      {sections.map(([id, title]) => {
        const meta = sectionMeta[id];
        const active = section === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => selectSection(id)}
            aria-pressed={active}
            className={"zaf-mobile-primary-item group min-w-0 rounded-xl px-1.5 py-2 text-[9px] font-medium leading-tight transition-colors " + (active ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
          >
            <span className="flex min-h-10 flex-col items-center justify-center gap-1">
              <Icon name={meta.icon} size={16} />
              <span className="max-w-full truncate">{label(title, locale)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <nav className="zaf-navigation mt-4 border-t border-border pt-3" aria-label={locale === "tr" ? "Ekosistem Bölümleri" : "Ecosystem Sections"}>
      <div className="hidden lg:block">
        <div className="zaf-desktop-primary-nav grid grid-cols-5 gap-1 rounded-2xl border border-border bg-card/90 p-1.5">
          {sections.map(([id, title]) => {
            const meta = sectionMeta[id];
            const active = section === id;
            return (
              <button key={id} type="button" onClick={() => selectSection(id)} aria-pressed={active}
              className={"zaf-desktop-primary-item group rounded-xl px-2 py-2.5 text-[11px] font-medium transition-colors " + (active ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                <span className="flex flex-col items-center gap-1.5">
                  <Icon name={meta.icon} size={17} />
                  <span className="truncate max-w-full">{label(title, locale)}</span>
                </span>
              </button>
            );
          })}
        </div>
        {subtabs.length ? (
          section === "network" ? (
            <div className="zaf-network-secondary mt-2 grid grid-cols-4 gap-2 border-b border-border pb-2">
              {networkGroups.map(group => (
                <div key={group.label} className="min-w-0 rounded-xl border border-border/70 bg-card/50 px-2.5 py-2">
                  <div className="mb-1.5 px-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label(group.label, locale)}</div>
                  <div className="flex flex-wrap gap-1">
                    {group.items.map(item => {
                      const active = subtab === item;
                      return (
                        <button key={item} type="button" onClick={() => onSubtabChange(item)} className={"rounded-lg px-2 py-1 text-[10px] font-medium transition-colors " + (active ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                          {label(item, locale)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="zaf-desktop-secondary-nav mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-1 pb-1.5">
              {subtabs.map(item => {
                const active = subtab === item;
                return (
                  <button key={item} type="button" onClick={() => onSubtabChange(item)} className={"zaf-desktop-secondary-item relative px-1 py-1 text-[10px] font-medium transition-colors " + (active ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
                    {label(item, locale)}
                    <span className={"absolute inset-x-1 -bottom-1 h-0.5 rounded-full transition-opacity " + (active ? "bg-primary opacity-100" : "opacity-0")} />
                  </button>
                );
              })}
            </div>
          )
        ) : null}
      </div>

      <div className="lg:hidden">
        {primaryNav}
        {subtabs.length ? (
          section === "network" ? (
            <div className="zaf-network-secondary mt-2 grid grid-cols-2 gap-1.5">
              {networkGroups.map(group => (
                <div key={group.label} className="min-w-0 rounded-xl border border-border/70 bg-card/60 p-2">
                  <div className="mb-1.5 px-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label(group.label, locale)}</div>
                  <div className="grid grid-cols-1 gap-1">
                    {group.items.map(item => {
                      const active = subtab === item;
                      return (
                        <button key={item} type="button" onClick={() => onSubtabChange(item)} className={"min-w-0 rounded-lg border px-2 py-1.5 text-[9px] font-medium leading-tight transition-colors " + (active ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:text-foreground")}>
                          <span className="block truncate">{label(item, locale)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="zaf-mobile-subtabs mt-2 grid grid-cols-2 gap-1">
              {subtabs.map(item => {
                const active = subtab === item;
                return (
                  <button key={item} type="button" onClick={() => onSubtabChange(item)} className={"zaf-mobile-subtab min-w-0 rounded-lg border px-2 py-1.5 text-[9px] font-medium leading-tight transition-colors " + (active ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:text-foreground")}>
                    <span className="block truncate">{label(item, locale)}</span>
                  </button>
                );
              })}
            </div>
          )
        ) : null}
      </div>
    </nav>
  );
}
