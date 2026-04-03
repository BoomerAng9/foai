import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const AUTH_COOKIE = 'firebase-auth-token';

if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (e) {
    console.warn('[Auth] Firebase Admin init failed:', e);
  }
}

export interface AuthResult { ok: true; userId: string; email: string; }
export interface AuthFailure { ok: false; response: NextResponse; }

export async function requireAuth(request: NextRequest): Promise<AuthResult | AuthFailure> {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: 'Auth required' }, { status: 401 }) };
  }
  try {
    const decoded = await getAuth().verifyIdToken(token);
    return { ok: true, userId: decoded.uid, email: decoded.email || '' };
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Invalid session' }, { status: 401 }) };
  }
}
