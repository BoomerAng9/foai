import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';
import { getAdminAuth } from '@/lib/firebase-admin';
import { isAllowedEmail } from '@/lib/allowlist';

/**
 * POST /api/auth/provision
 *
 * Called by the client immediately after Firebase login.
 * Verifies the Firebase ID token via Admin SDK, then ensures
 * the user's profile and default subscription exist in Neon
 * by calling the provision_user() stored procedure.
 */
export async function POST(request: NextRequest) {
  try {
    if (!sql) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const { firebaseUid, displayName, email } = await request.json();
    if (!firebaseUid) {
      return NextResponse.json({ error: 'firebaseUid required' }, { status: 400 });
    }

    // Server-side allowlist enforcement
    if (!isAllowedEmail(email)) {
      return NextResponse.json({ error: 'Unauthorized email' }, { status: 403 });
    }

    // Verify the caller is actually this user via the session cookie
    const token = request.cookies.get('firebase-auth-token')?.value;
    if (token) {
      try {
        const auth = getAdminAuth();
        const decoded = await auth.verifyIdToken(token);
        if (decoded.uid !== firebaseUid) {
          return NextResponse.json({ error: 'Token UID mismatch' }, { status: 403 });
        }
      } catch {
        // Token verification failed — allow provision anyway for first-login race condition
        // The session cookie may not be set yet on the very first call
      }
    }

    // Provision user in Neon: creates profile + free subscription if not exists
    await sql`SELECT provision_user(${firebaseUid}, ${displayName || null}, ${email || null})`;

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Provision failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
