export const PI_SIGNIN_STATE_KEY = "zaf-pi-signin-state-v1";
export const PI_SIGNIN_RETURN_TO_KEY = "zaf-pi-signin-return-to-v1";
export const PI_SIGNIN_VERIFIED_USERNAME_KEY = "zaf-pi-verified-username-v1";

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
