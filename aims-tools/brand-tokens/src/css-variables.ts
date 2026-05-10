/**
 * CSS custom-property blob ready to drop into a <style> tag or a global
 * stylesheet. Variable names kebab-case; values sourced from the canonical
 * tokens so a single source of truth stays in colors.ts + typography.ts.
 */

import { DEPLOY_COLORS } from './colors.js';
import { DEPLOY_FONTS } from './typography.js';

export const cssVariables = `
:root {
  /* Brand neon */
  --deploy-neon-primary: ${DEPLOY_COLORS.neonPrimary};
  --deploy-neon-primary-dim: ${DEPLOY_COLORS.neonPrimaryDim};
  --deploy-neon-primary-soft: ${DEPLOY_COLORS.neonPrimarySoft};

  /* Surfaces */
  --deploy-bg-deep: ${DEPLOY_COLORS.bgDeep};
  --deploy-bg-elevated: ${DEPLOY_COLORS.bgElevated};
  --deploy-bg-surface: ${DEPLOY_COLORS.bgSurface};
  --deploy-bg-overlay: ${DEPLOY_COLORS.bgOverlay};

  /* Text */
  --deploy-text-primary: ${DEPLOY_COLORS.textPrimary};
  --deploy-text-muted: ${DEPLOY_COLORS.textMuted};
  --deploy-text-subtle: ${DEPLOY_COLORS.textSubtle};
  --deploy-text-inverse: ${DEPLOY_COLORS.textInverse};

  /* Accents */
  --deploy-accent-orange: ${DEPLOY_COLORS.accentOrange};
  --deploy-accent-gold: ${DEPLOY_COLORS.accentGold};
  --deploy-accent-cyan: ${DEPLOY_COLORS.accentCyan};

  /* Semantic */
  --deploy-success: ${DEPLOY_COLORS.semanticSuccess};
  --deploy-warning: ${DEPLOY_COLORS.semanticWarning};
  --deploy-danger: ${DEPLOY_COLORS.semanticDanger};

  /* Borders */
  --deploy-border-strong: ${DEPLOY_COLORS.borderStrong};
  --deploy-border-subtle: ${DEPLOY_COLORS.borderSubtle};
  --deploy-border-neon: ${DEPLOY_COLORS.borderNeon};

  /* Typography */
  --deploy-font-wordmark: ${DEPLOY_FONTS.wordmark.family};
  --deploy-font-body: ${DEPLOY_FONTS.body.family};
  --deploy-font-mono: ${DEPLOY_FONTS.mono.family};
  --deploy-font-display: ${DEPLOY_FONTS.display.family};
}
`.trim();
