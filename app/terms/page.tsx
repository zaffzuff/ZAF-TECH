import Link from "next/link";
import { ZafBrand } from "@/components/zaf-brand";
import { CONTACT_EMAIL, LEGAL_UPDATED, OPERATOR } from "@/lib/zaf/legal-notice";

const terms = {
  en: {
    title: "Terms of Service", back: "Back to ZAF Tech", privacy: "Privacy Policy", updated: "Last updated",
    intro: "These terms describe the use of ZAF Tech, a free, not-for-profit Pi ecosystem observatory operated by Zafer TEKYILDIZ in Türkiye.",
    sections: [
      ["Service and access", "ZAF Tech provides observations and tools based on public Pi ecosystem and network sources. Public information can be viewed without signing in. Optional Pi sign-in verifies a username. ZAF Tech accepts no user payments, sells no subscriptions and does not request wallet custody, private keys, or transaction signing. Pi account eligibility and authorization are governed by Pi's own requirements."],
      ["Use of observations", "Data may be delayed, incomplete, inaccurate or unavailable. Source availability, health scores and trends describe limited observations, not official endorsements, security audits or guarantees. The service does not provide personalized financial, investment, legal or tax advice. Verify consequential decisions against the original sources."],
      ["Acceptable use", "Use only public addresses, transaction identifiers and public URLs you are entitled to submit. Respect rate limits. Do not attempt unauthorized access, scan private networks, submit credentials or confidential URLs, disrupt the service, bypass protections, impersonate another person or use the tools unlawfully. Access can be limited where reasonably necessary to prevent abuse or comply with law."],
      ["Pi sign-in and external services", "Pi verifies the identity shared with your permission. ZAF Tech displays the server-verified username; a browser-stored display name is not a server session or permission to access protected data. External websites, Pi and hosting services have their own terms. ZAF Tech is independent of the Pi Core Team and cannot control third-party availability, approval decisions or accounts."],
      ["Privacy and requests", "The Privacy Policy explains information flows, storage, recipients and your rights. For support, corrections and privacy requests, contact zaftech.contact@gmail.com. Never send passwords, wallet passphrases or access tokens. Public blockchain information cannot be deleted by ZAF Tech."],
      ["Content and attribution", "The ZAF Tech name, original interface and content are used with the rights of their respective owners. Public data, third-party marks and linked content retain their own rights and licenses. Availability in a public source does not grant a blanket license. Any software license expressly present in the repository applies to that software; these terms do not replace it."],
      ["Availability and responsibility", "The service is provided on an available-effort basis and can be maintained, changed or discontinued. Continuous availability and error-free information are not promised. To the extent allowed by law, the operator is not responsible for losses caused by relying on incomplete observations or third-party failures. Nothing excludes responsibility that cannot lawfully be excluded or limits mandatory consumer, privacy or other statutory rights."],
      ["Updates and applicable law", "Material changes will be identified on this page with an updated date; use the contact address if you have questions. These terms are subject to applicable Turkish law, without removing mandatory protections available under other applicable law. Competent authorities and courts are determined by the applicable rules; no exclusive venue or waiver of statutory remedies is imposed here."],
    ],
  },
  tr: {
    title: "Kullanım Koşulları", back: "ZAF Tech'e dön", privacy: "Gizlilik Politikası", updated: "Son güncelleme",
    intro: "Bu koşullar, Türkiye'de Zafer TEKYILDIZ tarafından şahsen işletilen ücretsiz ve kâr amacı gütmeyen Pi ekosistem gözlem hizmeti ZAF Tech'in kullanımını açıklar.",
    sections: [
      ["Hizmet ve erişim", "ZAF Tech, herkese açık Pi ekosistemi ve ağ kaynaklarına dayalı gözlemler ve araçlar sunar. Açık bilgiler giriş yapmadan görüntülenebilir. İsteğe bağlı Pi girişi kullanıcı adını doğrular. ZAF Tech kullanıcıdan ödeme almaz, abonelik satmaz; cüzdan saklama, özel anahtar veya işlem imzalama talep etmez. Pi hesabı uygunluğu ve yetkilendirmesi Pi'nin kendi şartlarına tabidir."],
      ["Gözlemlerin kullanımı", "Veriler gecikmiş, eksik, hatalı veya kullanılamaz olabilir. Kaynak erişilebilirliği, sağlık puanları ve eğilimler sınırlı gözlemleri ifade eder; resmî onay, güvenlik denetimi veya garanti değildir. Hizmet kişiye özel finans, yatırım, hukuk veya vergi danışmanlığı sunmaz. Önemli kararlar için bilgileri asıl kaynaklardan doğrulayın."],
      ["Uygun kullanım", "Yalnızca sorgulamaya yetkili olduğunuz açık adres, işlem kimliği ve herkese açık URL'leri kullanın. İstek sınırlarına uyun. Yetkisiz erişim, özel ağ taraması, gizli bilgi veya özel URL gönderimi, hizmeti aksatma, korumaları aşma, başkasını taklit etme ve hukuka aykırı kullanım yasaktır. Kötüye kullanımı önlemek veya hukuka uymak için makul ölçüde erişim sınırlanabilir."],
      ["Pi girişi ve dış hizmetler", "Pi, izninizle paylaştığı kimliği doğrular. ZAF Tech sunucuda doğrulanan kullanıcı adını gösterir; tarayıcıda tutulan görünen ad sunucu oturumu veya korumalı verilere erişim yetkisi değildir. Dış siteler, Pi ve barındırma hizmetleri kendi koşullarına sahiptir. ZAF Tech, Pi Core Team'den bağımsızdır; üçüncü taraf erişilebilirliğini, onay kararlarını veya hesaplarını kontrol edemez."],
      ["Gizlilik ve talepler", "Gizlilik Politikası bilgi akışlarını, saklamayı, alıcıları ve haklarınızı açıklar. Destek, düzeltme ve gizlilik talepleri için zaftech.contact@gmail.com adresine yazabilirsiniz. Şifre, cüzdan kurtarma kelimeleri veya erişim belirteci göndermeyin. Herkese açık blockchain bilgileri ZAF Tech tarafından silinemez."],
      ["İçerik ve atıf", "ZAF Tech adı, özgün arayüz ve içerikler ilgili hak sahiplerinin haklarına tabidir. Açık veriler, üçüncü taraf markaları ve bağlantılı içerikler kendi hak ve lisanslarını korur. Bir kaynakta açıkça bulunması genel kullanım lisansı vermez. Depoda yazılım için açıkça belirtilen lisans o yazılıma uygulanır; bu koşullar lisansın yerine geçmez."],
      ["Erişilebilirlik ve sorumluluk", "Hizmet mevcut imkânlarla sunulur; bakım yapılabilir, değiştirilebilir veya sonlandırılabilir. Kesintisiz erişim ve hatasız bilgi taahhüt edilmez. Hukukun izin verdiği ölçüde işletmeci eksik gözlemlere güvenilmesi veya üçüncü taraf arızalarından doğan kayıplardan sorumlu değildir. Hukuken kaldırılamayan sorumluluklar ile emredici tüketici, gizlilik ve diğer kanuni haklarınız bu hükümle sınırlandırılmaz."],
      ["Güncellemeler ve uygulanacak hukuk", "Önemli değişiklikler bu sayfada güncel tarihle belirtilir; sorularınız için iletişim adresini kullanabilirsiniz. Koşullar, diğer uygulanabilir hukukun emredici korumalarını ortadan kaldırmadan Türk hukukuna tabidir. Yetkili makam ve mahkemeler uygulanacak kurallara göre belirlenir; burada münhasır bir yer şartı veya kanuni başvuru yollarından feragat öngörülmez."],
    ],
  },
} as const;

export default async function TermsPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const locale = (await searchParams).lang === "tr" ? "tr" : "en";
  const t = terms[locale];
  return (
    <main lang={locale} className="min-h-screen bg-background px-4 py-8 text-foreground">
      <article className="mx-auto max-w-2xl">
        <ZafBrand className="mb-6" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-sm underline underline-offset-2">← {t.back}</Link>
          <nav aria-label={locale === "tr" ? "Metin dili" : "Document language"} className="flex gap-2 text-sm">
            <Link href="/terms?lang=en" hrefLang="en" aria-current={locale === "en" ? "page" : undefined} className="rounded-lg border border-border px-3 py-2 aria-[current=page]:bg-muted">English</Link>
            <Link href="/terms?lang=tr" hrefLang="tr" aria-current={locale === "tr" ? "page" : undefined} className="rounded-lg border border-border px-3 py-2 aria-[current=page]:bg-muted">Türkçe</Link>
          </nav>
        </div>
        <h1 className="mt-6 text-2xl font-bold">{t.title}</h1>
        <p className="mt-2 text-xs text-muted-foreground">{t.updated}: <time dateTime={LEGAL_UPDATED}>{LEGAL_UPDATED}</time></p>
        <p className="mt-4 text-sm leading-relaxed">{t.intro}</p>
        <div className="mt-6 space-y-5 text-sm leading-relaxed text-muted-foreground">
          {t.sections.map(([title, text]) => <section key={title}><h2 className="font-semibold text-foreground">{title}</h2><p className="mt-2">{text}</p></section>)}
        </div>
        <footer className="mt-8 flex flex-wrap gap-3 border-t border-border pt-4 text-sm">
          <Link href="/privacy" className="underline underline-offset-2">{t.privacy}</Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className="break-all underline underline-offset-2">{CONTACT_EMAIL}</a>
          <span>{OPERATOR} · Türkiye</span>
        </footer>
      </article>
    </main>
  );
}
