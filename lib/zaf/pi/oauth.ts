export const PI_SIGNIN_STATE_KEY = "zaf-pi-signin-state-v1";
export const PI_SIGNIN_STARTED_KEY = "zaf-pi-signin-started-v1";
export const PI_OAUTH_MAX_AGE_MS = 10 * 60_000;
export const PI_SIGNIN_RETURN_TO_KEY = "zaf-pi-signin-return-to-v1";
export const PI_SIGNIN_VERIFIED_USERNAME_KEY = "zaf-pi-verified-username-v1";
export const PI_DISPLAY_CHANGE_EVENT = "zaf-pi-display-change";
export const PI_DISPLAY_MAX_AGE_MS = 30 * 60_000;
export type PiDisplay = { username: string; verifiedAt: number; current: boolean };
let currentDisplay: PiDisplay | null = null;
let busy = false;

export function isPiSignInBusy() { return busy; }
export function acquirePiSignIn() {
  if (busy) return false;
  busy = true; notifyPiDisplayChange(); return true;
}
export function releasePiSignIn() { busy = false; notifyPiDisplayChange(); }

export function readPiDisplay(now = Date.now()): PiDisplay | null {
  let display = currentDisplay;
  if (!display) {
    try { display = JSON.parse(sessionStorage.getItem(PI_SIGNIN_VERIFIED_USERNAME_KEY) || "null"); } catch { return null; }
  }
  if (!display || typeof display.username !== "string" || !/^[^\s\x00-\x1f\x7f]{1,100}$/.test(display.username) ||
      !Number.isFinite(display.verifiedAt) || display.verifiedAt > now || now - display.verifiedAt >= PI_DISPLAY_MAX_AGE_MS) {
    currentDisplay = null;
    try { sessionStorage.removeItem(PI_SIGNIN_VERIFIED_USERNAME_KEY); } catch { /* Optional display only. */ }
    return null;
  }
  return { username: display.username, verifiedAt: display.verifiedAt, current: currentDisplay !== null };
}

export function savePiDisplay(username: string) {
  if (!/^[^\s\x00-\x1f\x7f]{1,100}$/.test(username)) throw new Error("Invalid Pi username.");
  currentDisplay = { username, verifiedAt: Date.now(), current: true };
  try { sessionStorage.setItem(PI_SIGNIN_VERIFIED_USERNAME_KEY, JSON.stringify({ username, verifiedAt: currentDisplay.verifiedAt })); } catch { /* Keep in-memory display usable. */ }
  notifyPiDisplayChange();
}

export function isPiOAuthStateFresh(started: string | null, now = Date.now()) {
  const at = Number(started);
  return Boolean(started) && Number.isFinite(at) && at > 0 && at <= now && now - at <= PI_OAUTH_MAX_AGE_MS;
}

export function notifyPiDisplayChange() {
  if (typeof window.dispatchEvent === "function") window.dispatchEvent(new Event(PI_DISPLAY_CHANGE_EVENT));
}

/** Clear this application's presentation state; never claim to revoke Pi's session. */
export function clearPiDisplay() {
  currentDisplay = null;
  for (const key of [PI_SIGNIN_VERIFIED_USERNAME_KEY, PI_SIGNIN_STATE_KEY, PI_SIGNIN_RETURN_TO_KEY, PI_SIGNIN_STARTED_KEY]) {
    try { sessionStorage.removeItem(key); } catch { /* Current view can still clear. */ }
  }
  notifyPiDisplayChange();
}

export function getSafePiSignInReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || /[\\\x00-\x20]/.test(value) || value.startsWith("//")) {
    return "/?section=overview&subtab=Pulse";
  }
  try {
    const origin = "https://zaf-tech.invalid";
    const target = new URL(value, origin);
    const decodedPath = decodeURIComponent(target.pathname);
    if (target.origin !== origin || decodedPath.startsWith("//") || /[\\\x00-\x20]/.test(decodedPath) || decodedPath.startsWith("/signin/callback")) return "/?section=overview&subtab=Pulse";
    return target.pathname + target.search;
  } catch { return "/?section=overview&subtab=Pulse"; }
}
