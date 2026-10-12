"use client";

import { useState } from "react";
import type { Locale } from "@/lib/zaf/i18n";
import { translate } from "@/lib/zaf/i18n";

type VerifiedPiUser = { username: string };

type PiAuthResult = {
  accessToken: string;
  user?: { username?: string; uid?: string };
};

type PiSdk = {
  init: (options: { version: "2.0"; sandbox: boolean }) => void;
  authenticate: (
    scopes: string[],
    onIncompletePaymentFound?: (payment: unknown) => void,
  ) => Promise<PiAuthResult>;
};

declare global {
  interface Window {
    Pi?: PiSdk;
  }
}

let sdkLoadPromise: Promise<void> | null = null;
let initializedSandboxMode: boolean | null = null;

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

function loadPiSdk() {
  if (typeof window !== "undefined" && window.Pi) return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://sdk.minepi.com/pi-sdk.js";
    script.async = true;
    script.onload = () => {
      if (window.Pi) resolve();
      else {
        sdkLoadPromise = null;
        reject(new Error("Pi SDK did not initialize."));
      }
    };
    script.onerror = () => {
      sdkLoadPromise = null;
      reject(new Error("Pi SDK could not be loaded."));
    };
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

function initializePiSdk() {
  const pi = window.Pi;
  if (!pi) throw new Error("Pi SDK is unavailable.");

  // Sandbox mode is determined by Pi's Sandbox host, not by the registered
  // blockchain network. A hosted Testnet app may correctly use sandbox:false.
  const configuredMode = process.env.NEXT_PUBLIC_PI_SDK_MODE?.trim().toLowerCase();
  const sandbox = configuredMode
    ? configuredMode === "sandbox"
    : window.location.hostname === "sandbox.minepi.com";
  if (initializedSandboxMode !== sandbox) {
    pi.init({ version: "2.0", sandbox });
    initializedSandboxMode = sandbox;
  }
  return pi;
}

export function ZafPiSignIn({ locale }: { locale: Locale }) {
  const [user, setUser] = useState<VerifiedPiUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const tr = (en: string, trText: string) => translate(locale, en, trText);

  async function signIn() {
    if (busy) return;
    setBusy(true);
    setMessage("");

    let verificationStarted = false;
    try {
      await withTimeout(
        loadPiSdk(),
        12_000,
        "Pi SDK loading timed out.",
      );
      const pi = initializePiSdk();
      const auth = await withTimeout(
        pi.authenticate(["username"], () => undefined),
        25_000,
        "Pi authentication timed out.",
      );
      if (!auth?.accessToken || typeof auth.accessToken !== "string") {
        throw new Error("Pi did not return an access token.");
      }

      verificationStarted = true;
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
      setMessage(tr("Pi account verified.", "Pi hesabı doğrulandı."));
    } catch {
      setUser(null);
      setMessage(
        verificationStarted
          ? tr("Pi sign-in could not be verified. Please try again.", "Pi girişi doğrulanamadı. Lütfen tekrar dene.")
          : tr("Open ZAF Tech inside Pi Browser and try again.", "ZAF TECH'i Pi Browser içinde açıp tekrar dene."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-testid="zaf-pi-sign-in" className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void signIn()}
        disabled={busy}
        className="inline-flex max-w-full items-center gap-2 rounded-lg border border-ty-active/40 bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-wait disabled:opacity-60"
        aria-label={tr("Sign in with Pi", "Pi ile giriş yap")}
      >
        <span aria-hidden="true" className="text-sm font-bold">π</span>
        <span>{busy ? tr("Connecting to Pi…", "Pi'ye bağlanılıyor…") : user ? tr("Pi Account Verified", "Pi Hesabı Doğrulandı") : tr("Sign in with Pi", "Pi ile giriş yap")}</span>
      </button>
      {user ? (
        <span className="min-w-0 break-all text-[10px] text-muted-foreground" aria-live="polite">
          {tr("Verified username:", "Doğrulanan kullanıcı adı:")} @{user.username}
        </span>
      ) : message ? (
        <span className="min-w-0 text-[10px] leading-relaxed text-muted-foreground" role="status" aria-live="polite">
          {message}
        </span>
      ) : null}
    </div>
  );
}
