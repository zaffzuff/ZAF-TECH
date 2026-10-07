"use client";

import { useState } from "react";
import type { Locale } from "@/lib/zaf/i18n";
import { intlLocale, translate } from "@/lib/zaf/i18n";
import type { ZafWalletSnapshot } from "@/lib/zaf/types";

function fmt(value: number | null, locale: Locale) {
  return value == null || !Number.isFinite(value)
    ? "—"
    : value.toLocaleString(intlLocale(locale), { maximumFractionDigits: 7 });
}

function age(value: string | null, locale: Locale) {
  if (!value) return "—";
  const ms = Date.now() - Date.parse(value);
  if (!Number.isFinite(ms)) return "—";
  const min = Math.floor(ms / 60000);
  const day = Math.floor(min / (60 * 24));
  if (locale === "tr") return min < 1 ? "Az Önce" : min < 60 ? `${min} Dk Önce` : day < 1 ? `${Math.floor(min / 60)} Sa Önce` : `${day} Gün Önce`;
  if (locale === "es") return min < 1 ? "Ahora Mismo" : min < 60 ? `${min} Min Antes` : day < 1 ? `${Math.floor(min / 60)} H Antes` : `Hace ${day} Día${day === 1 ? "" : "s"}`;
  if (locale === "zh") return min < 1 ? "刚刚" : min < 60 ? `${min} 分钟前` : day < 1 ? `${Math.floor(min / 60)} 小时前` : `${day} 天前`;
  if (locale === "it") return min < 1 ? "Proprio Ora" : min < 60 ? `${min} Min Fa` : day < 1 ? `${Math.floor(min / 60)} Ore Fa` : `${day} Giorni Fa`;
  if (locale === "fr") return min < 1 ? "À L’Instant" : min < 60 ? `${min} Min Plus Tôt` : day < 1 ? `${Math.floor(min / 60)} H Plus Tôt` : `Il y a ${day} jour${day === 1 ? "" : "s"}`;
  if (locale === "de") return min < 1 ? "Gerade eben" : min < 60 ? `Vor ${min} Min.` : day < 1 ? `Vor ${Math.floor(min / 60)} Std.` : `Vor ${day} Tag${day === 1 ? "" : "en"}`;
  if (locale === "pt") return min < 1 ? "Agora mesmo" : min < 60 ? `Há ${min} min` : day < 1 ? `Há ${Math.floor(min / 60)} h` : `Há ${day} dia${day === 1 ? "" : "s"}`;
  if (locale === "ru") return min < 1 ? "Только что" : min < 60 ? `${min} мин назад` : day < 1 ? `${Math.floor(min / 60)} ч назад` : `${day} дн. назад`;
  return min < 1 ? "Just Now" : min < 60 ? `${min}m Ago` : day < 1 ? `${Math.floor(min / 60)}h Ago` : `${day} Day${day === 1 ? "" : "s"} Ago`;
}

type WalletViewData = ZafWalletSnapshot & {
  analytics?: {
    transactionCount: number;
    operationCount: number;
    successfulTransactions: number;
    failedTransactions: number;
    successRate: number | null;
    totalObservedFeesPi: number;
    activeLedgerCount: number;
    operationTypeCounts: Array<{ type: string; count: number }>;
    activeDayCount: number;
    activityByDay: Array<{
      day: string;
      transactions: number;
      operations: number;
      successfulTransactions: number;
      failedTransactions: number;
    }>;
  };
};

function label(locale: Locale, value: "Checking…" | "Inspect" | "Copy" | "Explorer" | "Successful" | "Failed" | "Success" | "Enter a valid public Pi wallet address." | "Wallet lookup failed.") {
  const labels: Record<typeof value, [string, string, string, string, string, string, string, string, string]> = {
    "Checking…": ["Checking…", "Kontrol Ediliyor…", "Comprobando…", "检查中…", "Controllo…", "Vérification…", "Wird geprüft…", "Verificando…", "Проверка…"],
    Inspect: ["Inspect", "İncele", "Inspeccionar", "检查", "Ispeziona", "Inspecter", "Prüfen", "Inspecionar", "Проверить"],
    Copy: ["Copy", "Kopyala", "Copiar", "复制", "Copia", "Copier", "Kopieren", "Copiar", "Копировать"],
    Explorer: ["Explorer", "Explorer", "Explorador", "浏览器", "Explorer", "Explorateur", "Explorer", "Explorador", "Обозреватель"],
    Successful: ["Successful", "Başarılı", "Exitosas", "成功", "Riuscite", "Réussies", "Erfolgreich", "Bem-sucedidas", "Успешные"],
    Failed: ["Failed", "Başarısız", "Fallidas", "失败", "Fallite", "Échouées", "Fehlgeschlagen", "Falhas", "Неуспешные"],
    Success: ["Success", "Başarılı", "Éxito", "成功", "Successo", "Réussite", "Erfolg", "Sucesso", "Успех"],
    "Enter a valid public Pi wallet address.": ["Enter a valid public Pi wallet address.", "Geçerli bir herkese açık Pi cüzdan adresi girin.", "Introduce una dirección pública válida de billetera Pi.", "请输入有效的公开 Pi 钱包地址。", "Inserisci un indirizzo pubblico valido del wallet Pi.", "Saisissez une adresse publique Pi valide.", "Geben Sie eine gültige öffentliche Pi-Wallet-Adresse ein.", "Insira um endereço público válido da carteira Pi.", "Введите корректный публичный адрес Pi-кошелька."],
    "Wallet lookup failed.": ["Wallet lookup failed.", "Cüzdan sorgusu başarısız.", "No se pudo consultar la billetera.", "钱包查询失败。", "Ricerca del wallet non riuscita.", "Échec de la recherche du portefeuille.", "Wallet-Abfrage fehlgeschlagen.", "Falha na consulta da carteira.", "Не удалось проверить кошелёк."],
  };
  const index = locale === "tr" ? 1 : locale === "es" ? 2 : locale === "zh" ? 3 : locale === "it" ? 4 : locale === "fr" ? 5 : locale === "de" ? 6 : locale === "pt" ? 7 : locale === "ru" ? 8 : 0;
  return labels[value][index];
}

function walletLabel(locale: Locale, value: "Wallet Observatory" | "Public Pi Wallet Address (G...)" | "Public Address" | "Public Data Only" | "Account Balance" | "Transactions" | "Observed Transactions" | "Operations" | "Observed Operations" | "Success Rate" | "Observed Transaction Results" | "Observed Assets" | "Native asset" | "Issuer unavailable" | "Observed Fees" | "Active Ledgers" | "Observed Operation Types" | "Observable Claimable" | "Native Claimable Balances" | "Last Activity" | "Transactions + Operations" | "Active Days" | "Within Observed Window" | "Wallet Activity Timeline" | "tx" | "ops" | "Observed Days" | "Fees" | "Account Metadata" | "Sequence" | "Subentries" | "Last Modified Ledger" | "Recent Transactions" | "Observable Claimable Balances" | "Unlock" | "Unlock Time Not Observable") {
  const labels: Record<typeof value, [string,string,string,string,string,string,string,string,string]> = {
    "Wallet Observatory":["Wallet Observatory","Cüzdan Gözlemleri","Observatorio de billeteras","钱包观测","Osservatorio wallet","Observatoire du portefeuille","Wallet-Observatorium","Observatório de carteira","Наблюдатель кошелька"],
    "Public Pi Wallet Address (G...)":["Public Pi Wallet Address (G...)","Herkese Açık Pi Cüzdan Adresi (G...)","Dirección pública de billetera Pi (G...)","公开 Pi 钱包地址 (G...)","Indirizzo pubblico wallet Pi (G...)","Adresse publique du portefeuille Pi (G...)","Öffentliche Pi-Wallet-Adresse (G...)","Endereço público da carteira Pi (G...)","Публичный адрес Pi-кошелька (G...)"],
    "Public Address":["Public Address","Herkese Açık Adres","Dirección pública","公开地址","Indirizzo pubblico","Adresse publique","Öffentliche Adresse","Endereço público","Публичный адрес"],
    "Public Data Only":["Public Data Only","Yalnızca Herkese Açık Veri","Solo datos públicos","仅公开数据","Solo dati pubblici","Données publiques uniquement","Nur öffentliche Daten","Apenas dados públicos","Только публичные данные"],
    "Account Balance":["Account Balance","Hesap Bakiyesi","Saldo de cuenta","账户余额","Saldo account","Solde du compte","Kontostand","Saldo da conta","Баланс аккаунта"],
    "Transactions":["Transactions","İşlemler","Transacciones","交易","Transazioni","Transactions","Transaktionen","Transações","Транзакции"],
    "Observed Transactions":["Observed Transactions","Gözlemlenen İşlemler","Transacciones observadas","已观测交易","Transazioni osservate","Transactions observées","Beobachtete Transaktionen","Transações observadas","Наблюдаемые транзакции"],
    "Operations":["Operations","Operasyonlar","Operaciones","操作","Operazioni","Opérations","Operationen","Operações","Операции"],
    "Observed Operations":["Observed Operations","Gözlemlenen Operasyonlar","Operaciones observadas","已观测操作","Operazioni osservate","Opérations observées","Beobachtete Operationen","Operações observadas","Наблюдаемые операции"],
    "Success Rate":["Success Rate","Başarı Oranı","Tasa de éxito","成功率","Tasso di successo","Taux de réussite","Erfolgsrate","Taxa de sucesso","Процент успеха"],
    "Observed Transaction Results":["Observed Transaction Results","Gözlemlenen İşlem Sonuçları","Resultados de transacciones observados","已观测交易结果","Risultati transazioni osservati","Résultats de transactions observés","Beobachtete Transaktionsergebnisse","Resultados de transações observados","Наблюдаемые результаты транзакций"],
    "Observed Assets":["Observed Assets","Gözlemlenen Varlıklar","Activos observados","已观测资产","Asset osservati","Actifs observés","Beobachtete Vermögenswerte","Ativos observados","Наблюдаемые активები"],
    "Native asset":["Native asset","Native varlık","Activo nativo","原生资产","Asset nativo","Actif natif","Natives Asset","Ativo nativo","Нативный актив"],
    "Issuer unavailable":["Issuer unavailable","Issuer bilgisi yok","Emisor no disponible","发行方不可用","Emittente non disponibile","Émetteur indisponible","Emittent nicht verfügbar","Emissor indisponível","Эмитент недоступен"],
    "Observed Fees":["Observed Fees","Gözlemlenen Ücretler","Comisiones observadas","已观测费用","Commissioni osservate","Frais observés","Beobachtete Gebühren","Taxas observadas","Наблюдаемые комиссии"],
    "Active Ledgers":["Active Ledgers","Aktif Ledger'lar","Ledgers activos","活跃账本","Ledger attivi","Ledgers actifs","Aktive Ledger","Ledgers ativos","Активные леджеры"],
    "Observed Operation Types":["Observed Operation Types","Gözlemlenen Operasyon Türleri","Tipos de operación observados","已观测操作类型","Tipi di operazione osservati","Types d’opérations observés","Beobachtete Operationstypen","Tipos de operação observados","Наблюдаемые типы операций"],
    "Observable Claimable":["Observable Claimable","Gözlemlenebilir Talep Edilebilir","Reclamable observable","可观测可领取","Reclamabile osservabile","Récupérable observable","Beobachtbar beanspruchbar","Reclamável observável","Наблюдаемые клеймируемые"],
    "Native Claimable Balances":["Native Claimable Balances","Native Claimable Bakiyeler","Saldos nativos reclamables","原生可领取余额","Saldi nativi reclamabili","Soldes natifs réclamables","Beanspruchbare native Salden","Saldos nativos reclamáveis","Нативные клеймируемые балансы"],
    "Last Activity":["Last Activity","Son Aktivite","Última actividad","最近活动","Ultima attività","Dernière activité","Letzte Aktivität","Última atividade","Последняя активность"],
    "Transactions + Operations":["Transactions + Operations","İşlemler + Operasyonlar","Transacciones + operaciones","交易 + 操作","Transazioni + operazioni","Transactions + opérations","Transaktionen + Operationen","Transações + operações","Транзакции + операции"],
    "Active Days":["Active Days","Aktif Günler","Días activos","活跃天数","Giorni attivi","Jours actifs","Aktive Tage","Dias ativos","Активные дни"],
    "Within Observed Window":["Within Observed Window","Gözlemlenen Pencere İçinde","Dentro de la ventana observada","在观测窗口内","Nella finestra osservata","Dans la fenêtre observée","Innerhalb des Beobachtungsfensters","Dentro da janela observada","В наблюдаемом окне"],
    "Wallet Activity Timeline":["Wallet Activity Timeline","Cüzdan Aktivite Zaman Çizelgesi","Cronología de actividad de la billetera","钱包活动时间线","Cronologia attività wallet","Chronologie d’activité du portefeuille","Wallet-Aktivitätsverlauf","Linha do tempo da atividade","Шкала активности кошелька"],
    "tx":["tx","işlem","tx","交易","tx","tx","tx","tx","транз."],
    "ops":["ops","op","ops","操作","op","ops","Ops.","ops","операц."],
    "Observed Days":["Observed Days","Gözlemlenen Günler","Días observados","观测天数","Giorni osservati","Jours observés","Beobachtete Tage","Dias observados","Наблюдаемые дни"],
    "Fees":["Fees","Ücretler","Comisiones","费用","Commissioni","Frais","Gebühren","Taxas","Комиссии"],
    "Account Metadata":["Account Metadata","Hesap Metadatası","Metadatos de cuenta","账户元数据","Metadati account","Métadonnées du compte","Kontometadaten","Metadados da conta","Метаданные аккаунта"],
    "Sequence":["Sequence","Sequence","Secuencia","序列","Sequenza","Séquence","Sequenz","Sequência","Последовательность"],
    "Subentries":["Subentries","Alt Kayıtlar","Subentradas","子条目","Sotto-voci","Sous-entrées","Untereinträge","Subentradas","Подзаписи"],
    "Last Modified Ledger":["Last Modified Ledger","Son Değişiklik Ledger'ı","Último ledger modificado","最近修改账本","Ultimo ledger modificato","Dernier ledger modifié","Zuletzt geändertes Ledger","Último ledger modificado","Последний изменённый леджер"],
    "Recent Transactions":["Recent Transactions","Son İşlemler","Transacciones recientes","最近交易","Transazioni recenti","Transactions récentes","Letzte Transaktionen","Transações recentes","Недавние транзакции"],
    "Observable Claimable Balances":["Observable Claimable Balances","Gözlemlenebilir Claimable Bakiyeler","Saldos reclamables observables","可观测可领取余额","Saldi reclamabili osservabili","Soldes réclamables observables","Beobachtbare beanspruchbare Salden","Saldos reclamáveis observáveis","Наблюдаемые клеймируемые балансы"],
    "Unlock":["Unlock","Açılma","Desbloqueo","解锁","Sblocco","Déverrouillage","Entsperren","Desbloqueio","Разблокировка"],
    "Unlock Time Not Observable":["Unlock Time Not Observable","Açılma Zamanı Gözlemlenemiyor","Hora de desbloqueo no observable","解锁时间不可观测","Ora di sblocco non osservabile","Heure de déverrouillage non observable","Entsperrzeit nicht beobachtbar","Hora de desbloqueio não observável","Время разблокировки не наблюдается"],
  };
  const index=locale==="tr"?1:locale==="es"?2:locale==="zh"?3:locale==="it"?4:locale==="fr"?5:locale==="de"?6:locale==="pt"?7:locale==="ru"?8:0;
  return labels[value][index];
}

function Card({ title, value, detail }: { title: string; value: string; detail?: string }) {
  return <div className="rounded-xl border border-border bg-card p-3 sm:p-4"><div className="text-xl font-bold ty-nums text-foreground sm:text-2xl">{value}</div><div className="mt-1 text-xs font-medium text-foreground">{title}</div>{detail ? <div className="mt-1 text-[11px] text-muted-foreground">{detail}</div> : null}</div>;
}

export function ZafWalletIntelligence({ locale }: { locale: Locale }) {
  const [address, setAddress] = useState("");
  const [network, setNetwork] = useState<"mainnet" | "testnet">("mainnet");
  const [data, setData] = useState<WalletViewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tr = (en: string, trText: string) => translate(locale, en, trText);
  const explorerBase = network === "mainnet" ? "https://blockexplorer.minepi.com/mainnet" : "https://blockexplorer.minepi.com/testnet";

  async function lookup() {
    const normalized = address.trim().toUpperCase();
    if (!/^G[A-Z2-7]{55}$/.test(normalized)) {
      setError(label(locale, "Enter a valid public Pi wallet address."));
      setData(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/zaf/wallet?address=${encodeURIComponent(normalized)}&network=${network}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok && body?.exists !== false) throw new Error(body?.error ?? label(locale, "Wallet lookup failed."));
      setData(body);
      if (body?.exists === false) setError(tr("No account was found for this address on the selected network.", "Seçilen ağda bu adres için hesap bulunamadı."));
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : label(locale, "Wallet lookup failed."));
    } finally {
      setLoading(false);
    }
  }

  return <section className="mt-5 sm:mt-7">
    <div className="mb-3">
      <h2 className="text-sm font-semibold text-foreground">{walletLabel(locale, "Wallet Observatory")}</h2>
      <p className="text-[11px] text-muted-foreground">{tr("Public, read-only wallet observations from Pi Horizon. No wallet connection or signing is required.", "Pi Horizon üzerinden herkese açık, salt-okunur cüzdan gözlemleri. Cüzdan bağlantısı veya imzalama gerekmez.")}</p>
    </div>

    <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input value={address} onChange={e => setAddress(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void lookup(); }} placeholder={walletLabel(locale, "Public Pi Wallet Address (G...)")} className="min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring" />
        <select value={network} onChange={e => setNetwork(e.target.value as "mainnet" | "testnet")} className="rounded-lg border border-border bg-background px-3 py-2.5 text-xs text-foreground">
          <option value="mainnet">{tr("Pi Mainnet", "Pi Mainnet")}</option>
          <option value="testnet">{tr("Pi Testnet", "Pi Testnet")}</option>
        </select>
        <button type="button" onClick={() => void lookup()} disabled={loading} className="rounded-lg bg-foreground px-4 py-2.5 text-xs font-medium text-background disabled:opacity-50">{loading ? label(locale, "Checking…") : label(locale, "Inspect")}</button>
      </div>
      {error ? <p className="mt-2 text-[11px] text-muted-foreground">{error}</p> : null}
    </div>

    {data?.exists ? <div className="mt-3 space-y-3">
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><div className="text-[10px] text-muted-foreground">{walletLabel(locale, "Public Address")}</div><div className="mt-1 break-all font-mono text-[11px] text-foreground">{data.address}</div></div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => void navigator.clipboard?.writeText(data.address)} className="rounded-md border border-border px-2.5 py-1.5 text-[10px] font-medium text-foreground">{label(locale, "Copy")}</button>
            <a href={data.network === "Pi Mainnet" ? `${explorerBase}/accounts/${data.address}` : `https://blockexplorer.minepi.com/testnet/accounts/${data.address}`} target="_blank" rel="noreferrer" className="rounded-md border border-border px-2.5 py-1.5 text-[10px] font-medium text-foreground">{label(locale, "Explorer")}</a>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5"><span className="rounded-full border border-border px-2 py-0.5 text-[9px] text-muted-foreground">{data.network}</span><span className="rounded-full border border-border px-2 py-0.5 text-[9px] text-muted-foreground">{walletLabel(locale, "Public Data Only")}</span></div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card title={walletLabel(locale, "Account Balance")} value={fmt(data.accountBalancePi, locale)} detail="Pi" />
        <Card title={walletLabel(locale, "Transactions")} value={fmt(data.analytics?.transactionCount ?? null, locale)} detail={walletLabel(locale, "Observed Transactions")} />
        <Card title={walletLabel(locale, "Operations")} value={fmt(data.analytics?.operationCount ?? null, locale)} detail={walletLabel(locale, "Observed Operations")} />
        <Card title={walletLabel(locale, "Success Rate")} value={data.analytics?.successRate == null ? "—" : data.analytics.successRate.toFixed(1) + "%"} detail={walletLabel(locale, "Observed Transaction Results")} />
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-foreground">{walletLabel(locale, "Observed Assets")}</div>
            <p className="mt-1 text-[10px] text-muted-foreground">{tr("Public asset balances returned by the selected Pi Horizon network. Custom assets are shown with issuer information when available.", "Seçilen Pi Horizon ağının döndürdüğü herkese açık varlık bakiyeleri. Özel varlıklar mevcut olduğunda issuer bilgisiyle gösterilir.")}</p>
          </div>
          <span className="rounded-full border border-border px-2 py-1 text-[9px] text-muted-foreground">{data.networkScope}</span>
        </div>
        <div className="mt-3 space-y-2">
          {(data.assets ?? []).map(asset => (
            <div key={asset.assetType + "-" + (asset.assetIssuer ?? "native")} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-foreground">{asset.isNative ? "Pi" : (asset.assetCode ?? "—")}</div>
                  <div className="mt-1 break-all text-[9px] text-muted-foreground">{asset.isNative ? walletLabel(locale, "Native asset") : (asset.assetIssuer ?? walletLabel(locale, "Issuer unavailable"))}</div>
                </div>
                <span className="shrink-0 text-[10px] font-medium text-foreground">{fmt(asset.balance, locale)}</span>
              </div>
            </div>
          ))}
          {!data.assets?.length ? <div className="text-[10px] text-muted-foreground">{tr("No public asset balances were returned.", "Herkese açık varlık bakiyesi döndürülmedi.")}</div> : null}
        </div>
        <p className="mt-3 text-[9px] leading-relaxed text-muted-foreground">{tr("Boundary: this lists balances exposed by the selected public account response. It does not infer hidden balances or wallet activity outside the observable Horizon response.", "Sınır: bu bölüm seçilen herkese açık hesap yanıtında açığa çıkan bakiyeleri listeler. Gizli bakiyeleri veya gözlemlenebilir Horizon yanıtı dışındaki cüzdan aktivitesini çıkarmaz.")}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card title={walletLabel(locale, "Observed Fees")} value={fmt(data.analytics?.totalObservedFeesPi ?? null, locale)} detail="Pi" />
        <Card title={walletLabel(locale, "Active Ledgers")} value={fmt(data.analytics?.activeLedgerCount ?? null, locale)} />
        <Card title={label(locale, "Successful")} value={fmt(data.analytics?.successfulTransactions ?? null, locale)} />
        <Card title={label(locale, "Failed")} value={fmt(data.analytics?.failedTransactions ?? null, locale)} />
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card p-4">
        <div className="text-xs font-semibold text-foreground">{walletLabel(locale, "Observed Operation Types")}</div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(data.analytics?.operationTypeCounts ?? []).map(item => <div key={item.type} className="rounded-lg border border-border p-2.5 text-[10px]"><div className="truncate text-muted-foreground">{item.type}</div><div className="mt-1 text-sm font-semibold text-foreground">{item.count}</div></div>)}
          {!data.analytics?.operationTypeCounts?.length ? <div className="text-[10px] text-muted-foreground">{tr("No operation type data returned.", "Operasyon türü verisi döndürülmedi.")}</div> : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Card title={walletLabel(locale, "Observable Claimable")} value={fmt(data.observableClaimablePi, locale)} detail={walletLabel(locale, "Native Claimable Balances")} />
        <Card title={walletLabel(locale, "Last Activity")} value={age(data.lastActivity, locale)} detail={walletLabel(locale, "Transactions + Operations")} />
        <Card title={walletLabel(locale, "Active Days")} value={fmt(data.analytics?.activeDayCount ?? null, locale)} detail={walletLabel(locale, "Within Observed Window")} />
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="text-xs font-semibold text-foreground">{walletLabel(locale, "Wallet Activity Timeline")}</div>
        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{tr("Daily buckets from the public transactions and operations returned by Horizon. This is an observed window, not a full wallet history.", "Horizon tarafından döndürülen herkese açık işlemler ve operasyonlardan günlük dilimler. Bu gözlemlenen bir penceredir; tam cüzdan geçmişi değildir.")}</p>
        <div className="mt-3 space-y-2">
          {(data.analytics?.activityByDay ?? []).slice(-7).reverse().map((day) => (
            <div key={day.day} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-[10px]">
              <span className="text-muted-foreground">{new Date(day.day + "T00:00:00Z").toLocaleDateString(intlLocale(locale), { year: "numeric", month: "short", day: "2-digit" })}</span>
              <span className="text-foreground">{day.transactions} {walletLabel(locale, "tx")} · {day.operations} {walletLabel(locale, "ops")}</span>
              <span className="text-muted-foreground">{day.successfulTransactions}/{day.failedTransactions}</span>
            </div>
          ))}
          {!data.analytics?.activityByDay?.length ? <div className="text-[10px] text-muted-foreground">{tr("No dated activity points are available in the observed window.", "Gözlemlenen pencerede tarihli aktivite noktası bulunmuyor.")}</div> : null}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Card title={walletLabel(locale, "Observed Days")} value={fmt(data.analytics?.activeDayCount ?? null, locale)} />
          <Card title={label(locale, "Successful")} value={fmt(data.analytics?.successfulTransactions ?? null, locale)} />
          <Card title={label(locale, "Failed")} value={fmt(data.analytics?.failedTransactions ?? null, locale)} />
          <Card title={walletLabel(locale, "Fees")} value={fmt(data.analytics?.totalObservedFeesPi ?? null, locale)} detail="Pi" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="text-xs font-semibold text-foreground">{walletLabel(locale, "Account Metadata")}</div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] sm:grid-cols-3 lg:grid-cols-4">
          <div><div className="text-muted-foreground">{walletLabel(locale, "Sequence")}</div><div className="mt-1 break-all text-foreground">{data.account?.sequence ?? "—"}</div></div>
          <div><div className="text-muted-foreground">{walletLabel(locale, "Subentries")}</div><div className="mt-1 text-foreground">{data.account?.subentryCount ?? "—"}</div></div>
          <div><div className="text-muted-foreground">{walletLabel(locale, "Last Modified Ledger")}</div><div className="mt-1 text-foreground">{data.account?.lastModifiedLedger ?? "—"}</div></div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2"><div className="text-xs font-semibold text-foreground">{walletLabel(locale, "Recent Transactions")}</div><span className="text-[10px] text-muted-foreground">{data.transactions.length}</span></div>
        <div className="mt-2 grid gap-2 zaf-desktop-two-up">
          {data.transactions.slice(0, 8).map(tx => <div key={tx.hash} className="rounded-lg border border-border p-2.5"><div className="flex items-start justify-between gap-2"><a href={`${explorerBase}/transactions/${tx.hash}`} target="_blank" rel="noreferrer" className="truncate font-mono text-[10px] text-foreground underline underline-offset-2">{tx.hash}</a><span className="shrink-0 text-[9px] text-muted-foreground">{tx.successful === true ? label(locale, "Success") : tx.successful === false ? label(locale, "Failed") : "—"}</span></div><div className="mt-1 text-[9px] text-muted-foreground">{tx.createdAt ? new Date(tx.createdAt).toLocaleString(intlLocale(locale)) : "—"} · {tx.operationCount ?? "—"} ops · {fmt(tx.feePi, locale)} Pi</div></div>)}
          {!data.transactions.length ? <div className="text-[11px] text-muted-foreground">{tr("No Recent Transactions Returned.", "Son İşlemler Döndürülmedi.")}</div> : null}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="text-xs font-semibold text-foreground">{walletLabel(locale, "Observable Claimable Balances")}</div>
        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{tr("This section reports public native claimable balances returned by Horizon. It does not infer private Pi lockup commitments.", "Bu bölüm Horizon'un döndürdüğü herkese açık native claimable bakiyeleri raporlar. Özel Pi lockup taahhütlerini çıkarımsamaz.")}</p>
        <div className="mt-2 space-y-2">
          {Array.isArray(data.lockup?.items) && data.lockup.items.length ? data.lockup.items.map((item: any) => <div key={String(item.id)} className="rounded-lg border border-border p-2.5 text-[10px]"><div className="flex justify-between gap-2"><span className="font-mono text-foreground">{String(item.id)}</span><span className="text-foreground">{fmt(Number(item.amountPi), locale)} Pi</span></div><div className="mt-1 text-muted-foreground">{item.unlockAt ? `${walletLabel(locale, "Unlock")}: ${new Date(String(item.unlockAt)).toLocaleString(intlLocale(locale))}` : walletLabel(locale, "Unlock Time Not Observable")}</div></div>) : <div className="text-[11px] text-muted-foreground">{tr("No publicly observable native claimable balances were returned.", "Herkese açık gözlemlenebilir native claimable bakiye döndürülmedi.")}</div>}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 text-[10px] leading-relaxed text-muted-foreground">
        {tr("Security boundary: ZAF TECH never asks for a seed phrase, private key, wallet connection or transaction signature. Only a public wallet address is used for lookup.", "Güvenlik sınırı: ZAF TECH seed phrase, private key, cüzdan bağlantısı veya işlem imzası istemez. Sorgu için yalnızca herkese açık cüzdan adresi kullanılır.")}
      </div>
    </div> : null}
  </section>;
}
