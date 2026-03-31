/**
 * Referral System — invite others, get a discount.
 *
 * - Each user gets a unique referral code
 * - When someone signs up through the link, inviter gets a discount
 * - Attribution via referral codes (not cookies)
 * - Follows Pipeline Workgroup Skill attribution pattern
 */

export function generateReferralCode(userId: string): string {
  // Deterministic code from userId — same user always gets same code
  const hash = userId.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  const code = Math.abs(hash).toString(36).toUpperCase().slice(0, 8);
  return `DEPLOY-${code}`;
}

export function getReferralUrl(code: string): string {
  return `https://cti.foai.cloud/auth/redeem?ref=${code}`;
}

export const REFERRAL_DISCOUNT_PERCENT = 15; // Inviter gets 15% off next billing cycle

export interface ReferralRecord {
  code: string;
  inviterUserId: string;
  redeemedBy?: string;
  redeemedAt?: string;
  discountApplied: boolean;
}
