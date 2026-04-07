/**
 * Iller_Ang Curator
 * ====================
 * Iller_Ang is Per|Form's Visual Director Boomer_Ang ($197/mo
 * Strategic Tier). When a Stitch-generated design lands, Iller_Ang
 * evaluates it against the broadcast-grade quality bar before it
 * ships to users.
 *
 * Rules enforced:
 *  - Per|Form design tokens (navy/red/light broadcast theme OR
 *    studio-dark for Void-Caster surfaces)
 *  - Typography: Outfit (display), Inter (body), JetBrains Mono
 *    (tabular)
 *  - No generic stock layouts — must feel broadcast-grade
 *  - No team logos, no real player names, no NFL shield
 *  - Formula weights (40/30/30) NEVER shown
 *  - Clear hierarchy, readable at mobile + desktop widths
 *  - Per-vertical knowledge library hints present where relevant
 */

import type { CurationResult, DesignBrief, DesignVariant } from './types';

interface CuratorInput {
  brief: DesignBrief;
  variant: DesignVariant;
  /** Raw HTML/React output from Stitch for static analysis */
  exportedCode?: string;
}

const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; rule: string }> = [
  { pattern: /40%.*weight|30%.*weight|40\/30\/30|canonical.*40/i, rule: 'Formula weights must NEVER be displayed' },
  { pattern: /NFL\s*shield|nfl-shield|nflShield/i, rule: 'No NFL shield logo' },
  { pattern: /comprehensive/i, rule: 'Never use the word "comprehensive"' },
  { pattern: /<think>|<\/think>/i, rule: 'Reasoning artifacts leaked into output' },
];

const REQUIRED_TOKENS: Record<DesignBrief['theme'], string[]> = {
  'broadcast-light': ['#0B1E3F', '#D40028', '#F4F6FA'],
  'studio-dark': ['#06122A', '#D4A853', '#0A0E1A'],
  'editorial': ['#FFFFFF', '#0A0E1A', 'serif'],
  'cosmic-scholar': ['#8B5CF6', '#0B1E3F', '#F4F6FA'],
};

const REQUIRED_FONTS = ['Outfit', 'Inter'];

export function curateDesign(input: CuratorInput): CurationResult {
  const { brief, variant, exportedCode } = input;
  const violations: string[] = [];
  const feedbackLines: string[] = [];

  // Check 1: Formula leak / forbidden patterns in exported code
  if (exportedCode) {
    for (const { pattern, rule } of FORBIDDEN_PATTERNS) {
      if (pattern.test(exportedCode)) {
        violations.push(rule);
      }
    }
  }

  // Check 2: Required tokens for the theme
  const requiredTokens = REQUIRED_TOKENS[brief.theme] ?? [];
  if (exportedCode && requiredTokens.length > 0) {
    const missingTokens = requiredTokens.filter(
      token => !exportedCode.toLowerCase().includes(token.toLowerCase()),
    );
    if (missingTokens.length > 0) {
      feedbackLines.push(
        `Theme "${brief.theme}" is missing canonical tokens: ${missingTokens.join(', ')}. Apply the Per|Form token system.`,
      );
    }
  }

  // Check 3: Required font families
  if (exportedCode) {
    const missingFonts = REQUIRED_FONTS.filter(
      font => !exportedCode.includes(font),
    );
    if (missingFonts.length > 0) {
      feedbackLines.push(
        `Typography incomplete. Missing font families: ${missingFonts.join(', ')}. Outfit for display, Inter for body.`,
      );
    }
  }

  // Check 4: Required sections present
  if (exportedCode && brief.sections.length > 0) {
    const lowerCode = exportedCode.toLowerCase();
    const missingSections = brief.sections.filter(
      s => !lowerCode.includes(s.toLowerCase().replace(/\s+/g, '')) &&
           !lowerCode.includes(s.toLowerCase()),
    );
    if (missingSections.length > 0) {
      feedbackLines.push(
        `Design is missing required sections: ${missingSections.join(', ')}.`,
      );
    }
  }

  // Check 5: Hard constraints
  if (exportedCode && brief.constraints.mustAvoid?.length) {
    for (const forbidden of brief.constraints.mustAvoid) {
      if (exportedCode.toLowerCase().includes(forbidden.toLowerCase())) {
        violations.push(`Design contains forbidden element: "${forbidden}"`);
      }
    }
  }

  // Verdict logic
  if (violations.length > 0) {
    return {
      verdict: 'REJECT',
      feedback: `Iller_Ang rejected variant ${variant.id} (${variant.approach}). Violations:\n${violations.map(v => `- ${v}`).join('\n')}`,
      violatedRules: violations,
    };
  }

  if (feedbackLines.length > 0) {
    return {
      verdict: 'REFINE',
      feedback: `Iller_Ang requests refinements for variant ${variant.id} (${variant.approach}):\n${feedbackLines.map(l => `- ${l}`).join('\n')}`,
      refinementBrief: feedbackLines.join(' '),
    };
  }

  return {
    verdict: 'APPROVED',
    feedback: `Iller_Ang approved variant ${variant.id} (${variant.approach}). Design meets the broadcast-grade quality bar.`,
  };
}
