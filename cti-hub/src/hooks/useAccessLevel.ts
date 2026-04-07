/**
 * useAccessLevel — canonical permission hook for The Deploy Platform.
 *
 * Returns one of six levels reflecting what the current user can see:
 *   OWNER       — owner allowlist match (bypasses tier enforcement)
 *   ENTERPRISE  — DB tier === 'enterprise'
 *   GROWTH      — DB tier === 'pro' (renamed in app layer only)
 *   STARTER     — DB tier === 'free' (authenticated)
 *   PUBLIC      — no user (unauthenticated visitor)
 *   LOADING     — auth resolution in progress (avoid PUBLIC flicker)
 *
 * Components that gate on a specific level must also handle LOADING —
 * the helpers in `src/lib/access-helpers.ts` treat LOADING as
 * fail-closed (no access granted).
 */
'use client';

import { useAuth } from '@/hooks/useAuth';
import { isOwner } from '@/lib/allowlist';

export type AccessLevel =
  | 'OWNER'
  | 'ENTERPRISE'
  | 'GROWTH'
  | 'STARTER'
  | 'PUBLIC'
  | 'LOADING';

const TIER_TO_ACCESS_LEVEL: Record<string, AccessLevel> = {
  enterprise: 'ENTERPRISE',
  pro: 'GROWTH',
  free: 'STARTER',
};

export function useAccessLevel(): AccessLevel {
  const { user, profile, loading } = useAuth();

  // During auth resolution, return LOADING so consumers can render a
  // skeleton instead of flickering from PUBLIC to the real level.
  if (loading) return 'LOADING';

  // Owner bypass takes absolute priority over tier resolution.
  if (isOwner(user?.email)) return 'OWNER';

  // No user = public visitor.
  if (!user) return 'PUBLIC';

  // Map DB tier to AccessLevel; default authenticated users to STARTER.
  const dbTier = profile?.tier ?? 'free';
  return TIER_TO_ACCESS_LEVEL[dbTier] ?? 'STARTER';
}
