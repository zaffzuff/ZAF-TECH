import type { Locale } from "@/lib/zaf/i18n";
import type { ZafSnapshot } from "@/lib/zaf/types";

const copy: Record<Locale, [string, string, string, string, string]> = {
  en: ["Protocol transition", "Active Mainnet protocol", "Horizon supports", "Core supports", "Supported versions describe source capability; the active ledger version describes the network observation. ZAF Tech reads public JSON and does not upgrade or operate your Node."],
  tr: ["Protokol geçişi", "Aktif Mainnet protokolü", "Horizon desteği", "Core desteği", "Desteklenen sürümler kaynağın kapasitesini, aktif ledger sürümü ağ gözlemini belirtir. ZAF Tech herkese açık JSON okur; Node'unuzu yükseltmez veya çalıştırmaz."],
  es: ["Transición de protocolo", "Protocolo activo de Mainnet", "Soporte de Horizon", "Soporte de Core", "Las versiones compatibles describen la capacidad de la fuente; la versión activa del ledger describe la red observada. ZAF Tech lee JSON público y no actualiza ni opera tu Node."],
  zh: ["协议转换", "Mainnet 当前协议", "Horizon 支持", "Core 支持", "支持的版本表示数据源能力；当前账本版本表示观察到的网络。ZAF Tech 读取公开 JSON，不升级或运行您的 Node。"],
  it: ["Transizione del protocollo", "Protocollo Mainnet attivo", "Supporto Horizon", "Supporto Core", "Le versioni supportate descrivono la capacità della fonte; la versione attiva del ledger descrive la rete osservata. ZAF Tech legge JSON pubblico e non aggiorna né gestisce il tuo Node."],
  fr: ["Transition du protocole", "Protocole Mainnet actif", "Support Horizon", "Support Core", "Les versions prises en charge décrivent la capacité de la source ; la version active du ledger décrit le réseau observé. ZAF Tech lit le JSON public et ne met pas à niveau votre Node."],
  de: ["Protokollübergang", "Aktives Mainnet-Protokoll", "Horizon-Unterstützung", "Core-Unterstützung", "Unterstützte Versionen beschreiben die Fähigkeiten der Quelle; die aktive Ledger-Version beschreibt das beobachtete Netzwerk. ZAF Tech liest öffentliches JSON und aktualisiert oder betreibt deinen Node nicht."],
  pt: ["Transição do protocolo", "Protocolo Mainnet ativo", "Suporte Horizon", "Suporte Core", "As versões suportadas descrevem a capacidade da fonte; a versão ativa do ledger descreve a rede observada. A ZAF Tech lê JSON público e não atualiza nem opera o teu Node."],
  ru: ["Переход протокола", "Активный протокол Mainnet", "Поддержка Horizon", "Поддержка Core", "Поддерживаемые версии описывают возможности источника, а активная версия ledger — наблюдаемую сеть. ZAF Tech читает публичный JSON и не обновляет и не запускает ваш Node."],
};
const version = (value: number | null | undefined) => value != null && Number.isInteger(value) && value > 0 ? `v${value}` : "—";

export function ZafProtocolObservation({ data, locale }: { data: ZafSnapshot | null; locale: Locale }) {
  const text = copy[locale];
  return <section className="mt-3 rounded-xl border border-border bg-card p-4" aria-label={text[0]}>
    <h3 className="text-xs font-semibold text-foreground">{text[0]}</h3>
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {[data?.protocol?.current ?? data?.metrics.latestProtocolVersion, data?.protocol?.horizonSupported, data?.protocol?.coreSupported].map((value, index) => <div key={text[index + 1]}><div className="text-xl font-semibold text-foreground">{version(value)}</div><div className="text-[11px] text-muted-foreground">{text[index + 1]}</div></div>)}
    </div>
    <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{text[4]}</p>
    <a href="https://minepi.com/pi-node/" target="_blank" rel="noreferrer" className="mt-2 inline-block text-[11px] underline">Pi Node ↗</a>
  </section>;
}
