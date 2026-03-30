const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(userId: string, maxRequests: number = 30, windowMs: number = 60000): boolean {
  const now = Date.now();
  const entry = store.get(userId);

  if (!entry || now > entry.resetAt) {
    store.set(userId, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }

  if (entry.count >= maxRequests) {
    return false; // blocked
  }

  entry.count++;

  // Periodic cleanup of expired entries
  if (store.size > 1000) {
    const now2 = Date.now();
    for (const [key, entry] of store) {
      if (now2 > entry.resetAt) store.delete(key);
    }
  }

  return true; // allowed
}
