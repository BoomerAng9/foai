/**
 * Seed — Prime Sub-Tags (101+ scores only)
 * =========================================
 * Prime players get additional identity flags. SPORTS heritage, but
 * nothing prevents other verticals from using them (e.g. FOUNDER
 * "nil_ready" isn't wrong for a brand-forward founder).
 */

import type { PrimeSubTag, PrimeSubTagDef, VersatilityBonus, VersatilityFlex } from './types.js';

export const SEED_PRIME_SUB_TAGS: Record<PrimeSubTag, PrimeSubTagDef> = {
  franchise_cornerstone: {
    id: 'franchise_cornerstone',
    icon: '🏗️',
    label: 'Franchise Cornerstone',
    meaning: 'Cornerstone of a franchise build — you build the team around this player',
  },
  talent_character_concerns: {
    id: 'talent_character_concerns',
    icon: '⚠️',
    label: 'Talent w/ Character Concerns',
    meaning: 'Elite ceiling, but off-field flags reduce certainty',
  },
  nil_ready: {
    id: 'nil_ready',
    icon: '🎤',
    label: 'NIL Ready',
    meaning: 'Brand value and market readiness exceed pure performance projection',
  },
  quiet_but_elite: {
    id: 'quiet_but_elite',
    icon: '🔒',
    label: 'Quiet but Elite',
    meaning: 'Under-the-radar generational talent — the hidden gem',
  },
  ultra_competitive: {
    id: 'ultra_competitive',
    icon: '🤯',
    label: 'Ultra-Competitive',
    meaning: 'Elite motor and drive that elevates everyone around them',
  },
};

export const SEED_VERSATILITY_BONUSES: Record<VersatilityFlex, VersatilityBonus> = {
  none: {
    flex: 'none',
    bonus: 0,
    description: 'Single-role specialist',
  },
  situational: {
    flex: 'situational',
    bonus: 3,
    description: 'Can contribute in limited situational packages',
  },
  two_way: {
    flex: 'two_way',
    bonus: 5,
    description: 'Starts on both sides / can anchor two roles',
  },
  unicorn: {
    flex: 'unicorn',
    bonus: 7,
    description: 'Elite at multiple roles — schematic unicorn',
  },
};
