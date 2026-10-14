import type { Locale } from "./i18n";

export const servicePolicy: Record<Locale, { label: string; detail: string }> = {
  en: { label: "Free · Not for profit", detail: "ZAF Tech is free to use on iOS, Android and desktop browsers. We do not charge users or accept payments. Public observations are available without signing in." },
  tr: { label: "Ücretsiz · Kar amacı gütmez", detail: "ZAF Tech iOS, Android ve masaüstü tarayıcılarda ücretsizdir. Kullanıcılardan ücret veya ödeme almayız. Herkese açık gözlemler giriş yapmadan kullanılabilir." },
  es: { label: "Gratis · Sin fines de lucro", detail: "ZAF Tech es gratuito en iOS, Android y navegadores de escritorio. No cobramos ni aceptamos pagos. Las observaciones públicas están disponibles sin iniciar sesión." },
  zh: { label: "免费 · 非营利", detail: "ZAF Tech 可在 iOS、Android 和桌面浏览器上免费使用。我们不向用户收费或接受付款。公开观察无需登录即可查看。" },
  it: { label: "Gratuito · Senza scopo di lucro", detail: "ZAF Tech è gratuito su iOS, Android e browser desktop. Non addebitiamo costi né accettiamo pagamenti. Le osservazioni pubbliche sono accessibili senza accedere." },
  fr: { label: "Gratuit · Sans but lucratif", detail: "ZAF Tech est gratuit sur iOS, Android et les navigateurs de bureau. Nous ne facturons pas les utilisateurs et n’acceptons pas de paiements. Les observations publiques sont accessibles sans connexion." },
  de: { label: "Kostenlos · Ohne Gewinnabsicht", detail: "ZAF Tech ist auf iOS, Android und Desktop-Browsern kostenlos. Wir erheben keine Gebühren und nehmen keine Zahlungen an. Öffentliche Beobachtungen sind ohne Anmeldung zugänglich." },
  pt: { label: "Gratuito · Sem fins lucrativos", detail: "A ZAF Tech é gratuita no iOS, Android e navegadores de computador. Não cobramos nem aceitamos pagamentos. As observações públicas estão disponíveis sem iniciar sessão." },
  ru: { label: "Бесплатно · Без цели получения прибыли", detail: "ZAF Tech бесплатен в iOS, Android и настольных браузерах. Мы не взимаем плату и не принимаем платежи. Публичные наблюдения доступны без входа." },
};
