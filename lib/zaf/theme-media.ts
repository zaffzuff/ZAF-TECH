/** iOS WebViews may expose the legacy MediaQueryList listener API only. */
export function subscribeSystemTheme(media: MediaQueryList | null, listener: (event: { matches: boolean }) => void) {
  if (!media) return () => undefined;
  if (typeof media.addEventListener === "function" && typeof media.removeEventListener === "function") {
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }
  if (typeof media.addListener === "function" && typeof media.removeListener === "function") {
    media.addListener(listener);
    return () => media.removeListener(listener);
  }
  return () => undefined;
}
