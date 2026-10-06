"use client";

import type { Locale } from "@/lib/zaf/i18n";

export type ZafSection = "overview" | "apps" | "testnet" | "defi" | "node" | "intelligence" | "wallet";

export const ZAF_SECTION_TABS: Record<ZafSection, readonly string[]> = {
  overview: ["Ecosystem", "Network", "Tools"],
  apps: ["App Directory", "App Health", "App Activity", "Staking"],
  testnet: ["Assets"],
  defi: ["Overview", "DEX", "AMM & Pools", "Tokens", "Launchpad"],
  node: ["Node", "Node History", "SoloHost", "Compute", "Infrastructure"],
  intelligence: ["Radar", "Activity Signals", "Graph", "Explorer"],
  wallet: [],
};

const labels: Record<string, [string, string, string, string, string, string, string, string, string]> = {
  Overview: ["Overview", "Genel Bakış", "Descripción General", "概览", "Panoramica", "Vue D’ensemble", "Übersicht", "Visão Geral", "Обзор"],
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
  "Activity Signals": ["Activity Signals", "Aktivite Sinyalleri", "Señales De Actividad", "活动信号", "Segnali Di Attività", "Signaux D’activité", "Aktivitätssignale", "Sinais De Atividade", "Сигналы Активности"],
  Graph: ["Graph", "Graf", "Gráfico", "图谱", "Grafo", "Graphe", "Graph", "Grafo", "Граф"],
  Explorer: ["Explorer", "Explorer", "Explorador", "浏览器", "Esplora", "Explorateur", "Explorer", "Explorador", "Обозреватель"],
  Wallet: ["Wallet", "Cüzdan", "Billetera", "钱包", "Wallet", "Portefeuille", "Wallet", "Carteira", "Кошелёк"],
};

function label(value: string, locale: Locale) {
  const pair = labels[value] ?? [value, value, value, value, value, value, value, value, value];
  const index = locale === "tr" ? 1 : locale === "es" ? 2 : locale === "zh" ? 3 : locale === "it" ? 4 : locale === "fr" ? 5 : locale === "de" ? 6 : locale === "pt" ? 7 : locale === "ru" ? 8 : 0;
  return pair[index];
}

const sectionMeta: Record<ZafSection, { title: string; icon: string }> = {
  overview: { title: "Overview", icon: "home" },
  apps: { title: "Apps", icon: "apps" },
  testnet: { title: "Testnet", icon: "testnet" },
  defi: { title: "DeFi", icon: "defi" },
  node: { title: "Node & Compute", icon: "node" },
  intelligence: { title: "Observatory", icon: "observatory" },
  wallet: { title: "Wallet", icon: "wallet" },
};

function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "home") return <svg {...common}><path d="m3 10 9-7 9 7" /><path d="M5 9.8V21h14V9.8" /><path d="M9 21v-6h6v6" /></svg>;
  if (name === "apps") return <svg {...common}><rect x="3.5" y="3.5" width="6" height="6" rx="1.2" /><rect x="14.5" y="3.5" width="6" height="6" rx="1.2" /><rect x="3.5" y="14.5" width="6" height="6" rx="1.2" /><rect x="14.5" y="14.5" width="6" height="6" rx="1.2" /></svg>;
  if (name === "testnet") return <svg {...common}><path d="M8 3h8" /><path d="M9 3v5l-5 9.2A2.2 2.2 0 0 0 5.9 21h12.2a2.2 2.2 0 0 0 1.9-3.3L15 8V3" /><path d="M7 15h10" /></svg>;
  if (name === "defi") return <svg {...common}><path d="M12 3 5 7v10l7 4 7-4V7l-7-4Z" /><path d="m8.5 9.5 3.5 2 3.5-2" /><path d="M12 11.5V18" /></svg>;
  if (name === "node") return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>;
  if (name === "observatory") return <svg {...common}><path d="M4 19h16" /><path d="M6 17V9M11 17V5M16 17v-7" /><path d="m6 7 5-2 5 2" /></svg>;
  if (name === "wallet") return <svg {...common}><path d="M5 7.5A2.5 2.5 0 0 1 7.5 5H19v14H7.5A2.5 2.5 0 0 1 5 16.5v-9Z" /><path d="M5 8h12a2 2 0 0 0 2-2" /><path d="M15 12h4" /><circle cx="15" cy="12" r=".6" fill="currentColor" /></svg>;
  if (name === "tools") return <svg {...common}><path d="m14.5 5.5 4 4" /><path d="M4 20 12.5 11.5" /><path d="M14 4a4 4 0 0 0-5 5l4 4a4 4 0 0 0 5-5l-2 2-4-4 2-2Z" /></svg>;
  if (name === "more") return <svg {...common}><circle cx="5" cy="12" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /><circle cx="19" cy="12" r="1.3" fill="currentColor" /></svg>;
  if (name === "chevron") return <svg {...common}><path d="m6 9 6 6 6-6" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>;
}

export function ZafEcosystemNavigation({ locale, section, subtab, onSectionChange, onSubtabChange }: {
  locale: Locale;
  section: ZafSection;
  subtab: string;
  onSectionChange: (section: ZafSection) => void;
  onSubtabChange: (subtab: string) => void;
}) {
  const sections: Array<[ZafSection, string]> = [["overview", "Overview"], ["apps", "Apps"], ["testnet", "Testnet"], ["defi", "DeFi"], ["node", "Node & Compute"], ["intelligence", "Observatory"], ["wallet", "Wallet"]];
  const subtabs = ZAF_SECTION_TABS[section];

  const selectSection = (next: ZafSection) => {
    onSectionChange(next);
    onSubtabChange(ZAF_SECTION_TABS[next][0] ?? "");
  };

  const primaryNav = (
    <div className="zaf-mobile-primary-nav grid grid-cols-4 gap-1 rounded-2xl border border-border bg-card/90 p-1.5">
      {sections.map(([id, title]) => {
        const meta = sectionMeta[id];
        const active = section === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => selectSection(id)}
            className={"zaf-mobile-primary-item min-w-0 rounded-xl px-1.5 py-2 text-[9px] font-medium leading-tight transition-colors " + (active ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
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
        <div className="zaf-desktop-primary-nav grid grid-cols-7 gap-1 rounded-2xl border border-border bg-card/90 p-1.5">
          {sections.map(([id, title]) => {
            const meta = sectionMeta[id];
            const active = section === id;
            return (
              <button key={id} type="button" onClick={() => selectSection(id)} className={"zaf-desktop-primary-item group rounded-xl px-2 py-2.5 text-[11px] font-medium transition-colors " + (active ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                <span className="flex flex-col items-center gap-1.5">
                  <Icon name={meta.icon} size={17} />
                  <span className="truncate max-w-full">{label(title, locale)}</span>
                </span>
              </button>
            );
          })}
        </div>
        {subtabs.length ? (
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
        ) : null}
      </div>

      <div className="lg:hidden">
        {primaryNav}
        {subtabs.length ? (
          <div className="zaf-mobile-subtabs mt-2 grid grid-cols-2 gap-1">
            {subtabs.map(item => {
              const active = subtab === item;
              return (
                <button key={item} type="button" onClick={() => onSubtabChange(item)} className={"zaf-mobile-subtab min-w-0 rounded-lg border px-2 py-1.5 text-[9px] font-medium leading-tight transition-colors " + (active ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:text-foreground")}>
                  {label(item, locale)}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
