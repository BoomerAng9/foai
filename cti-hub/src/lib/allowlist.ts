/**
 * Access Key System — owner controls who can use The Deploy Platform.
 *
 * ACHEEVY generates access keys. Team members redeem them at /auth/redeem.
 * Redeemed keys link a Firebase email to the system.
 * Owner emails are always allowed without a key.
 *
 * Storage: Firestore collection `access_keys` and `allowed_users`.
 * Fallback: hardcoded owner emails always pass.
 */

// Owner emails — always allowed, no key needed
const OWNER_EMAILS = [
  'bpo@achievemor.io',
  'jarrett.risher@gmail.com',
];

export function isOwner(email: string | null | undefined): boolean {
  if (!email) return false;
  return OWNER_EMAILS.includes(email.toLowerCase());
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  // Owners always pass
  if (isOwner(email)) return true;
  // For non-owners, the /api/auth/verify-access endpoint checks Firestore
  // This client-side check is a fast path — server enforces the real gate
  return false;
}

// Access key format: CTI-XXXX-XXXX-XXXX
export function generateAccessKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `CTI-${segment()}-${segment()}-${segment()}`;
}
