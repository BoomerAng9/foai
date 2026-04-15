/**
 * @aims/tie-matrix — Types
 * =========================
 * Canonical type definitions for the Talent & Innovation Engine (TIE).
 * The TIE is CROSS-VERTICAL. Every surface (Per|Form sports, Workforce
 * OpenKlassAI, Student-Athlete, Contractor, Founder, Creative) routes
 * through the same numeric grade scale but consumes vertical-specific
 * labels, context strings, and (for SPORTS) draft projections.
 *
 * Mirror of the partition pattern used in @aims/pricing-matrix:
 *   types → schema → loader → queries → seed-* → index
 */

// ─────────────────────────────────────────────────────────────────────────
// Grade tiers — numeric bands shared across every vertical
// ─────────────────────────────────────────────────────────────────────────

export type TIETier =
  | 'PRIME'
  | 'A_PLUS'
  | 'A'
  | 'A_MINUS'
  | 'B_PLUS'
  | 'B'
  | 'B_MINUS'
  | 'C_PLUS'
  | 'C';

export interface GradeBand {
  tier: TIETier;
  /** Short display grade — "A+", "B-", "PRIME" */
  grade: string;
  /** Hex color for the tier badge */
  badgeColor: string;
  /** Unicode emoji icon (SPORTS heritage — usable cross-vertical) */
  icon: string;
  min: number;
  max: number;
}

// ─────────────────────────────────────────────────────────────────────────
// Verticals — the partition dimension
// ─────────────────────────────────────────────────────────────────────────

export type Vertical =
  | 'SPORTS'
  | 'WORKFORCE'
  | 'STUDENT'
  | 'CONTRACTOR'
  | 'FOUNDER'
  | 'CREATIVE';

export interface VerticalConfig {
  id: Vertical;
  displayName: string;
  /** What a "score" represents in this vertical */
  scoreNoun: string;
  /** What a "subject" of grading is called (player, learner, contractor...) */
  subjectNoun: string;
  /** Source dataset namespace — must match DB table prefix / collection name */
  datasetNamespace: string;
  /** Allowed source modules — anything outside this list is a routing bug */
  allowedSourceModules: string[];
}

export interface VerticalTierLabel {
  /** Human label: "Generational Talent", "Senior Specialist", "Five-Star Recruit" */
  label: string;
  /** Context string: "Franchise Player", "Director / VP track", "Power 5 + NIL ready" */
  context: string;
  /**
   * Projection — optional, primarily used by SPORTS for draft projections
   * ("First-Round Lock, Potential Pro Bowler"). Other verticals MAY use
   * this for stage progression strings.
   */
  projection?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Prime sub-tags — only attach to 101+ scores (SPORTS heritage)
// ─────────────────────────────────────────────────────────────────────────

export type PrimeSubTag =
  | 'franchise_cornerstone'
  | 'talent_character_concerns'
  | 'nil_ready'
  | 'quiet_but_elite'
  | 'ultra_competitive';

export interface PrimeSubTagDef {
  id: PrimeSubTag;
  icon: string;
  label: string;
  meaning: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Multi-position bonus — SPORTS lever for flex players
// Generic "versatility-bonus" concept reusable in future verticals.
// ─────────────────────────────────────────────────────────────────────────

export type VersatilityFlex = 'none' | 'situational' | 'two_way' | 'unicorn';

export interface VersatilityBonus {
  flex: VersatilityFlex;
  bonus: number;
  description: string;
}

// ─────────────────────────────────────────────────────────────────────────
// TIE scoring inputs/outputs — shared shape across engines
// ─────────────────────────────────────────────────────────────────────────

export interface TIEComponents {
  /** Pillar 1 (sports: Performance / workforce: Talent / student: Ability) */
  performance: number;
  /** Pillar 2 (sports: Attributes / workforce: Innovation / student: Potential) */
  attributes: number;
  /** Pillar 3 (sports: Intangibles / workforce: Execution / student: Character) */
  intangibles: number;
}

export interface TIEResult {
  /** REQUIRED — which vertical this result belongs to.
   *  Routing/UI MUST assertVertical() before consuming. */
  vertical: Vertical;
  score: number;
  grade: string;
  tier: TIETier;
  label: string;
  /** Context string — vertical-specific. */
  context: string;
  /** Projection — SPORTS-heritage, optional for other verticals. */
  projection?: string;
  badgeColor: string;
  icon: string;
  components: TIEComponents;
  /** Prime sub-tags — only non-empty when score >= 101 */
  primeSubTags?: PrimeSubTag[];
}

// ─────────────────────────────────────────────────────────────────────────
// The loaded matrix — what loader.ts returns, what queries.ts reads
// ─────────────────────────────────────────────────────────────────────────

export interface TIEMatrix {
  grades: GradeBand[];
  verticals: Record<Vertical, VerticalConfig>;
  labelsByVertical: Record<Vertical, Record<TIETier, VerticalTierLabel>>;
  primeSubTags: Record<PrimeSubTag, PrimeSubTagDef>;
  versatilityBonuses: Record<VersatilityFlex, VersatilityBonus>;
  generatedAt: string;
  version: string;
}
