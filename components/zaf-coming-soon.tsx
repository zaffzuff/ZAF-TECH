import { translate } from "@/lib/zaf/i18n";
import type { Locale } from "@/lib/zaf/i18n";

export function ZafComingSoon({ locale, title, detail }: { locale: Locale; title?: string; detail?: string }) {
  const tx = (en: string, trText: string) => translate(locale, en, trText);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex rounded-full border border-border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {tx("Coming Soon", "Yakında")}
        </span>
        <span className="text-xs font-semibold text-foreground">{title ?? (tx("This feature is being prepared", "Bu özellik hazırlanıyor"))}</span>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        {detail ?? (tx("The underlying infrastructure is being prepared. This feature will be enabled only when verifiable data and a reliable source are available.", "Altyapı hazırlanıyor. Özellik yalnızca doğrulanabilir veri ve güvenilir bir kaynak kullanılabildiğinde etkinleştirilecektir."))}
      </p>
    </div>
  );
}
