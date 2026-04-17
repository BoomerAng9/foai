/**
 * @aims/brand-tokens — barrel export.
 *
 * Deploy by: ACHIEVEMOR canonical brand tokens. Locked by the
 * 2026-04-17 Rish arbitration.
 */

export * from './colors.js';
export * from './typography.js';
export * from './css-variables.js';
export * from './tailwind-preset.js';

export const BRAND_WORDMARK = 'Deploy by: ACHIEVEMOR';
export const BRAND_HOME_CARDS = [
  'Let ACHEEVY manage it',
  'Let ACHEEVY guide me',
] as const;
export type BrandHomeCard = (typeof BRAND_HOME_CARDS)[number];
