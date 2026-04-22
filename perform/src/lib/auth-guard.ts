import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getAdminAuth } from '@/lib/firebase/admin';

const AUTH_COOKIE = 'firebase-auth-token';

/** Timing-safe string comparison — constant-time even on length mismatch. */
export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export interface AuthResult { ok: true; userId: string; email: string; emailVerified: boolean; }
export interface AuthFailure { ok: false; response: NextResponse; }

/** Owner emails — unlimited access, auto-LFG, never prompted to pay. */
const OWNER_EMAILS: ReadonlySet<string> = new Set([
  'jarrett.risher@gmail.com',
  'bpo@achievemor.io',
]);

export function isOwnerEmail(email: string): boolean {
  return OWNER_EMAILS.has(email.toLowerCase());
}

export async function requireAuth(request: NextRequest): Promise<AuthResult | AuthFailure> {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: 'Auth required' }, { status: 401 }) };
  }
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return {
      ok: true,
      userId: decoded.uid,
      email: decoded.email || '',
      emailVerified: decoded.email_verified ?? false,
    };
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Invalid session' }, { status: 401 }) };
  }
}

/**
 * Stronger guard for paid actions (SHIP-CHECKLIST Gate 2 · Item 13).
 * Requires a valid session AND a verified email. Owner emails bypass
 * verification — they're trusted by construction.
 *
 * Returns a structured 403 with `code: 'email_unverified'` so the client
 * UI can render a resend-verification CTA instead of a generic error.
 */
export async function requireVerifiedEmail(
  request: NextRequest,
): Promise<AuthResult | AuthFailure> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth;

  if (isOwnerEmail(auth.email)) return auth;

  if (!auth.emailVerified) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Verify your email before completing purchases',
          code: 'email_unverified',
          cta: {
            label: 'Resend verification email',
            target: '/dashboard?verify=1',
          },
        },
        { status: 403 },
      ),
    };
  }

  return auth;
}
