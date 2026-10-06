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
  "DEX": ["DEX", "DEX", "DEX", "DEX", "DEX", "DEX", "DEX", "DEX", "DEX"],
  "AMM & Pools": ["AMM & Pools", "AMM & Havuzlar", "AMM Y Pools", "AMM 与池", "AMM & Pool", "AMM & Pools", "AMM & Pools", "AMM & Pools", "AMM и Пулы"],
  "Tokens": ["Tokens", "Tokenlar", "Tokens", "代币", "Token", "Tokens", "Token", "Tokens", "Токены"],
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
  Search: ["Search", "Ara", "Buscar", "搜索", "Cerca", "Rechercher", "Suche", "Pesquisar", "Поиск"],
  "Node Health": ["Node Health", "Node Sağlığı", "Salud Del Node", "节点健康", "Salute Del Node", "Santé Du Node", "Node-Gesundheit", "Saúde Do Node", "Состояние Node"],
  "Wallet Observatory": ["Wallet Observatory", "Cüzdan Gözlemleri", "Observatorio De Billetera", "钱包观测", "Osservatorio Wallet", "Observatoire Wallet", "Wallet-Observatorium", "Observatório Da Carteira", "Наблюдение Кошелька"],
  "Node Alerts": ["Node Alerts", "Node Uyarıları", "Alertas Del Node", "节点警报", "Avvisi Del Node", "Alertes Du Node", "Node-Warnungen", "Alertas Do Node", "Оповещения Node"],
};

function label(value: string, locale: Locale) {
  const pair = labels[value] ?? [value, value, value, value, value, value, value, value, value];
  const index = locale === "tr" ? 1 : locale === "es" ? 2 : locale === "zh" ? 3 : locale === "it" ? 4 : locale === "fr" ? 5 : locale === "de" ? 6 : locale === "pt" ? 7 : locale === "ru" ? 8 : 0;
  return pair[index];
}

export function ZafEcosystemNavigation({ locale, section, subtab, onSectionChange, onSubtabChange }: {
  locale: Locale; section: ZafSection; subtab: string; onSectionChange: (section: ZafSection) => void; onSubtabChange: (subtab: string) => void;
}) {
  const sections: Array<[ZafSection, string]> = [["overview", "Overview"], ["apps", "Apps"], ["testnet", "Testnet"], ["defi", "DeFi"], ["node", "Node & Compute"], ["intelligence", "Observatory"], ["wallet", "Wallet"]];
  const subtabs = ZAF_SECTION_TABS[section];
  return <nav className="mt-4 border-t border-border pt-3" aria-label={locale === "tr" ? "Ekosistem Bölümleri" : locale === "es" ? "Secciones Del Ecosistema" : locale === "zh" ? "生态系统分区" : locale === "it" ? "Sezioni Dell’Ecosistema" : locale === "fr" ? "Sections De L’Écosystème" : locale === "de" ? "Ökosystembereiche" : locale === "pt" ? "Seções do Ecossistema" : locale === "ru" ? "Разделы экосистемы" : "Ecosystem Sections"}>
    <div className="overflow-x-auto ty-no-scrollbar"><div className="zaf-primary-tabs flex min-w-max gap-1 rounded-xl border border-border bg-card p-1 sm:min-w-0 sm:flex-wrap>
      {sections.map(([id, title]) => <button key={id} type="button" onClick={() => { onSectionChange(id); const first = ZAF_SECTION_TABS[id][0]; onSubtabChange(first ?? ""); }} className={"zaf-primary-tab min-h-9 shrink-0 rounded-lg px-3 py-2 text-[11px] font-medium transition-colors " + (section === id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>{label(title, locale)}</button>)}
    </div></div>
    {subtabs.length ? <div className="mt-2 overflow-x-auto ty-no-scrollbar"><div className="zaf-secondary-tabs flex min-w-max gap-1 pb-1 sm:min-w-0 sm:flex-wrap>
      {subtabs.map(item => <button key={item} type="button" onClick={() => onSubtabChange(item)} className={"zaf-secondary-tab shrink-0 rounded-md border px-2.5 py-1.5 text-[10px] font-medium transition-colors " + (subtab === item ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:text-foreground")}>{label(item, locale)}</button>)}
    </div></div> : null}
  </nav>;
}
