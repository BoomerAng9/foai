import { NextResponse, type NextRequest } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';

const AUTH_COOKIE = 'firebase-auth-token';

/**
 * GET /api/auth/verify
 *
 * Reads the session cookie, verifies it, and returns the authenticated user
 * claims. Used by client components to gate UI and by server components to
 * identify the caller. Returns 401 when no valid session.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const decoded = await getAdminAuth().verifySessionCookie(token, true);
    return NextResponse.json({
      authenticated: true,
      user: {
        uid: decoded.uid,
        email: decoded.email ?? null,
        name: decoded.name ?? null,
        picture: decoded.picture ?? null,
        emailVerified: decoded.email_verified ?? false,
      },
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
