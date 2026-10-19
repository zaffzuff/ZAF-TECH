import { requestJson } from "@/lib/zaf/client-request";
import { clearPiDisplay, getPiDisplayRevision, isPiSignInBusy, markPiDisplayUnconfirmed, savePiDisplay } from "./oauth";
import { checkPiStorageAccess, isPiStorageContext } from "./storage-access";

let pending: Promise<void> | null = null;

/** Restore only the server's current cookie identity, shared by both headers. */
export function refreshPiSession(): Promise<void> {
  if (isPiSignInBusy()) return Promise.resolve();
  if (pending) return pending;
  const revision = getPiDisplayRevision();
  const stillCurrent = () => !isPiSignInBusy() && getPiDisplayRevision() === revision;
  pending = (async () => {
    try {
      // On older iOS, permission is per page. A blocked cookie is not a logout.
      // Keep a historical name only; a user gesture must restore real access.
      if (isPiStorageContext() && !await checkPiStorageAccess()) {
        if (stillCurrent()) markPiDisplayUnconfirmed();
        return;
      }
      const { response, body } = await requestJson<{ user?: { username?: unknown } | null }>("/api/zaf/pi/session", {
        method: "GET", cache: "no-store", credentials: "same-origin",
      });
      // A late restoration must never replace a newer sign-in or sign-out.
      if (!stillCurrent()) return;
      if (!response.ok) { markPiDisplayUnconfirmed(); return; }
      if (body?.user === null) { clearPiDisplay(); return; }
      const username = body?.user?.username;
      if (typeof username !== "string" || !/^[^\s\x00-\x1f\x7f]{1,100}$/.test(username)) {
        markPiDisplayUnconfirmed(); return;
      }
      savePiDisplay(username);
    } catch {
      if (stillCurrent()) markPiDisplayUnconfirmed();
    }
  })().finally(() => { pending = null; });
  return pending;
}

/** Confirm the HttpOnly cookie round-trip before presenting a successful login. */
export async function confirmPiSession(expectedUsername?: string): Promise<string | null> {
  const { response, body } = await requestJson<{ user?: { username?: unknown } | null }>("/api/zaf/pi/session", {
    method: "GET", cache: "no-store", credentials: "same-origin",
  });
  const username = body?.user?.username;
  return response.ok && typeof username === "string" && /^[^\s\x00-\x1f\x7f]{1,100}$/.test(username) &&
    (expectedUsername === undefined || username === expectedUsername) ? username : null;
}

export async function confirmPiSignOut(): Promise<boolean> {
  const { response, body } = await requestJson<{ user?: unknown }>("/api/zaf/pi/session", {
    method: "GET", cache: "no-store", credentials: "same-origin",
  });
  return response.ok && body?.user === null;
}
