import { translate } from "@/lib/zaf/i18n";
import type { Locale } from "@/lib/zaf/i18n";

export function ZafComingSoon({ locale, title, detail, waitingForData = false }: { locale: Locale; title?: string; detail?: string; waitingForData?: boolean }) {
  const tx = (en: string, trText: string) => translate(locale, en, trText);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex rounded-full border border-border px-2 py-1 text-[9px] font-bold tracking-[0.04em] text-muted-foreground">
          <strong>{waitingForData ? tx("Awaiting observations", "Gözlem bekleniyor") : tx("Coming Soon", "Yakında")}</strong>
        </span>
        <span className="text-xs font-semibold text-foreground">{title ?? tx("This feature is being prepared", "Bu özellik hazırlanıyor")}</span>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        {detail ?? (waitingForData ? tx("This view needs readable source data and stored observations.", "Bu görünüm için okunabilir kaynak verisi ve kayıtlı gözlemler gerekiyor.") : tx("The underlying infrastructure is being prepared. This feature will be enabled only when verifiable data and a reliable source are available.", "Altyapı hazırlanıyor. Özellik yalnızca doğrulanabilir veri ve güvenilir bir kaynak kullanılabildiğinde etkinleştirilecektir."))}
      </p>
    </div>
  );
}
