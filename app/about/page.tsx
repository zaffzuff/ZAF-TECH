"use client";

import Link from "next/link";
import { ZafBrand } from "@/components/zaf-brand";
import { useState } from "react";
import { LanguageSelector } from "@/components/zaf-language-selector";

import type { Locale } from "@/lib/zaf/i18n";
import { servicePolicy } from "@/lib/zaf/service-policy";

const copy = {
  "en": {
    "back": "← Back To ZAF Tech",
    "title": "About ZAF Tech",
    "subtitle": "Pi Ecosystem Observatory",
    "what": "What It Is",
    "whatText": "ZAF Tech is an independent, observation-first technology platform for exploring publicly observable Pi Network ecosystem data. It reports what its sources expose and distinguishes observations from assumptions.",
    "scope": "Current Scope",
    "scopeText": "Current features include the Pi Ecosystem Observatory and Pulse, app discovery and details, app URL and availability checks, Network and Testnet views, DeFi and Launchpad observations, Developer Tools, Node & Compute observations, public Wallet Observatory lookups, and Pi Sign-In username verification. The interface offers nine language options; translation coverage can vary by page and feature.",
    "verification": "Verification and Privacy Principles",
    "verificationText": "ZAF Tech is not an official Pi Network service. A listing or status does not automatically verify an app, project, token, or claim. Pi Sign-In can verify a username through Pi's platform; it does not give ZAF Tech access to private keys or seed phrases, connect to a user's wallet, or sign or submit blockchain transactions.",
    "future": "Ongoing Development",
    "futureText": "Planned improvements focus on reliability, transparent source coverage, clearer limitations, documentation, and usability. Planned work is not an active feature until it is released. Public data may be incomplete, delayed, unavailable, or limited to the sample and source described by each view."
  },
  "tr": {
    "back": "← ZAF Tech'e Dön",
    "title": "ZAF Tech Hakkında",
    "subtitle": "Pi Ekosistem Gözlem Merkezi",
    "what": "Nedir?",
    "whatText": "ZAF Tech, herkese açık Pi Network ekosistem verilerini incelemek için geliştirilmiş bağımsız ve gözlem odaklı bir teknoloji platformudur. Kaynakların sunduğu verileri aktarır, gözlemleri varsayımlardan ayırır.",
    "scope": "Mevcut Kapsam",
    "scopeText": "Mevcut özellikler; Pi Ekosistem Gözlem Merkezi ve Pulse, uygulama keşfi ve ayrıntıları, uygulama URL ve erişilebilirlik kontrolleri, Network ve Testnet görünümleri, DeFi ve Launchpad gözlemleri, Developer Tools, Node & Compute gözlemleri, herkese açık cüzdan sorguları ve Pi Sign-In kullanıcı adı doğrulamasını içerir. Arayüzde dokuz dil seçeneği bulunur; çeviri kapsamı sayfa ve özelliğe göre değişebilir.",
    "verification": "Doğrulama ve Gizlilik İlkeleri",
    "verificationText": "ZAF Tech resmî bir Pi Network hizmeti değildir. Bir uygulamanın veya projenin listelenmesi ya da bir durum etiketi, tek başına doğrulandığı anlamına gelmez. Pi Sign-In, kullanıcı adını Pi platformu üzerinden doğrulayabilir; ZAF Tech'e özel anahtarları veya seed phrase'leri kullanma, kullanıcının cüzdanına bağlanma ya da blockchain işlemi imzalama veya gönderme yetkisi vermez.",
    "future": "Geliştirme Yönü",
    "futureText": "Planlanan geliştirmeler güvenilirliği, kaynak kapsamının şeffaflığını, sınırlamaların açıklığını, dokümantasyonu ve kullanım kolaylığını iyileştirmeye odaklanır. Planlanan bir çalışma yayımlanmadıkça mevcut özellik sayılmaz. Herkese açık veriler eksik, gecikmeli veya erişilemez olabilir; bazı görünümler yalnızca belirtilen örneklem ve kaynakları kapsar."
  },
  "es": {
    "back": "← Volver a ZAF Tech",
    "title": "Acerca de ZAF Tech",
    "subtitle": "Observatorio del ecosistema Pi",
    "what": "Qué es",
    "whatText": "ZAF Tech es una plataforma tecnológica independiente y centrada en la observación para explorar datos públicos del ecosistema Pi Network. Presenta lo que exponen sus fuentes y distingue las observaciones de las suposiciones.",
    "scope": "Alcance actual",
    "scopeText": "Las funciones actuales incluyen el Observatorio Pi y Pulse, descubrimiento y detalles de aplicaciones, comprobaciones de URL y disponibilidad, vistas de Network y Testnet, observaciones de DeFi y Launchpad, Developer Tools, observaciones de Node y Compute, consultas de Wallet Observatory a direcciones públicas y verificación de nombre de usuario mediante Pi Sign-In. La interfaz ofrece nueve idiomas; la cobertura de traducción puede variar según la página y la función.",
    "verification": "Principios de verificación y privacidad",
    "verificationText": "ZAF Tech no es un servicio oficial de Pi Network. Que una aplicación o proyecto aparezca en una lista, o tenga un estado, no significa que esté verificado. Pi Sign-In puede verificar el nombre de usuario mediante la plataforma Pi; no proporciona acceso a claves privadas o frases semilla, no conecta una billetera del usuario ni firma o envía transacciones.",
    "future": "Desarrollo continuo",
    "futureText": "Las mejoras previstas se centran en la fiabilidad, la transparencia de las fuentes, la explicación de limitaciones, la documentación y la facilidad de uso. Una función planificada no está disponible hasta su lanzamiento. Los datos públicos pueden estar incompletos, retrasados o no disponibles, y algunas vistas se limitan a la muestra y fuente indicadas."
  },
  "zh": {
    "back": "← 返回 ZAF Tech",
    "title": "关于 ZAF Tech",
    "subtitle": "Pi 生态观测中心",
    "what": "项目简介",
    "whatText": "ZAF Tech 是一个独立、以观测为先的技术平台，用于查看公开可观测的 Pi Network 生态数据。平台展示来源实际提供的信息，并区分观测结果与推测。",
    "scope": "当前功能范围",
    "scopeText": "当前功能包括 Pi 生态观测中心与 Pulse、应用发现和详情、应用 URL 与可用性检查、Network 和 Testnet 视图、DeFi 与 Launchpad 观测、开发者工具、Node 与计算观测、公开钱包查询，以及 Pi Sign-In 用户名验证。界面提供九种语言选项，但不同页面和功能的翻译覆盖程度可能不同。",
    "verification": "验证与隐私原则",
    "verificationText": "ZAF Tech 不是 Pi Network 官方服务。应用或项目出现在目录中或显示某种状态，并不代表其已得到全面验证。Pi Sign-In 可通过 Pi 平台验证用户名；它不会让 ZAF Tech 访问私钥或助记词、连接用户钱包，或签署、提交区块链交易。",
    "future": "持续开发",
    "futureText": "计划中的改进将着重提高可靠性、透明展示数据来源和覆盖范围、说明限制、完善文档并改善易用性。计划中的功能只有正式发布后才算可用。公开数据可能不完整、延迟或暂时无法获取，部分视图仅覆盖所说明的样本和来源。"
  },
  "it": {
    "back": "← Torna a ZAF Tech",
    "title": "Informazioni su ZAF Tech",
    "subtitle": "Osservatorio dell’ecosistema Pi",
    "what": "Che cos’è",
    "whatText": "ZAF Tech è una piattaforma tecnologica indipendente, basata sull’osservazione, per esplorare i dati pubblicamente osservabili dell’ecosistema Pi Network. Mostra ciò che le fonti rendono disponibile e distingue le osservazioni dalle supposizioni.",
    "scope": "Ambito attuale",
    "scopeText": "Le funzioni attuali includono Pi Ecosystem Observatory e Pulse, ricerca e dettagli delle app, controlli degli URL e della disponibilità, viste Network e Testnet, osservazioni DeFi e Launchpad, Developer Tools, osservazioni Node & Compute, consultazioni pubbliche di Wallet Observatory e verifica del nome utente tramite Pi Sign-In. L’interfaccia offre nove lingue; la copertura delle traduzioni può variare in base alla pagina e alla funzione.",
    "verification": "Principi di verifica e privacy",
    "verificationText": "ZAF Tech non è un servizio ufficiale di Pi Network. La presenza in un elenco o uno stato visualizzato non equivale a una verifica completa. Pi Sign-In può verificare il nome utente tramite la piattaforma Pi; non dà a ZAF Tech accesso a chiavi private o seed phrase, non collega il wallet dell’utente e non firma né invia transazioni blockchain.",
    "future": "Sviluppo continuo",
    "futureText": "I miglioramenti pianificati riguardano affidabilità, trasparenza delle fonti, chiarezza dei limiti, documentazione e facilità d’uso. Una funzione pianificata non è disponibile finché non viene rilasciata. I dati pubblici possono essere incompleti, in ritardo o non disponibili; alcune viste sono limitate al campione e alle fonti indicati."
  },
  "fr": {
    "back": "← Retour à ZAF Tech",
    "title": "À propos de ZAF Tech",
    "subtitle": "Observatoire de l’écosystème Pi",
    "what": "Présentation",
    "whatText": "ZAF Tech est une plateforme technologique indépendante, axée sur l’observation, qui permet d’explorer les données publiquement observables de l’écosystème Pi Network. Elle présente ce que ses sources exposent et distingue les observations des suppositions.",
    "scope": "Périmètre actuel",
    "scopeText": "Les fonctions actuelles comprennent Pi Ecosystem Observatory et Pulse, la découverte et les détails des applications, les contrôles d’URL et de disponibilité, les vues Network et Testnet, les observations DeFi et Launchpad, Developer Tools, les observations Node & Compute, les consultations publiques de Wallet Observatory et la vérification du nom d’utilisateur via Pi Sign-In. L’interface propose neuf langues ; la couverture des traductions peut varier selon la page et la fonction.",
    "verification": "Principes de vérification et de confidentialité",
    "verificationText": "ZAF Tech n’est pas un service officiel de Pi Network. Une inscription dans un répertoire ou un statut affiché ne constitue pas une vérification complète. Pi Sign-In peut vérifier le nom d’utilisateur via la plateforme Pi ; il ne donne pas accès aux clés privées ou phrases de récupération, ne connecte pas le portefeuille de l’utilisateur et ne signe ni n’envoie de transactions blockchain.",
    "future": "Développement continu",
    "futureText": "Les améliorations prévues visent la fiabilité, la transparence des sources, la clarté des limites, la documentation et la facilité d’utilisation. Une fonction prévue n’est disponible qu’après sa publication. Les données publiques peuvent être incomplètes, retardées ou indisponibles ; certaines vues se limitent à l’échantillon et aux sources indiqués."
  },
  "de": {
    "back": "← Zurück zu ZAF Tech",
    "title": "Über ZAF Tech",
    "subtitle": "Pi-Ökosystem-Beobachtungszentrum",
    "what": "Was es ist",
    "whatText": "ZAF Tech ist eine unabhängige, beobachtungsorientierte Technologieplattform zur Untersuchung öffentlich beobachtbarer Daten des Pi-Network-Ökosystems. Sie zeigt, was die Quellen tatsächlich bereitstellen, und trennt Beobachtungen von Annahmen.",
    "scope": "Aktueller Umfang",
    "scopeText": "Zu den aktuellen Funktionen gehören Pi Ecosystem Observatory und Pulse, App-Suche und Details, URL- und Verfügbarkeitsprüfungen, Network- und Testnet-Ansichten, DeFi- und Launchpad-Beobachtungen, Developer Tools, Node- und Compute-Beobachtungen, öffentliche Wallet-Observatory-Abfragen und die Überprüfung des Benutzernamens über Pi Sign-In. Die Oberfläche bietet neun Sprachoptionen; die Übersetzungsabdeckung kann je nach Seite und Funktion variieren.",
    "verification": "Verifizierungs- und Datenschutzgrundsätze",
    "verificationText": "ZAF Tech ist kein offizieller Pi-Network-Dienst. Ein Eintrag oder Status bedeutet nicht automatisch, dass eine App oder ein Projekt vollständig verifiziert wurde. Pi Sign-In kann den Benutzernamen über die Pi-Plattform verifizieren; es verschafft ZAF Tech keinen Zugriff auf private Schlüssel oder Seed-Phrasen, verbindet kein Benutzer-Wallet und signiert oder sendet keine Blockchain-Transaktionen.",
    "future": "Laufende Entwicklung",
    "futureText": "Geplante Verbesserungen betreffen Zuverlässigkeit, transparente Quellenabdeckung, klarere Einschränkungen, Dokumentation und Benutzerfreundlichkeit. Geplante Funktionen sind erst nach ihrer Veröffentlichung verfügbar. Öffentliche Daten können unvollständig, verzögert oder nicht verfügbar sein; einige Ansichten beschränken sich auf die angegebenen Stichproben und Quellen."
  },
  "pt": {
    "back": "← Voltar para ZAF Tech",
    "title": "Sobre a ZAF Tech",
    "subtitle": "Observatório do ecossistema Pi",
    "what": "O que é",
    "whatText": "ZAF Tech é uma plataforma tecnológica independente e orientada à observação para explorar dados publicamente observáveis do ecossistema Pi Network. Ela apresenta o que as fontes disponibilizam e distingue observações de suposições.",
    "scope": "Escopo atual",
    "scopeText": "Os recursos atuais incluem Pi Ecosystem Observatory e Pulse, descoberta e detalhes de aplicativos, verificações de URL e disponibilidade, visualizações Network e Testnet, observações DeFi e Launchpad, Developer Tools, observações Node & Compute, consultas públicas do Wallet Observatory e verificação do nome de usuário pelo Pi Sign-In. A interface oferece nove opções de idioma; a cobertura das traduções pode variar por página e recurso.",
    "verification": "Princípios de verificação e privacidade",
    "verificationText": "ZAF Tech não é um serviço oficial da Pi Network. A presença em uma lista ou um status exibido não significa verificação completa. O Pi Sign-In pode verificar o nome de usuário pela plataforma Pi; não dá à ZAF Tech acesso a chaves privadas ou frases-semente, não conecta a carteira do usuário e não assina nem envia transações blockchain.",
    "future": "Desenvolvimento contínuo",
    "futureText": "As melhorias planejadas priorizam confiabilidade, transparência das fontes, clareza sobre limitações, documentação e usabilidade. Um recurso planejado só estará disponível depois de lançado. Os dados públicos podem estar incompletos, atrasados ou indisponíveis; algumas visualizações se limitam à amostra e às fontes indicadas."
  },
  "ru": {
    "back": "← Назад в ZAF Tech",
    "title": "О ZAF Tech",
    "subtitle": "Наблюдательный центр экосистемы Pi",
    "what": "Что это",
    "whatText": "ZAF Tech — независимая технологическая платформа, ориентированная на наблюдение за общедоступными данными экосистемы Pi Network. Она показывает сведения, доступные из источников, и отделяет наблюдения от предположений.",
    "scope": "Текущий функционал",
    "scopeText": "Текущие функции включают Pi Ecosystem Observatory и Pulse, поиск приложений и сведения о них, проверку URL и доступности, представления Network и Testnet, наблюдения DeFi и Launchpad, Developer Tools, наблюдения Node и Compute, публичные запросы Wallet Observatory и проверку имени пользователя через Pi Sign-In. Интерфейс предлагает девять языков; полнота перевода может различаться в зависимости от страницы и функции.",
    "verification": "Принципы проверки и конфиденциальности",
    "verificationText": "ZAF Tech не является официальным сервисом Pi Network. Наличие приложения в каталоге или отображаемый статус не означают полной проверки. Pi Sign-In может проверить имя пользователя через платформу Pi; он не предоставляет ZAF Tech доступ к приватным ключам или seed-фразам, не подключает кошелёк пользователя и не подписывает и не отправляет блокчейн-транзакции.",
    "future": "Дальнейшая разработка",
    "futureText": "Планируемые улучшения сосредоточены на надёжности, прозрачности источников, пояснении ограничений, документации и удобстве использования. Запланированные функции считаются доступными только после выпуска. Публичные данные могут быть неполными, запаздывать или быть недоступными; некоторые представления ограничены указанной выборкой и источниками."
  }
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
        <ZafBrand className="mb-6" />
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-xs underline underline-offset-2">{t.back}</Link>
          <LanguageSelector locale={locale} onChange={changeLocale} />
        </div>
        <h1 className="mt-6 text-2xl font-bold">{t.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t.subtitle}</p>
        <section className="mt-5 rounded-xl border border-border bg-card p-4 text-sm">
          <h2 className="font-semibold">{servicePolicy[locale].label}</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">{servicePolicy[locale].detail}</p>
        </section>
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
