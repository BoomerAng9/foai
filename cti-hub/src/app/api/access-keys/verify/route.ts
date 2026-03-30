import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/insforge';
import { isOwner } from '@/lib/allowlist';

/**
 * GET /api/access-keys/verify?email=... — Check if an email is allowed.
 * Called by the auth provider after Firebase login.
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ allowed: false });

  // Owners always pass
  if (isOwner(email)) {
    return NextResponse.json({ allowed: true, role: 'owner' });
  }

  if (!sql) {
    // No database — only owners can access
    return NextResponse.json({ allowed: false });
  }

  // Check allowed_users table
  const rows = await sql`
    SELECT email, is_active, role FROM allowed_users WHERE email = ${email.toLowerCase()} LIMIT 1
  `;

  if (rows.length > 0 && rows[0].is_active) {
    return NextResponse.json({ allowed: true, role: rows[0].role || 'member' });
  }

  return NextResponse.json({ allowed: false });
}
