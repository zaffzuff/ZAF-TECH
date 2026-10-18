import { requestJson } from "@/lib/zaf/client-request";
import { clearPiDisplay, getPiDisplayRevision, isPiSignInBusy, markPiDisplayUnconfirmed, savePiDisplay } from "./oauth";

let pending: Promise<void> | null = null;

/** Restore only the server's current cookie identity, shared by both headers. */
export function refreshPiSession(): Promise<void> {
  if (isPiSignInBusy()) return Promise.resolve();
  if (pending) return pending;
  const revision = getPiDisplayRevision();
  const stillCurrent = () => !isPiSignInBusy() && getPiDisplayRevision() === revision;
  pending = (async () => {
    try {
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
