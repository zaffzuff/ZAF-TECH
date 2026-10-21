"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ZafBrand } from "@/components/zaf-brand";
import { loadPiSdk, initializePiSdk, withPiTimeout } from "@/lib/zaf/pi/sdk";
import { requestJson } from "@/lib/zaf/client-request";

const messages: Record<string, string> = {
  TEST_NOT_ENABLED: "Test henüz etkinleştirilmedi. Uygulama sahibinin kurulumu tamamlaması gerekiyor.",
  WALLET_NOT_ELIGIBLE: "Bu cüzdan beş kişilik test listesinde değil veya bu cüzdan test ödemesini zaten aldı.",
  ANOTHER_TEST_PENDING: "Başka bir test işlemi devam ediyor. Biraz sonra tekrar dene.",
  CAMPAIGN_FULL: "Beş alıcılı test tamamlandı. Yeni bir gönderim yapılmayacak.",
  RECEIVE_PERMISSION_REQUIRED: "Pi cüzdan adresini paylaşma izni gerekiyor. Pi Browser üzerinden tekrar dene.",
  NATIVE_SIGNIN_REQUIRED: "Testi Pi Browser üzerinden başlat.",
  CONFIRMATION_PENDING: "Gönderimin son doğrulaması bekleniyor. Tekrar denemek ikinci bir ödeme oluşturmaz.",
  REVIEW_REQUIRED: "İşlem tamamlanamadı; önceki gönderim kontrol edilmeli. Uygulama sahibine haber ver.",
  PI_SERVICE_UNAVAILABLE: "Pi servisine şu an ulaşılamıyor. Biraz sonra aynı hesapla tekrar dene.",
  PAYMENT_MISMATCH: "Pi ödeme bilgileri beklenen testle eşleşmedi. Gönderim durduruldu.",
  CHAIN_MISMATCH: "İşlem kaydı beklenen testle eşleşmedi. Uygulama sahibine haber ver.",
};

export function ZafA2uTest() {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reloadRequired, setReloadRequired] = useState(false);
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<{ txid: string; paymentId: string } | null>(null);
  const active = useRef(true);
  const inFlight = useRef(false);
  const authTimedOut = useRef(false);
  useEffect(() => {
    active.current = true;
    const controller = new AbortController();
    void requestJson<{ enabled?: boolean }>("/api/zaf/pi/a2u", { cache: "no-store", signal: controller.signal }, 8_000)
      .then(({ response, body }) => response.ok ? body : Promise.reject(new Error("unavailable")))
      .then(data => { if (active.current) setReady(data.enabled === true); })
      .catch(() => { if (active.current) setMessage("Test durumu alınamadı. Sayfayı tekrar aç."); })
      .finally(() => { if (active.current) setChecking(false); });
    return () => { active.current = false; controller.abort(); };
  }, []);

  async function receive() {
    if (reloadRequired) { window.location.reload(); return; }
    if (!ready || inFlight.current || receipt) return;
    inFlight.current = true;
    setBusy(true); setMessage("");
    try {
      await loadPiSdk();
      const pi = await initializePiSdk();
      // This separate, user-initiated receive test requests wallet sharing.
      // Normal ZAF Tech sign-in continues to request username only.
      const auth = await withPiTimeout(pi.authenticate(["username", "wallet_address"], () => undefined), 45_000, "Pi permission timed out.", () => {
        authTimedOut.current = true;
        if (active.current) setReloadRequired(true);
      });
      if (!active.current) return;
      if (typeof auth?.accessToken !== "string" || !auth.accessToken) throw new Error("invalid authorization");
      const { response, body: data } = await requestJson<{ code?: string; state?: string; txid?: string; paymentId?: string }>("/api/zaf/pi/a2u", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: auth.accessToken }), cache: "no-store",
      }, 65_000);
      if (!active.current) return;
      if (!response.ok || data.state !== "complete") {
        setMessage(messages[data.code || ""] || "Test tamamlanamadı. Aynı hesapla tekrar dene; sorun sürerse uygulama sahibine haber ver.");
        return;
      }
      if (typeof data.txid !== "string" || !/^[a-f0-9]{64}$/.test(data.txid) || typeof data.paymentId !== "string") throw new Error("invalid receipt");
      setReceipt({ txid: data.txid, paymentId: data.paymentId });
      setMessage("0,01 Test-Pi gönderildi. Blockchain işlemi ve Pi ödeme kaydı doğrulandı.");
    } catch {
      if (active.current) setMessage(authTimedOut.current ? "Pi izni zaman aşımına uğradı. Yeniden denemek için sayfayı yenile." : "Test tamamlanamadı veya izin verilmedi. Pi Browser içinden aynı hesapla tekrar dene. Devam eden gönderim varsa ikinci bir ödeme oluşturulmaz.");
    } finally {
      inFlight.current = false;
      if (active.current) setBusy(false);
    }
  }

  return <main lang="tr" className="min-h-screen bg-background px-4 py-8 text-foreground">
    <article className="mx-auto max-w-xl space-y-5">
      <ZafBrand />
      <Link href="/" className="inline-block text-sm underline">← ZAF Tech Testnet</Link>
      <h1 className="text-2xl font-bold">Test-Pi alım testi</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">ZAF Tech Testnet uygulamasından kendi Pi Testnet cüzdanına tek seferlik <strong>0,01 Test-Pi</strong> al. Bu test yalnızca önceden belirlenen beş farklı alıcı cüzdanı içindir. Test-Pi gerçek Pi değildir ve parasal değeri yoktur.</p>
      <section className="rounded-xl border border-border bg-card p-4 text-sm leading-relaxed">
        <h2 className="font-semibold">Nasıl çalışır?</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>Bu sayfayı Pi Browser üzerinden aç.</li>
          <li>Aşağıdaki düğmeye dokun ve Pi’nin kullanıcı adı ile cüzdan adresini paylaşma iznini onayla.</li>
          <li>Uygulama, izin listesindeki cüzdanına Test-Pi gönderir. Sonucu burada görürsün.</li>
        </ol>
        <p className="mt-3">Cüzdanının Testnet’te etkin olması gerekir. Senden ödeme, cüzdan parolası veya özel anahtar istenmez.</p>
      </section>
      <p className="text-sm" role="status">{checking ? "Test durumu kontrol ediliyor…" : ready ? "Alım testi etkin." : messages.TEST_NOT_ENABLED}</p>
      <button onClick={() => void receive()} disabled={checking || !ready || busy || Boolean(receipt)} className="zaf-action-button w-full disabled:opacity-50">
        {busy ? "Pi izni ve gönderim bekleniyor…" : receipt ? "Test tamamlandı" : reloadRequired ? "Sayfayı yenile" : "İzin ver ve 0,01 Test-Pi al"}
      </button>
      {message ? <p role="status" aria-live="polite" className="break-words rounded-xl border border-border p-4 text-sm">{message}</p> : null}
      {receipt ? <dl className="space-y-2 break-all rounded-xl border border-border p-4 text-xs"><dt className="font-semibold">Pi ödeme kaydı</dt><dd>{receipt.paymentId}</dd><dt className="font-semibold">Testnet işlem kimliği</dt><dd>{receipt.txid}</dd></dl> : null}
      <p className="text-xs leading-relaxed text-muted-foreground">Çift gönderimi önlemek için test kaydı, alıcı cüzdan adresi ve işlem kimlikleri sunucuda saklanır. Pi erişim belirteci kaydedilmez. Blockchain işlem kaydı herkese açıktır. <Link href="/privacy" className="underline">Gizlilik bilgileri</Link></p>
    </article>
  </main>;
}
