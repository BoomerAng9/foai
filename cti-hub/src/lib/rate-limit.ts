import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const globalRateLimitStore = globalThis as typeof globalThis & {
  __grammarRateLimitStore?: Map<string, RateLimitEntry>;
};

const rateLimitStore = globalRateLimitStore.__grammarRateLimitStore ?? new Map<string, RateLimitEntry>();
globalRateLimitStore.__grammarRateLimitStore = rateLimitStore;

function getClientKey(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }

  return request.headers.get('x-real-ip') || 'unknown';
}

export function applyRateLimit(
  request: NextRequest,
  bucket: string,
  options: {
    maxRequests: number;
    windowMs: number;
    subject?: string;
  },
) {
  const subject = options.subject || getClientKey(request);
  const now = Date.now();
  const key = `${bucket}:${subject}`;
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return null;
  }

  if (current.count >= options.maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Please slow down and try again shortly.',
        retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
        },
      },
    );
  }

  current.count += 1;
  rateLimitStore.set(key, current);
  return null;
}
