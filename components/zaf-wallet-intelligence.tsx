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
  };
};

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
      setError(tr("Enter a valid public Pi wallet address.", "Geçerli bir herkese açık Pi cüzdan adresi girin."));
      setData(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/zaf/wallet?address=${encodeURIComponent(normalized)}&network=${network}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok && body?.exists !== false) throw new Error(body?.error ?? tr("Wallet lookup failed.", "Cüzdan sorgusu başarısız."));
      setData(body);
      if (body?.exists === false) setError(tr("No account was found for this address on the selected network.", "Seçilen ağda bu adres için hesap bulunamadı."));
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : tr("Wallet lookup failed.", "Cüzdan sorgusu başarısız."));
    } finally {
      setLoading(false);
    }
  }

  return <section className="mt-5 sm:mt-7">
    <div className="mb-3">
      <h2 className="text-sm font-semibold text-foreground">{tr("Wallet Observatory", "Cüzdan Gözlemleri")}</h2>
      <p className="text-[11px] text-muted-foreground">{tr("Public, read-only wallet observations from Pi Horizon. No wallet connection or signing is required.", "Pi Horizon üzerinden herkese açık, salt-okunur cüzdan gözlemleri. Cüzdan bağlantısı veya imzalama gerekmez.")}</p>
    </div>

    <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input value={address} onChange={e => setAddress(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void lookup(); }} placeholder={tr("Public Pi Wallet Address (G...)", "Herkese Açık Pi Cüzdan Adresi (G...)")} className="min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring" />
        <select value={network} onChange={e => setNetwork(e.target.value as "mainnet" | "testnet")} className="rounded-lg border border-border bg-background px-3 py-2.5 text-xs text-foreground">
          <option value="mainnet">{tr("Pi Mainnet", "Pi Mainnet")}</option>
          <option value="testnet">{tr("Pi Testnet", "Pi Testnet")}</option>
        </select>
        <button type="button" onClick={() => void lookup()} disabled={loading} className="rounded-lg bg-foreground px-4 py-2.5 text-xs font-medium text-background disabled:opacity-50">{loading ? tr("Checking…", "Kontrol Ediliyor…") : tr("Inspect", "İncele")}</button>
      </div>
      {error ? <p className="mt-2 text-[11px] text-muted-foreground">{error}</p> : null}
    </div>

    {data?.exists ? <div className="mt-3 space-y-3">
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><div className="text-[10px] text-muted-foreground">{tr("Public Address", "Herkese Açık Adres")}</div><div className="mt-1 break-all font-mono text-[11px] text-foreground">{data.address}</div></div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => void navigator.clipboard?.writeText(data.address)} className="rounded-md border border-border px-2.5 py-1.5 text-[10px] font-medium text-foreground">{tr("Copy", "Kopyala")}</button>
            <a href={data.network === "Pi Mainnet" ? `${explorerBase}/accounts/${data.address}` : `https://blockexplorer.minepi.com/testnet/accounts/${data.address}`} target="_blank" rel="noreferrer" className="rounded-md border border-border px-2.5 py-1.5 text-[10px] font-medium text-foreground">{tr("Explorer", "Explorer")}</a>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5"><span className="rounded-full border border-border px-2 py-0.5 text-[9px] text-muted-foreground">{data.network}</span><span className="rounded-full border border-border px-2 py-0.5 text-[9px] text-muted-foreground">{tr("Public Data Only", "Yalnızca Herkese Açık Veri")}</span></div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card title={tr("Account Balance", "Hesap Bakiyesi")} value={fmt(data.accountBalancePi, locale)} detail="Pi" />
        <Card title={tr("Transactions", "İşlemler")} value={fmt(data.analytics?.transactionCount ?? null, locale)} detail={tr("Observed Transactions", "Gözlemlenen İşlemler")} />
        <Card title={tr("Operations", "Operasyonlar")} value={fmt(data.analytics?.operationCount ?? null, locale)} detail={tr("Observed Operations", "Gözlemlenen Operasyonlar")} />
        <Card title={tr("Success Rate", "Başarı Oranı")} value={data.analytics?.successRate == null ? "—" : data.analytics.successRate.toFixed(1) + "%"} detail={tr("Observed Transaction Results", "Gözlemlenen İşlem Sonuçları")} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card title={tr("Observed Fees", "Gözlemlenen Ücretler")} value={fmt(data.analytics?.totalObservedFeesPi ?? null, locale)} detail="Pi" />
        <Card title={tr("Active Ledgers", "Aktif Ledger'lar")} value={fmt(data.analytics?.activeLedgerCount ?? null, locale)} />
        <Card title={tr("Successful", "Başarılı")} value={fmt(data.analytics?.successfulTransactions ?? null, locale)} />
        <Card title={tr("Failed", "Başarısız")} value={fmt(data.analytics?.failedTransactions ?? null, locale)} />
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card p-4">
        <div className="text-xs font-semibold text-foreground">{tr("Observed Operation Types", "Gözlemlenen Operasyon Türleri")}</div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(data.analytics?.operationTypeCounts ?? []).map(item => <div key={item.type} className="rounded-lg border border-border p-2.5 text-[10px]"><div className="truncate text-muted-foreground">{item.type}</div><div className="mt-1 text-sm font-semibold text-foreground">{item.count}</div></div>)}
          {!data.analytics?.operationTypeCounts?.length ? <div className="text-[10px] text-muted-foreground">{tr("No operation type data returned.", "Operasyon türü verisi döndürülmedi.")}</div> : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Card title={tr("Observable Claimable", "Gözlemlenebilir Talep Edilebilir")} value={fmt(data.observableClaimablePi, locale)} detail={tr("Native Claimable Balances", "Native Claimable Bakiyeler")} />
        <Card title={tr("Last Activity", "Son Aktivite")} value={age(data.lastActivity, locale)} detail={tr("Transactions + Operations", "İşlemler + Operasyonlar")} />
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="text-xs font-semibold text-foreground">{tr("Account Metadata", "Hesap Metadatası")}</div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] sm:grid-cols-3">
          <div><div className="text-muted-foreground">{tr("Sequence", "Sequence")}</div><div className="mt-1 break-all text-foreground">{data.account?.sequence ?? "—"}</div></div>
          <div><div className="text-muted-foreground">{tr("Subentries", "Alt Kayıtlar")}</div><div className="mt-1 text-foreground">{data.account?.subentryCount ?? "—"}</div></div>
          <div><div className="text-muted-foreground">{tr("Last Modified Ledger", "Son Değişiklik Ledger'ı")}</div><div className="mt-1 text-foreground">{data.account?.lastModifiedLedger ?? "—"}</div></div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2"><div className="text-xs font-semibold text-foreground">{tr("Recent Transactions", "Son İşlemler")}</div><span className="text-[10px] text-muted-foreground">{data.transactions.length}</span></div>
        <div className="mt-2 space-y-2">
          {data.transactions.slice(0, 8).map(tx => <div key={tx.hash} className="rounded-lg border border-border p-2.5"><div className="flex items-start justify-between gap-2"><a href={`${explorerBase}/transactions/${tx.hash}`} target="_blank" rel="noreferrer" className="truncate font-mono text-[10px] text-foreground underline underline-offset-2">{tx.hash}</a><span className="shrink-0 text-[9px] text-muted-foreground">{tx.successful === true ? tr("Success", "Başarılı") : tx.successful === false ? tr("Failed", "Başarısız") : "—"}</span></div><div className="mt-1 text-[9px] text-muted-foreground">{tx.createdAt ? new Date(tx.createdAt).toLocaleString(intlLocale(locale)) : "—"} · {tx.operationCount ?? "—"} ops · {fmt(tx.feePi, locale)} Pi</div></div>)}
          {!data.transactions.length ? <div className="text-[11px] text-muted-foreground">{tr("No Recent Transactions Returned.", "Son İşlemler Döndürülmedi.")}</div> : null}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="text-xs font-semibold text-foreground">{tr("Observable Claimable Balances", "Gözlemlenebilir Claimable Bakiyeler")}</div>
        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{tr("This section reports public native claimable balances returned by Horizon. It does not infer private Pi lockup commitments.", "Bu bölüm Horizon'un döndürdüğü herkese açık native claimable bakiyeleri raporlar. Özel Pi lockup taahhütlerini çıkarımsamaz.")}</p>
        <div className="mt-2 space-y-2">
          {Array.isArray(data.lockup?.items) && data.lockup.items.length ? data.lockup.items.map((item: any) => <div key={String(item.id)} className="rounded-lg border border-border p-2.5 text-[10px]"><div className="flex justify-between gap-2"><span className="font-mono text-foreground">{String(item.id)}</span><span className="text-foreground">{fmt(Number(item.amountPi), locale)} Pi</span></div><div className="mt-1 text-muted-foreground">{item.unlockAt ? `${tr("Unlock", "Açılma")}: ${new Date(String(item.unlockAt)).toLocaleString(intlLocale(locale))}` : tr("Unlock Time Not Observable", "Açılma Zamanı Gözlemlenemiyor")}</div></div>) : <div className="text-[11px] text-muted-foreground">{tr("No publicly observable native claimable balances were returned.", "Herkese açık gözlemlenebilir native claimable bakiye döndürülmedi.")}</div>}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 text-[10px] leading-relaxed text-muted-foreground">
        {tr("Security boundary: ZAF TECH never asks for a seed phrase, private key, wallet connection or transaction signature. Only a public wallet address is used for lookup.", "Güvenlik sınırı: ZAF TECH seed phrase, private key, cüzdan bağlantısı veya işlem imzası istemez. Sorgu için yalnızca herkese açık cüzdan adresi kullanılır.")}
      </div>
    </div> : null}
  </section>;
}
