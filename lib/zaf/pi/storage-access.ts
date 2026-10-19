import { requestJson } from "@/lib/zaf/client-request";

export const PI_STORAGE_SETUP_PATH = "/signin/storage";
let blocked = false;
let checking: Promise<boolean> | null = null;

export function isPiStorageContext() {
  return typeof window !== "undefined" && window.parent !== window &&
    (/iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1));
}
export function isPiSessionStorageBlocked() { return blocked; }

/** Probe the same HttpOnly attributes as authentication, without identity. */
export function checkPiStorageAccess(): Promise<boolean> {
  if (checking) return checking;
  checking = (async () => {
    let missing = 0;
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const { response, body } = await requestJson<{ available?: unknown }>("/api/zaf/pi/storage", {
          method: "GET", cache: "no-store", credentials: "same-origin",
        });
        if (!response.ok) break;
        if (body?.available === true) { blocked = false; return true; }
        if (body?.available !== false) break;
        missing++;
      }
    } catch { /* A failed probe cannot establish cookie support. */ }
    if (missing === 2) blocked = true;
    return false;
  })().finally(() => { checking = null; });
  return checking;
}

/** Call directly from a click: awaiting SDK or hasStorageAccess loses iOS activation. */
export function requestPiStorageAccess(): Promise<boolean> {
  try {
    if (typeof document.requestStorageAccess !== "function") return checkPiStorageAccess();
    const permission = document.requestStorageAccess();
    return permission.then(async () => {
      // A pre-grant probe may still be in flight. Never reuse its old result.
      if (checking) await checking;
      return checkPiStorageAccess();
    }, () => false);
  } catch { return Promise.resolve(false); }
}
