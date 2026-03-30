import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';
import { getAdminAuth } from '@/lib/firebase-admin';

/**
 * POST /api/access-keys/redeem — Redeem an access key after Firebase login.
 * Links the Firebase email to the key, granting access.
 */
export async function POST(request: NextRequest) {
  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const token = request.cookies.get('firebase-auth-token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Must be signed in to redeem' }, { status: 401 });
  }

  let email: string;
  let displayName: string;
  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    email = decoded.email || '';
    displayName = decoded.name || email.split('@')[0];
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const { key } = await request.json();
  if (!key || typeof key !== 'string') {
    return NextResponse.json({ error: 'Access key required' }, { status: 400 });
  }

  // Validate key exists and is active
  const keys = await sql`
    SELECT key, label, is_active, redeemed_by FROM access_keys WHERE key = ${key}
  `;

  if (keys.length === 0) {
    return NextResponse.json({ error: 'Invalid access key' }, { status: 404 });
  }

  const accessKey = keys[0];
  if (!accessKey.is_active) {
    return NextResponse.json({ error: 'This key has been revoked' }, { status: 403 });
  }

  if (accessKey.redeemed_by && accessKey.redeemed_by !== email) {
    return NextResponse.json({ error: 'This key has already been redeemed by another user' }, { status: 409 });
  }

  // Redeem: mark key as used, add user to allowed_users
  await sql`
    UPDATE access_keys SET redeemed_by = ${email}, redeemed_at = NOW() WHERE key = ${key}
  `;

  await sql`
    INSERT INTO allowed_users (email, display_name, access_key, granted_at, is_active, role)
    VALUES (${email}, ${displayName}, ${key}, NOW(), true, 'beta-tester')
    ON CONFLICT (email) DO UPDATE SET
      access_key = ${key}, display_name = ${displayName}, is_active = true, granted_at = NOW(), role = 'beta-tester'
  `;

  return NextResponse.json({ ok: true, email, label: accessKey.label });
}
