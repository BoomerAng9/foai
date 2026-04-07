/**
 * server-access-level — server-side equivalent of the useAccessLevel hook.
 *
 * Two helpers because Next.js App Router has two server contexts:
 *
 *   getAccessLevelFromRequest(req) — for API routes (NextRequest available)
 *   getAccessLevelFromHeaders()    — for Server Components (read cookie via next/headers)
 *
 * The two helpers cannot share a single signature because Server
 * Components do not receive a NextRequest object. They use `next/headers`
 * to read cookies directly.
 *
 * Note on Server Component tier accuracy: getAccessLevelFromHeaders()
 * currently returns 'STARTER' as a safe default for authenticated
 * non-owner users instead of looking up profile.tier. This is because
 * loadProfile() is private inside server-auth.ts. If Server Components
 * need tier-accurate gating, export loadProfile(userId) from server-auth.ts
 * as a follow-up and replace the STARTER default with the real tier
 * mapping below.
 */
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { requireAuthenticatedRequest } from '@/lib/server-auth';
import { getAdminAuth } from '@/lib/firebase-admin';
import { isOwner } from '@/lib/allowlist';
import type { AccessLevel } from '@/hooks/useAccessLevel';

const TIER_TO_ACCESS_LEVEL: Record<string, AccessLevel> = {
  enterprise: 'ENTERPRISE',
  pro: 'GROWTH',
  free: 'STARTER',
};

/** Use in API routes (NextRequest available). */
export async function getAccessLevelFromRequest(
  request: NextRequest,
): Promise<AccessLevel> {
  const authResult = await requireAuthenticatedRequest(request);
  if (!authResult.ok) return 'PUBLIC';

  if (isOwner(authResult.context.user.email)) return 'OWNER';

  const tier = authResult.context.profile?.tier ?? 'free';
  return TIER_TO_ACCESS_LEVEL[tier] ?? 'STARTER';
}

/** Use in Server Components (no NextRequest — reads cookie via next/headers). */
export async function getAccessLevelFromHeaders(): Promise<AccessLevel> {
  const cookieStore = await cookies();
  const token = cookieStore.get('firebase-auth-token')?.value;
  if (!token) return 'PUBLIC';

  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    const email = decoded.email ?? null;

    if (isOwner(email)) return 'OWNER';

    // Safe default for authenticated non-owners until loadProfile() is
    // exposed from server-auth.ts. See file header note.
    return 'STARTER';
  } catch {
    return 'PUBLIC';
  }
}
