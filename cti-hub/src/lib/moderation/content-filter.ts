/**
 * Content Moderation — Zero Tolerance Policy
 *
 * Scans all user-generated text for:
 * - Vulgarity, slurs, hate speech
 * - Harassment, sexually explicit language
 * - Anything disrespectful or offensive
 *
 * Policy: One warning, then permanent ban.
 */

// Common offensive patterns (expandable)
const BLOCKED_PATTERNS = [
  // Slurs and hate speech (abbreviated patterns to catch variations)
  /\bn[i1!]gg/i, /\bf[a@]gg/i, /\bk[i1]ke/i, /\bch[i1]nk/i, /\bsp[i1]c/i, /\bwetback/i,
  /\bretard/i, /\btr[a@]nny/i,
  // Sexually explicit
  /\bp[o0]rn/i, /\bhentai/i, /\bxxx\b/i, /\bnude[s]?\b/i, /\bf[u\*]ck/i, /\bsh[i1\*]t/i,
  /\bc[u\*]nt/i, /\bd[i1]ck\b/i, /\bp[u\*]ssy/i, /\bass\s?hole/i, /\bbitch/i,
  // Violence/threats
  /\bkill\s+(your|my|him|her|them)/i, /\brape\b/i, /\bsuicid/i,
  // General disrespect patterns
  /\bdie\s+in\b/i, /\bgo\s+to\s+hell/i,
];

export interface ModerationResult {
  allowed: boolean;
  flagged: boolean;
  reason?: string;
  severity: 'clean' | 'warning' | 'block';
}

/**
 * Check text content against moderation rules.
 * Returns immediately — no API call needed for basic patterns.
 */
export function moderateText(text: string): ModerationResult {
  if (!text || text.trim().length === 0) {
    return { allowed: true, flagged: false, severity: 'clean' };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return {
        allowed: false,
        flagged: true,
        reason: 'Content violates community guidelines. Offensive or inappropriate language detected.',
        severity: 'block',
      };
    }
  }

  return { allowed: true, flagged: false, severity: 'clean' };
}

/**
 * Check an image generation prompt for offensive content.
 * Stricter than text — blocks suggestive or violent imagery requests.
 */
export function moderateImagePrompt(prompt: string): ModerationResult {
  const textResult = moderateText(prompt);
  if (!textResult.allowed) return textResult;

  // Additional image-specific blocks
  const imageBlocked = [
    /\bnaked/i, /\bundress/i, /\bsexy\b/i, /\berotic/i, /\bgore\b/i,
    /\bblood/i, /\bweapon/i, /\bgun\b/i, /\bbomb/i, /\bdrug/i,
    /\bviolent/i, /\bexplicit/i,
  ];

  for (const pattern of imageBlocked) {
    if (pattern.test(prompt)) {
      return {
        allowed: false,
        flagged: true,
        reason: 'Image prompt contains content that violates our safety guidelines.',
        severity: 'block',
      };
    }
  }

  return { allowed: true, flagged: false, severity: 'clean' };
}
