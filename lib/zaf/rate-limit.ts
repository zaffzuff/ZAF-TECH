type RateLimitConfig = { limit: number; windowMs: number; prefix: string };
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;

function getClientKey(request: Request, prefix: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return prefix + ":" + (forwarded || realIp || "unknown");
}

function pruneExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimit(request: Request, config: RateLimitConfig) {
  const now = Date.now();
  if (buckets.size >= MAX_BUCKETS) pruneExpired(now);
  if (buckets.size >= MAX_BUCKETS) {
    const oldestKey = buckets.keys().next().value;
    if (oldestKey) buckets.delete(oldestKey);
  }

  const key = getClientKey(request, config.prefix);
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: Math.max(config.limit - 1, 0), retryAfterSeconds: 0 };
  }

  current.count += 1;
  if (current.count > config.limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }

  return { allowed: true, remaining: Math.max(config.limit - current.count, 0), retryAfterSeconds: 0 };
}
