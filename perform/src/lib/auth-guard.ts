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

export interface AuthResult { ok: true; userId: string; email: string; }
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
    return { ok: true, userId: decoded.uid, email: decoded.email || '' };
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Invalid session' }, { status: 401 }) };
  }
}
