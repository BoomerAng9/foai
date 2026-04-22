import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';

/**
 * POST /api/auth/logout — clears the Per|Form session cookie and revokes
 * all Firebase refresh tokens for the current user (SHIP-CHECKLIST Gate 2).
 *
 * Token revocation is best-effort: if the cookie is missing or the token
 * decode fails, we still clear the cookie and return 200. That keeps this
 * endpoint safe to call from any state (even after the cookie TTL expired)
 * and preserves the "logout always succeeds" UX invariant.
 */

const AUTH_COOKIE = 'firebase-auth-token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  if (token) {
    try {
      const decoded = await getAdminAuth().verifyIdToken(token).catch(() => null);
      if (decoded?.uid) {
        await getAdminAuth().revokeRefreshTokens(decoded.uid).catch(() => {
          // Non-fatal — the session cookie is still cleared below.
        });
      }
    } catch {
      // Admin SDK unreachable or credentials missing — still clear the cookie.
    }
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  return res;
}
