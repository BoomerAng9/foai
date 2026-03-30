/**
 * Auth guard — single entry point for all API route authentication.
 *
 * Usage in any route:
 *   const auth = await requireAuth(request);
 *   if (!auth.ok) return auth.response;
 *   // auth.userId, auth.email, auth.role are available
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { isOwner } from '@/lib/allowlist';
import { sql } from '@/lib/insforge';

const AUTH_COOKIE = 'firebase-auth-token';

export interface AuthResult {
  ok: true;
  userId: string;
  email: string;
  role: 'owner' | 'beta-tester' | 'member';
}

export interface AuthFailure {
  ok: false;
  response: NextResponse;
}

export async function requireAuth(
  request: NextRequest,
): Promise<AuthResult | AuthFailure> {
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 },
      ),
    };
  }

  let uid: string;
  let email: string;

  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email || '';
  } catch (err) {
    console.error('[Auth] Token verification failed:', err instanceof Error ? err.message : err);
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Invalid or expired session', code: 'AUTH_INVALID' },
        { status: 401 },
      ),
    };
  }

  // Owner check — always passes
  if (isOwner(email)) {
    return { ok: true, userId: uid, email, role: 'owner' };
  }

  // Check allowed_users table
  if (!sql) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Service temporarily unavailable', code: 'DB_UNAVAILABLE' },
        { status: 503 },
      ),
    };
  }

  try {
    const rows = await sql`
      SELECT role FROM allowed_users
      WHERE email = ${email.toLowerCase()} AND is_active = true
      LIMIT 1
    `;

    if (rows.length === 0) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Access denied. Contact admin for an invitation.', code: 'ACCESS_DENIED' },
          { status: 403 },
        ),
      };
    }

    const role = (rows[0].role as 'beta-tester' | 'member') || 'member';
    return { ok: true, userId: uid, email, role };
  } catch (err) {
    console.error('[Auth] Allowlist check failed:', err instanceof Error ? err.message : err);
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Authentication service error', code: 'AUTH_ERROR' },
        { status: 500 },
      ),
    };
  }
}
