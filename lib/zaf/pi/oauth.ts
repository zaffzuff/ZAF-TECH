export const PI_SIGNIN_STATE_KEY = "zaf-pi-signin-state-v1";
export const PI_SIGNIN_RETURN_TO_KEY = "zaf-pi-signin-return-to-v1";
export const PI_SIGNIN_VERIFIED_USERNAME_KEY = "zaf-pi-verified-username-v1";
export const PI_DISPLAY_CHANGE_EVENT = "zaf-pi-display-change";

export function notifyPiDisplayChange() {
  if (typeof window.dispatchEvent === "function") window.dispatchEvent(new Event(PI_DISPLAY_CHANGE_EVENT));
}

/** Clear this application's presentation state; never claim to revoke Pi's session. */
export function clearPiDisplay() {
  for (const key of [PI_SIGNIN_VERIFIED_USERNAME_KEY, PI_SIGNIN_STATE_KEY, PI_SIGNIN_RETURN_TO_KEY]) {
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
