export type PiAuthResult = { accessToken: string; user?: { username?: string; uid?: string } };
export type PiSdk = {
  init: (options: { version: "2.0"; sandbox: boolean }) => Promise<unknown> | void;
  authenticate: (scopes: string[], onIncompletePaymentFound?: (payment: unknown) => void) => Promise<PiAuthResult>;
  getPiHostAppInfo?: () => Promise<{ hostApp?: string }>;
};

declare global { interface Window { Pi?: PiSdk } }

let loading: Promise<void> | null = null;
let initializing: Promise<PiSdk> | null = null;
let initializedMode: boolean | null = null;
let reloadRequired = false;

export function piReloadRequired() { return reloadRequired; }

export function withPiTimeout<T>(promise: Promise<T>, ms: number, message: string, onTimeout?: () => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => { onTimeout?.(); reject(new Error(message)); }, ms);
    promise.then(value => { window.clearTimeout(timer); resolve(value); }, error => { window.clearTimeout(timer); reject(error); });
  });
}

export function loadPiSdk(): Promise<void> {
  if (reloadRequired) return Promise.reject(new Error("Reload ZAF Tech to retry Pi SDK loading."));
  if (window.Pi) return Promise.resolve();
  if (loading) return loading;
  const script = document.createElement("script");
  script.src = "https://sdk.minepi.com/pi-sdk.js";
  script.async = true;
  const pending = new Promise<void>((resolve, reject) => {
    script.onload = () => window.Pi ? resolve() : reject(new Error("Pi SDK did not initialize."));
    script.onerror = () => reject(new Error("Pi SDK could not be loaded."));
    document.head.appendChild(script);
  });
  loading = withPiTimeout(pending, 12_000, "Pi SDK loading timed out.", () => {
    // Removing a script cannot guarantee cancellation after execution has begun.
    // Retry in a fresh document rather than race another SDK global instance.
    reloadRequired = true;
    script.onload = null; script.onerror = null; script.remove();
  }).catch(error => { loading = null; throw error; });
  return loading;
}

export function isPiSandboxRoute() {
  return process.env.NEXT_PUBLIC_PI_SANDBOX_ROUTE === "enabled" &&
    typeof window !== "undefined" && /^\/sandbox\/?$/.test(window.location.pathname);
}

export function initializePiSdk(): Promise<PiSdk> {
  if (reloadRequired) return Promise.reject(new Error("Reload ZAF Tech to retry Pi SDK initialization."));
  const pi = window.Pi;
  if (!pi) return Promise.reject(new Error("Pi SDK is unavailable."));
  const sandbox = isPiSandboxRoute() || process.env.NEXT_PUBLIC_PI_SDK_MODE?.trim().toLowerCase() === "sandbox";
  if (initializedMode === sandbox) return Promise.resolve(pi);
  if (initializing) return initializing;
  const pending = Promise.resolve().then(() => pi.init({ version: "2.0", sandbox }));
  initializing = withPiTimeout(pending, 12_000, "Pi SDK initialization timed out.", () => { reloadRequired = true; })
    .then(() => { initializedMode = sandbox; return pi; })
    .catch(error => { initializing = null; throw error; });
  return initializing;
}

export function authenticatePi(pi: PiSdk) {
  // No documented SDK cancellation API: a timed-out permission prompt requires
  // a fresh document before retry, so late credentials can never update this UI.
  return withPiTimeout(pi.authenticate(["username"], () => undefined), 45_000,
    "Pi Browser did not respond to the sign-in request within 45 seconds.", () => { reloadRequired = true; });
}
