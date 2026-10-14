/** A bounded JSON request that also works in older mobile WebViews. */
export async function requestJson<T>(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 15_000): Promise<{ response: Response; body: T }> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (init.signal?.aborted) cancel();
  init.signal?.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(cancel, timeoutMs);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    const body = await response.json() as T;
    return { response, body };
  } finally {
    clearTimeout(timeout);
    init.signal?.removeEventListener("abort", cancel);
  }
}
