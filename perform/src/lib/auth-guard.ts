import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

const AUTH_COOKIE = 'firebase-auth-token';

export interface AuthResult { ok: true; userId: string; email: string; }
export interface AuthFailure { ok: false; response: NextResponse; }

export async function requireAuth(request: NextRequest): Promise<AuthResult | AuthFailure> {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: 'Auth required' }, { status: 401 }) };
  }
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { ok: true, userId: decoded.uid, email: decoded.email || '' };
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Invalid session' }, { status: 401 }) };
  }
}
