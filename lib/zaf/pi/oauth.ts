export const PI_SIGNIN_STATE_KEY = "zaf-pi-signin-state-v1";
export const PI_SIGNIN_RETURN_TO_KEY = "zaf-pi-signin-return-to-v1";
export const PI_SIGNIN_VERIFIED_USERNAME_KEY = "zaf-pi-verified-username-v1";

export function getSafePiSignInReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/signin/callback")) {
    return "/?section=overview&subtab=Pulse";
  }
  return value;
}
