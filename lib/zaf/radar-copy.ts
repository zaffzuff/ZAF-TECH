import { intlLocale, type Locale } from "./i18n";
import type { RadarSignal } from "./radar";

const locales: Locale[] = ["en", "tr", "es", "zh", "it", "fr", "de", "pt", "ru"];
const copy = {
  unavailable: ["Not available in the current sample.", "Mevcut örneklemde kullanılamıyor.", "No disponible en la muestra actual.", "当前样本中不可用。", "Non disponibile nel campione attuale.", "Indisponible dans l’échantillon actuel.", "In der aktuellen Stichprobe nicht verfügbar.", "Indisponível na amostra atual.", "Недоступно в текущей выборке."],
  baseline: ["Current pace is observable; a rolling comparison needs at least three stored observations.", "Mevcut tempo gözlemleniyor; hareketli karşılaştırma için en az üç kayıtlı gözlem gerekiyor.", "El ritmo actual es observable; la comparación móvil requiere al menos tres observaciones guardadas.", "可观测当前速率；滚动比较至少需要三个存储观测。", "Il ritmo attuale è osservabile; il confronto mobile richiede almeno tre osservazioni salvate.", "Le rythme actuel est observable ; la comparaison glissante nécessite au moins trois observations stockées.", "Die aktuelle Rate ist beobachtbar; ein gleitender Vergleich benötigt mindestens drei gespeicherte Beobachtungen.", "O ritmo atual é observável; a comparação móvel requer pelo menos três observações guardadas.", "Текущий темп наблюдается; для скользящего сравнения нужны минимум три сохранённых наблюдения."],
  change: ["Change against the 30-minute rolling median: {0}%.", "30 dakikalık hareketli medyana göre değişim: %{0}.", "Cambio respecto a la mediana móvil de 30 minutos: {0}%.", "相对于30分钟滚动中位数的变化：{0}%。", "Variazione rispetto alla mediana mobile di 30 minuti: {0}%.", "Variation par rapport à la médiane glissante de 30 minutes : {0} %.", "Änderung gegenüber dem gleitenden 30-Minuten-Median: {0}%.", "Variação face à mediana móvel de 30 minutos: {0}%.", "Изменение относительно скользящей 30-минутной медианы: {0}%."],
  success: ["Observed transaction success rate: {0}%.", "Gözlemlenen işlem başarı oranı: %{0}.", "Tasa de éxito observada: {0}%.", "观测交易成功率：{0}%。", "Tasso di successo osservato: {0}%.", "Taux de réussite observé : {0} %.", "Beobachtete Transaktionserfolgsrate: {0}%.", "Taxa de sucesso observada: {0}%.", "Наблюдаемая успешность транзакций: {0}%."],
  throughput: ["Average transactions per observed ledger: {0}.", "Gözlemlenen ledger başına ortalama işlem: {0}.", "Promedio de transacciones por ledger observado: {0}.", "每个观测账本的平均交易数：{0}。", "Transazioni medie per ledger osservato: {0}.", "Transactions moyennes par ledger observé : {0}.", "Durchschnittliche Transaktionen je beobachtetem Ledger: {0}.", "Média de transações por ledger observado: {0}.", "Среднее число транзакций на наблюдаемый ledger: {0}."],
  sources: ["Available public ecosystem sources: {0}.", "Kullanılabilir herkese açık ekosistem kaynakları: {0}.", "Fuentes públicas disponibles: {0}.", "可用公共生态来源：{0}。", "Fonti pubbliche disponibili: {0}.", "Sources publiques disponibles : {0}.", "Verfügbare öffentliche Ökosystemquellen: {0}.", "Fontes públicas disponíveis: {0}.", "Доступные публичные источники: {0}."],
  protocol: ["Latest observed ledger protocol: v{0}.", "Son gözlemlenen ledger protokolü: v{0}.", "Último protocolo de ledger observado: v{0}.", "最新观测账本协议：v{0}。", "Ultimo protocollo ledger osservato: v{0}.", "Dernier protocole ledger observé : v{0}.", "Zuletzt beobachtetes Ledger-Protokoll: v{0}.", "Último protocolo ledger observado: v{0}.", "Последний наблюдаемый протокол ledger: v{0}."],
};
export function radarDetail(signal: RadarSignal, locale: Locale): string {
  const index = locales.indexOf(locale);
  const format = (key: keyof typeof copy, value = "") => copy[key][index].replace("{0}", value);
  if (signal.value == null) return format("unavailable");
  const number = (value: number, digits: number) => value.toLocaleString(intlLocale(locale), { maximumFractionDigits: digits });
  if (signal.id === "transaction-pace" || signal.id === "operation-pace") return signal.changePercent == null ? format("baseline") : format("change", number(signal.changePercent, 1));
  if (signal.id === "transaction-success") return format("success", number(Number(signal.value), 1));
  if (signal.id === "ledger-throughput") return format("throughput", number(Number(signal.value), 2));
  if (signal.id === "source-coverage") return format("sources", String(signal.value));
  if (signal.id === "protocol") return format("protocol", String(signal.value));
  return signal.detail;
}
