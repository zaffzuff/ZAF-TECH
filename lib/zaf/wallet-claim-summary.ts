/** Classify only explicit claimant conditions; never reconstruct private lockups. */
export function summarizeClaimConditions(items: unknown, observedAt: string | null | undefined): { lockedPi: number; claimableNowPi: number } | null {
  if (!Array.isArray(items) || !items.length) return null;
  const timestamp = Date.parse(observedAt ?? "");
  if (!Number.isFinite(timestamp)) return null;
  let lockedPi = 0, claimableNowPi = 0;
  for (const item of items) {
    if (!item || typeof item !== "object" || typeof item.amountPi !== "number" || !Number.isFinite(item.amountPi) || item.amountPi < 0) return null;
    if (item.canClaimNow === true) claimableNowPi += item.amountPi;
    else if (item.canClaimNow === false && typeof item.unlockAt === "string" && Date.parse(item.unlockAt) > timestamp) lockedPi += item.amountPi;
    else return null; // Expired deadlines and unknown predicates are not time locks.
  }
  return { lockedPi, claimableNowPi };
}
