"use client";

import Link from "next/link";
import { useState } from "react";
import { LanguageSelector } from "@/components/zaf-language-selector";

import type { Locale } from "@/lib/zaf/i18n";

const copy = {
  "en": {
    "back": "← Back To ZAF Tech",
    "title": "Privacy",
    "subtitle": "ZAF Tech Pi Ecosystem Observatory",
    "scope": "Data and User-Submitted Queries",
    "scopeText": "ZAF Tech is an independent, observation-first service. Depending on the feature, it requests public Pi ecosystem, Mainnet/Testnet, ledger, app-availability, and wallet data from external sources. A public wallet address, transaction hash, or public HTTP(S) URL you submit may be sent to ZAF Tech's API and the relevant Pi or target service to perform the requested lookup or check. Do not enter passwords, access tokens, private URLs, or other confidential information.",
    "wallet": "Wallet and Transaction Lookups",
    "walletText": "The address inspector only validates address format locally. When you run a Wallet Observatory lookup, the public address is sent to ZAF Tech's API and the selected Pi Horizon endpoint. Transaction hashes are sent to Pi's public Mainnet endpoint. ZAF Tech does not ask for or access private keys, seed phrases, wallet passwords, or wallet credentials; it does not connect to your wallet or sign or submit blockchain transactions.",
    "signin": "Pi Sign-In",
    "signinText": "If you choose Pi Sign-In, the Pi SDK or Pi OAuth flow is used to request username-level authentication. The temporary access token is sent to ZAF Tech's server and forwarded to Pi's Platform API for verification. The application endpoint returns the verified username to the interface; the reviewed application code does not intentionally store the access token or Pi UID in its database. The verified username may be held in sessionStorage for the current browser session.",
    "local": "Browser Storage and Preferences",
    "localText": "The theme choice is stored in localStorage. The interface language is not saved as a persistent preference: a fresh visit starts in English, and the About and Privacy pages have their own page-level language selector. The verified username and temporary OAuth state/return path may be held in sessionStorage to complete or display the current sign-in flow. These browser stores are not a server-side user account.",
    "logs": "Application Records and Technical Logs",
    "logsText": "Database-backed history is optional and depends on the DATABASE_URL configuration. When configured, scheduled public-app health-check results and ecosystem/network observation snapshots may be saved for historical comparison. The rate limiter stores a SHA-256 hash derived from the request IP address, User-Agent, and request category, with counts and timestamps; the application does not intentionally store the raw IP address in that rate-limit table. Hosting infrastructure may independently process IP addresses, request paths, and other technical metadata in operational or security logs.",
    "providers": "External Services",
    "providersText": "Depending on the feature, requests may involve Vercel hosting, Pi SDK and Pi authentication/Platform APIs, Pi Mainnet or Testnet Horizon, the flag-image provider used by the language selector, and the public URL you ask the checker to visit. These services receive the information necessary to provide their part of the feature and handle it under their own terms and privacy practices. ZAF Tech does not control their independent logs or retention.",
    "retention": "Retention and Limitations",
    "retentionText": "The reviewed application code does not intentionally write on-demand wallet addresses, transaction hashes, or manually submitted URL-check inputs into the application history database; however, these values can appear in API request URLs, which hosting logs may process. When database history is enabled, saved scheduled checks and observation snapshots do not currently have one general expiry period defined in the application code, so retention depends on database administration and configuration. A cleanup task targets rate-limit entries older than 24 hours when that task runs. External providers may apply different retention periods.",
    "contact": "Questions and Contact",
    "contactText": "For general project questions and privacy requests, contact ZAF Tech at the email address below. Do not post wallet addresses, transaction details, personal information, access tokens, or other sensitive data in public issues. ZAF Tech is operated personally by Zafer TEKYILDIZ, based in Türkiye, who is the data controller. This page describes current application behavior; the applicable legal bases and statutory rights still require completion before it is used as a complete statutory privacy notice.",
    "repository": "ZAF Tech project repository",
    "boundary": "Project Status",
    "boundaryText": "ZAF Tech is an independent community-developed project and is not an official Pi Core Team product. Observations are informational, depend on external public sources, and may be incomplete, delayed, or unavailable. This notice describes the application behavior reviewed in the source code; external providers' policies also apply."
  },
  "tr": {
    "back": "← ZAF Tech'e Dön",
    "title": "Gizlilik",
    "subtitle": "ZAF Tech Pi Ekosistem Gözlem Merkezi",
    "scope": "Veriler ve Kullanıcı Sorguları",
    "scopeText": "ZAF Tech, gözlem odaklı ve bağımsız bir hizmettir. Kullanılan özelliğe göre herkese açık Pi ekosistemi, Mainnet/Testnet, ledger, uygulama erişilebilirliği ve cüzdan verilerini dış kaynaklardan sorgular. Sizin girdiğiniz herkese açık cüzdan adresi, işlem hash'i veya herkese açık HTTP(S) adresi, istenen sorgu ya da kontrolün yapılabilmesi için ZAF Tech API'sine ve ilgili Pi veya hedef hizmete gönderilebilir. Parola, erişim belirteci, özel URL ya da gizli bilgi girmeyin.",
    "wallet": "Cüzdan ve İşlem Sorguları",
    "walletText": "Adres inceleyici yalnızca adres biçimini yerel olarak kontrol eder. Wallet Observatory üzerinden sorgu yaptığınızda herkese açık adres ZAF Tech API'sine ve seçilen Pi Horizon uç noktasına gönderilir. İşlem hash'leri Pi'nin herkese açık Mainnet uç noktasına iletilir. ZAF Tech özel anahtar, seed phrase, cüzdan parolası veya cüzdan kimlik bilgisi istemez ya da bunlara erişmez; cüzdanınıza bağlanmaz ve blockchain işlemi imzalamaz veya göndermez.",
    "signin": "Pi ile Giriş",
    "signinText": "Pi ile Giriş'i seçtiğinizde kullanıcı adı kapsamındaki kimlik doğrulaması için Pi SDK veya Pi OAuth akışı kullanılır. Geçici erişim belirteci ZAF Tech sunucusuna gönderilir ve doğrulama için Pi Platform API'sine iletilir. Uygulama uç noktası doğrulanmış kullanıcı adını arayüze döndürür; incelenen uygulama kodu erişim belirtecini veya Pi UID'sini kendi veritabanında kasıtlı olarak saklamaz. Doğrulanan kullanıcı adı mevcut tarayıcı oturumu boyunca sessionStorage içinde tutulabilir.",
    "local": "Tarayıcı Depolaması ve Tercihler",
    "localText": "Tema seçimi localStorage içinde saklanır. Arayüz dili kalıcı tercih olarak kaydedilmez: yeni bir ziyaret İngilizce başlar; About ve Privacy sayfalarının kendi dil seçicileri vardır. Doğrulanmış kullanıcı adı ve geçici OAuth durumu/dönüş yolu, mevcut giriş akışını tamamlamak veya göstermek için sessionStorage içinde tutulabilir. Bu tarayıcı depoları sunucu tarafında bir kullanıcı hesabı oluşturmaz.",
    "logs": "Uygulama Kayıtları ve Teknik Günlükler",
    "logsText": "Veritabanına dayalı geçmiş isteğe bağlıdır ve DATABASE_URL yapılandırmasına bağlıdır. Yapılandırılmışsa zamanlanmış herkese açık uygulama sağlık kontrolü sonuçları ile ekosistem/ağ gözlem snapshot'ları geçmiş karşılaştırmaları için kaydedilebilir. İstek sınırlandırma sistemi; IP adresi, User-Agent ve istek kategorisinden türetilen SHA-256 özeti ile istek sayısı ve zaman bilgilerini tutar; uygulama bu tabloda ham IP adresini kasıtlı olarak saklamaz. Barındırma altyapısı IP adreslerini, istek yollarını ve diğer teknik bilgileri kendi operasyonel veya güvenlik günlüklerinde ayrıca işleyebilir.",
    "providers": "Harici Hizmetler",
    "providersText": "Özelliğe bağlı olarak isteklerde Vercel barındırma altyapısı, Pi SDK ve Pi kimlik doğrulama/Platform API'leri, Pi Mainnet veya Testnet Horizon, dil seçicisinde kullanılan bayrak görseli sağlayıcısı ve denetlemenizi istediğiniz herkese açık URL yer alabilir. Bu hizmetler, kendi işlevlerini sunmak için gereken bilgileri alır ve kendi koşul ve gizlilik uygulamalarına göre işler. ZAF Tech bu sağlayıcıların bağımsız günlüklerini veya saklama sürelerini kontrol etmez.",
    "retention": "Saklama Süresi ve Sınırlamalar",
    "retentionText": "İncelenen uygulama kodu, kullanıcı tarafından anlık olarak sorgulanan cüzdan adreslerini, işlem hash'lerini veya elle girilen URL kontrol verilerini uygulamanın geçmiş veritabanına kasıtlı olarak yazmaz; ancak bu değerler API istek URL'lerinde yer alabileceğinden barındırma günlüklerinde işlenebilir. Veritabanı geçmişi açıksa zamanlanmış kontroller ve gözlem snapshot'ları için uygulama kodunda tek bir genel silinme süresi tanımlanmamıştır; saklama veritabanı yönetimine ve yapılandırmasına bağlıdır. Çalıştırıldığı zaman bir temizleme görevi, 24 saatten eski istek sınırlandırma kayıtlarını silmeyi hedefler. Harici hizmetler farklı saklama süreleri uygulayabilir.",
    "contact": "Sorular ve İletişim",
    "contactText": "Genel proje soruları ve gizlilik talepleri için aşağıdaki e-posta adresinden ZAF Tech ile iletişime geçebilirsiniz. Herkese açık sorun kayıtlarında cüzdan adresi, işlem ayrıntısı, kişisel bilgi, erişim belirteci veya başka hassas veriler paylaşmayın. ZAF Tech, Türkiye’de yerleşik Zafer TEKYILDIZ tarafından şahsen işletilmektedir; veri sorumlusu Zafer TEKYILDIZ’dır. Bu sayfa mevcut uygulama davranışını açıklar; eksiksiz bir yasal aydınlatma metni olarak kullanılmadan önce uygulanacak hukuki sebepler ve ilgili kişi hakları tamamlanmalıdır.",
    "repository": "ZAF Tech proje deposu",
    "boundary": "Projenin Durumu",
    "boundaryText": "ZAF Tech bağımsız, topluluk tarafından geliştirilen bir projedir ve resmî Pi Core Team ürünü değildir. Gözlemler bilgilendirme amaçlıdır, harici herkese açık kaynaklara bağlıdır ve eksik, gecikmeli veya erişilemez olabilir. Bu metin kaynak kodunda incelenen uygulama davranışını açıklar; harici sağlayıcıların kendi politikaları da geçerlidir."
  },
  "es": {
    "back": "← Volver a ZAF Tech",
    "title": "Privacidad",
    "subtitle": "Observatorio del ecosistema Pi de ZAF Tech",
    "scope": "Datos y consultas del usuario",
    "scopeText": "ZAF Tech es un servicio independiente centrado en la observación. Según la función utilizada, consulta fuentes externas de datos públicos del ecosistema Pi, Mainnet/Testnet, ledger, disponibilidad de aplicaciones y billeteras. La dirección pública de billetera, el hash de transacción o la URL HTTP(S) pública que introduzcas pueden enviarse a la API de ZAF Tech y al servicio Pi o destino pertinente para realizar la consulta o comprobación. No introduzcas contraseñas, tokens de acceso, URL privadas ni información confidencial.",
    "wallet": "Consultas de billetera y transacciones",
    "walletText": "El inspector de direcciones solo valida localmente el formato. Al consultar Wallet Observatory, la dirección pública se envía a la API de ZAF Tech y al punto final Pi Horizon seleccionado. Los hashes de transacción se envían al punto final público de Pi Mainnet. ZAF Tech no solicita ni accede a claves privadas, frases semilla, contraseñas ni credenciales de billetera; tampoco conecta tu billetera ni firma o envía transacciones.",
    "signin": "Pi Sign-In",
    "signinText": "Si eliges Pi Sign-In, se usa Pi SDK o Pi OAuth para autenticar el nombre de usuario. El token de acceso temporal se envía al servidor de ZAF Tech y se reenvía a la API de plataforma de Pi para su verificación. El endpoint de la aplicación devuelve el nombre de usuario verificado a la interfaz; el código revisado no guarda intencionadamente el token ni el UID de Pi en la base de datos de la aplicación. El nombre de usuario verificado puede mantenerse en sessionStorage durante la sesión actual del navegador.",
    "local": "Almacenamiento y preferencias del navegador",
    "localText": "La preferencia de tema se guarda en localStorage. El idioma de la interfaz no se guarda como preferencia permanente: una visita nueva comienza en inglés y las páginas About y Privacy tienen su propio selector de idioma. El nombre de usuario verificado y el estado/ruta de retorno temporal de OAuth pueden guardarse en sessionStorage para completar o mostrar el inicio de sesión actual. Esto no crea una cuenta de usuario en el servidor.",
    "logs": "Registros de la aplicación y registros técnicos",
    "logsText": "El historial basado en base de datos es opcional y depende de la configuración DATABASE_URL. Si está configurado, pueden guardarse resultados programados de comprobaciones de aplicaciones públicas y snapshots de observación del ecosistema/red para comparaciones históricas. El limitador de solicitudes almacena un hash SHA-256 derivado de la IP, el User-Agent y la categoría de solicitud, junto con recuentos y marcas de tiempo; la aplicación no guarda intencionadamente la IP sin transformar en esa tabla. La infraestructura de alojamiento puede procesar por separado direcciones IP, rutas de solicitud y otros metadatos técnicos en registros operativos o de seguridad.",
    "providers": "Servicios externos",
    "providersText": "Según la función, pueden intervenir el alojamiento de Vercel, Pi SDK y las API de autenticación/plataforma de Pi, Pi Mainnet o Testnet Horizon, el proveedor de imágenes de banderas del selector de idioma y la URL pública que solicites comprobar. Estos servicios reciben la información necesaria para prestar su función y la tratan según sus propias condiciones y prácticas de privacidad. ZAF Tech no controla sus registros ni sus periodos de conservación independientes.",
    "retention": "Conservación y limitaciones",
    "retentionText": "El código revisado no escribe intencionadamente en la base de datos histórica de la aplicación las direcciones consultadas al momento, los hashes de transacción ni las URL introducidas manualmente; sin embargo, estos valores pueden aparecer en URL de solicitudes API y ser procesados en registros del alojamiento. Si se activa el historial de base de datos, el código no define un plazo general de caducidad para las comprobaciones programadas y los snapshots; la conservación depende de la configuración y administración de la base de datos. Una tarea de limpieza intenta eliminar registros del limitador de más de 24 horas cuando se ejecuta. Los proveedores externos pueden aplicar otros plazos.",
    "contact": "Preguntas y contacto",
    "contactText": "Para preguntas generales y solicitudes de privacidad, contacta con ZAF Tech en el correo indicado abajo. No publiques direcciones de billetera, datos de transacciones, información personal, tokens de acceso ni otros datos sensibles en incidencias públicas. ZAF Tech es operado personalmente por Zafer TEKYILDIZ, establecido en Türkiye, quien es el responsable de datos. Esta página describe el funcionamiento actual; deben completarse las bases jurídicas y los derechos legales antes de utilizarla como aviso legal completo.",
    "repository": "Repositorio del proyecto ZAF Tech",
    "boundary": "Estado del proyecto",
    "boundaryText": "ZAF Tech es un proyecto independiente desarrollado por la comunidad y no es un producto oficial de Pi Core Team. Las observaciones son informativas, dependen de fuentes públicas externas y pueden estar incompletas, retrasadas o no disponibles. Este aviso describe el comportamiento de la aplicación revisado en el código; también se aplican las políticas de los proveedores externos."
  },
  "zh": {
    "back": "← 返回 ZAF Tech",
    "title": "隐私",
    "subtitle": "ZAF Tech Pi 生态观测中心",
    "scope": "数据与用户查询",
    "scopeText": "ZAF Tech 是一个独立、以观测为先的服务。根据所用功能，它会从外部来源获取公开的 Pi 生态、Mainnet/Testnet、ledger、应用可用性和钱包数据。你提交的公开钱包地址、交易哈希或公开 HTTP(S) URL 可能会发送到 ZAF Tech API 以及相关 Pi 服务或目标网站，以完成所请求的查询或检查。请勿输入密码、访问令牌、私有 URL 或机密信息。",
    "wallet": "钱包与交易查询",
    "walletText": "地址检查器仅在本地验证地址格式。使用 Wallet Observatory 查询时，公开地址会发送到 ZAF Tech API 和所选的 Pi Horizon 接口。交易哈希会发送到 Pi Mainnet 公共接口。ZAF Tech 不会要求或访问私钥、助记词、钱包密码或钱包凭据，也不会连接你的钱包、签署或提交区块链交易。",
    "signin": "Pi Sign-In 登录",
    "signinText": "选择 Pi Sign-In 时，系统通过 Pi SDK 或 Pi OAuth 进行用户名级身份验证。临时访问令牌会发送到 ZAF Tech 服务器，并转发给 Pi Platform API 进行验证。应用接口只向界面返回已验证的用户名；经审查的应用代码不会有意将访问令牌或 Pi UID 存入应用数据库。已验证的用户名可能会保存在 sessionStorage 中，供当前浏览器会话使用。",
    "local": "浏览器存储与偏好",
    "localText": "主题选择保存在 localStorage 中。界面语言不会作为长期偏好保存：新访问默认以英语开始，About 和 Privacy 页面各自提供语言选择器。已验证用户名以及临时 OAuth 状态/返回路径可能会保存在 sessionStorage 中，以完成或显示当前登录流程。这些浏览器存储不会在服务器上创建用户账户。",
    "logs": "应用记录与技术日志",
    "logsText": "数据库历史记录是可选的，取决于是否配置 DATABASE_URL。配置后，定期运行的公开应用健康检查结果和生态/网络观测快照可能会保存以供历史比较。请求限流功能会保存由 IP 地址、User-Agent 和请求类别计算出的 SHA-256 哈希，以及请求计数和时间；应用不会有意在该表中保存原始 IP 地址。托管基础设施可能会在自己的运行或安全日志中另行处理 IP 地址、请求路径和其他技术元数据。",
    "providers": "外部服务",
    "providersText": "根据所用功能，请求可能涉及 Vercel 托管、Pi SDK 和 Pi 身份验证/Platform API、Pi Mainnet 或 Testnet Horizon、语言选择器所用的旗帜图片服务商，以及你要求检查的公开 URL。这些服务会接收提供相应功能所必需的信息，并依照各自的条款和隐私做法处理。ZAF Tech 无法控制这些服务独立的日志或保留期限。",
    "retention": "数据保留与限制",
    "retentionText": "经审查的应用代码不会有意把即时钱包查询地址、交易哈希或手动提交的 URL 检查输入写入应用历史数据库；但这些值可能出现在 API 请求 URL 中，并被托管日志处理。启用数据库历史记录后，应用代码尚未为定期检查和观测快照定义统一过期时间，具体保留期限取决于数据库管理和配置。清理任务在运行时会尝试删除超过 24 小时的限流记录。外部服务可能使用不同的保留期限。",
    "contact": "问题与联系",
    "contactText": "如有一般项目问题或隐私请求，请通过下方电子邮件地址联系 ZAF Tech。请勿在公开 issue 中发布钱包地址、交易详情、个人信息、访问令牌或其他敏感数据。ZAF Tech 由居住在 Türkiye 的 Zafer TEKYILDIZ 以个人身份运营，数据控制者为 Zafer TEKYILDIZ。本页面描述当前应用行为；在作为完整法定隐私声明使用之前，仍需补充适用的法律依据及法定权利。",
    "repository": "ZAF Tech 项目仓库",
    "boundary": "项目状态",
    "boundaryText": "ZAF Tech 是一个独立的社区开发项目，并非 Pi Core Team 官方产品。观测结果仅供参考，取决于外部公开来源，可能不完整、延迟或不可用。本声明描述的是源代码中审查到的应用行为；外部服务商的政策也适用。"
  },
  "it": {
    "back": "← Torna a ZAF Tech",
    "title": "Privacy",
    "subtitle": "ZAF Tech Pi Ecosystem Observatory",
    "scope": "Dati e richieste dell’utente",
    "scopeText": "ZAF Tech è un servizio indipendente basato sull’osservazione. A seconda della funzione, consulta fonti esterne per dati pubblici dell’ecosistema Pi, Mainnet/Testnet, ledger, disponibilità delle app e wallet. L’indirizzo pubblico del wallet, l’hash di transazione o l’URL HTTP(S) pubblico inserito può essere inviato all’API ZAF Tech e al servizio Pi o al sito di destinazione pertinente per eseguire la richiesta. Non inserire password, token di accesso, URL private o informazioni riservate.",
    "wallet": "Consultazioni di wallet e transazioni",
    "walletText": "Il controllo dell’indirizzo convalida localmente solo il formato. Quando effettui una ricerca in Wallet Observatory, l’indirizzo pubblico viene inviato all’API ZAF Tech e all’endpoint Pi Horizon selezionato. Gli hash delle transazioni vengono inviati all’endpoint pubblico Pi Mainnet. ZAF Tech non richiede né accede a chiavi private, seed phrase, password o credenziali del wallet; non si collega al wallet e non firma né invia transazioni blockchain.",
    "signin": "Pi Sign-In",
    "signinText": "Se scegli Pi Sign-In, viene usato Pi SDK o Pi OAuth per autenticare il nome utente. Il token di accesso temporaneo viene inviato al server ZAF Tech e inoltrato alla Platform API di Pi per la verifica. L’endpoint dell’app restituisce all’interfaccia il nome utente verificato; il codice esaminato non salva intenzionalmente il token o il Pi UID nel database dell’app. Il nome utente verificato può essere mantenuto in sessionStorage per la sessione corrente del browser.",
    "local": "Archiviazione e preferenze del browser",
    "localText": "La scelta del tema viene salvata in localStorage. La lingua dell’interfaccia non viene conservata come preferenza permanente: una nuova visita inizia in inglese e le pagine About e Privacy hanno un selettore di lingua proprio. Il nome utente verificato e lo stato/percorso di ritorno temporaneo OAuth possono essere conservati in sessionStorage per completare o mostrare l’accesso corrente. Questi archivi del browser non creano un account sul server.",
    "logs": "Registri dell’app e log tecnici",
    "logsText": "La cronologia su database è opzionale e dipende dalla configurazione di DATABASE_URL. Se configurato, i risultati programmati dei controlli sulle app pubbliche e gli snapshot dell’ecosistema/rete possono essere salvati per confronti storici. Il limitatore delle richieste memorizza un hash SHA-256 derivato da indirizzo IP, User-Agent e categoria della richiesta, oltre a conteggi e orari; l’applicazione non salva intenzionalmente l’IP grezzo in quella tabella. L’infrastruttura di hosting può trattare separatamente indirizzi IP, percorsi delle richieste e altri metadati tecnici nei propri log operativi o di sicurezza.",
    "providers": "Servizi esterni",
    "providersText": "A seconda della funzione, le richieste possono coinvolgere hosting Vercel, Pi SDK e API di autenticazione/Platform di Pi, Pi Mainnet o Testnet Horizon, il fornitore delle immagini delle bandiere nel selettore della lingua e l’URL pubblico che chiedi di controllare. Questi servizi ricevono le informazioni necessarie a fornire la propria funzione e le trattano secondo le proprie condizioni e pratiche sulla privacy. ZAF Tech non controlla i loro log o periodi di conservazione indipendenti.",
    "retention": "Conservazione e limiti",
    "retentionText": "Il codice esaminato non scrive intenzionalmente nel database storico dell’app gli indirizzi dei wallet, gli hash di transazione o gli URL inseriti manualmente per controlli su richiesta; tali valori possono però apparire negli URL delle richieste API ed essere elaborati nei log di hosting. Se la cronologia su database è attiva, il codice non definisce una scadenza generale per i controlli programmati e gli snapshot: la conservazione dipende dall’amministrazione e dalla configurazione del database. Un’attività di pulizia mira a rimuovere i record di limitazione delle richieste più vecchi di 24 ore quando viene eseguita. I fornitori esterni possono applicare scadenze diverse.",
    "contact": "Domande e contatti",
    "contactText": "Per domande generali e richieste sulla privacy, contatta ZAF Tech all’indirizzo email indicato sotto. Non pubblicare nelle issue pubbliche indirizzi wallet, dettagli di transazioni, informazioni personali, token di accesso o altri dati sensibili. ZAF Tech è gestito personalmente da Zafer TEKYILDIZ, con sede in Türkiye, che è il titolare del trattamento. Questa pagina descrive il funzionamento attuale; le basi giuridiche e i diritti previsti dalla legge devono essere completati prima di usarla come informativa legale completa.",
    "repository": "Repository del progetto ZAF Tech",
    "boundary": "Stato del progetto",
    "boundaryText": "ZAF Tech è un progetto indipendente sviluppato dalla comunità e non è un prodotto ufficiale di Pi Core Team. Le osservazioni sono informative, dipendono da fonti pubbliche esterne e possono essere incomplete, ritardate o non disponibili. Questa informativa descrive il comportamento dell’app esaminato nel codice; si applicano anche le politiche dei fornitori esterni."
  },
  "fr": {
    "back": "← Retour à ZAF Tech",
    "title": "Confidentialité",
    "subtitle": "Observatoire de l’écosystème Pi de ZAF Tech",
    "scope": "Données et requêtes de l’utilisateur",
    "scopeText": "ZAF Tech est un service indépendant axé sur l’observation. Selon la fonction, il interroge des sources externes pour obtenir des données publiques sur l’écosystème Pi, Mainnet/Testnet, les ledgers, la disponibilité des applications et les portefeuilles. L’adresse publique d’un portefeuille, le hash d’une transaction ou l’URL HTTP(S) publique que vous fournissez peut être envoyé à l’API ZAF Tech et au service Pi ou au site cible concerné. N’entrez pas de mots de passe, jetons d’accès, URL privées ni informations confidentielles.",
    "wallet": "Consultations de portefeuille et de transactions",
    "walletText": "L’inspecteur d’adresse vérifie uniquement le format en local. Lorsque vous lancez une recherche Wallet Observatory, l’adresse publique est envoyée à l’API ZAF Tech et au point de terminaison Pi Horizon sélectionné. Les hashes de transaction sont envoyés au point de terminaison public Pi Mainnet. ZAF Tech ne demande ni n’accède aux clés privées, phrases de récupération, mots de passe ou identifiants de portefeuille ; il ne connecte pas votre portefeuille et ne signe ni n’envoie de transactions blockchain.",
    "signin": "Pi Sign-In",
    "signinText": "Si vous choisissez Pi Sign-In, le Pi SDK ou Pi OAuth est utilisé pour authentifier le nom d’utilisateur. Le jeton d’accès temporaire est envoyé au serveur ZAF Tech puis transmis à l’API Platform de Pi pour vérification. Le point de terminaison de l’application renvoie le nom d’utilisateur vérifié à l’interface ; le code examiné ne stocke pas intentionnellement le jeton ni l’UID Pi dans la base de données de l’application. Le nom d’utilisateur vérifié peut être conservé dans sessionStorage pendant la session actuelle du navigateur.",
    "local": "Stockage et préférences du navigateur",
    "localText": "Le choix du thème est enregistré dans localStorage. La langue de l’interface n’est pas conservée comme préférence permanente : une nouvelle visite commence en anglais et les pages About et Privacy disposent de leur propre sélecteur de langue. Le nom d’utilisateur vérifié et l’état/le chemin de retour OAuth temporaire peuvent être conservés dans sessionStorage pour terminer ou afficher la connexion actuelle. Ces stockages du navigateur ne créent pas de compte utilisateur côté serveur.",
    "logs": "Enregistrements de l’application et journaux techniques",
    "logsText": "L’historique en base de données est facultatif et dépend de la configuration DATABASE_URL. S’il est configuré, les résultats programmés des contrôles d’applications publiques et les instantanés d’observation de l’écosystème/réseau peuvent être conservés pour comparaison historique. Le limiteur de requêtes stocke un hash SHA-256 dérivé de l’adresse IP, du User-Agent et de la catégorie de requête, ainsi que les compteurs et horodatages ; l’application ne stocke pas intentionnellement l’adresse IP brute dans cette table. L’hébergeur peut traiter séparément les adresses IP, chemins de requête et autres métadonnées techniques dans ses journaux opérationnels ou de sécurité.",
    "providers": "Services externes",
    "providersText": "Selon la fonction, les requêtes peuvent impliquer l’hébergement Vercel, le Pi SDK et les API d’authentification/Platform de Pi, Pi Mainnet ou Testnet Horizon, le fournisseur des images de drapeaux du sélecteur de langue et l’URL publique que vous demandez de vérifier. Ces services reçoivent les informations nécessaires à leur fonction et les traitent selon leurs propres conditions et pratiques de confidentialité. ZAF Tech ne contrôle pas leurs journaux ni leurs durées de conservation indépendants.",
    "retention": "Conservation et limites",
    "retentionText": "Le code examiné n’écrit pas intentionnellement dans la base de données historique de l’application les adresses de portefeuille, les hashes de transaction ou les URL saisies manuellement pour des contrôles ponctuels ; ces valeurs peuvent toutefois apparaître dans les URL des requêtes API et être traitées dans les journaux d’hébergement. Si l’historique en base est activé, le code ne définit pas de durée générale d’expiration pour les contrôles programmés et les instantanés ; la conservation dépend de l’administration et de la configuration de la base de données. Une tâche de nettoyage vise à supprimer les entrées de limitation de plus de 24 heures lorsqu’elle s’exécute. Les services externes peuvent appliquer d’autres durées.",
    "contact": "Questions et contact",
    "contactText": "Pour les questions générales et les demandes relatives à la confidentialité, contactez ZAF Tech à l’adresse e-mail ci-dessous. Ne publiez pas d’adresses de portefeuille, de détails de transactions, d’informations personnelles, de jetons d’accès ou d’autres données sensibles dans les issues publiques. ZAF Tech est exploité personnellement par Zafer TEKYILDIZ, établi en Türkiye, qui est le responsable du traitement. Cette page décrit le fonctionnement actuel ; les bases juridiques et les droits légaux doivent encore être complétés avant son utilisation comme notice légale complète.",
    "repository": "Dépôt du projet ZAF Tech",
    "boundary": "Statut du projet",
    "boundaryText": "ZAF Tech est un projet indépendant développé par la communauté et n’est pas un produit officiel de Pi Core Team. Les observations sont informatives, dépendent de sources publiques externes et peuvent être incomplètes, retardées ou indisponibles. Cette notice décrit le comportement de l’application examiné dans le code ; les politiques des fournisseurs externes s’appliquent également."
  },
  "de": {
    "back": "← Zurück zu ZAF Tech",
    "title": "Datenschutz",
    "subtitle": "ZAF Tech Pi-Ökosystem-Beobachtungszentrum",
    "scope": "Daten und Nutzereingaben",
    "scopeText": "ZAF Tech ist ein unabhängiger, beobachtungsorientierter Dienst. Je nach Funktion fragt er externe Quellen zu öffentlichen Pi-Ökosystem-, Mainnet/Testnet-, Ledger-, App-Verfügbarkeits- und Wallet-Daten ab. Eine von Ihnen eingegebene öffentliche Wallet-Adresse, Transaktions-Hash oder öffentliche HTTP(S)-URL kann an die API von ZAF Tech und den relevanten Pi-Dienst oder das Ziel gesendet werden, um die gewünschte Abfrage oder Prüfung auszuführen. Geben Sie keine Passwörter, Zugriffstoken, privaten URLs oder vertraulichen Informationen ein.",
    "wallet": "Wallet- und Transaktionsabfragen",
    "walletText": "Der Adressprüfer kontrolliert lokal nur das Format. Bei einer Wallet-Observatory-Abfrage wird die öffentliche Adresse an die API von ZAF Tech und den ausgewählten Pi-Horizon-Endpunkt gesendet. Transaktions-Hashes werden an den öffentlichen Pi-Mainnet-Endpunkt gesendet. ZAF Tech fragt keine privaten Schlüssel, Seed-Phrasen, Wallet-Passwörter oder Zugangsdaten ab und greift nicht darauf zu; es verbindet sich nicht mit Ihrem Wallet und signiert oder sendet keine Blockchain-Transaktionen.",
    "signin": "Pi Sign-In",
    "signinText": "Wenn Sie Pi Sign-In wählen, wird die Pi-SDK- oder Pi-OAuth-Anmeldung zur Verifizierung des Benutzernamens verwendet. Das temporäre Zugriffstoken wird an den Server von ZAF Tech gesendet und zur Prüfung an die Pi Platform API weitergeleitet. Der Anwendungsendpunkt gibt den verifizierten Benutzernamen an die Oberfläche zurück; der geprüfte Anwendungscode speichert das Zugriffstoken oder die Pi-UID nicht absichtlich in der Anwendungsdatenbank. Der verifizierte Benutzername kann während der aktuellen Browsersitzung in sessionStorage gehalten werden.",
    "local": "Browserspeicher und Einstellungen",
    "localText": "Die Themenwahl wird in localStorage gespeichert. Die Oberflächensprache wird nicht dauerhaft gespeichert: Ein neuer Besuch beginnt auf Englisch, und About sowie Privacy haben jeweils eine eigene Sprachauswahl. Der verifizierte Benutzername sowie temporärer OAuth-Status und Rückkehrpfad können in sessionStorage gespeichert werden, um den aktuellen Anmeldevorgang abzuschließen oder anzuzeigen. Dadurch entsteht kein serverseitiges Benutzerkonto.",
    "logs": "Anwendungsdaten und technische Protokolle",
    "logsText": "Datenbankbasierte Historie ist optional und hängt von DATABASE_URL ab. Wenn konfiguriert, können geplante Ergebnisse öffentlicher App-Gesundheitsprüfungen sowie Ökosystem-/Netzwerk-Beobachtungssnapshots für historische Vergleiche gespeichert werden. Die Ratenbegrenzung speichert einen SHA-256-Hash aus IP-Adresse, User-Agent und Anfragekategorie sowie Zähler und Zeitstempel; die Anwendung speichert die rohe IP-Adresse nicht absichtlich in dieser Tabelle. Die Hosting-Infrastruktur kann IP-Adressen, Anfragepfade und weitere technische Metadaten unabhängig in Betriebs- oder Sicherheitsprotokollen verarbeiten.",
    "providers": "Externe Dienste",
    "providersText": "Je nach Funktion können Vercel-Hosting, Pi SDK und Pi-Authentifizierungs-/Platform-APIs, Pi Mainnet oder Testnet Horizon, der Anbieter der Flaggenbilder im Sprachmenü sowie die von Ihnen zu prüfende öffentliche URL beteiligt sein. Diese Dienste erhalten die für ihre Funktion nötigen Informationen und verarbeiten sie nach ihren eigenen Bedingungen und Datenschutzpraktiken. ZAF Tech kontrolliert ihre unabhängigen Protokolle oder Speicherfristen nicht.",
    "retention": "Aufbewahrung und Einschränkungen",
    "retentionText": "Der geprüfte Anwendungscode schreibt spontan abgefragte Wallet-Adressen, Transaktions-Hashes oder manuell eingegebene URL-Prüfungen nicht absichtlich in die Anwendungshistorie; diese Werte können jedoch in API-Anfrage-URLs erscheinen und in Hosting-Protokollen verarbeitet werden. Bei aktivierter Datenbankhistorie ist im Code keine allgemeine Ablaufzeit für geplante Prüfungen und Beobachtungssnapshots festgelegt; die Aufbewahrung hängt von Datenbankverwaltung und Konfiguration ab. Eine Bereinigungsaufgabe zielt bei Ausführung darauf ab, Einträge zur Ratenbegrenzung zu löschen, die älter als 24 Stunden sind. Externe Anbieter können andere Fristen verwenden.",
    "contact": "Fragen und Kontakt",
    "contactText": "Für allgemeine Fragen und Datenschutzanfragen kontaktieren Sie ZAF Tech über die unten angegebene E-Mail-Adresse. Veröffentlichen Sie keine Wallet-Adressen, Transaktionsdetails, persönlichen Informationen, Zugriffstoken oder andere sensible Daten in öffentlichen Issues. ZAF Tech wird von Zafer TEKYILDIZ mit Sitz in Türkiye als Privatperson betrieben; Verantwortlicher ist Zafer TEKYILDIZ. Diese Seite beschreibt das aktuelle Anwendungsverhalten; die Rechtsgrundlagen und gesetzlichen Rechte müssen vor der Verwendung als vollständige gesetzliche Datenschutzerklärung ergänzt werden.",
    "repository": "Projekt-Repository von ZAF Tech",
    "boundary": "Projektstatus",
    "boundaryText": "ZAF Tech ist ein unabhängiges, gemeinschaftlich entwickeltes Projekt und kein offizielles Pi-Core-Team-Produkt. Beobachtungen dienen der Information, hängen von externen öffentlichen Quellen ab und können unvollständig, verzögert oder nicht verfügbar sein. Dieser Hinweis beschreibt das im Quellcode geprüfte Anwendungsverhalten; die Richtlinien externer Anbieter gelten ebenfalls."
  },
  "pt": {
    "back": "← Voltar para ZAF Tech",
    "title": "Privacidade",
    "subtitle": "Observatório do ecossistema Pi da ZAF Tech",
    "scope": "Dados e consultas do usuário",
    "scopeText": "ZAF Tech é um serviço independente e orientado à observação. Dependendo do recurso, consulta fontes externas de dados públicos do ecossistema Pi, Mainnet/Testnet, ledger, disponibilidade de aplicativos e carteiras. O endereço público de carteira, hash de transação ou URL HTTP(S) pública fornecido pode ser enviado à API da ZAF Tech e ao serviço Pi ou destino pertinente para realizar a consulta ou verificação. Não insira senhas, tokens de acesso, URLs privadas ou informações confidenciais.",
    "wallet": "Consultas de carteira e transações",
    "walletText": "O inspetor de endereços valida localmente apenas o formato. Ao consultar o Wallet Observatory, o endereço público é enviado à API da ZAF Tech e ao endpoint Pi Horizon selecionado. Hashes de transação são enviados ao endpoint público Pi Mainnet. A ZAF Tech não solicita nem acessa chaves privadas, frases-semente, senhas ou credenciais de carteira; não conecta sua carteira nem assina ou envia transações blockchain.",
    "signin": "Pi Sign-In",
    "signinText": "Ao escolher Pi Sign-In, o Pi SDK ou Pi OAuth é usado para autenticação no nível do nome de usuário. O token de acesso temporário é enviado ao servidor da ZAF Tech e encaminhado à Pi Platform API para verificação. O endpoint da aplicação retorna à interface o nome de usuário verificado; o código analisado não armazena intencionalmente o token ou UID da Pi no banco de dados da aplicação. O nome de usuário verificado pode ficar no sessionStorage durante a sessão atual do navegador.",
    "local": "Armazenamento e preferências do navegador",
    "localText": "A escolha do tema é armazenada no localStorage. O idioma da interface não é salvo como preferência permanente: uma nova visita começa em inglês e as páginas About e Privacy têm seletores próprios. O nome de usuário verificado e o estado/caminho de retorno temporário do OAuth podem ficar no sessionStorage para concluir ou mostrar o login atual. Esses armazenamentos não criam uma conta de usuário no servidor.",
    "logs": "Registros da aplicação e logs técnicos",
    "logsText": "O histórico em banco de dados é opcional e depende de DATABASE_URL. Quando configurado, resultados agendados de verificações de saúde de aplicativos públicos e snapshots de observação da rede/ecossistema podem ser salvos para comparação histórica. O limitador de solicitações armazena um hash SHA-256 derivado do IP, User-Agent e categoria da solicitação, junto com contagens e horários; a aplicação não armazena intencionalmente o IP bruto nessa tabela. A infraestrutura de hospedagem pode processar separadamente IPs, caminhos de solicitações e outros metadados técnicos em logs operacionais ou de segurança.",
    "providers": "Serviços externos",
    "providersText": "Dependendo do recurso, as solicitações podem envolver a hospedagem Vercel, Pi SDK e APIs de autenticação/Platform da Pi, Pi Mainnet ou Testnet Horizon, o provedor das imagens de bandeiras do seletor de idioma e a URL pública solicitada para verificação. Esses serviços recebem as informações necessárias para executar suas funções e as tratam conforme seus próprios termos e práticas de privacidade. A ZAF Tech não controla os logs independentes ou prazos de retenção desses provedores.",
    "retention": "Retenção e limitações",
    "retentionText": "O código analisado não grava intencionalmente no banco de histórico da aplicação endereços de carteira, hashes de transação ou URLs inseridas manualmente para verificações sob demanda; porém, esses valores podem aparecer em URLs de solicitações da API e ser processados nos logs de hospedagem. Se o histórico em banco estiver ativo, o código não define um prazo geral de expiração para verificações agendadas e snapshots; a retenção depende da administração e configuração do banco. Uma tarefa de limpeza procura remover registros de limitação com mais de 24 horas quando é executada. Provedores externos podem aplicar prazos diferentes.",
    "contact": "Dúvidas e contato",
    "contactText": "Para dúvidas gerais e solicitações de privacidade, entre em contato com a ZAF Tech pelo e-mail abaixo. Não publique endereços de carteira, detalhes de transações, informações pessoais, tokens de acesso ou outros dados sensíveis em issues públicas. A ZAF Tech é operada pessoalmente por Zafer TEKYILDIZ, estabelecido na Türkiye, que é o controlador de dados. Esta página descreve o funcionamento atual; as bases legais e os direitos previstos em lei precisam ser completados antes de utilizá-la como aviso legal completo.",
    "repository": "Repositório do projeto ZAF Tech",
    "boundary": "Status do projeto",
    "boundaryText": "ZAF Tech é um projeto independente desenvolvido pela comunidade e não é um produto oficial da Pi Core Team. As observações são informativas, dependem de fontes públicas externas e podem estar incompletas, atrasadas ou indisponíveis. Este aviso descreve o comportamento da aplicação revisado no código-fonte; as políticas dos provedores externos também se aplicam."
  },
  "ru": {
    "back": "← Назад в ZAF Tech",
    "title": "Конфиденциальность",
    "subtitle": "Наблюдательный центр экосистемы Pi ZAF Tech",
    "scope": "Данные и запросы пользователя",
    "scopeText": "ZAF Tech — независимый сервис, ориентированный на наблюдение. В зависимости от функции он запрашивает из внешних источников общедоступные данные экосистемы Pi, Mainnet/Testnet, ledger, доступности приложений и кошельков. Введённый вами публичный адрес кошелька, хэш транзакции или общедоступный URL HTTP(S) может быть отправлен в API ZAF Tech и соответствующий сервис Pi или целевой сайт для выполнения запроса или проверки. Не вводите пароли, токены доступа, приватные URL и конфиденциальные сведения.",
    "wallet": "Запросы кошельков и транзакций",
    "walletText": "Проверка адреса локально проверяет только его формат. При запросе через Wallet Observatory публичный адрес отправляется в API ZAF Tech и выбранную точку Pi Horizon. Хэши транзакций передаются в публичную точку Pi Mainnet. ZAF Tech не запрашивает и не получает доступ к приватным ключам, seed-фразам, паролям или учётным данным кошелька; сервис не подключает кошелёк, не подписывает и не отправляет блокчейн-транзакции.",
    "signin": "Pi Sign-In",
    "signinText": "При выборе Pi Sign-In для проверки имени пользователя используется Pi SDK или Pi OAuth. Временный токен доступа отправляется на сервер ZAF Tech и передаётся в Pi Platform API для проверки. Эндпоинт приложения возвращает интерфейсу подтверждённое имя пользователя; проверенный код приложения намеренно не сохраняет токен доступа или Pi UID в базе данных. Подтверждённое имя пользователя может храниться в sessionStorage в течение текущего сеанса браузера.",
    "local": "Хранилище браузера и настройки",
    "localText": "Выбор темы сохраняется в localStorage. Язык интерфейса не сохраняется как постоянная настройка: новый визит начинается на английском, а страницы About и Privacy имеют собственные переключатели языка. Подтверждённое имя пользователя и временное состояние/путь возврата OAuth могут храниться в sessionStorage для завершения или отображения текущего входа. Эти данные браузера не создают учётную запись на сервере.",
    "logs": "Записи приложения и технические журналы",
    "logsText": "История в базе данных необязательна и зависит от настройки DATABASE_URL. Если она настроена, результаты плановых проверок публичных приложений и снимки наблюдений экосистемы/сети могут сохраняться для исторического сравнения. Ограничитель запросов хранит SHA-256-хэш, полученный из IP-адреса, User-Agent и категории запроса, а также счётчики и время; приложение намеренно не сохраняет исходный IP-адрес в этой таблице. Хостинг-инфраструктура может отдельно обрабатывать IP-адреса, пути запросов и другие технические метаданные в операционных журналах и журналах безопасности.",
    "providers": "Внешние сервисы",
    "providersText": "В зависимости от функции запросы могут использовать хостинг Vercel, Pi SDK и API аутентификации/Platform Pi, Pi Mainnet или Testnet Horizon, поставщика изображений флагов в выборе языка и публичный URL, который вы просите проверить. Эти сервисы получают необходимую для работы информацию и обрабатывают её в соответствии со своими условиями и практиками конфиденциальности. ZAF Tech не контролирует их независимые журналы и сроки хранения.",
    "retention": "Хранение данных и ограничения",
    "retentionText": "Проверенный код приложения намеренно не записывает в историческую базу адреса кошельков, хэши транзакций или URL, вручную введённые для разовых проверок; однако эти значения могут присутствовать в URL API-запросов и обрабатываться в журналах хостинга. При включённой истории базы данных код не задаёт общего срока истечения для плановых проверок и снимков; срок хранения зависит от администрирования и настроек базы. Задача очистки при запуске стремится удалить записи ограничителя запросов старше 24 часов. Внешние поставщики могут применять другие сроки.",
    "contact": "Вопросы и связь",
    "contactText": "По общим вопросам и запросам о конфиденциальности свяжитесь с ZAF Tech по указанной ниже электронной почте. Не публикуйте в открытых обращениях адреса кошельков, сведения о транзакциях, личную информацию, токены доступа и другие чувствительные данные. ZAF Tech управляется лично Zafer TEKYILDIZ, находящимся в Türkiye, который является контролёром данных. Страница описывает текущее поведение приложения; правовые основания и предусмотренные законом права необходимо дополнить до её использования как полного юридического уведомления.",
    "repository": "Репозиторий проекта ZAF Tech",
    "boundary": "Статус проекта",
    "boundaryText": "ZAF Tech — независимый проект, разрабатываемый сообществом, а не официальный продукт Pi Core Team. Наблюдения носят информационный характер, зависят от внешних общедоступных источников и могут быть неполными, запаздывать или быть недоступными. Это уведомление описывает поведение приложения, проверенное по исходному коду; также применяются политики внешних поставщиков."
  }
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
          <section><h2 className="font-semibold text-foreground">{t.signin}</h2><p className="mt-2">{t.signinText}</p></section>
          <section><h2 className="font-semibold text-foreground">{t.local}</h2><p className="mt-2">{t.localText}</p></section>
          <section><h2 className="font-semibold text-foreground">{t.logs}</h2><p className="mt-2">{t.logsText}</p></section>
          <section><h2 className="font-semibold text-foreground">{t.providers}</h2><p className="mt-2">{t.providersText}</p></section>
          <section><h2 className="font-semibold text-foreground">{t.retention}</h2><p className="mt-2">{t.retentionText}</p></section>
          <section><h2 className="font-semibold text-foreground">{t.contact}</h2><p className="mt-2">{t.contactText}</p><p className="mt-2"><a href="mailto:zaftech.contact@gmail.com" className="break-all underline underline-offset-2 text-foreground">zaftech.contact@gmail.com</a></p><p className="mt-2"><a href="https://github.com/zaffzuff/ZAF-TECH" target="_blank" rel="noreferrer" className="underline underline-offset-2 text-foreground">{t.repository}</a></p></section>
          <section><h2 className="font-semibold text-foreground">{t.boundary}</h2><p className="mt-2">{t.boundaryText}</p></section>
        </div>
      </article>
    </main>
  );
}
