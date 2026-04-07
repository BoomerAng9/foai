/**
 * GET /api/auth/owner-check
 *
 * Lightweight UI personalization endpoint. Returns whether the current
 * authenticated user is on the owner allowlist. The actual paywall
 * enforcement lives server-side in the Stripe checkout routes — this
 * endpoint is for client-side rendering decisions only (e.g., showing
 * the "UNLIMITED BERTH · OWNER CLEARANCE" stamp instead of a tier grid).
 *
 * Anonymous visitors get a graceful { isOwner: false, email: null }
 * response, NOT a 401, because client components call this on mount.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedRequest } from '@/lib/server-auth';
import { isOwner } from '@/lib/allowlist';

export async function GET(request: NextRequest) {
  const authResult = await requireAuthenticatedRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ isOwner: false, email: null });
  }

  const email = authResult.context.user.email ?? null;
  return NextResponse.json({
    isOwner: isOwner(email),
    email,
  });
}
