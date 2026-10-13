"use client";

import { useState } from "react";

const copy = {
  en: {
    eyebrow: "ZAF TECH / PI NETWORK FIELD GUIDE",
    title: "Your Pi journey starts here.",
    intro: "New to Pi Network? This is a clear, safety-first starting point to understand the ecosystem and decide your next step.",
    cta: "Start with my invitation",
    pdfCta: "Download PDF guide",
    pdfHint: "A printable Pi Network starter guide",
    flowLabel: "YOUR STARTING PATH",
    flowIntro: "Follow these steps in order. Each step explains what to do and opens the relevant official destination when needed.",
    openInvite: "Open my invitation",
    openOfficial: "Open official Pi website",
    openBrowserInfo: "Find Pi Browser",
    previous: "Previous step",
    next: "Next step",
    stepDone: "Step completed",
    stepNote: "ZAF Tech cannot create the account for you. Complete registration inside the official Pi app.",
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
    cta: "Davet bağlantımla başla",
    pdfCta: "PDF Rehberini İndir",
    pdfHint: "Pi Network başlangıç rehberini PDF olarak aç veya indir",
    flowLabel: "BAŞLANGIÇ YOLUN",
    flowIntro: "Bu adımları sırayla izle. Her adım ne yapacağını açıklar ve gerektiğinde ilgili resmî bağlantıyı açar.",
    openInvite: "Davet bağlantımı aç",
    openOfficial: "Resmî Pi sitesini aç",
    openBrowserInfo: "Pi Browser bilgilerini bul",
    previous: "Önceki adım",
    next: "Sonraki adım",
    stepDone: "Adım tamamlandı",
    stepNote: "ZAF Tech senin adına hesap oluşturamaz. Kaydı resmî Pi uygulamasında tamamla.",
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
  const [activeStep, setActiveStep] = useState(0);
  const t = copy[locale];
  const flow = locale === "tr" ? [
    { title: "Davet bağlantını aç", body: "Pi kayıt sürecini senin davetin üzerinden başlat. Bağlantı açıldığında resmî Pi sayfasındaki yönergeleri izle.", action: t.openInvite, href: "https://minepi.com/zaffzuff" },
    { title: "Pi uygulamasını indir", body: "Resmî Pi web sitesinden cihazına uygun uygulama mağazası bağlantısına geç. Uygulama yayıncısını kontrol ederek resmî uygulamayı yükle.", action: t.openOfficial, href: "https://minepi.com/" },
    { title: "Hesabını oluştur", body: "Pi uygulamasını aç ve kayıt adımlarını takip et. Davet kodu istenirse zaffzuff gir. Kayıt ve doğrulama işlemleri uygulama içinde tamamlanır.", action: t.openInvite, href: "https://minepi.com/zaffzuff" },
    { title: "İlk madencilik oturumunu başlat", body: "Hesabına giriş yaptıktan sonra uygulamadaki madencilik başlatma talimatlarını izle. Oturumun devamı için uygulamanın güncel yönlendirmelerini takip et.", action: t.openOfficial, href: "https://minepi.com/" },
    { title: "Pi Browser’ı kur", body: "Pi Browser’ı yalnızca cihazının resmî uygulama mağazasından bulup yükle. Uygulama adını ve yayıncısını kontrol et; ardından uygulama içindeki yönergeleri izle.", action: t.openBrowserInfo, href: "https://minepi.com/" },
    { title: "Wallet ve güvenliği öğren", body: "Wallet kurulumunu yalnızca resmî Pi Browser akışı içinden başlat. Passphrase’ini kimseyle paylaşma ve hiçbir web sitesine güvenmeden önce adresini doğrula.", action: "wallet.pinet.com", href: "https://wallet.pinet.com/" },
  ] : [
    { title: "Open your invitation", body: "Start the Pi registration journey through your invitation. Follow the instructions on the official Pi destination.", action: t.openInvite, href: "https://minepi.com/zaffzuff" },
    { title: "Install the Pi app", body: "Use the official Pi website to reach the app-store option for your device. Verify the publisher before installing.", action: t.openOfficial, href: "https://minepi.com/" },
    { title: "Create your account", body: "Open the Pi app and follow its sign-up flow. If asked for an invitation code, enter zaffzuff. Registration and verification happen inside the app.", action: t.openInvite, href: "https://minepi.com/zaffzuff" },
    { title: "Start your first mining session", body: "After signing in, follow the app’s current instructions to start a mining session. Use the app’s own guidance for subsequent sessions.", action: t.openOfficial, href: "https://minepi.com/" },
    { title: "Install Pi Browser", body: "Find Pi Browser only through your device’s official app store. Check the app name and publisher, then follow its in-app instructions.", action: t.openBrowserInfo, href: "https://minepi.com/" },
    { title: "Learn Wallet and security", body: "Begin Wallet setup only through the official Pi Browser flow. Never share your passphrase, and verify the address before using any website.", action: "wallet.pinet.com", href: "https://wallet.pinet.com/" },
  ];
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
            <div className="mb-5 inline-flex items-center gap-2 border-b border-[#b98745] pb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#93672f]">{t.eyebrow}</div>
            <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">{t.title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#596873] sm:text-base">{t.intro}</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href="https://minepi.com/zaffzuff" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-[#a8793d] bg-[#b98745] px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#9d7138]">{t.cta} <span aria-hidden="true">↗</span></a>
              <a href="/ZAF_Tech_Pi_Network_Baslangic_Rehberi_2026.pdf" download className="inline-flex items-center gap-2 border border-[#b98745] bg-white/70 px-4 py-3 text-xs font-semibold text-[#765326] transition hover:bg-[#f4ead9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b98745]"><span aria-hidden="true">↓</span>{t.pdfCta}</a>
              <div className="border-l border-[#d9c6a4] pl-3 text-[10px] text-[#596873]">{t.inviter}<div className="mt-0.5 text-sm font-semibold text-[#1d2933]">{t.code}</div></div>
            </div>
          </div>
          <div className="relative mt-9 grid grid-cols-3 border-t border-[#dfd0b8] pt-4 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#596873] sm:max-w-xl">
            <div>01 / Discover</div><div>02 / Understand</div><div>03 / Participate</div>
          </div>
        </section>

        <section className="mt-10" id="start-steps">
          <div className="mb-5">
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#b98745]">{t.flowLabel}</div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{t.stepsTitle}</h2>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">{t.flowIntro}</p>
          </div>
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {flow.map((step, index) => (
                <button key={step.title} type="button" onClick={() => setActiveStep(index)} className={`flex items-center gap-3 border p-3 text-left transition-colors ${activeStep === index ? "border-[#b98745] bg-[#f8f2e8] text-[#1d2933]" : "border-border bg-card hover:border-[#c9a978]"}`} aria-current={activeStep === index ? "step" : undefined}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#d9c6a4] text-xs font-semibold text-[#93672f]">{String(index + 1).padStart(2, "0")}</span>
                  <span className="text-xs font-semibold">{step.title}</span>
                </button>
              ))}
            </div>
            <article className="border border-[#dfd0b8] bg-gradient-to-br from-[#fffdf8] via-[#f8f5ee] to-[#eee4d4] p-5 text-[#1d2933] sm:p-7">
              <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#93672f]">{String(activeStep + 1).padStart(2, "0")} / {flow.length}</div>
              <h3 className="mt-3 text-xl font-semibold tracking-tight">{flow[activeStep].title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#596873]">{flow[activeStep].body}</p>
              {activeStep === 2 ? <p className="mt-3 border-l-2 border-[#b98745] pl-3 text-xs font-semibold">{t.stepNote}</p> : null}
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={flow[activeStep].href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-[#a8793d] bg-[#b98745] px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#9d7138]">{flow[activeStep].action} ↗</a>
                {activeStep > 0 ? <button type="button" onClick={() => setActiveStep(activeStep - 1)} className="border border-[#d9c6a4] px-4 py-3 text-xs font-semibold text-[#596873]">{t.previous}</button> : null}
                {activeStep < flow.length - 1 ? <button type="button" onClick={() => setActiveStep(activeStep + 1)} className="border border-[#d9c6a4] px-4 py-3 text-xs font-semibold text-[#596873]">{t.next} →</button> : null}
              </div>
              <div className="mt-5 h-1.5 overflow-hidden bg-white/70"><div className="h-full bg-[#b98745] transition-all" style={{ width: `${((activeStep + 1) / flow.length) * 100}%` }} /></div>
            </article>
          </div>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
          <div className="border border-[#e1b8af] bg-[#fff8f6] p-5 text-[#342321]">
            <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#a43f37]">SECURITY FIRST</div>
            <h2 className="mt-2 text-base font-semibold">{t.safetyTitle}</h2>
            <p className="mt-2 text-xs leading-relaxed text-[#6c5551]">{t.safetyBody}</p>
            <a href="https://minepi.com/safety/" target="_blank" rel="noreferrer" className="mt-4 inline-flex text-xs font-semibold text-[#8d352e] underline underline-offset-4">{t.safetyLink} ↗</a>
          </div>
          <div className="border border-border bg-card p-5">
            <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#b98745]">ABOUT THIS GUIDE</div>
            <h2 className="mt-2 text-base font-semibold">{t.aboutTitle}</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t.aboutBody}</p>
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
