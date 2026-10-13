"use client";

import Link from "next/link";
import { useState } from "react";
import { LanguageSelector } from "@/components/zaf-language-selector";

import type { Locale } from "@/lib/zaf/i18n";

const copy = {
  en: {
    back: "← Back To ZAF Tech", title: "Privacy", subtitle: "ZAF Tech Pi Ecosystem Observatory",
    scope: "Data Scope", scopeText: "ZAF Tech is an independent, read-only technology layer. It reads observable public Pi ecosystem, Network, Mainnet/Testnet and Node-related sources, and may run public URL checks requested by the user. The Wallet Observatory feature only uses a public Pi wallet address for observable blockchain data.",
    wallet: "No Wallet Access", walletText: "The Developer Tools address inspector performs local format validation only. Wallet Observatory does not access private keys, seed phrases or wallet credentials, does not connect to a user wallet, and does not sign blockchain transactions. Wallet lookups are based on publicly observable blockchain data.",
    local: "Local Preferences", localText: "Language and theme preferences may be stored locally in the browser. They are used to preserve the user's interface settings.",
    public: "Public Sources", publicText: "Network, ecosystem, Node and wallet observations are derived from public or explicitly observable sources. ZAF Tech distinguishes observed data from unverified claims and does not claim that its observations represent the entire Pi Network. Where a source does not directly expose a value, ZAF Tech does not infer it as fact; for example, private Pi lockup commitments are not presented as publicly verified locked balances.",
    boundary: "Important Boundary", boundaryText: "ZAF Tech is an independent community-developed project and is not an official Pi Core Team product.",
  },
  es: {
    back: "← Volver A ZAF Tech", title: "Privacidad", subtitle: "Observatorio Del Ecosistema Pi De ZAF Tech",
    scope: "Alcance De Datos", scopeText: "ZAF Tech es una capa tecnológica independiente y de solo lectura. Lee fuentes públicas y observables del ecosistema Pi, la Red, Mainnet/Testnet y Node, y puede ejecutar comprobaciones de URL públicas solicitadas por el usuario. La función de observación de billetera solo utiliza una dirección pública de billetera Pi para obtener datos observables de blockchain.",
    wallet: "Sin Acceso A La Billetera", walletText: "El inspector de direcciones de Developer Tools solo realiza validación local del formato. El Observatorio De Billetera no accede a claves privadas, frases semilla ni credenciales de billetera, no conecta una billetera de usuario y no firma transacciones blockchain. Las consultas de billetera se basan en datos de blockchain públicamente observables.",
    local: "Preferencias Locales", localText: "Las preferencias de idioma y tema pueden almacenarse localmente en el navegador. Se utilizan para conservar la configuración de la interfaz del usuario.",
    public: "Fuentes Públicas", publicText: "Las observaciones de Red, ecosistema, Node y billetera se derivan de fuentes públicas o explícitamente observables. ZAF Tech distingue los datos observados de las afirmaciones no verificadas y no afirma que sus observaciones representen toda la red Pi. Cuando una fuente no expone directamente un valor, ZAF Tech no lo presenta como un hecho; por ejemplo, los compromisos privados de lockup de Pi no se muestran como saldos bloqueados verificados públicamente.",
    boundary: "Límite Importante", boundaryText: "ZAF Tech es un proyecto independiente desarrollado por la comunidad y no es un producto oficial de Pi Core Team.",
  },
  zh: {
    back: "← 返回 ZAF Tech",
    title: "隐私",
    subtitle: "ZAF Tech Pi 生态观测中心",
    scope: "数据范围",
    scopeText: "ZAF Tech 是一个独立的只读技术层。它读取可观测的公开 Pi 生态、Network、Mainnet/Testnet 和 Node 相关来源，并可以执行用户请求的公开 URL 检查。钱包观测功能仅使用公开 Pi 钱包地址获取可观测的区块链数据。",
    wallet: "无钱包访问",
    walletText: "Developer Tools 地址检查器仅执行本地格式验证。钱包观测不会访问私钥、助记词或钱包凭据，不连接用户钱包，也不会签署区块链交易。钱包查询基于公开可观测的区块链数据。",
    local: "本地偏好",
    localText: "语言和主题偏好可以保存在浏览器本地，用于保留用户的界面设置。",
    public: "公开来源",
    publicText: "Network、生态、Node 和钱包观测来自公开或明确可观测的来源。ZAF Tech 区分已观测数据和未经验证的声明，并不声称其观测代表整个 Pi Network。如果来源没有直接提供某个值，ZAF Tech 不会将其推断为事实；例如，私有 Pi lockup 承诺不会被展示为公开验证的锁定余额。",
    boundary: "重要边界",
    boundaryText: "ZAF Tech 是一个独立的社区开发项目，不是 Pi Core Team 的官方产品。",
  },  it: {
    back: "← Torna A ZAF Tech",
    title: "Privacy",
    subtitle: "ZAF Tech Pi Ecosystem Observatory",
    scope: "Ambito Dei Dati",
    scopeText: "ZAF Tech è un livello tecnologico indipendente e di sola lettura. Legge fonti pubbliche e osservabili di Pi ecosystem, Network, Mainnet/Testnet e Node e può eseguire controlli su URL pubblici richiesti dall’utente. Wallet Observatory utilizza solo un indirizzo wallet Pi pubblico per dati blockchain osservabili.",
    wallet: "Nessun Accesso Al Wallet",
    walletText: "Pi Address Inspector esegue solo la validazione locale del formato. Wallet Observatory non accede a chiavi private, seed phrase o credenziali del wallet, non si connette al wallet dell’utente e non firma transazioni blockchain. Le ricerche del wallet si basano su dati blockchain pubblicamente osservabili.",
    local: "Preferenze Locali",
    localText: "Le preferenze di lingua e tema possono essere memorizzate localmente nel browser per mantenere le impostazioni dell’interfaccia.",
    public: "Fonti Pubbliche",
    publicText: "Le osservazioni Network, ecosystem, Node e wallet provengono da fonti pubbliche o chiaramente osservabili. ZAF Tech distingue i dati osservati dalle affermazioni non verificate e non dichiara che le proprie osservazioni rappresentino l’intera Pi Network. Quando una fonte non fornisce direttamente un valore, ZAF Tech non lo deduce come fatto.",
    boundary: "Limite Importante",
    boundaryText: "ZAF Tech è un progetto indipendente sviluppato dalla comunità e non è un prodotto ufficiale di Pi Core Team."
  },
  fr: {
    back: "← Retour À ZAF Tech",
    title: "Confidentialité",
    subtitle: "ZAF Tech Pi Ecosystem Observatory",
    scope: "Périmètre Des Données",
    scopeText: "ZAF Tech est un projet technologique indépendant et en lecture seule. Il lit des sources publiques et observables de Pi ecosystem, Network, Mainnet/Testnet et Node et peut effectuer des contrôles sur les URL publiques demandées par l’utilisateur. Wallet Observatory utilise uniquement une adresse publique de wallet Pi pour les données blockchain observables.",
    wallet: "Aucun Accès Au Wallet",
    walletText: "Pi Address Inspector effectue uniquement une validation locale du format. Wallet Observatory n’accède pas aux clés privées, seed phrases ou identifiants du wallet, ne se connecte pas au wallet de l’utilisateur et ne signe pas de transactions blockchain. Les recherches de wallet reposent sur des données blockchain publiquement observables.",
    local: "Préférences Locales",
    localText: "Les préférences de langue et de thème peuvent être stockées localement dans le navigateur afin de conserver les paramètres de l’interface.",
    public: "Sources Publiques",
    publicText: "Les observations Network, ecosystem, Node et wallet proviennent de sources publiques ou clairement observables. ZAF Tech distingue les données observées des affirmations non vérifiées et ne prétend pas que ses observations représentent l’ensemble de Pi Network. Lorsqu’une source ne fournit pas directement une valeur, ZAF Tech ne l’infère pas comme un fait.",
    boundary: "Limite Importante",
    boundaryText: "ZAF Tech est un projet indépendant développé par la communauté et n’est pas un produit officiel de Pi Core Team."
  },
  de: {
    back: "← Zurück Zu ZAF Tech", title: "Datenschutz", subtitle: "ZAF Tech Pi Ökosystem Beobachtungszentrum",
    scope: "Datenumfang", scopeText: "ZAF Tech ist eine unabhängige, schreibgeschützte Technologieebene. Sie liest öffentliche und beobachtbare Quellen zu Pi Ökosystem, Network, Mainnet/Testnet und Node und kann vom Benutzer angeforderte öffentliche URL-Prüfungen durchführen. Wallet Observatory verwendet nur eine öffentliche Pi-Wallet-Adresse für beobachtbare Blockchain-Daten.",
    wallet: "Kein Wallet-Zugriff", walletText: "Der Pi Address Inspector validiert nur lokal das Adressformat. Wallet Observatory greift nicht auf private Schlüssel, Seed-Phrases oder Wallet-Anmeldedaten zu, verbindet sich nicht mit dem Wallet des Benutzers und signiert keine Blockchain-Transaktionen. Wallet-Abfragen basieren auf öffentlich beobachtbaren Blockchain-Daten.",
    local: "Lokale Einstellungen", localText: "Sprach- und Designeinstellungen können lokal im Browser gespeichert werden, um die Benutzeroberfläche zu erhalten.",
    public: "Öffentliche Quellen", publicText: "Beobachtungen zu Network, Ökosystem, Node und Wallet stammen aus öffentlichen oder eindeutig beobachtbaren Quellen. ZAF Tech trennt beobachtete Daten von nicht verifizierten Aussagen und behauptet nicht, dass seine Beobachtungen das gesamte Pi Network darstellen.",
    boundary: "Wichtige Grenze", boundaryText: "ZAF Tech ist ein unabhängiges, von der Community entwickeltes Projekt und kein offizielles Produkt des Pi Core Team."
  },
  pt: {
    back: "← Voltar Para ZAF Tech", title: "Privacidade", subtitle: "Observatório Do Ecossistema Pi Da ZAF Tech",
    scope: "Escopo Dos Dados", scopeText: "A ZAF Tech é uma camada tecnológica independente e somente leitura. Ela consulta fontes públicas e observáveis do ecossistema Pi, Network, Mainnet/Testnet e Node e pode executar verificações de URLs públicas solicitadas pelo usuário. Wallet Observatory usa apenas um endereço público de carteira Pi para dados observáveis da blockchain.",
    wallet: "Sem Acesso À Carteira", walletText: "O Pi Address Inspector realiza apenas a validação local do formato. Wallet Observatory não acessa chaves privadas, seed phrases ou credenciais da carteira, não se conecta à carteira do usuário e não assina transações de blockchain. As consultas da carteira usam dados públicos observáveis da blockchain.",
    local: "Preferências Locais", localText: "As preferências de idioma e tema podem ser armazenadas localmente no navegador para manter as configurações da interface.",
    public: "Fontes Públicas", publicText: "As observações de Network, ecossistema, Node e carteira vêm de fontes públicas ou claramente observáveis. A ZAF Tech separa dados observados de afirmações não verificadas e não afirma que suas observações representem toda a Pi Network.",
    boundary: "Limite Importante", boundaryText: "A ZAF Tech é um projeto independente desenvolvido pela comunidade e não é um produto oficial da Pi Core Team."
  },
  ru: {
    back: "← Назад В ZAF Tech", title: "Конфиденциальность", subtitle: "Наблюдательный Центр Экосистемы Pi ZAF Tech",
    scope: "Охват Данных", scopeText: "ZAF Tech — независимый технологический слой только для чтения. Он получает данные из общедоступных и наблюдаемых источников экосистемы Pi, Network, Mainnet/Testnet и Node и может выполнять проверки общедоступных URL по запросу пользователя. Wallet Observatory использует только публичный адрес Pi-кошелька для наблюдаемых данных блокчейна.",
    wallet: "Нет Доступа К Кошельку", walletText: "Pi Address Inspector выполняет только локальную проверку формата. Wallet Observatory не получает доступ к приватным ключам, seed-фразам или учетным данным кошелька, не подключается к кошельку пользователя и не подписывает транзакции блокчейна. Запросы кошелька основаны на общедоступных наблюдаемых данных блокчейна.",
    local: "Локальные Настройки", localText: "Настройки языка и темы могут храниться локально в браузере для сохранения параметров интерфейса.",
    public: "Публичные Источники", publicText: "Наблюдения Network, экосистемы, Node и кошелька получают из публичных или явно наблюдаемых источников. ZAF Tech отделяет наблюдаемые данные от непроверенных утверждений и не заявляет, что его наблюдения представляют всю Pi Network.",
    boundary: "Важное Ограничение", boundaryText: "ZAF Tech — независимый проект, разработанный сообществом, а не официальный продукт Pi Core Team."
  },
  tr: {
    back: "← ZAF Tech'e Dön", title: "Gizlilik", subtitle: "ZAF Tech Pi Ekosistem Gözlem Merkezi",
    scope: "Veri Kapsamı", scopeText: "ZAF Tech bağımsız, salt-okunur bir teknoloji katmanıdır. Gözlemlenebilir herkese açık Pi ekosistemi, Network, Mainnet/Testnet ve Node kaynaklarını okur ve kullanıcı tarafından istenen herkese açık URL kontrollerini çalıştırabilir. Wallet Observatory özelliği yalnızca herkese açık Pi cüzdan adresi üzerinden gözlemlenebilir blockchain verilerini kullanır.",
    wallet: "Cüzdan Erişimi Yok", walletText: "Developer Tools adres denetleyicisi yalnızca yerel format doğrulaması yapar. Wallet Observatory özel anahtarlara, seed phrase'lere veya cüzdan kimlik bilgilerine erişmez; kullanıcı cüzdanına bağlanmaz ve blockchain işlemlerini imzalamaz. Cüzdan sorguları herkese açık olarak gözlemlenebilir blockchain verilerine dayanır.",
    local: "Yerel Tercihler", localText: "Dil ve tema tercihleri tarayıcıda yerel olarak saklanabilir. Bunlar kullanıcı arayüzü ayarlarını korumak için kullanılır.",
    public: "Herkese Açık Kaynaklar", publicText: "Network, ekosistem, Node ve cüzdan gözlemleri herkese açık veya açıkça gözlemlenebilir kaynaklardan elde edilir. ZAF Tech, gözlemlenen verileri doğrulanmamış iddialardan ayırır ve gözlemlerinin Pi Network'ün tamamını temsil ettiğini iddia etmez. Bir kaynak bir değeri doğrudan sunmuyorsa ZAF Tech bunu gerçekmiş gibi çıkarmaz; örneğin özel Pi lockup taahhütleri herkese açık olarak doğrulanmış kilitli bakiye şeklinde sunulmaz.",
    boundary: "Önemli Sınır", boundaryText: "ZAF Tech bağımsız, topluluk tarafından geliştirilen bir projedir ve resmi Pi Core Team ürünü değildir.",
  },
};

export default function PrivacyPage() {
  const [locale, setLocale] = useState<Locale>("en");



  const t = copy[locale];
  const changeLocale = (next: Locale) => {
    setLocale(next);
    
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <article className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-xs underline underline-offset-2">{t.back}</Link>
          <LanguageSelector locale={locale} onChange={changeLocale} />
        </div>
        <h1 className="mt-6 text-2xl font-bold">{t.title}</h1>
        <p className="mt-2 text-xs text-muted-foreground">{t.subtitle}</p>
        <div className="mt-6 space-y-5 text-sm leading-relaxed text-muted-foreground">
          <section><h2 className="font-semibold text-foreground">{t.scope}</h2><p className="mt-2">{t.scopeText}</p></section>
          <section><h2 className="font-semibold text-foreground">{t.wallet}</h2><p className="mt-2">{t.walletText}</p></section>
          <section><h2 className="font-semibold text-foreground">{t.local}</h2><p className="mt-2">{t.localText}</p></section>
          <section><h2 className="font-semibold text-foreground">{t.public}</h2><p className="mt-2">{t.publicText}</p></section>
          <section><h2 className="font-semibold text-foreground">{t.boundary}</h2><p className="mt-2">{t.boundaryText}</p></section>
        </div>
      </article>
    </main>
  );
}
