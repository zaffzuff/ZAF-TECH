"use client";

import { useState } from "react";

function piText(value: string) {
  return value.split(/(Pi Network)/gi).map((part, index) =>
    /pi network/i.test(part) ? <span key={index} className="zaf-pi-gradient-text">{part}</span> : part,
  );
}

const copy = {
  en: {
    eyebrow: "ZAF TECH / PI NETWORK FIELD GUIDE",
    title: "Your Pi journey starts here.",
    intro: "New to Pi Network? This is a clear, safety-first starting point to understand the ecosystem and decide your next step.",
    cta: "Continue to official Pi resources",
    inviter: "Invitation username",
    code: "zaffzuff",
    stepsTitle: "A clear path, one step at a time",
    steps: [
      ["01", "Discover Pi Network", "Understand the project, the app ecosystem, and the difference between an account, a mining session, and a Mainnet wallet."],
      ["02", "Create your account carefully", "Use the official Pi app from your device’s app store. If the sign-up flow asks for an invitation code, enter zaffzuff. Follow the instructions shown in the official app."],
      ["03", "Learn the daily routine", "Open the Pi app and follow its current instructions to start a mining session. Avoid third-party tools promising automated or guaranteed earnings."],
      ["04", "Set up Pi Browser and Wallet", "Install Pi Browser from an official app store and follow the Wallet instructions inside the browser. Keep your wallet passphrase private and offline."],
      ["05", "Check KYC and Mainnet steps", "Review your own status in the official Pi app. Eligibility, timing, and migration are not guaranteed and may vary by account."],
    ],
    safetyTitle: "Your safety comes first",
    safetyBody: "Never share your Pi account password, verification codes, or Wallet passphrase with anyone — including ZAF Tech. The official Pi Wallet is at wallet.pinet.com. Check the URL carefully before entering any passphrase.",
    safetyLink: "Open Pi Safety Center",
    aboutTitle: "Independent by design",
    aboutBody: "ZAF Tech is an independent, read-only technology project. It is not affiliated with or endorsed by Pi Network Core Team. This guide is educational and does not promise rewards, KYC approval, or Mainnet migration.",
    back: "Back to ZAF Tech",
    official: "Official Pi resources",
    footer: "Explore carefully. Verify official sources. Keep control of your account.",
  },
  tr: {
    eyebrow: "ZAF TECH / PI NETWORK BAŞLANGIÇ REHBERİ",
    title: "Pi yolculuğun burada başlıyor.",
    intro: "Pi Network'e yeni misin? Ekosistemi anlamak ve sonraki adımına bilinçli karar vermek için güvenliği önceleyen bir başlangıç noktası.",
    cta: "Resmî Pi kaynaklarına git",
    inviter: "Davet kullanıcı adı",
    code: "zaffzuff",
    stepsTitle: "Adım adım, anlaşılır bir yol haritası",
    steps: [
      ["01", "Pi Network'ü keşfet", "Projeyi, uygulama ekosistemini ve hesap, madencilik oturumu ile Mainnet cüzdanı arasındaki farkları öğren."],
      ["02", "Hesabını dikkatle oluştur", "Cihazının uygulama mağazasındaki resmî Pi uygulamasını kullan. Kayıt akışı davet kodu isterse zaffzuff yaz ve resmî uygulamadaki talimatları izle."],
      ["03", "Günlük rutini öğren", "Pi uygulamasını aç ve madencilik oturumunu başlatmak için güncel talimatları izle. Otomatik veya garantili kazanç vadeden üçüncü taraf araçlardan uzak dur."],
      ["04", "Pi Browser ve Wallet'ı kur", "Pi Browser'ı resmî uygulama mağazasından indir ve tarayıcı içindeki Wallet talimatlarını izle. Cüzdan passphrase'ini gizli ve çevrimdışı tut."],
      ["05", "KYC ve Mainnet adımlarını kontrol et", "Kendi durumunu resmî Pi uygulamasından kontrol et. Uygunluk, zamanlama ve aktarım garanti değildir; hesaba göre değişebilir."],
    ],
    safetyTitle: "Önce güvenliğin",
    safetyBody: "Pi hesap şifreni, doğrulama kodlarını veya Wallet passphrase'ini hiç kimseyle paylaşma — ZAF Tech dahil. Resmî Pi Wallet adresi wallet.pinet.com'dur. Passphrase girmeden önce URL'yi dikkatle kontrol et.",
    safetyLink: "Pi Güvenlik Merkezi'ni aç",
    aboutTitle: "Bağımsız bir proje",
    aboutBody: "ZAF Tech bağımsız, salt-okunur bir teknoloji projesidir. Pi Network Core Team ile bağlantılı veya onun tarafından onaylanmış değildir. Bu rehber bilgilendirme amaçlıdır; ödül, KYC onayı veya Mainnet aktarımı vaat etmez.",
    back: "ZAF Tech'e dön",
    official: "Resmî Pi kaynakları",
    footer: "Bilinçli keşfet. Resmî kaynakları doğrula. Hesabının kontrolünü koru.",
  },
};

export default function StartWithPiPage() {
  const [locale, setLocale] = useState<"en" | "tr">("en");
  const t = copy[locale];
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between gap-4 border-b border-border pb-4">
          <a href="/" className="text-sm font-semibold tracking-[0.12em] text-foreground">ZAF <span className="text-[#b98745]">Tech</span></a>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setLocale(locale === "en" ? "tr" : "en")} className="border border-border px-3 py-1.5 text-[10px] font-semibold hover:bg-muted" aria-label="Switch language">{locale === "en" ? "TR" : "EN"}</button>
            <a href="/" className="hidden text-[10px] text-muted-foreground underline underline-offset-4 sm:inline">{t.back}</a>
          </div>
        </header>

        <section className="relative overflow-hidden border border-[#dfd0b8] bg-gradient-to-br from-[#fffdf8] via-[#f8f5ee] to-[#eee4d4] px-5 py-8 text-[#1d2933] shadow-sm sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full border border-[#d9c6a4]/70" />
          <div className="pointer-events-none absolute -right-2 -top-2 h-36 w-36 rounded-full border border-[#d9c6a4]/70" />
          <div className="relative max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 border-b border-[#b98745] pb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#93672f]">{piText(t.eyebrow)}</div>
            <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">{piText(t.title)}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#596873] sm:text-base">{piText(t.intro)}</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href="https://minepi.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-[#a8793d] bg-[#b98745] px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#9d7138]">{t.cta} <span aria-hidden="true">↗</span></a>
              <div className="border-l border-[#d9c6a4] pl-3 text-[10px] text-[#596873]">{t.inviter}<div className="mt-0.5 text-sm font-semibold text-[#1d2933]">{t.code}</div></div>
            </div>
          </div>
          <div className="relative mt-9 grid grid-cols-3 border-t border-[#dfd0b8] pt-4 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#596873] sm:max-w-xl">
            <div>01 / Discover</div><div>02 / Understand</div><div>03 / Participate</div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-5">
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#b98745]">START HERE</div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{piText(t.stepsTitle)}</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {t.steps.map(([number, title, body]) => (
              <article key={number} className="group border border-border bg-card p-5 transition-colors hover:border-[#c9a978]">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#d9c6a4] bg-[#f8f2e8] text-xs font-semibold text-[#93672f]">{number}</div>
                  <div><h3 className="text-sm font-semibold">{piText(title)}</h3><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{piText(body)}</p></div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
          <div className="border border-[#e1b8af] bg-[#fff8f6] p-5 text-[#342321]">
            <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#a43f37]">SECURITY FIRST</div>
            <h2 className="mt-2 text-base font-semibold">{t.safetyTitle}</h2>
            <p className="mt-2 text-xs leading-relaxed text-[#6c5551]">{piText(t.safetyBody)}</p>
            <a href="https://minepi.com/safety/" target="_blank" rel="noreferrer" className="mt-4 inline-flex text-xs font-semibold text-[#8d352e] underline underline-offset-4">{t.safetyLink} ↗</a>
          </div>
          <div className="border border-border bg-card p-5">
            <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#b98745]">ABOUT THIS GUIDE</div>
            <h2 className="mt-2 text-base font-semibold">{t.aboutTitle}</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{piText(t.aboutBody)}</p>
            <div className="mt-4 flex flex-wrap gap-3 text-xs">
              <a href="https://minepi.com/support/" target="_blank" rel="noreferrer" className="underline underline-offset-4">{t.official} ↗</a>
              <a href="https://developers.minepi.com/docs/build-first-app/Register" target="_blank" rel="noreferrer" className="underline underline-offset-4">Pi developer registration guide ↗</a>
            </div>
          </div>
        </section>

        <footer className="mt-10 border-t border-border py-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <a href="/" className="text-xs font-semibold tracking-[0.1em]">ZAF <span className="text-[#b98745]">Tech</span></a>
            <p className="text-[10px] text-muted-foreground">{t.footer}</p>
          </div>
        </footer>
      </div>
    </main>
  );
}
