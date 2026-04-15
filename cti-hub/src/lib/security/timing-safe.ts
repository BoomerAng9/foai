/**
 * Timing-safe token comparison helpers
 * =====================================
 * Constant-time comparison protects against timing-based key probing.
 * Use these in place of `token === expected` or `token !== expected`
 * for any path that gates security (API keys, pipeline keys, webhook
 * secrets, owner tokens).
 */

import { timingSafeEqual as nodeTimingSafeEqual } from 'node:crypto';

/**
 * Constant-time string equality. Returns false on length mismatch
 * without leaking the comparison through timing.
 */
export function timingSafeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  try {
    return nodeTimingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

/**
 * Bearer-token check: pulls the Authorization header, strips the
 * Bearer prefix, and compares against the expected value. Returns
 * `{ ok: true }` on success or `{ ok: false, status, body }` on
 * failure — drop the response into your route handler directly.
 */
export function checkBearerKey(
  request: { headers: { get(name: string): string | null } },
  expected: string,
): { ok: true } | { ok: false; status: number; body: { error: string } } {
  if (!expected) {
    return { ok: false, status: 503, body: { error: 'Service not configured' } };
  }
  const authHeader = request.headers.get('authorization') || '';
  const got = authHeader.replace(/^Bearer\s+/i, '');
  if (!timingSafeEqual(got, expected)) {
    return { ok: false, status: 401, body: { error: 'Unauthorized' } };
  }
  return { ok: true };
}

/**
 * Header-token check: like checkBearerKey but reads a custom header
 * (e.g. `x-pipeline-key`) instead of `Authorization: Bearer`.
 */
export function checkHeaderKey(
  request: { headers: { get(name: string): string | null } },
  headerName: string,
  expected: string,
): { ok: true } | { ok: false; status: number; body: { error: string } } {
  if (!expected) {
    return { ok: false, status: 503, body: { error: 'Service not configured' } };
  }
  const got = request.headers.get(headerName) || '';
  if (!timingSafeEqual(got, expected)) {
    return { ok: false, status: 401, body: { error: 'Unauthorized' } };
  }
  return { ok: true };
}
