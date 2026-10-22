"use client";

import { useEffect, useRef, useState } from "react";
import { ZafOverlay } from "@/components/zaf-overlay";
import { requestJson } from "@/lib/zaf/client-request";
import type { Locale } from "@/lib/zaf/i18n";
import { translate } from "@/lib/zaf/i18n";
import { PI_SIGNIN_RETURN_TO_KEY, PI_SIGNIN_STATE_KEY, PI_SIGNIN_STARTED_KEY, PI_DISPLAY_CHANGE_EVENT, clearPiDisplay, readPiDisplay, savePiDisplay, acquirePiSignIn, releasePiSignIn, isPiSignInBusy, type PiDisplay } from "@/lib/zaf/pi/oauth";
import { loadPiSdk, initializePiSdk, authenticatePi, piReloadRequired, withPiTimeout as withTimeout, type PiSdk } from "@/lib/zaf/pi/sdk";
import { confirmPiSession, confirmPiSignOut, refreshPiSession } from "@/lib/zaf/pi/session-state";
import { usesPiPageSession, enablePiPageSession, rememberPiPageSession, forgetPiPageSession, piSessionRequestOptions } from "@/lib/zaf/pi/page-session";
import { isDirectPiBrowserEntry, isPiBrowserUserAgent, ZAF_PI_APP_URL } from "@/lib/zaf/pi/native-context";
import { checkPiStorageAccess, isPiStorageContext, isPiSessionStorageBlocked, requestPiStorageAccess } from "@/lib/zaf/pi/storage-access";

function beginPiOAuthSignIn(clientId: string) {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  const state = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  const redirectUri = new URL("/signin/callback", window.location.origin).toString();
  const returnTo = window.location.pathname + window.location.search;

  sessionStorage.setItem(PI_SIGNIN_STATE_KEY, state);
  sessionStorage.setItem(PI_SIGNIN_STARTED_KEY, String(Date.now()));
  sessionStorage.setItem(PI_SIGNIN_RETURN_TO_KEY, returnTo);

  const authorizationUrl = new URL("https://accounts.pinet.com/oauth/authorize");
  authorizationUrl.searchParams.set("response_type", "token");
  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("scope", "username");
  authorizationUrl.searchParams.set("state", state);
  window.location.assign(authorizationUrl.toString());
}

function safePiErrorDetail(error: unknown): string {
  let message = "";
  if (error instanceof Error) message = error.message;
  else if (typeof error === "string") message = error;
  else if (error && typeof error === "object") {
    const value = error as { message?: unknown; reason?: unknown; code?: unknown };
    message = [value.message, value.reason, value.code]
      .filter((part): part is string | number => typeof part === "string" || typeof part === "number")
      .map(String)
      .join(" ");
  }

  return message
    .replace(/(access[_ -]?token|authorization|bearer)\s*[:=]?\s*\S+/gi, "$1 [redacted]")
    .replace(/https?:\/\/[^\s]+/gi, "[address]")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 140);
}

async function detectPiBrowser(pi: PiSdk): Promise<boolean> {
  // Prefer explicit Pi host information when the current SDK exposes it.
  // Some Pi Browser builds use a generic WebView user agent, so retain a
  // user-agent fallback for those builds.
  try {
    if (typeof pi.getPiHostAppInfo === "function") {
      const info = await withTimeout(
        Promise.resolve(pi.getPiHostAppInfo()),
        1_500,
        "Pi host app detection timed out.",
      );
      // PiNet's web host does not provide native consent; retain web OAuth.
      if (info?.hostApp === "pi-net") return false;
      if (info?.hostApp && ["pi-browser", "pi-node"].includes(info.hostApp)) return true;
      if (typeof info?.hostApp === "string" && info.hostApp.length > 0) return false;
    }
  } catch {
    // Use the user-agent fallback if host information isn't available.
  }
  return isPiBrowserUserAgent();
}

export function ZafPiSignIn({ locale }: { locale: Locale }) {
  const [user, setUser] = useState<PiDisplay | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(false);
  const [entryRequired, setEntryRequired] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [storageSetup, setStorageSetup] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const mounted = useRef(true);

  const tr = (en: string, trText: string) => translate(locale, en, trText);

  useEffect(() => {
    mounted.current = true;
    const sync = () => { setUser(readPiDisplay()); setBusy(isPiSignInBusy()); setReload(piReloadRequired()); setStorageBlocked(isPiSessionStorageBlocked() && !usesPiPageSession()); };
    const restore = () => { sync(); void refreshPiSession(); };
    restore();
    const timer = window.setInterval(restore, 30_000);
    window.addEventListener(PI_DISPLAY_CHANGE_EVENT, sync);
    window.addEventListener("pageshow", restore);
    return () => { mounted.current = false; window.clearInterval(timer); window.removeEventListener(PI_DISPLAY_CHANGE_EVENT, sync); window.removeEventListener("pageshow", restore); };
  }, []);

  useEffect(() => {
    if (!isPiBrowserUserAgent() || isDirectPiBrowserEntry()) return;

    let cancelled = false;
    void (async () => {
      try {
        await loadPiSdk();
        await initializePiSdk();
      } catch (error) {
        if (!cancelled) {
          // Delay visible errors until the user taps Sign in; log only sanitized details.
          console.warn(
            "[ZAF Tech] Pi SDK pre-initialization failed",
            error instanceof Error ? error.name : "UnknownError",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function signIn() {
    if (busy || isPiSignInBusy()) return;
    setEntryRequired(false);
    if (piReloadRequired()) { window.location.reload(); return; }
    if (!acquirePiSignIn()) return;
    // Preserve the click's activation: no awaited SDK/probe before this call.
    const storagePermission = isPiSessionStorageBlocked() && !usesPiPageSession() ? requestPiStorageAccess() : null;
    setBusy(true);
    setMessage("");
    setStorageSetup(false);

    let phase: "oauth-start" | "sdk-load" | "browser-detection" | "sdk-init" | "authentication" | "verification" = "sdk-load";
    let verificationCode = "ZAF-PI-CONNECTION";
    let storageUnavailable = false;
    try {
      // Pi Browser can resolve a self-hosted PiNet app to its Vercel origin.
      // OAuth uses the Portal client and registered callback without a parent bridge.
      if (window.parent === window) {
        phase = "oauth-start";
        const clientId = process.env.NEXT_PUBLIC_PI_SIGNIN_CLIENT_ID?.trim();
        if (!clientId) throw new Error("Pi Sign-In Client ID is not configured.");
        beginPiOAuthSignIn(clientId);
        return;
      }
      if (storagePermission) {
        const available = await withTimeout(storagePermission, 5_000, "Session access timed out.").catch(() => false);
        if (!mounted.current) return;
        storageUnavailable = !available;
        if (available) {
          setStorageBlocked(false);
          const restored = await confirmPiSession();
          if (!mounted.current) return;
          if (restored) { savePiDisplay(restored); setUser(readPiDisplay()); return; }
        }
      }
      if (usesPiPageSession()) forgetPiPageSession();
      clearPiDisplay();
      setUser(null);
      await loadPiSdk();
      phase = "sdk-init";
      const pi = await initializePiSdk();

      // The Pi SDK requires init() before any other SDK method. Detect the
      // host only after initialization so Pi Browser auth isn't disrupted.
      phase = "browser-detection";
      const insidePiBrowser = await detectPiBrowser(pi);
      if (!mounted.current) return;
      const oauthClientId = process.env.NEXT_PUBLIC_PI_SIGNIN_CLIENT_ID?.trim();

      if (!insidePiBrowser) {
        // Pi OAuth Sign-In is for ordinary browsers; Pi Browser uses Pi.authenticate().
        if (!oauthClientId) {
          phase = "oauth-start";
          throw new Error("Pi Sign-In Client ID is not configured.");
        }
        phase = "oauth-start";
        beginPiOAuthSignIn(oauthClientId);
        return;
      }

      // Some iOS WebViews have a generic user agent. Recheck after SDK host detection.
      if (window.parent === window) { setEntryRequired(true); return; }

      // Old iOS WebViews can reject cookie access even inside the registered
      // app. Do not gate Pi authentication on an unavailable cookie transport.
      if (!usesPiPageSession() && (storageUnavailable ||
          (isPiStorageContext() && !await checkPiStorageAccess() && isPiSessionStorageBlocked()))) {
        enablePiPageSession();
      }
      if (!mounted.current) return;
      if (usesPiPageSession()) setStorageBlocked(false);

      // Inside Pi Browser, use the native Pi Apps SDK flow instead of OAuth.
      phase = "authentication";
      const auth = await authenticatePi(pi);
      if (!mounted.current) return;
      if (!auth?.accessToken || typeof auth.accessToken !== "string") {
        throw new Error("Pi did not return an access token.");
      }

      phase = "verification";
      const { response, body } = await requestJson<{ error?: string; user?: { username?: string }; session?: unknown }>("/api/zaf/pi/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(usesPiPageSession() ? { "X-ZAF-Pi-Session-Transport": "memory" } : {}) },
        body: JSON.stringify({ accessToken: auth.accessToken }),
        cache: "no-store",
        credentials: usesPiPageSession() ? "omit" : "same-origin",
      });

      verificationCode = `ZAF-PI-${response.status}`;
      if (!response.ok) {
        const serverMessage = typeof body?.error === "string" ? body.error : "";
        if (response.status === 401) {
          throw new Error("Pi could not verify this sign-in. Please try again.");
        }
        if (response.status === 502) {
          setEntryRequired(true);
          throw new Error("Pi sign-in could not be verified. Open the registered Pi app to retry.");
        }
        if (response.status === 503) {
          throw new Error("Pi verification is temporarily unavailable. Please try again later.");
        }
        throw new Error(serverMessage || "Pi sign-in could not be verified.");
      }

      const username = typeof body?.user?.username === "string" ? body.user.username.trim() : "";
      if (!mounted.current) return;
      if (!username) throw new Error("Pi verified the request but returned no username.");
      verificationCode = "ZAF-PI-SESSION";
      if (usesPiPageSession() && !rememberPiPageSession(body?.session)) throw new Error("The page session could not be established.");
      if (await confirmPiSession(username) !== username) {
        if (!usesPiPageSession() && !await checkPiStorageAccess() && isPiSessionStorageBlocked()) { setStorageBlocked(true); setStorageSetup(true); return; }
        forgetPiPageSession();
        throw new Error("The ZAF Tech session could not be confirmed.");
      }
      if (!mounted.current) return;
      savePiDisplay(username);
      setUser(readPiDisplay());
      setMessage("");
    } catch (error) {
      if (!mounted.current) return;
      // Ordinary browsers can use Pi OAuth even when the native SDK cannot
      // initialize there. Native Pi Browser errors stay on the native path.
      const oauthClientId = process.env.NEXT_PUBLIC_PI_SIGNIN_CLIENT_ID?.trim();
      if (["sdk-load", "sdk-init"].includes(phase) && !isPiBrowserUserAgent() && oauthClientId) {
        try { beginPiOAuthSignIn(oauthClientId); return; } catch { phase = "oauth-start"; }
      }
      // Never log the access token or full API request; only log the phase and
      // error class so a Pi Browser failure can be diagnosed without secrets.
      const errorName = error instanceof Error ? error.name : "UnknownError";
      const errorDetail = safePiErrorDetail(error);
      // Never log access tokens or full URLs. The short message is sanitized.
      console.error("[ZAF Tech] Pi sign-in failed during " + phase, errorName);
      setUser(null);
      clearPiDisplay();

      if (phase === "authentication" && /timed out|did not respond/i.test(errorDetail)) {
        setEntryRequired(true);
        setMessage(tr(
          "Pi Browser did not respond to the sign-in request. Check for a pending permission prompt and try again.",
          "Pi Browser giriş isteğine yanıt vermedi. Bekleyen bir izin penceresi olup olmadığını kontrol edip tekrar dene.",
        ));
        return;
      }

      const failureCopy = {
        "oauth-start": [
          "Pi Sign-In could not start. Check the Client ID and registered callback URL.",
          "Pi Sign-In başlatılamadı. Client ID ve kayıtlı dönüş adresini kontrol et.",
        ],
        "sdk-load": [
          "Pi SDK could not load. Refresh ZAF Tech inside Pi Browser and try again.",
          "Pi SDK yüklenemedi. ZAF Tech'i Pi Browser içinde yenileyip tekrar dene.",
        ],
        "browser-detection": [
          "Could not determine the Pi sign-in environment. Please try again.",
          "Pi giriş ortamı belirlenemedi. Lütfen tekrar dene.",
        ],
        "sdk-init": [
          "Pi SDK could not initialize. Refresh ZAF Tech inside Pi Browser and try again.",
          "Pi SDK başlatılamadı. ZAF Tech'i Pi Browser içinde yenileyip tekrar dene.",
        ],
        authentication: [
          "Pi Browser could not complete authentication. Please allow the sign-in prompt and try again.",
          "Pi Browser kimlik doğrulamasını tamamlayamadı. Giriş iznini kontrol edip tekrar dene.",
        ],
        verification: [
          "Pi sign-in could not be verified. Please try again.",
          "Pi girişi doğrulanamadı. Lütfen tekrar dene.",
        ],
      } as const;
      const [enMessage, trMessage] = failureCopy[phase];
      setMessage(tr(enMessage, trMessage) + (phase === "verification" ? ` (${verificationCode})` : ""));
    } finally {
      releasePiSignIn();
      if (mounted.current) { setReload(piReloadRequired()); setBusy(false); }
    }
  }

  async function signOut() {
    if (!acquirePiSignIn()) return;
    const permission = isPiSessionStorageBlocked() && !usesPiPageSession() ? requestPiStorageAccess() : null;
    setBusy(true);
    try {
      if (permission && !await permission) throw new Error("Session access is required to sign out.");
      // Cover an immediate click before the page's first probe completed.
      if (!usesPiPageSession() && isPiStorageContext() && !await checkPiStorageAccess()) throw new Error("Session access is required to sign out.");
      const { response } = await requestJson("/api/zaf/pi/session", piSessionRequestOptions("DELETE"));
      if (!response.ok && !(usesPiPageSession() && response.status === 401)) throw new Error("Sign-out failed.");
      forgetPiPageSession();
      if (!await confirmPiSignOut()) throw new Error("Sign-out failed.");
      clearPiDisplay(); setUser(null); setMessage(""); setStorageSetup(false); setStorageBlocked(false);
    } catch { setMessage(tr("Sign-out failed. Please try again.", "Çıkış yapılamadı. Lütfen tekrar dene.")); }
    finally { releasePiSignIn(); if (mounted.current) setBusy(false); }

  }

  return (
    <div data-testid="zaf-pi-sign-in" className="zaf-pi-control">
      <button
        type="button"
        onClick={() => { setDialogOpen(true); if (!user) void signIn(); }}
        disabled={busy}
        className="zaf-pi-signin-button"
        aria-label={user?.current ? tr("Pi Account Verified", "Pi Hesabı Doğrulandı") : tr("Sign in with Pi", "Pi ile giriş yap")}
        aria-haspopup="dialog"
        aria-expanded={dialogOpen}
      >
        <span aria-hidden="true">π</span>
        <span className="hidden lg:inline">{busy ? tr("Connecting to Pi…", "Pi'ye bağlanılıyor…") : reload ? tr("Reload and retry", "Yenile ve tekrar dene") : user?.current ? tr("Pi Account Verified", "Pi Hesabı Doğrulandı") : tr("Sign in with Pi", "Pi ile giriş yap")}</span>
        <span className="lg:hidden">{busy ? tr("Connecting…", "Bağlanıyor…") : reload ? tr("Reload and retry", "Yenile ve tekrar dene") : user?.current ? tr("Pi Verified", "Pi Doğrulandı") : tr("Sign in with Pi", "Pi ile giriş yap")}</span>
      </button>
      {dialogOpen ? <ZafOverlay title={tr("Pi Sign-In", "Pi Girişi")} closeLabel={tr("Close", "Kapat")} onClose={() => setDialogOpen(false)}>
        {busy ? <p role="status" aria-live="polite">{tr("Connecting to Pi…", "Pi'ye bağlanılıyor…")}</p> : <>
          {message ? <p role="alert">{message}</p> : null}
          {user ? <p className="zaf-pi-identity" aria-live="polite">{user.current ? tr("Verified username:", "Doğrulanan kullanıcı adı:") : tr("Previously verified:", "Önceden doğrulanan:")} <strong>@{user.username}</strong></p> : null}
          {user?.current && usesPiPageSession() ? <p className="zaf-overlay-note">{tr("This session ends when you refresh or close this page.", "Bu oturum sayfayı yenileyince veya kapatınca sona erer.")}</p> : null}
          {storageSetup ? <p>{tr("This browser needs permission to keep your ZAF Tech session inside Pi.", "Bu tarayıcı, ZAF Tech oturumunu Pi içinde korumak için izin gerektiriyor.")}</p> : null}
          {entryRequired ? <p>{tr("Open the registered Pi app to sign in.", "Giriş yapmak için kayıtlı Pi uygulamasını aç.")}</p> : null}
          <div className="zaf-overlay-actions">
            {entryRequired ? <a href={ZAF_PI_APP_URL} target="_top" className="zaf-action-button">{tr("Open ZAF Tech in Pi", "ZAF Tech'i Pi'de aç")}</a> : null}
            {!user?.current && !entryRequired ? <button type="button" onClick={() => void signIn()} className="zaf-action-button">{reload ? tr("Reload and retry", "Yenile ve tekrar dene") : tr("Sign in with Pi", "Pi ile giriş yap")}</button> : null}
            {user ? <button type="button" onClick={() => void signOut()} className="zaf-action-button zaf-pi-clear-button" title={tr("Ends your ZAF Tech session; your Pi account stays signed in.", "ZAF Tech oturumunu kapatır; Pi hesabınız açık kalır.")}>{tr("Sign out", "Çıkış yap")}</button> : null}
          </div>
        </>}
      </ZafOverlay> : null}
    </div>
  );
}
