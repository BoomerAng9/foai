import { NextResponse, type NextRequest } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';

const AUTH_COOKIE = 'firebase-auth-token';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 5; // 5 days — standard for Firebase session cookies

/**
 * POST /api/auth/session
 * Body: { idToken: string }
 *
 * Accepts a Firebase ID token from the client (obtained after signInWith…),
 * exchanges it for a longer-lived session cookie via Admin SDK, and sets
 * it as a secure httpOnly cookie.
 */
export async function POST(request: NextRequest) {
  let body: { idToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const idToken = body?.idToken;
  if (typeof idToken !== 'string' || idToken.length < 20) {
    return NextResponse.json({ error: 'idToken required' }, { status: 400 });
  }

  let sessionCookie: string;
  try {
    sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
      expiresIn: MAX_AGE_SECONDS * 1000,
    });
  } catch (err) {
    console.error('[api/auth/session] createSessionCookie failed', err);
    return NextResponse.json({ error: 'invalid idToken' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, sessionCookie, {
    maxAge: MAX_AGE_SECONDS,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  return res;
}

/**
 * DELETE /api/auth/session — sign-out. Clears the cookie.
 */
export async function DELETE(_request: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, '', {
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  return res;
}
