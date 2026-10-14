"use client";
import { requestJson } from "@/lib/zaf/client-request";

import { useState } from "react";
import type { Locale } from "@/lib/zaf/i18n";
import { translate } from "@/lib/zaf/i18n";

type UrlResult = {
  url: string;
  status?: number;
  ok?: boolean;
  reachable: boolean;
  responseTimeMs: number;
  https: boolean;
  redirect: boolean;
  error?: string;
  checkedAt: string;
};

export function ZafDeveloperTools({ locale }: { locale: Locale }) {
  const tr = (en: string, trText: string) => translate(locale, en, trText);
  const [address, setAddress] = useState("");
  const [tx, setTx] = useState("");
  const [txResult, setTxResult] = useState<Record<string, unknown> | null>(null);
  const [url, setUrl] = useState("");
  const [urlResult, setUrlResult] = useState<UrlResult | null>(null);
  const [loadingTx, setLoadingTx] = useState(false);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [urlError, setUrlError] = useState("");

  const valid = /^G[A-Z2-7]{55}$/.test(address.trim().toUpperCase());

  async function lookup() {
    if (!tx.trim()) return;
    setLoadingTx(true);
    setTxResult(null);
    try {
      const r = await fetch("/api/tools/transaction?id=" + encodeURIComponent(tx.trim()), { cache: "no-store" });
      setTxResult(await r.json());
    } catch {
      setTxResult({ error: "Request failed" });
    } finally {
      setLoadingTx(false);
    }
  }

  async function checkUrl() {
    if (!url.trim()) return;
    setLoadingUrl(true);
    setUrlResult(null); setUrlError("");
    try {
      const {response,body}=await requestJson<UrlResult>("/api/apps/check?url="+encodeURIComponent(url.trim()),{cache:"no-store"});
      if(!response.ok){setUrlError(response.status===429?tr("Too many requests. Please retry later.","Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin."):tr("The URL check could not be completed. Check the address or try again later.","URL kontrolü tamamlanamadı. Adresi kontrol edin veya biraz sonra tekrar deneyin."));return;}
      setUrlResult(body);
    } catch {
      setUrlError(tr("Request failed","İstek başarısız"));
    } finally {
      setLoadingUrl(false);
    }
  }

  return (
    <section className="mt-5 sm:mt-7">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">{tr("Developer Tools", "Geliştirici Araçları")}</h2>
        <p className="text-[11px] text-muted-foreground">{tr("Small, free utilities built around observable Pi data. More tools will be added incrementally.", "Gözlemlenebilir Pi verileri etrafında oluşturulan küçük, ücretsiz araçlar. Yeni araçlar kademeli olarak eklenecek.")}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs font-semibold text-foreground">{tr("Pi Address Inspector", "Pi Adres İnceleyici")}</div>
          <div className="mt-1 text-[10px] text-muted-foreground">{tr("Local format validation only; no wallet access.", "Yalnızca yerel format doğrulaması; cüzdan erişimi yok.")}</div>
          <input aria-label={tr("Pi Address Inspector", "Pi Adres İnceleyici")} value={address} onChange={e => setAddress(e.target.value.toUpperCase())} placeholder="G..." className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground outline-none focus:ring-2 focus:ring-ring" />
          <div className="mt-2 text-[10px] text-muted-foreground">{address ? valid ? tr("Format Valid", "Format Geçerli") : tr("Format Invalid", "Format Geçersiz") : tr("Enter A Public Pi Address", "Herkese Açık Pi Adresi Girin")}</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs font-semibold text-foreground">{tr("Transaction Lookup", "İşlem Sorgulama")}</div>
          <div className="mt-1 text-[10px] text-muted-foreground">{tr("Queries Pi Mainnet Horizon for a transaction hash.", "Pi Mainnet Horizon üzerinden transaction hash sorgular.")}</div>
          <input aria-label={tr("Transaction Hash", "Transaction Hash")} value={tx} onChange={e => setTx(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void lookup(); }} placeholder={tr("Transaction Hash", "Transaction Hash")} className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground outline-none focus:ring-2 focus:ring-ring" />
          <button type="button" onClick={() => void lookup()} disabled={loadingTx} className="mt-2 rounded-lg border border-border px-3 py-2 text-[10px] font-medium text-foreground disabled:opacity-50">{loadingTx ? tr("Looking Up…", "Sorgulanıyor…") : tr("Lookup", "Sorgula")}</button>
          {txResult ? <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-border bg-background p-2 text-[9px] text-muted-foreground">{JSON.stringify(txResult, null, 2)}</pre> : null}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:col-span-2">
          <div className="text-xs font-semibold text-foreground">{tr("Pi App URL Checker", "Pi Uygulama URL Kontrolü")}</div>
          <div className="mt-1 text-[10px] text-muted-foreground">{tr("Checks a public application URL for reachability, HTTPS, HTTP status and response time.", "Herkese açık bir uygulama URL'sini erişilebilirlik, HTTPS, HTTP durumu ve yanıt süresi açısından kontrol eder.")}</div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input aria-label={tr("Pi App URL Checker", "Pi Uygulama URL Kontrolü")} value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void checkUrl(); }} placeholder="https://example.com" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring" />
            <button type="button" onClick={() => void checkUrl()} disabled={loadingUrl} className="rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background disabled:opacity-50">{loadingUrl ? tr("Checking…", "Kontrol Ediliyor…") : tr("Check URL", "URL'yi Kontrol Et")}</button>
          </div>
          {urlError ? <p role="status" className="mt-3 text-xs text-muted-foreground">{urlError}</p> : null}
          {urlResult ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">{tr("Reachability", "Erişilebilirlik")}</div><div className="mt-1 text-sm font-semibold text-foreground">{urlResult.reachable ? tr("Online", "Çevrimiçi") : tr("Offline", "Çevrimdışı")}</div></div>
              <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">HTTPS</div><div className="mt-1 text-sm font-semibold text-foreground">{urlResult.https ? "✓" : "—"}</div></div>
              <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">{tr("Response", "Yanıt")}</div><div className="mt-1 text-sm font-semibold text-foreground">{urlResult.responseTimeMs} ms</div></div>
              <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">HTTP</div><div className="mt-1 text-sm font-semibold text-foreground">{urlResult.status ?? "—"}</div></div>
            </div>
          ) : null}
          {urlResult?.error ? <div className="mt-3 text-[10px] text-muted-foreground">{urlResult.error}</div> : null}
          {urlResult ? <div className="mt-2 text-[10px] text-muted-foreground">{tr("Redirect Detected:", "Yönlendirme:")} {urlResult.redirect ? tr("Yes", "Evet") : tr("No", "Hayır")}</div> : null}
        </div>
      </div>
    </section>
  );
}
