/**
 * Tailwind v4 preset that extends the theme with Deploy canonical tokens.
 *
 * Usage:
 *   import { deployBrandPreset } from '@aims/brand-tokens/tailwind-preset';
 *   export default { presets: [deployBrandPreset], content: [...] };
 */

import { DEPLOY_COLORS } from './colors.js';
import { DEPLOY_FONTS, DEPLOY_TYPE_SCALE } from './typography.js';

export const deployBrandPreset = {
  theme: {
    extend: {
      colors: {
        'deploy-neon': DEPLOY_COLORS.neonPrimary,
        'deploy-neon-dim': DEPLOY_COLORS.neonPrimaryDim,
        'deploy-bg-deep': DEPLOY_COLORS.bgDeep,
        'deploy-bg-elevated': DEPLOY_COLORS.bgElevated,
        'deploy-bg-surface': DEPLOY_COLORS.bgSurface,
        'deploy-bg-overlay': DEPLOY_COLORS.bgOverlay,
        'deploy-text': DEPLOY_COLORS.textPrimary,
        'deploy-text-muted': DEPLOY_COLORS.textMuted,
        'deploy-text-subtle': DEPLOY_COLORS.textSubtle,
        'deploy-accent-orange': DEPLOY_COLORS.accentOrange,
        'deploy-accent-gold': DEPLOY_COLORS.accentGold,
        'deploy-accent-cyan': DEPLOY_COLORS.accentCyan,
      },
      fontFamily: {
        wordmark: DEPLOY_FONTS.wordmark.family.split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')),
        body: DEPLOY_FONTS.body.family.split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')),
        mono: DEPLOY_FONTS.mono.family.split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')),
        display: DEPLOY_FONTS.display.family.split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')),
      },
      fontSize: Object.fromEntries(
        Object.entries(DEPLOY_TYPE_SCALE).map(([key, val]) => [
          key,
          [val.fontSize, { lineHeight: String(val.lineHeight), fontWeight: val.fontWeight.toString() }],
        ]),
      ),
      boxShadow: {
        'deploy-neon': `0 0 0 1px ${DEPLOY_COLORS.borderNeon}, 0 0 24px ${DEPLOY_COLORS.neonPrimarySoft}`,
      },
    },
  },
} as const;

export type DeployBrandPreset = typeof deployBrandPreset;
