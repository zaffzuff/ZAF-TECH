import { translate, intlLocale, type Locale } from "@/lib/zaf/i18n";

export const protocolHistory = [
  ["19.1", null], ["19.6", "2026-02-15"], ["19.9", "2026-03-01"],
  ["20.2", "2026-03-12"], ["21.2", "2026-04-06"], ["22.1", "2026-04-27"],
  ["23.0", "2026-05-19"], ["24.1", "2026-06-02"], ["25.2", "2026-06-18"],
  ["26.1", "2026-08-11"], ["27.1", "2026-09-15"], ["28.0", "2026-10-13"],
] as const;
export function ZafProtocolHistory({ locale }: { locale: Locale }) {
  return <section className="mt-4 rounded-xl border border-border bg-card p-4">
    <h3 className="text-sm font-semibold">{translate(locale, "Published protocol history", "Yayınlanmış protokol geçmişi")}</h3>
    <p className="mt-2 text-xs text-muted-foreground">{translate(locale, "Published upgrade deadlines; not observed activation times. Node release versions are distinct from integer ledger protocol versions.", "Yayınlanmış yükseltme son tarihleri; gözlemlenen etkinleşme zamanları değildir. Node sürümleri, tam sayı ledger protokol sürümlerinden farklıdır.")}</p>
    <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {protocolHistory.map(([version, deadline]) => <li key={version} className="min-w-0 rounded-lg border border-border p-3">
        <div className="font-semibold text-foreground">v{version}</div>
        <div className="mt-1 text-xs text-muted-foreground">{deadline ? new Date(deadline + "T00:00:00Z").toLocaleDateString(intlLocale(locale), { timeZone: "UTC" }) : translate(locale, "Starting version; date not stated", "Başlangıç sürümü; tarih belirtilmemiş")}</div>
      </li>)}
    </ol>
    <a className="mt-3 inline-block text-xs underline" href="https://docs.google.com/document/d/1iqI7MZCfLqiZMYdGlXSQXpS1qK2q74nVK0jBER-S-mM/edit" target="_blank" rel="noreferrer">{translate(locale, "Source", "Kaynak")} ↗</a>
  </section>;
}
