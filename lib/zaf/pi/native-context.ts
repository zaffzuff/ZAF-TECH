// Fixed App Studio entry; never accept a destination from URL parameters.
export const ZAF_PI_APP_URL = "https://zaftechpu0455.pinet.com";

export function isPiBrowserUserAgent() {
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes("pibrowser") || userAgent.includes("pi-browser") || userAgent.includes("pi browser");
}

/** The SDK's native consent bridge needs a parent shell; init alone does not. */
export function isDirectPiBrowserEntry() {
  return isPiBrowserUserAgent() && window.parent === window;
}
