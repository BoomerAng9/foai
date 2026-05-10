/**
 * Shared auth helper — server-side session verification.
 *
 * Used by every auth-gated route to avoid reimplementing the cookie read
 * + verifySessionCookie dance. Returns the decoded user or a 401-ready
 * response.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';

const AUTH_COOKIE = 'firebase-auth-token';

export interface AuthedUser {
  uid: string;
  email: string | null;
  name: string | null;
  emailVerified: boolean;
}

export type AuthResult =
  | { ok: true; user: AuthedUser }
  | { ok: false; response: NextResponse };

export async function requireUser(request: NextRequest): Promise<AuthResult> {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'authentication required' },
        { status: 401 },
      ),
    };
  }

  try {
    const decoded = await getAdminAuth().verifySessionCookie(token, true);
    return {
      ok: true,
      user: {
        uid: decoded.uid,
        email: decoded.email ?? null,
        name: decoded.name ?? null,
        emailVerified: decoded.email_verified ?? false,
      },
    };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'invalid session' }, { status: 401 }),
    };
  }
}
