"use client";
import { ZafBrand } from "@/components/zaf-brand";

import { useEffect, useRef, useState } from "react";
import { requestJson } from "@/lib/zaf/client-request";
import { confirmPiSession } from "@/lib/zaf/pi/session-state";
import {
  getSafePiSignInReturnPath,
  PI_SIGNIN_RETURN_TO_KEY,
  PI_SIGNIN_STATE_KEY,
  PI_SIGNIN_STARTED_KEY,
  isPiOAuthStateFresh, clearPiDisplay, savePiDisplay,
} from "@/lib/zaf/pi/oauth";

export default function PiSignInCallbackPage() {
  const [message, setMessage] = useState("Completing Pi sign-in… / Pi girişi tamamlanıyor…");
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function finishSignIn() {
      const fragment = new URLSearchParams(
        window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash,
      );
      const accessToken = fragment.get("access_token");
      const oauthError = fragment.get("error");
      const returnedState = fragment.get("state");
      // Clear credentials before storage access: restricted browsers may throw.
      window.history.replaceState(null, "", window.location.pathname + window.location.search);

      let startedAt: string | null = null;
      let expectedState: string | null = null;
      let returnTo: string | null = null;
      try {
        startedAt = sessionStorage.getItem(PI_SIGNIN_STARTED_KEY);
        expectedState = sessionStorage.getItem(PI_SIGNIN_STATE_KEY);
        returnTo = sessionStorage.getItem(PI_SIGNIN_RETURN_TO_KEY);
        sessionStorage.removeItem(PI_SIGNIN_STATE_KEY);
        sessionStorage.removeItem(PI_SIGNIN_RETURN_TO_KEY);
        sessionStorage.removeItem(PI_SIGNIN_STARTED_KEY);
      } catch {
        setFailed(true);
        setMessage("Sign-in security storage is unavailable. Try again in the same browser. / Güvenlik depolaması kullanılamıyor. Aynı tarayıcıda tekrar dene.");
        return;
      }

      clearPiDisplay();
      const duplicate = ["access_token", "state", "error", "token_type", "expires_in"].some(key => fragment.getAll(key).length > 1);
      if (duplicate || !isPiOAuthStateFresh(startedAt) || !expectedState || !returnedState || returnedState !== expectedState) {
        setFailed(true);
        setMessage("Pi sign-in could not be verified because the security state did not match. Start again. / Güvenlik doğrulaması eşleşmedi. Yeniden başlat.");
        return;
      }

      if (oauthError) {
        setFailed(true);
        const copy = oauthError === "access_denied" || oauthError === "cancelled"
          ? "Pi sign-in was cancelled. / Pi girişi iptal edildi."
          : oauthError === "expired"
            ? "The Pi sign-in request expired. Start again. / Pi giriş isteğinin süresi doldu. Yeniden başlat."
            : "Pi authorization was not completed. / Pi yetkilendirmesi tamamlanmadı.";
        setMessage(copy);
        return;
      }

      if (!accessToken || accessToken.length > 4096) {
        setFailed(true);
        setMessage("Pi did not return a usable access token. Start again. / Pi geçerli bir erişim anahtarı döndürmedi. Yeniden başlat.");
        return;
      }

      const { response, body } = await requestJson<{ user?: { username?: string } }>("/api/zaf/pi/oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
        cache: "no-store",
        credentials: "same-origin",
      });
      const username = typeof body?.user?.username === "string" ? body.user.username.trim() : "";

      if (!response.ok || !username) {
        setFailed(true);
        setMessage(`Pi returned, but ZAF Tech could not verify the account. Please start again. / Pi'den dönüş alındı ancak hesap doğrulanamadı. Yeniden başlat. (ZAF-PI-OAUTH-${response.status})`);
        return;
      }

      // Persist only the verified display name, never the access token.
      if (await confirmPiSession(username) !== username) {
        setFailed(true);
        setMessage("Your browser could not keep the ZAF Tech session. Allow cookies for ZAF Tech and start again. / Tarayıcı ZAF Tech oturumunu koruyamadı. ZAF Tech için çerezlere izin verip yeniden başlat. (ZAF-PI-SESSION)");
        return;
      }
      savePiDisplay(username);
      window.location.replace(getSafePiSignInReturnPath(returnTo));
    }

    void finishSignIn().catch(() => {
      setFailed(true);
      setMessage("Pi sign-in could not be completed. Please try again. / Pi girişi tamamlanamadı. Lütfen tekrar dene.");
    });
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-sm">
        <ZafBrand className="mb-4" />
        <div className="text-xs text-muted-foreground">Pi Sign-In</div>
        <h1 className="mt-2 text-xl font-semibold">Pi account verification</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground" role="status" aria-live="polite">{message}</p>
        {failed ? (
          <a href="/" className="mt-4 inline-flex rounded-lg border border-border px-3 py-2 text-sm font-medium">Return to ZAF Tech / ZAF Tech'e dön</a>
        ) : null}
      </section>
    </main>
  );
}
