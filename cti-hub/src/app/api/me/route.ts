import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { isOwner } from '@/lib/allowlist';

/**
 * GET /api/me — current user status including owner flag.
 * Owner check runs SERVER-SIDE using OWNER_EMAILS env (never
 * exposed to the client). The client calls this once on mount
 * and caches the result for 60 seconds.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  return NextResponse.json(
    {
      userId: auth.userId,
      isOwner: auth.role === 'owner',
      role: auth.role || null,
    },
    {
      headers: { 'Cache-Control': 'private, max-age=60' },
    },
  );
}
