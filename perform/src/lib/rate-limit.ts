/**
 * Simple in-memory rate limiter using a sliding-window counter per IP.
 *
 * Not suitable for multi-instance deployments — replace with @upstash/ratelimit
 * or a Redis-backed solution when scaling horizontally.
 */

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, TokenBucket>();

/** Evict stale entries every 5 minutes to prevent unbounded memory growth. */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.lastRefill > windowMs * 2) {
      buckets.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

/**
 * Check whether a request from `ip` is within the rate limit.
 *
 * @param ip       — Client IP address (or other unique key)
 * @param maxReqs  — Maximum requests allowed per window (default 100)
 * @param windowMs — Window duration in milliseconds (default 60 000 = 1 minute)
 */
export function rateLimit(
  ip: string,
  maxReqs = 100,
  windowMs = 60_000,
): RateLimitResult {
  cleanup(windowMs);

  const now = Date.now();
  let bucket = buckets.get(ip);

  if (!bucket) {
    bucket = { tokens: maxReqs - 1, lastRefill: now };
    buckets.set(ip, bucket);
    return { allowed: true, remaining: bucket.tokens, resetMs: windowMs };
  }

  // Refill tokens proportionally to elapsed time
  const elapsed = now - bucket.lastRefill;
  if (elapsed >= windowMs) {
    // Full refill
    bucket.tokens = maxReqs - 1;
    bucket.lastRefill = now;
    return { allowed: true, remaining: bucket.tokens, resetMs: windowMs };
  }

  if (bucket.tokens > 0) {
    bucket.tokens--;
    return { allowed: true, remaining: bucket.tokens, resetMs: windowMs - elapsed };
  }

  // Rate limited
  return { allowed: false, remaining: 0, resetMs: windowMs - elapsed };
}
