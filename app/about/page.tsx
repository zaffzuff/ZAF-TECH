"use client";

import Link from "next/link";
import { useState } from "react";
import { LanguageSelector } from "@/components/zaf-language-selector";

import type { Locale } from "@/lib/zaf/i18n";

const copy = {
  en: {
    back: "← Back To ZAF TECH",
    title: "About ZAF TECH",
    subtitle: "Pi Ecosystem Observatory",
    what: "What It Is",
    whatText: "ZAF TECH is an independent, read-only technology layer for discovering, checking and observing public Pi Network ecosystem data.",
    scope: "Current Scope",
    scopeText: "The current release includes the Pi Ecosystem Observatory, App Directory, App Details, App URL Checker, Network view, Developer Tools, Node & Compute observations and Wallet Observatory, with interface support in English, Turkish, Spanish, Chinese, Italian, French, German, Portuguese and Russian.",
    verification: "Verification Principle",
    verificationText: "ZAF TECH separates observed facts from unverified claims. Pi-specific capabilities are not marked as verified unless an observable check supports them.",
    future: "Next Phase",
    futureText: "The next phase focuses on hardening the read-only foundation and preparing a clear Pi integration boundary. Pi authentication, payments and other authenticated capabilities will be introduced only after the foundation is verified and frozen. Private wallet keys, signing and unrestricted write access remain outside the read-only observatory scope.",
  },
  es: {
    back: "← Volver A ZAF TECH", title: "Acerca De ZAF TECH", subtitle: "Observatorio Del Ecosistema Pi",
    what: "Qué Es", whatText: "ZAF TECH es una capa tecnológica independiente y de solo lectura para descubrir, comprobar y observar datos públicos del ecosistema Pi Network.",
    scope: "Alcance Actual", scopeText: "La versión actual incluye el Observatorio Del Ecosistema Pi, el Directorio De Aplicaciones, los Detalles De Aplicaciones, el Comprobador De URL, la vista de Red, las Herramientas Para Desarrolladores, las observaciones de Node Y Cómputo y el Observatorio De Billetera, con soporte de interfaz en inglés, español y turco.",
    verification: "Principio De Verificación", verificationText: "ZAF TECH separa los hechos observados de las afirmaciones no verificadas. Las capacidades específicas de Pi no se marcan como verificadas a menos que una comprobación observable las respalde.",
    future: "Dirección Futura", futureText: "La siguiente fase planificada amplía ZAF TECH con observaciones de billeteras Pi públicas, selección de Mainnet/Testnet, saldos observables y reclamables, metadatos de cuenta, transacciones y operaciones públicas recientes y navegación al explorador. El acceso privado a la billetera, la firma y la autenticación están fuera de este alcance.",
  },
  zh: {
    back: "← 返回 ZAF TECH",
    title: "关于 ZAF TECH",
    subtitle: "Pi 生态观测中心",
    what: "项目简介",
    whatText: "ZAF TECH 是一个独立的只读技术层，用于发现、检查和观测公开的 Pi Network 生态数据。",
    scope: "当前范围",
    scopeText: "当前版本包括 Pi 生态观测中心、应用目录、应用详情、应用 URL 检查器、网络视图、开发者工具、Node 与计算观测以及钱包观测，并支持英语、西班牙语、土耳其语和中文界面。",
    verification: "验证原则",
    verificationText: "ZAF TECH 将已观测事实与未经验证的声明分开。除非可观测检查提供支持，否则不会将 Pi 特定功能标记为已验证。",
    future: "未来方向",
    futureText: "下一阶段将继续扩展 ZAF TECH 的钱包观测能力，包括公开 Pi 钱包地址查询、Mainnet/Testnet 选择、可观测余额和可领取余额、账户元数据、近期公开交易与操作以及区块浏览器导航。私有钱包访问、签名和身份验证不在此范围内。",
  },  it: {
    back: "← Torna A ZAF TECH",
    title: "Informazioni Su ZAF TECH",
    subtitle: "Osservatorio Dell’Ecosistema Pi",
    what: "Che Cos’è",
    whatText: "ZAF TECH è un livello tecnologico indipendente e di sola lettura per scoprire, verificare e osservare i dati pubblici dell’ecosistema Pi Network.",
    scope: "Ambito Attuale",
    scopeText: "La versione attuale include Pi Ecosystem Observatory, App Directory, App Details, App URL Checker, vista Network, Developer Tools, osservazioni Node & Compute e Wallet Observatory. L’interfaccia è disponibile in English, Spanish, Turkish, Chinese e Italian.",
    verification: "Principio Di Verifica",
    verificationText: "ZAF TECH mantiene separati i fatti osservati dalle affermazioni non verificate. Le funzionalità specifiche di Pi non vengono considerate verificate finché un controllo osservabile non le supporta.",
    future: "Direzione Futura",
    futureText: "La fase successiva estende ZAF TECH con osservazioni pubbliche dei wallet Pi, selezione Mainnet/Testnet, saldi e saldi claimable osservabili, metadati dell’account, transazioni e operazioni pubbliche recenti e navigazione verso l’explorer. L’accesso privato al wallet, la firma e l’autenticazione sono fuori ambito."
  },
  fr: {
    back: "← Retour À ZAF TECH",
    title: "À Propos De ZAF TECH",
    subtitle: "Observatoire De L’Écosystème Pi",
    what: "Qu’est-Ce Que C’est",
    whatText: "ZAF TECH est un niveau technologique indépendant et en lecture seule permettant de découvrir, vérifier et observer les données publiques de l’écosystème Pi Network.",
    scope: "Périmètre Actuel",
    scopeText: "La version actuelle comprend l’Observatoire de l’écosystème Pi, le répertoire des applications, les détails des applications, le vérificateur d’URL, la vue réseau, les outils développeur, les observations Node & Compute et Wallet Observatory. L’interface est disponible en English, Spanish, Turkish, Chinese, Italian et French.",
    verification: "Principe De Vérification",
    verificationText: "ZAF TECH sépare les faits observés des affirmations non vérifiées. Les fonctionnalités spécifiques à Pi ne sont pas considérées comme vérifiées tant qu’un contrôle observable ne les confirme pas.",
    future: "Orientation Future",
    futureText: "La prochaine étape étendra ZAF TECH avec des observations publiques des wallets Pi, la sélection Mainnet/Testnet, les soldes et soldes claimable observables, les métadonnées de compte, les transactions et opérations publiques récentes et la navigation vers l’explorer. L’accès privé au wallet, la signature et l’authentification restent hors périmètre."
  },
  de: {
    back: "← Zurück Zu ZAF TECH", title: "Über ZAF TECH", subtitle: "Pi Ökosystem Beobachtungszentrum",
    what: "Was Es Ist", whatText: "ZAF TECH ist eine unabhängige, schreibgeschützte Technologieebene zum Entdecken, Prüfen und Beobachten öffentlicher Daten des Pi Network Ökosystems.",
    scope: "Aktueller Umfang", scopeText: "Die aktuelle Version umfasst das Pi Ökosystem Beobachtungszentrum, App-Verzeichnis, App-Details, URL-Prüfer, Netzwerkansicht, Entwicklerwerkzeuge, Node- und Compute-Beobachtungen sowie Wallet Observatory und unterstützt Englisch, Spanisch, Türkisch, Chinesisch, Italienisch, Französisch, Deutsch, Portugiesisch und Russisch.",
    verification: "Verifizierungsprinzip", verificationText: "ZAF TECH trennt beobachtete Fakten von nicht verifizierten Aussagen. Pi-spezifische Funktionen werden nur dann als verifiziert markiert, wenn eine beobachtbare Prüfung sie bestätigt.",
    future: "Zukünftige Richtung", futureText: "Die nächste geplante Phase erweitert ZAF TECH um öffentliche Beobachtungen von Pi-Wallets, Mainnet/Testnet-Auswahl, beobachtbare Guthaben und Claimable-Guthaben, Kontometadaten, aktuelle öffentliche Transaktionen und Operationen sowie Explorer-Navigation. Privater Wallet-Zugriff, Signaturen und Authentifizierung liegen außerhalb dieses Umfangs."
  },
  pt: {
    back: "← Voltar Para ZAF TECH", title: "Sobre A ZAF TECH", subtitle: "Observatório Do Ecossistema Pi",
    what: "O Que É", whatText: "A ZAF TECH é uma camada tecnológica independente e somente leitura para descobrir, verificar e observar dados públicos do ecossistema Pi Network.",
    scope: "Escopo Atual", scopeText: "A versão atual inclui o Observatório Do Ecossistema Pi, Diretório De Aplicativos, Detalhes Dos Aplicativos, Verificador De URL, visão da Rede, Ferramentas Para Desenvolvedores, observações de Node e Compute e Wallet Observatory, com suporte para inglês, espanhol, turco, chinês, italiano, francês, alemão, português e russo.",
    verification: "Princípio De Verificação", verificationText: "A ZAF TECH separa fatos observados de afirmações não verificadas. Recursos específicos do Pi só são marcados como verificados quando uma verificação observável os confirma.",
    future: "Direção Futura", futureText: "A próxima fase planejada amplia a ZAF TECH com observações públicas de carteiras Pi, seleção Mainnet/Testnet, saldos observáveis e saldos claimable, metadados da conta, transações e operações públicas recentes e navegação para o explorer. O acesso privado à carteira, assinaturas e autenticação estão fora deste escopo."
  },
  ru: {
    back: "← Назад В ZAF TECH", title: "О ZAF TECH", subtitle: "Наблюдательный Центр Экосистемы Pi",
    what: "Что Это", whatText: "ZAF TECH — независимый технологический слой только для чтения, предназначенный для обнаружения, проверки и наблюдения за общедоступными данными экосистемы Pi Network.",
    scope: "Текущий Охват", scopeText: "Текущая версия включает наблюдательный центр экосистемы Pi, каталог приложений, сведения о приложениях, проверку URL, представление сети, инструменты разработчика, наблюдения Node и Compute и Wallet Observatory, с поддержкой английского, испанского, турецкого, китайского, итальянского, французского, немецкого, португальского и русского языков.",
    verification: "Принцип Проверки", verificationText: "ZAF TECH отделяет наблюдаемые факты от непроверенных утверждений. Возможности Pi помечаются как проверенные только при наличии подтверждающей наблюдаемой проверки.",
    future: "Будущее Развитие", futureText: "Следующий запланированный этап расширит ZAF TECH наблюдением за публичными Pi-кошельками, выбором Mainnet/Testnet, наблюдаемыми балансами и доступными к получению балансами, метаданными аккаунта, последними публичными транзакциями и операциями и переходом к explorer. Приватный доступ к кошельку, подпись и аутентификация не входят в этот охват."
  },
  tr: {
    back: "← ZAF TECH'e Dön",
    title: "ZAF TECH Hakkında",
    subtitle: "Pi Ekosistem Gözlem Merkezi",
    what: "Nedir?",
    whatText: "ZAF TECH, herkese açık Pi Network ekosistem verilerini keşfetmek, kontrol etmek ve gözlemlemek için geliştirilmiş bağımsız, salt-okunur bir teknoloji katmanıdır.",
    scope: "Mevcut Kapsam",
    scopeText: "Mevcut sürüm; Pi Ekosistem Gözlem Merkezi, App Directory, App Details, App URL Checker, Network görünümü, Developer Tools, Node & Compute gözlemleri ve Wallet Observatory bölümlerini İngilizce, Türkçe, İspanyolca, Çince, İtalyanca, Fransızca, Almanca, Portekizce ve Rusça arayüz desteğiyle içerir.",
    verification: "Doğrulama İlkesi",
    verificationText: "ZAF TECH, gözlemlenen gerçekleri doğrulanmamış iddialardan ayırır. Gözlemlenebilir bir kontrol desteklemedikçe Pi'ye özgü yetenekler doğrulanmış olarak işaretlenmez.",
    future: "Sonraki Aşama",
    futureText: "Sonraki aşama salt-okunur temeli sağlamlaştırmaya ve net bir Pi entegrasyon sınırı hazırlamaya odaklanır. Pi kimlik doğrulama, ödemeler ve diğer kimlik doğrulamalı yetenekler ancak temel yapı doğrulanıp dondurulduktan sonra eklenecektir. Özel cüzdan anahtarları, imzalama ve sınırsız yazma erişimi salt-okunur gözlem kapsamının dışındadır.",
  },
};

export default function AboutPage() {
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
        <p className="mt-2 text-sm text-muted-foreground">{t.subtitle}</p>
        <div className="mt-6 space-y-5 text-sm leading-relaxed text-muted-foreground">
          <section><h2 className="font-semibold text-foreground">{t.what}</h2><p className="mt-2">{t.whatText}</p></section>
          <section><h2 className="font-semibold text-foreground">{t.scope}</h2><p className="mt-2">{t.scopeText}</p></section>
          <section><h2 className="font-semibold text-foreground">{t.verification}</h2><p className="mt-2">{t.verificationText}</p></section>
          <section><h2 className="font-semibold text-foreground">{t.future}</h2><p className="mt-2">{t.futureText}</p></section>
        </div>
      </article>
    </main>
  );
}
