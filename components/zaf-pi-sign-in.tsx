"use client";

import { useEffect, useRef, useState } from "react";
import { requestJson } from "@/lib/zaf/client-request";
import type { Locale } from "@/lib/zaf/i18n";
import { translate } from "@/lib/zaf/i18n";
import { PI_SIGNIN_RETURN_TO_KEY, PI_SIGNIN_STATE_KEY, PI_SIGNIN_STARTED_KEY, PI_DISPLAY_CHANGE_EVENT, clearPiDisplay, readPiDisplay, savePiDisplay, acquirePiSignIn, releasePiSignIn, isPiSignInBusy, type PiDisplay } from "@/lib/zaf/pi/oauth";
import { loadPiSdk, initializePiSdk, authenticatePi, piReloadRequired, withPiTimeout as withTimeout, type PiSdk } from "@/lib/zaf/pi/sdk";

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

function isPiBrowserUserAgent() {
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes("pibrowser") ||
    userAgent.includes("pi-browser") ||
    userAgent.includes("pi browser");
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
      if (info?.hostApp && ["pi-browser", "pi-node", "pi-net"].includes(info.hostApp)) return true;
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
  const mounted = useRef(true);

  const tr = (en: string, trText: string) => translate(locale, en, trText);

  useEffect(() => {
    mounted.current = true;
    const sync = () => { setUser(readPiDisplay()); setBusy(isPiSignInBusy()); setReload(piReloadRequired()); };
    sync();
    const timer = window.setInterval(sync, 30_000);
    window.addEventListener(PI_DISPLAY_CHANGE_EVENT, sync);
    window.addEventListener("pageshow", sync);
    return () => { mounted.current = false; window.clearInterval(timer); window.removeEventListener(PI_DISPLAY_CHANGE_EVENT, sync); window.removeEventListener("pageshow", sync); };
  }, []);

  useEffect(() => {
    if (!isPiBrowserUserAgent()) return;

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
    if (piReloadRequired()) { window.location.reload(); return; }
    if (!acquirePiSignIn()) return;
    clearPiDisplay();
    setUser(null);
    setBusy(true);
    setMessage("");

    let phase: "oauth-start" | "sdk-load" | "browser-detection" | "sdk-init" | "authentication" | "verification" = "sdk-load";
    let verificationCode = "ZAF-PI-CONNECTION";
    try {
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

      // Inside Pi Browser, use the native Pi Apps SDK flow instead of OAuth.
      phase = "authentication";
      const auth = await authenticatePi(pi);
      if (!mounted.current) return;
      if (!auth?.accessToken || typeof auth.accessToken !== "string") {
        throw new Error("Pi did not return an access token.");
      }

      phase = "verification";
      const { response, body } = await requestJson<{ error?: string; user?: { username?: string } }>("/api/zaf/pi/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: auth.accessToken }),
        cache: "no-store",
        credentials: "same-origin",
      });

      verificationCode = `ZAF-PI-${response.status}`;
      if (!response.ok) {
        const serverMessage = typeof body?.error === "string" ? body.error : "";
        if (response.status === 401) {
          throw new Error("Pi could not verify this sign-in. Please try again.");
        }
        if (response.status === 503 || response.status === 502) {
          throw new Error("Pi verification is temporarily unavailable. Please try again later.");
        }
        throw new Error(serverMessage || "Pi sign-in could not be verified.");
      }

      const username = typeof body?.user?.username === "string" ? body.user.username.trim() : "";
      if (!mounted.current) return;
      if (!username) throw new Error("Pi verified the request but returned no username.");
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

  return (
    <div data-testid="zaf-pi-sign-in" className="relative flex min-w-0 max-w-full items-center gap-2">
      <button
        type="button"
        onClick={() => void signIn()}
        disabled={busy}
        className="zaf-pi-signin-button inline-flex h-8 w-[min(48vw,168px)] min-w-[132px] shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-lg border border-ty-active/40 bg-card px-2 text-[10px] font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-wait disabled:opacity-60"
        aria-label={tr("Sign in with Pi", "Pi ile giriş yap")}
      >
        <span aria-hidden="true" className="text-sm font-bold">π</span>
        <span className="hidden truncate lg:inline">{busy ? tr("Connecting to Pi…", "Pi'ye bağlanılıyor…") : reload ? tr("Reload and retry", "Yenile ve tekrar dene") : user?.current ? tr("Pi Account Verified", "Pi Hesabı Doğrulandı") : tr("Sign in with Pi", "Pi ile giriş yap")}</span>
        <span className="inline truncate lg:hidden">{busy ? tr("Connecting…", "Bağlanıyor…") : reload ? tr("Reload and retry", "Yenile ve tekrar dene") : user?.current ? tr("Pi Verified", "Pi Doğrulandı") : tr("Sign in with Pi", "Pi ile giriş yap")}</span>
      </button>
      {user ? (
        <span className="min-w-0 break-all text-[10px] text-muted-foreground" aria-live="polite">
          {user.current ? tr("Verified username:", "Doğrulanan kullanıcı adı:") : tr("Previously verified:", "Önceden doğrulanan:")} @{user.username}
        </span>
      ) : message ? (
        <span className="zaf-pi-status-bubble absolute left-0 top-full z-50 mt-1 block w-[min(86vw,340px)] max-w-[calc(100vw-32px)] break-words whitespace-normal rounded-lg border border-red-500/50 bg-red-50 px-2.5 py-1.5 text-[10px] leading-relaxed text-red-700 shadow-md [overflow-wrap:anywhere] dark:border-red-400/50 dark:bg-red-950 dark:text-red-200" role="status" aria-live="polite">
          {message}
        </span>
      ) : null}
      {user && message ? <span role="status" className="text-[10px] text-red-700 dark:text-red-200">{message}</span> : null}
      {user ? <button type="button" disabled={busy} onClick={() => { void (async () => {
        if (!acquirePiSignIn()) return;
        setBusy(true);
        try {
          const { response } = await requestJson("/api/zaf/pi/session", { method: "DELETE", credentials: "same-origin" });
          if (!response.ok) throw new Error("Sign-out failed.");
          clearPiDisplay(); setUser(null); setMessage("");
        } catch { setMessage(tr("Sign-out failed. Please try again.", "Çıkış yapılamadı. Lütfen tekrar dene.")); }
        finally { releasePiSignIn(); if (mounted.current) setBusy(false); }
      })(); }} className="zaf-pi-clear-button rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground disabled:opacity-50" title={tr("Ends your ZAF Tech session; your Pi account stays signed in.", "ZAF Tech oturumunu kapatır; Pi hesabınız açık kalır.")}>{tr("Sign out", "Çıkış yap")}</button> : null}
    </div>
  );
}
