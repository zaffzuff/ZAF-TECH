import type { Locale } from "@/lib/zaf/i18n";

export function ZafComingSoon({ locale, title, detail }: { locale: Locale; title?: string; detail?: string }) {
  const isTr = locale === "tr";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex rounded-full border border-border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {isTr ? "Yakında" : "Coming Soon"}
        </span>
        <span className="text-xs font-semibold text-foreground">{title ?? (isTr ? "Bu özellik hazırlanıyor" : "This feature is being prepared")}</span>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        {detail ?? (isTr ? "Altyapı hazırlanıyor. Özellik yalnızca doğrulanabilir veri ve güvenilir bir kaynak kullanılabildiğinde etkinleştirilecektir." : "The underlying infrastructure is being prepared. This feature will be enabled only when verifiable data and a reliable source are available.")}
      </p>
    </div>
  );
}
