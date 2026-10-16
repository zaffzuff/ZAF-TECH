export function observationFreshness(value: string | null | undefined, now = Date.now()) {
  const timestamp = value ? Date.parse(value) : NaN;
  // A future timestamp is not evidence of freshness (allow small clock skew).
  if (!Number.isFinite(timestamp) || timestamp > now + 30_000) {
    return { state: "unknown" as const, ageSeconds: 0, maxAgeSeconds: 120, generatedAt: null };
  }
  const ageSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  return { state: ageSeconds <= 30 ? "fresh" as const : ageSeconds <= 120 ? "aging" as const : "stale" as const, ageSeconds, maxAgeSeconds: 120, generatedAt: value! };
}
