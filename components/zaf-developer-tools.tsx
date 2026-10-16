"use client";
import { requestJson } from "@/lib/zaf/client-request";

import { useEffect, useRef, useState } from "react";
import { isValidPublicAddress } from "@/lib/zaf/public-address";
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
  const txRequest = useRef<AbortController | null>(null);
  const urlRequest = useRef<AbortController | null>(null);
  useEffect(() => () => { txRequest.current?.abort(); urlRequest.current?.abort(); }, []);

  const valid = isValidPublicAddress(address);
  const validTx = /^[a-f0-9]{64}$/i.test(tx.trim());

  async function lookup() {
    if (!validTx) return;
    txRequest.current?.abort();
    const controller = new AbortController();
    txRequest.current = controller;
    setLoadingTx(true);
    setTxResult(null);
    try {
      const { body } = await requestJson<Record<string, unknown>>("/api/tools/transaction?id=" + encodeURIComponent(tx.trim()), { cache: "no-store", signal: controller.signal });
      if (!controller.signal.aborted) setTxResult(body);
    } catch {
      if (!controller.signal.aborted) setTxResult({ error: tr("Request failed or timed out. Retry later.", "İstek başarısız oldu veya zaman aşımına uğradı. Tekrar deneyin.") });
    } finally {
      if (txRequest.current === controller) setLoadingTx(false);
    }
  }

  async function checkUrl() {
    if (!url.trim()) return;
    urlRequest.current?.abort();
    const controller = new AbortController();
    urlRequest.current = controller;
    setLoadingUrl(true);
    setUrlResult(null); setUrlError("");
    try {
      const {response,body}=await requestJson<UrlResult>("/api/apps/check?url="+encodeURIComponent(url.trim()),{cache:"no-store",signal:controller.signal});
      if(controller.signal.aborted)return;
      if(!response.ok){setUrlError(response.status===429?tr("Too many requests. Please retry later.","Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin."):tr("The URL check could not be completed. Check the address or try again later.","URL kontrolü tamamlanamadı. Adresi kontrol edin veya biraz sonra tekrar deneyin."));return;}
      setUrlResult(body);
    } catch {
      if (!controller.signal.aborted) setUrlError(tr("Request failed or timed out","İstek başarısız veya zaman aşımına uğradı"));
    } finally {
      if (urlRequest.current === controller) setLoadingUrl(false);
    }
  }

  return (
    <section className="mt-5 sm:mt-7">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">{tr("Developer Tools", "Geliştirici Araçları")}</h2>
        <p className="text-[11px] text-muted-foreground">{tr("Small, free utilities built around observable Pi data. More tools will be added incrementally.", "Gözlemlenebilir Pi verileri etrafında oluşturulan küçük, ücretsiz araçlar. Yeni araçlar kademeli olarak eklenecek.")}</p>
      </div>

      <div className="mb-4 rounded-xl border border-border bg-card p-4">
        <h3 className="text-xs font-semibold">{tr("Build with official Pi resources", "Resmî Pi kaynaklarıyla geliştirin")}</h3>
        <p className="mt-2 text-[11px] text-muted-foreground">{tr("These utilities read public Mainnet data. They do not deploy contracts, move funds or certify applications. Sign-in is optional and only verifies a Pi username.", "Bu araçlar herkese açık Mainnet verisini okur. Kontrat yayımlamaz, para taşımaz veya uygulama onaylamaz. Giriş isteğe bağlıdır ve yalnızca Pi kullanıcı adını doğrular.")}</p>
        <nav aria-label={tr("Official developer resources", "Resmî geliştirici kaynakları")} className="mt-3 flex flex-wrap gap-3 text-xs underline underline-offset-2">
          <a href="https://developers.minepi.com/" target="_blank" rel="noreferrer">Pi Docs ↗</a>
          <a href="https://developers.minepi.com/docs/build-first-app/MainnetListing" target="_blank" rel="noreferrer">{tr("Listing requirements", "Listeleme koşulları")} ↗</a>
          <a href="/api/zaf/status" target="_blank" rel="noreferrer">{tr("Scheduled collection status (JSON)", "Zamanlanmış toplama durumu (JSON)")} ↗</a>
        </nav>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs font-semibold text-foreground">{tr("Pi Address Inspector", "Pi Adres İnceleyici")}</div>
          <div className="mt-1 text-[10px] text-muted-foreground">{tr("Local format and checksum validation. It does not establish account existence, ownership or balance. Never enter a secret key.", "Yerel format ve kontrol toplamı doğrulaması. Hesabın varlığını, sahipliğini veya bakiyesini kanıtlamaz. Gizli anahtar girmeyin.")}</div>
          <input aria-label={tr("Pi Address Inspector", "Pi Adres İnceleyici")} value={address} onChange={e => setAddress(e.target.value.toUpperCase())} placeholder="G..." className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground outline-none focus:ring-2 focus:ring-ring" />
          <div className="mt-2 text-[10px] text-muted-foreground">{address ? valid ? tr("Format Valid", "Format Geçerli") : tr("Format Invalid", "Format Geçersiz") : tr("Enter A Public Pi Address", "Herkese Açık Pi Adresi Girin")}</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs font-semibold text-foreground">{tr("Transaction Lookup", "İşlem Sorgulama")}</div>
          <div className="mt-1 text-[10px] text-muted-foreground">{tr("Queries Pi Mainnet Horizon for a transaction hash.", "Pi Mainnet Horizon üzerinden transaction hash sorgular.")}</div>
          <input aria-label={tr("Transaction Hash", "Transaction Hash")} value={tx} onChange={e => { txRequest.current?.abort(); setTx(e.target.value); setTxResult(null); setLoadingTx(false); }} onKeyDown={e => { if (e.key === "Enter") void lookup(); }} placeholder={tr("Transaction Hash", "Transaction Hash")} className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground outline-none focus:ring-2 focus:ring-ring" />
          {tx && !validTx ? <p className="mt-2 text-[10px] text-muted-foreground">{tr("Enter a 64-character hexadecimal transaction hash.", "64 karakterli onaltılık işlem hash'i girin.")}</p> : null}
          <button type="button" onClick={() => void lookup()} disabled={loadingTx || !validTx} className="mt-2 rounded-lg border border-border px-3 py-2 text-[10px] font-medium text-foreground disabled:opacity-50">{loadingTx ? tr("Looking Up…", "Sorgulanıyor…") : tr("Lookup", "Sorgula")}</button>
          {txResult ? <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-border bg-background p-2 text-[9px] text-muted-foreground">{JSON.stringify(txResult, null, 2)}</pre> : null}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:col-span-2">
          <div className="text-xs font-semibold text-foreground">{tr("Pi App URL Checker", "Pi Uygulama URL Kontrolü")}</div>
          <div className="mt-1 text-[10px] text-muted-foreground">{tr("Checks a public application URL for reachability, HTTPS, HTTP status and response time.", "Herkese açık bir uygulama URL'sini erişilebilirlik, HTTPS, HTTP durumu ve yanıt süresi açısından kontrol eder.")}</div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input aria-label={tr("Pi App URL Checker", "Pi Uygulama URL Kontrolü")} value={url} onChange={e => { urlRequest.current?.abort(); setUrl(e.target.value); setUrlResult(null); setUrlError(""); setLoadingUrl(false); }} onKeyDown={e => { if (e.key === "Enter") void checkUrl(); }} placeholder="https://example.com" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring" />
            <button type="button" onClick={() => void checkUrl()} disabled={loadingUrl} className="rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background disabled:opacity-50">{loadingUrl ? tr("Checking…", "Kontrol Ediliyor…") : tr("Check URL", "URL'yi Kontrol Et")}</button>
          </div>
          {urlError ? <p role="status" className="mt-3 text-xs text-muted-foreground">{urlError}</p> : null}
          {urlResult ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">{tr("Reachability", "Erişilebilirlik")}</div><div className="mt-1 text-sm font-semibold text-foreground">{urlResult.reachable ? tr("Responded", "Yanıt verdi") : tr("Not reached", "Erişilemedi")}</div></div>
              <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">HTTPS</div><div className="mt-1 text-sm font-semibold text-foreground">{urlResult.https ? "✓" : "—"}</div></div>
              <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">{tr("Response", "Yanıt")}</div><div className="mt-1 text-sm font-semibold text-foreground">{urlResult.responseTimeMs} ms</div></div>
              <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">HTTP</div><div className="mt-1 text-sm font-semibold text-foreground">{urlResult.status ?? "—"}</div></div>
            </div>
          ) : null}
          {urlResult?.error ? <div className="mt-3 text-[10px] text-muted-foreground">{urlResult.error}</div> : null}
          {urlResult ? <div className="mt-2 text-[10px] text-muted-foreground">{tr("Redirect Detected:", "Yönlendirme:")} {urlResult.redirect ? tr("Yes", "Evet") : tr("No", "Hayır")}</div> : null}
          {urlResult ? <p className="mt-2 break-words text-[10px] text-muted-foreground">{urlResult.url} · {urlResult.checkedAt} · {tr("A single server-side check; not a security audit. Redirect destinations are not followed.", "Tek bir sunucu kontrolüdür; güvenlik denetimi değildir. Yönlendirme hedefi takip edilmez.")}</p> : null}
        </div>
      </div>
    </section>
  );
}
