"use client";

import Image from "next/image";
import Link from "next/link";
import type { DirectoryApp } from "@/lib/zaf/app-directory";
import { useState } from "react";
import type { Locale } from "@/lib/zaf/i18n";
import { intlLocale, translate } from "@/lib/zaf/i18n";
import { LanguageSelector } from "@/components/zaf-language-selector";

function displayStatus(value: string | null | undefined, locale: Locale) {
  if (!value) return "—";
  const normalized = value.replace(/[_-]+/g, " ").trim().toLowerCase();
  const labels: Record<string, Record<Locale, string>> = {
    unknown: { en: "Not Checked", es: "No Comprobado", tr: "Kontrol Edilmedi", zh: "未检查", it: "Non Controllato", fr: "Non Vérifié", de: "Nicht Geprüft", pt: "Não Verificado", ru: "Не Проверено" },
    online: { en: "Online", es: "En Línea", tr: "Çevrimiçi", zh: "在线", it: "Online", fr: "En Ligne", de: "Online", pt: "Online", ru: "Онлайн" },
    offline: { en: "Offline", es: "Fuera De Línea", tr: "Çevrimdışı", zh: "离线", it: "Offline", fr: "Hors Ligne", de: "Offline", pt: "Offline", ru: "Офлайн" },
    available: { en: "Available", es: "Disponible", tr: "Kullanılabilir", zh: "可用", it: "Disponibile", fr: "Disponible", de: "Verfügbar", pt: "Disponível", ru: "Доступно" },
    unavailable: { en: "Unavailable", es: "No Disponible", tr: "Kullanılamıyor", zh: "不可用", it: "Non Disponibile", fr: "Indisponible", de: "Nicht Verfügbar", pt: "Indisponível", ru: "Недоступно" },
  };
  return labels[normalized]?.[locale] ?? normalized.replace(/^./, char => char.toUpperCase());
}
function verification(value: DirectoryApp["piAuthentication"], locale: Locale) {
  return value === "verified"
    ? translate(locale, "Verified", "Doğrulandı")
    : translate(locale, "Not Verified", "Doğrulanmadı");
}

export function AppDetails({ app }: { app: DirectoryApp }) {
  const [locale, setLocale] = useState<Locale>("en");

  const tr = (en: string, trText: string) => translate(locale, en, trText);
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 pb-10">
        <header className="border-b border-border pb-5 pt-7">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="text-xs font-medium text-muted-foreground hover:text-foreground">{tr("← Back To ZAF TECH", "← ZAF TECH'e Dön")}</Link>
            <LanguageSelector locale={locale} onChange={setLocale} />
            <Image src="/zaf-tech-logo.png" alt="ZAF TECH" width={38} height={38} className="h-9 w-9 object-contain" priority />
          </div>
          <div className="mt-6">
            <div className="text-[10px] tracking-wider text-muted-foreground">{tr("Pi App Directory", "Pi Uygulama Dizini")}</div>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground">{app.name}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground">{app.category}</span>
              <span className="rounded-full border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground">{displayStatus(app.network, locale)}</span>
              <span className="rounded-full border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground">{displayStatus(app.status, locale)}</span>
            </div>
          </div>
        </header>

        <section className="mt-5 space-y-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs font-semibold text-foreground">{tr("Application", "Uygulama")}</div>
            <p className="mt-2 break-all text-[11px] text-muted-foreground">{app.url}</p>
            <a href={app.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-lg bg-foreground px-3 py-2 text-[11px] font-medium text-background">{tr("Open Application", "Uygulamayı Aç")}</a>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              [tr("Pi Authentication", "Pi Kimlik Doğrulama"), verification(app.piAuthentication, locale)],
              [tr("Pi Payments", "Pi Ödemeleri"), verification(app.piPayments, locale)],
              [tr("PiNet", "PiNet"), verification(app.piNet, locale)],
              [tr("Network", "Ağ"), displayStatus(app.network, locale)],
              [tr("Status", "Durum"), displayStatus(app.status, locale)],
              [tr("Last Checked", "Son Kontrol"), new Date(app.lastChecked).toLocaleString(intlLocale(locale))],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border bg-card p-3">
                <div className="text-[10px] text-muted-foreground">{label}</div>
                <div className="mt-1 text-xs font-semibold text-foreground">{value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs font-semibold text-foreground">{tr("Verification Boundary", "Doğrulama Sınırı")}</div>
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
              {tr("ZAF TECH does not claim Pi Authentication, Pi Payments, PiNet, Mainnet/Testnet status or application health until the relevant property has been independently verified by an observable check. Category is a ZAF TECH classification based on the public name/URL signal and is not an official Pi category.", "ZAF TECH, ilgili özellik gözlemlenebilir bir kontrolle bağımsız olarak doğrulanmadıkça Pi Kimlik Doğrulama, Pi Ödemeleri, PiNet, Mainnet/Testnet durumu veya uygulama sağlığı hakkında doğrulanmış bir iddiada bulunmaz. Kategori, herkese açık ad/URL sinyaline dayalı bir ZAF TECH sınıflandırmasıdır ve resmi Pi kategorisi değildir.")}
            </p>
          </div>
        </section>

        <footer className="mt-8 border-t border-border pt-4 text-[10px] text-muted-foreground">
          ZAF TECH · {tr("Independent Community-Developed Technology Project", "Bağımsız Topluluk Geliştirmeli Teknoloji Projesi")}
        </footer>
      </div>
    </main>
  );
}
