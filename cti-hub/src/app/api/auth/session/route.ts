import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

const COOKIE_NAME = 'firebase-auth-token';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function buildCookieResponse() {
  return NextResponse.json(
    { ok: true },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';

    if (!accessToken) {
      return NextResponse.json({ error: 'accessToken is required.' }, { status: 400 });
    }

    // Verify the token is a valid Firebase ID token before persisting it
    try {
      const adminAuth = getAdminAuth();
      await adminAuth.verifyIdToken(accessToken);
    } catch (err) {
      console.error('[Session] Token verification failed:', err instanceof Error ? err.message : err);
      return NextResponse.json({ error: 'Invalid Firebase token.' }, { status: 401 });
    }

    const response = buildCookieResponse();
    response.cookies.set({
      name: COOKIE_NAME,
      value: accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to persist session.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const response = buildCookieResponse();
  response.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
