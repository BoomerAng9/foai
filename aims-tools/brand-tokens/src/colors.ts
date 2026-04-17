/**
 * Canonical Deploy by: ACHIEVEMOR color tokens.
 *
 * Do not add, rename, or change values without a new Rish arbitration.
 * The neon green is the single most recognizable brand signature.
 */

export const DEPLOY_COLORS = {
  // Brand core
  neonPrimary: '#39FF14',                                 // the signature neon green
  neonPrimaryDim: '#2BCC10',                              // hover / pressed state
  neonPrimarySoft: 'rgba(57, 255, 20, 0.12)',             // tint for surfaces

  // Dark surface palette
  bgDeep: '#000000',                                      // deepest dark
  bgElevated: '#0B0D10',                                  // elevated surface
  bgSurface: '#15181C',                                   // cards
  bgOverlay: '#1E2228',                                   // hover surfaces

  // Text on dark
  textPrimary: '#F5F7FA',                                 // body text on dark (never dark-on-dark)
  textMuted: '#A0A8B5',                                   // secondary
  textSubtle: '#6B7280',                                  // tertiary / captions
  textInverse: '#0B0D10',                                 // used ONLY on neon surface

  // Accent + semantic
  accentOrange: '#FF6B00',                                // ACHEEVY visor spectrum (shared with Iller_Ang)
  accentGold: '#FFB200',                                  // premium / completion signals
  accentCyan: '#22D3EE',                                  // info / link hover
  semanticSuccess: '#4ADE80',
  semanticWarning: '#FFB200',
  semanticDanger: '#FF3B3B',

  // Borders + dividers
  borderStrong: 'rgba(245, 247, 250, 0.18)',
  borderSubtle: 'rgba(245, 247, 250, 0.08)',
  borderNeon: 'rgba(57, 255, 20, 0.35)',
} as const;

export type DeployColorToken = keyof typeof DEPLOY_COLORS;

/**
 * WCAG-safe pairs. Use only these combinations for text on background.
 * Each pair has been validated for contrast AA or better.
 */
export const DEPLOY_SAFE_PAIRS: Array<{
  bg: DeployColorToken;
  text: DeployColorToken;
  purpose: string;
}> = [
  { bg: 'bgDeep', text: 'textPrimary', purpose: 'Body text on deepest dark' },
  { bg: 'bgElevated', text: 'textPrimary', purpose: 'Body text on elevated surface' },
  { bg: 'bgSurface', text: 'textPrimary', purpose: 'Card content' },
  { bg: 'bgSurface', text: 'textMuted', purpose: 'Secondary labels on cards' },
  { bg: 'neonPrimary', text: 'textInverse', purpose: 'Text on neon button/badge — only place where inverse text is allowed' },
];

/**
 * Surfaces that are NEVER allowed. Rendering these must throw or fail
 * a visual-regression test. Enforces the "no dark text on dark fills"
 * rule from the brand canon.
 */
export const DEPLOY_FORBIDDEN_PAIRS: Array<{
  bg: DeployColorToken;
  text: DeployColorToken;
  reason: string;
}> = [
  { bg: 'bgDeep', text: 'textInverse', reason: 'Dark text on dark fill — brand violation' },
  { bg: 'bgElevated', text: 'textInverse', reason: 'Dark text on dark fill — brand violation' },
  { bg: 'bgSurface', text: 'textInverse', reason: 'Dark text on dark fill — brand violation' },
];
