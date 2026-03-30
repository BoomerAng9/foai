import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';
import { isOwner, generateAccessKey } from '@/lib/allowlist';
import { getAdminAuth } from '@/lib/firebase-admin';

/**
 * POST /api/access-keys — Generate a new access key (owner only)
 * GET  /api/access-keys — List all keys + allowed users (owner only)
 * DELETE /api/access-keys?key=CTI-XXXX — Revoke a key (owner only)
 */

async function getCallerEmail(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('firebase-auth-token')?.value;
  if (!token) return null;
  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    return decoded.email || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const email = await getCallerEmail(request);
  if (!isOwner(email)) {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }

  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const label = body.label || 'Beta Test Invite';
  const count = Math.min(Math.max(body.count || 1, 1), 50); // 1-50 keys at a time

  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    const key = generateAccessKey();
    await sql`
      INSERT INTO access_keys (key, label, created_by, created_at, is_active)
      VALUES (${key}, ${label}, ${email}, NOW(), true)
    `;
    keys.push(key);
  }

  const baseUrl = request.headers.get('origin') || 'https://cti.foai.cloud';
  const links = keys.map(k => ({ key: k, url: `${baseUrl}/auth/redeem?key=${k}` }));

  return NextResponse.json({ keys: links, label, count });
}

export async function GET(request: NextRequest) {
  const email = await getCallerEmail(request);
  if (!isOwner(email)) {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }

  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const keys = await sql`
    SELECT key, label, created_by, created_at, is_active, redeemed_by, redeemed_at
    FROM access_keys ORDER BY created_at DESC
  `;

  const users = await sql`
    SELECT email, display_name, access_key, granted_at, is_active
    FROM allowed_users ORDER BY granted_at DESC
  `;

  return NextResponse.json({ keys, users });
}

export async function DELETE(request: NextRequest) {
  const email = await getCallerEmail(request);
  if (!isOwner(email)) {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }

  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const key = request.nextUrl.searchParams.get('key');
  if (!key) return NextResponse.json({ error: 'key param required' }, { status: 400 });

  // Deactivate key and revoke user access
  await sql`UPDATE access_keys SET is_active = false WHERE key = ${key}`;
  await sql`UPDATE allowed_users SET is_active = false WHERE access_key = ${key}`;

  return NextResponse.json({ revoked: key });
}
