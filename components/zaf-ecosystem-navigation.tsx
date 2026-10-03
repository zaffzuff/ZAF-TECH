"use client";

import type { Locale } from "@/lib/zaf/i18n";

export type ZafSection = "overview" | "apps" | "node" | "intelligence" | "wallet";

export const ZAF_SECTION_TABS: Record<ZafSection, readonly string[]> = {
  overview: ["Ecosystem", "Network", "Tools"],
  apps: ["App Directory", "App Health"],
  node: ["Node", "Node History", "SoloHost", "Compute", "Infrastructure"],
  intelligence: ["Radar", "Activity Signals", "Explorer"],
  wallet: [],
};

const labels: Record<string, [string, string, string, string, string, string, string, string, string]> = {
  Overview: ["Overview", "Genel Bakış", "Descripción General", "概览", "Panoramica", "Vue D’ensemble", "Übersicht", "Visão Geral", "Обзор"],
  Network: ["Network", "Ağ", "Red", "网络", "Rete", "Réseau", "Netzwerk", "Rede", "Сеть"],
  Ecosystem: ["Ecosystem", "Ekosistem", "Ecosistema", "生态系统", "Ecosistema", "Écosystème", "Ökosystem", "Ecossistema", "Экосистема"],
  Tools: ["Tools", "Araçlar", "Herramientas", "工具", "Strumenti", "Outils", "Werkzeuge", "Ferramentas", "Инструменты"],
  Apps: ["Apps", "Uygulamalar", "Aplicaciones", "应用", "App", "Applications", "Apps", "Aplicativos", "Приложения"],
  "App Directory": ["App Directory", "Uygulama Dizini", "Directorio De Apps", "应用目录", "Elenco App", "Annuaire Des Apps", "App-Verzeichnis", "Diretório De Apps", "Каталог Приложений"],
  "App Health": ["App Health", "Uygulama Sağlığı", "Salud De Apps", "应用健康", "Salute App", "Santé Des Apps", "App-Gesundheit", "Saúde Dos Apps", "Состояние Приложений"],
  "Node & Compute": ["Node & Compute", "Node & Hesaplama", "Node Y Cómputo", "节点与计算", "Node E Calcolo", "Node Et Calcul", "Node & Computing", "Node E Computação", "Node И Вычисления"],
  Node: ["Node", "Node", "Node", "节点", "Node", "Node", "Node", "Node", "Node"],
  "Node History": ["Node History", "Node Geçmişi", "Historial Del Node", "节点历史", "Cronologia Node", "Historique Du Node", "Node-Verlauf", "Histórico Do Node", "История Node"],
  SoloHost: ["SoloHost", "SoloHost", "SoloHost", "SoloHost", "SoloHost", "SoloHost", "SoloHost", "SoloHost", "SoloHost"],
  Compute: ["Compute", "Hesaplama", "Cómputo", "计算", "Calcolo", "Calcul", "Berechnung", "Computação", "Вычисления"],
  Infrastructure: ["Infrastructure", "Altyapı", "Infraestructura", "基础设施", "Infrastruttura", "Infrastructure", "Infrastruktur", "Infraestrutura", "Инфраструктура"],
  Observatory: ["Observatory", "Gözlem Merkezi", "Observatorio", "观测中心", "Osservatorio", "Observatoire", "Beobachtungszentrum", "Observatório", "Наблюдательный Центр"],
  Radar: ["Radar", "Radar", "Radar", "雷达", "Radar", "Radar", "Radar", "Radar", "Радар"],
  "Activity Signals": ["Activity Signals", "Aktivite Sinyalleri", "Señales De Actividad", "活动信号", "Segnali Di Attività", "Signaux D’activité", "Aktivitätssignale", "Sinais De Atividade", "Сигналы Активности"],
  Explorer: ["Explorer", "Explorer", "Explorador", "浏览器", "Esplora", "Explorateur", "Explorer", "Explorador", "Обозреватель"],
  Wallet: ["Wallet", "Cüzdan", "Billetera", "钱包", "Wallet", "Portefeuille", "Wallet", "Carteira", "Кошелёк"],
  Search: ["Search", "Ara", "Buscar", "搜索", "Cerca", "Rechercher", "Suche", "Pesquisar", "Поиск"],
};

function label(value: string, locale: Locale) {
  const pair = labels[value] ?? [value, value, value, value, value, value, value, value, value];
  const index = locale === "tr" ? 1 : locale === "es" ? 2 : locale === "zh" ? 3 : locale === "it" ? 4 : locale === "fr" ? 5 : locale === "de" ? 6 : locale === "pt" ? 7 : locale === "ru" ? 8 : 0;
  return pair[index];
}

export function ZafEcosystemNavigation({ locale, section, subtab, onSectionChange, onSubtabChange }: {
  locale: Locale; section: ZafSection; subtab: string; onSectionChange: (section: ZafSection) => void; onSubtabChange: (subtab: string) => void;
}) {
  const sections: Array<[ZafSection, string]> = [["overview", "Overview"], ["apps", "Apps"], ["node", "Node & Compute"], ["intelligence", "Observatory"], ["wallet", "Wallet"]];
  const subtabs = ZAF_SECTION_TABS[section];
  return <nav className="mt-4 border-t border-border pt-3" aria-label={locale === "tr" ? "Ekosistem Bölümleri" : locale === "es" ? "Secciones Del Ecosistema" : locale === "zh" ? "生态系统分区" : locale === "it" ? "Sezioni Dell’Ecosistema" : locale === "fr" ? "Sections De L’Écosystème" : locale === "de" ? "Ökosystembereiche" : locale === "pt" ? "Seções do Ecossistema" : locale === "ru" ? "Разделы экосистемы" : "Ecosystem Sections"}>
    <div className="overflow-x-auto ty-no-scrollbar"><div className="flex min-w-max gap-1 rounded-xl border border-border bg-card p-1 sm:min-w-0 sm:flex-wrap">
      {sections.map(([id, title]) => <button key={id} type="button" onClick={() => { onSectionChange(id); const first = ZAF_SECTION_TABS[id][0]; onSubtabChange(first ?? ""); }} className={"min-h-9 shrink-0 rounded-lg px-3 py-2 text-[11px] font-medium transition-colors " + (section === id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>{label(title, locale)}</button>)}
      <a href="/observatory" className="min-h-9 shrink-0 rounded-lg border border-border px-3 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground">{label("Observatory", locale)} 2.0</a>
      <a href="/search" className="min-h-9 shrink-0 rounded-lg border border-border px-3 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground">{label("Search", locale)}</a>
    </div></div>
    {subtabs.length ? <div className="mt-2 overflow-x-auto ty-no-scrollbar"><div className="flex min-w-max gap-1 pb-1 sm:min-w-0 sm:flex-wrap">
      {subtabs.map(item => <button key={item} type="button" onClick={() => onSubtabChange(item)} className={"shrink-0 rounded-md border px-2.5 py-1.5 text-[10px] font-medium transition-colors " + (subtab === item ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:text-foreground")}>{label(item, locale)}</button>)}
    </div></div> : null}
  </nav>;
}
