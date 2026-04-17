/**
 * Canonical Deploy by: ACHIEVEMOR typography tokens.
 *
 * Permanent Marker is the brand-marker font. Do not substitute a
 * different marker face. Body stack is Geist Sans (shared with Open
 * Mind + Iller_Ang brand floor).
 */

export const DEPLOY_FONTS = {
  wordmark: {
    family: '"Permanent Marker", "Marker Felt", cursive',
    weight: 400,
    letterSpacing: '0.02em',
    textTransform: 'none' as const,
    purpose: 'The "Deploy" wordmark — ONLY place this font appears',
  },
  body: {
    family: '"Geist Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
    weight: 400,
    letterSpacing: '0',
    purpose: 'All body text across Deploy surfaces',
  },
  mono: {
    family: '"Geist Mono", "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
    weight: 400,
    letterSpacing: '0',
    purpose: 'Data + code + transaction IDs',
  },
  display: {
    family: '"Bebas Neue", "Arial Narrow Bold", sans-serif',
    weight: 400,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    purpose: 'Display headings where a condensed sans is needed (sports surfaces)',
  },
} as const;

export type DeployFontRole = keyof typeof DEPLOY_FONTS;

/** Display size ramp. Use these tokens rather than pixel literals. */
export const DEPLOY_TYPE_SCALE = {
  display2xl: { fontSize: '5.5rem', lineHeight: 1.02, fontWeight: 400 },
  displayXl:  { fontSize: '4rem',   lineHeight: 1.05, fontWeight: 400 },
  displayLg:  { fontSize: '3rem',   lineHeight: 1.1,  fontWeight: 400 },
  headingXl:  { fontSize: '2rem',   lineHeight: 1.15, fontWeight: 600 },
  headingLg:  { fontSize: '1.5rem', lineHeight: 1.2,  fontWeight: 600 },
  headingMd:  { fontSize: '1.25rem',lineHeight: 1.3,  fontWeight: 500 },
  bodyLg:     { fontSize: '1.125rem',lineHeight: 1.55,fontWeight: 400 },
  bodyMd:     { fontSize: '1rem',    lineHeight: 1.6, fontWeight: 400 },
  bodySm:     { fontSize: '0.875rem',lineHeight: 1.55,fontWeight: 400 },
  label:      { fontSize: '0.75rem', lineHeight: 1.4, fontWeight: 500, letterSpacing: '0.06em' },
} as const;

export type DeployTypeStep = keyof typeof DEPLOY_TYPE_SCALE;

/** Banned fonts per canon. Using any of these must fail CI. */
export const DEPLOY_BANNED_FONTS = [
  'Inter',
  'Roboto',
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Courier',
  'system-ui',                                            // too generic — must pick a stack
] as const;
