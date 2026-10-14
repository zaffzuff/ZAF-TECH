"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/zaf/i18n";
import { translate } from "@/lib/zaf/i18n";
import { PI_SIGNIN_RETURN_TO_KEY, PI_SIGNIN_STATE_KEY, PI_SIGNIN_VERIFIED_USERNAME_KEY } from "@/lib/zaf/pi/oauth";

type VerifiedPiUser = { username: string };

type PiAuthResult = {
  accessToken: string;
  user?: { username?: string; uid?: string };
};

type PiSdk = {
  init: (options: { version: "2.0"; sandbox: boolean }) => Promise<unknown> | void;
  authenticate: (
    scopes: string[],
    onIncompletePaymentFound?: (payment: unknown) => void,
  ) => Promise<PiAuthResult>;
  getPiHostAppInfo?: () => Promise<{ hostApp?: string }>;
};

declare global {
  interface Window {
    Pi?: PiSdk;
  }
}

let sdkLoadPromise: Promise<void> | null = null;
let initializedSandboxMode: boolean | null = null;
let sdkInitializationPromise: Promise<PiSdk> | null = null;

function beginPiOAuthSignIn(clientId: string) {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  const state = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  const redirectUri = new URL("/signin/callback", window.location.origin).toString();
  const returnTo = window.location.pathname + window.location.search;

  sessionStorage.setItem(PI_SIGNIN_STATE_KEY, state);
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
    .replace(/(?:access[_ -]?token|authorization|bearer)\s*[:=]?\s*\S+/gi, "$1 [redacted]")
    .replace(/https?:\/\/[^\s]+/gi, "[address]")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 140);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
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
      if (info?.hostApp === "pi-browser") return true;
      if (typeof info?.hostApp === "string" && info.hostApp.length > 0) return false;
    }
  } catch {
    // Use the user-agent fallback if host information isn't available.
  }
  return isPiBrowserUserAgent();
}

function loadPiSdk(): Promise<void> {
  if (typeof window !== "undefined" && window.Pi) return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;

  let pending: Promise<void>;
  pending = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://sdk.minepi.com/pi-sdk.js";
    script.async = true;

    let timeoutId: number;
    const clearHandlers = () => {
      window.clearTimeout(timeoutId);
      script.onload = null;
      script.onerror = null;
    };
    const releasePending = () => {
      if (sdkLoadPromise === pending) sdkLoadPromise = null;
    };

    timeoutId = window.setTimeout(() => {
      clearHandlers();
      releasePending();
      script.remove();
      reject(new Error("Pi SDK loading timed out."));
    }, 12_000);

    script.onload = () => {
      clearHandlers();
      releasePending();
      if (window.Pi) resolve();
      else {
        script.remove();
        reject(new Error("Pi SDK did not initialize."));
      }
    };
    script.onerror = () => {
      clearHandlers();
      releasePending();
      script.remove();
      reject(new Error("Pi SDK could not be loaded."));
    };
    document.head.appendChild(script);
  });

  sdkLoadPromise = pending;
  return pending;
}

async function initializePiSdk(): Promise<PiSdk> {
  const pi = window.Pi;
  if (!pi) throw new Error("Pi SDK is unavailable.");

  // Sandbox is an environment setting, separate from the app's Mainnet/Testnet choice.
  const configuredMode = process.env.NEXT_PUBLIC_PI_SDK_MODE?.trim().toLowerCase();
  const requestedByUrl = new URLSearchParams(window.location.search).get("pi_sandbox") === "true";
  const sandbox = configuredMode
    ? configuredMode === "sandbox"
    : requestedByUrl || window.location.hostname === "sandbox.minepi.com";

  if (initializedSandboxMode === sandbox) return pi;
  if (sdkInitializationPromise) return sdkInitializationPromise;

  // Keep a timed-out Pi.init() from pinning the shared promise forever.
  const initOperation = Promise.resolve().then(() => pi.init({ version: "2.0", sandbox }));
  let pending: Promise<PiSdk>;
  pending = withTimeout(
    initOperation,
    12_000,
    "Pi SDK initialization timed out.",
  ).then(() => {
    initializedSandboxMode = sandbox;
    return pi;
  }).catch((error: unknown) => {
    if (sdkInitializationPromise === pending) sdkInitializationPromise = null;
    throw error;
  });

  sdkInitializationPromise = pending;
  return pending;
}

export function ZafPiSignIn({ locale }: { locale: Locale }) {
  const [user, setUser] = useState<VerifiedPiUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const tr = (en: string, trText: string) => translate(locale, en, trText);

  useEffect(() => {
    try {
      const username = sessionStorage.getItem(PI_SIGNIN_VERIFIED_USERNAME_KEY)?.trim();
      if (username && username.length <= 100) setUser({ username });
    } catch {
      // Storage may be blocked; sign-in can still work for this page view.
    }
  }, []);

  useEffect(() => {
    if (!isPiBrowserUserAgent()) return;

    let cancelled = false;
    void (async () => {
      try {
        await withTimeout(loadPiSdk(), 12_000, "Pi SDK loading timed out.");
        await withTimeout(initializePiSdk(), 12_000, "Pi SDK initialization timed out.");
      } catch (error) {
        if (!cancelled) {
          // Delay visible errors until the user taps Sign in; log only sanitized details.
          console.warn(
            "[ZAF Tech] Pi SDK pre-initialization failed",
            error instanceof Error ? error.name : "UnknownError",
            safePiErrorDetail(error),
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function signIn() {
    if (busy) return;
    setBusy(true);
    setMessage("");

    let phase: "oauth-start" | "sdk-load" | "browser-detection" | "sdk-init" | "authentication" | "verification" = "sdk-load";
    try {
      await withTimeout(
        loadPiSdk(),
        12_000,
        "Pi SDK loading timed out.",
      );

      phase = "sdk-init";
      const pi = await withTimeout(
        initializePiSdk(),
        12_000,
        "Pi SDK initialization timed out.",
      );

      // The Pi SDK requires init() before any other SDK method. Detect the
      // host only after initialization so Pi Browser auth isn't disrupted.
      phase = "browser-detection";
      const insidePiBrowser = await detectPiBrowser(pi);
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
      const auth = await withTimeout(
        pi.authenticate(["username"], () => undefined),
        45_000,
        "Pi Browser did not respond to the sign-in request within 45 seconds.",
      );
      if (!auth?.accessToken || typeof auth.accessToken !== "string") {
        throw new Error("Pi did not return an access token.");
      }

      phase = "verification";
      const response = await fetch("/api/zaf/pi/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: auth.accessToken }),
        cache: "no-store",
        credentials: "same-origin",
      });
      const body = await response.json().catch(() => null);

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
      if (!username) throw new Error("Pi verified the request but returned no username.");
      setUser({ username });
      try {
        sessionStorage.setItem(PI_SIGNIN_VERIFIED_USERNAME_KEY, username);
      } catch {
        // Username is presentation-only; the access token is never stored.
      }
      setMessage(tr("Pi account verified.", "Pi hesabı doğrulandı."));
    } catch (error) {
      // Never log the access token or full API request; only log the phase and
      // error class so a Pi Browser failure can be diagnosed without secrets.
      const errorName = error instanceof Error ? error.name : "UnknownError";
      const errorDetail = safePiErrorDetail(error);
      // Never log access tokens or full URLs. The short message is sanitized.
      console.error("[ZAF Tech] Pi sign-in failed during " + phase, errorName, errorDetail);
      setUser(null);

      if (phase === "authentication" && errorDetail) {
        const timedOut = /timed out|did not respond/i.test(errorDetail);
        setMessage(tr(
          timedOut
            ? "Pi Browser did not respond to the sign-in request. The SDK is now initialized on page load; check for a pending Pi permission prompt and try again."
            : "Pi Browser authentication failed: " + errorDetail,
          timedOut
            ? "Pi Browser giriş isteğine yanıt vermedi. SDK artık sayfa açılırken başlatılıyor; bekleyen Pi izin penceresi olup olmadığını kontrol edip tekrar dene."
            : "Pi Browser kimlik doğrulaması başarısız: " + errorDetail,
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
      setMessage(tr(enMessage, trMessage));
    } finally {
      setBusy(false);
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
        <span className="hidden truncate lg:inline">{busy ? tr("Connecting to Pi…", "Pi'ye bağlanılıyor…") : user ? tr("Pi Account Verified", "Pi Hesabı Doğrulandı") : tr("Sign in with Pi", "Pi ile giriş yap")}</span>
        <span className="inline truncate lg:hidden">{busy ? tr("Connecting…", "Bağlanıyor…") : user ? tr("Pi Verified", "Pi Doğrulandı") : tr("Sign in with Pi", "Pi ile giriş yap")}</span>
      </button>
      {user ? (
        <span className="min-w-0 break-all text-[10px] text-muted-foreground" aria-live="polite">
          {tr("Verified username:", "Doğrulanan kullanıcı adı:")} @{user.username}
        </span>
      ) : message ? (
        <span className="zaf-pi-status-bubble absolute left-0 top-full z-50 mt-1 block w-[min(86vw,340px)] max-w-[calc(100vw-32px)] break-words whitespace-normal rounded-lg border border-red-500/50 bg-red-50 px-2.5 py-1.5 text-[10px] leading-relaxed text-red-700 shadow-md [overflow-wrap:anywhere] dark:border-red-400/50 dark:bg-red-950 dark:text-red-200" role="status" aria-live="polite">
          {message}
        </span>
      ) : null}
    </div>
  );
}
