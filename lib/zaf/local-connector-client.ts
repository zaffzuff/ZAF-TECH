import type { Locale } from "./i18n";

export function isMobileConnectorUnavailable(userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent, platform = typeof navigator === "undefined" ? "" : navigator.platform, touchPoints = typeof navigator === "undefined" ? 0 : navigator.maxTouchPoints) {
  return /iphone|ipad|ipod|android/i.test(userAgent) || (platform === "MacIntel" && touchPoints > 1);
}

export const mobileConnectorMessage: Record<Locale, string> = {
  en: "Local Node diagnostics require the Connector on a desktop computer. Public network observations remain available on mobile.",
  tr: "Yerel Node tanılaması için masaüstü bilgisayarda Connector gerekir. Herkese açık ağ gözlemleri mobilde kullanılmaya devam eder.",
  es: "El diagnóstico local del Node requiere el Connector en un ordenador. Las observaciones públicas de la red siguen disponibles en el móvil.",
  zh: "本地 Node 诊断需要桌面电脑上的 Connector。移动设备仍可使用公开网络观察。",
  it: "La diagnostica locale del Node richiede il Connector su un computer. Le osservazioni pubbliche della rete restano disponibili sui dispositivi mobili.",
  fr: "Le diagnostic local du Node nécessite le Connector sur un ordinateur. Les observations publiques du réseau restent accessibles sur mobile.",
  de: "Lokale Node-Diagnosen benötigen den Connector auf einem Desktop-Computer. Öffentliche Netzwerkbeobachtungen bleiben auf Mobilgeräten verfügbar.",
  pt: "O diagnóstico local do Node requer o Connector num computador. As observações públicas da rede continuam disponíveis no telemóvel.",
  ru: "Для локальной диагностики Node нужен Connector на компьютере. Публичные наблюдения сети доступны и на мобильных устройствах.",
};
