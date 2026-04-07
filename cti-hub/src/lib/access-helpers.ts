/**
 * access-helpers — utilities for tier-gated rendering and limit checks.
 *
 * Components ask "does this user have GROWTH access?" via
 * `hasAccess(level, 'GROWTH')` rather than checking
 * `level === 'GROWTH' || level === 'ENTERPRISE' || level === 'OWNER'`.
 *
 * IMPORTANT: never serialize `agentLimit()` return values via
 * JSON.stringify without converting UNLIMITED first — the value is
 * Number.MAX_SAFE_INTEGER (JSON-safe), not Infinity.
 */
import type { AccessLevel } from '@/hooks/useAccessLevel';

/**
 * Effectively unbounded, JSON-safe sentinel for owner-tier limits.
 * Use this instead of `Infinity` because `JSON.stringify(Infinity) === 'null'`,
 * which silently breaks downstream comparisons after any serialization.
 */
export const UNLIMITED = Number.MAX_SAFE_INTEGER;

const TIER_RANK: Record<AccessLevel, number> = {
  OWNER: 100,
  ENTERPRISE: 80,
  GROWTH: 60,
  STARTER: 40,
  PUBLIC: 0,
  LOADING: 0, // fail closed during auth resolution
};

/** Does the user's level meet or exceed the required minimum? */
export function hasAccess(
  userLevel: AccessLevel,
  requiredLevel: AccessLevel,
): boolean {
  // Fail closed during auth resolution — never grant access for LOADING.
  if (userLevel === 'LOADING') return false;
  return TIER_RANK[userLevel] >= TIER_RANK[requiredLevel];
}

/** Is the user specifically the owner? */
export function isOwnerLevel(level: AccessLevel): boolean {
  return level === 'OWNER';
}

/**
 * Can the user see internal infrastructure (Claw-Code, Hermes, internal
 * service names)? Owner only — never expose to customers.
 */
export function canSeeInfra(level: AccessLevel): boolean {
  return level === 'OWNER';
}

/**
 * How many agents does this tier permit?
 *
 * Owner receives `UNLIMITED` (Number.MAX_SAFE_INTEGER), which is
 * JSON-safe — it survives `JSON.stringify` without becoming `null`.
 * Never replace this with `Infinity`.
 */
export function agentLimit(level: AccessLevel): number {
  const limits: Record<AccessLevel, number> = {
    OWNER: UNLIMITED,
    ENTERPRISE: 99,
    GROWTH: 10,
    STARTER: 3,
    PUBLIC: 0,
    LOADING: 0,
  };
  return limits[level];
}
