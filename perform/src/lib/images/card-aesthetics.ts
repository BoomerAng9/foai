/**
 * Per|Form Multi-Sport Card Aesthetics
 * ======================================
 * 5 new card styles that work for ANY athlete, ANY sport.
 * Separated from card-styles.ts to avoid linter conflicts.
 *
 * Logo is composited AFTER generation using Sharp (card-compositor.ts).
 * Prompts reserve a clean dark zone for the logo overlay.
 *
 * BRANDING RULES:
 * - Per|Form (pipe character) — ALWAYS
 * - Crown version (lion + golden crown) ONLY for grade >= 100
 * - NO AI-GENERATED LOGOS in any prompt
 */

import type { CardStyleSpec, CardPromptInput } from './card-styles';

/* ── Sport type ── */
export type Sport =
  | 'football' | 'basketball' | 'baseball' | 'soccer' | 'track'
  | 'volleyball' | 'softball' | 'lacrosse' | 'hockey' | 'tennis'
  | 'swimming' | 'wrestling' | 'golf' | 'flag_football' | 'other';

/* ── Aesthetic card types ── */
export type CardAesthetic =
  | 'blueprint' | 'animal_archetype' | 'inhuman_emergence' | 'wall_breaker' | 'commitment';

export type AnyCardStyle = import('./card-styles').CardVariation | CardAesthetic;

/* ── Animal archetypes by position ── */
const ANIMAL_ARCHETYPES: Record<string, { animal: string; trait: string }> = {
  QB: { animal: 'Eagle', trait: 'vision and precision' },
  RB: { animal: 'Cheetah', trait: 'explosive speed and elusiveness' },
  WR: { animal: 'Hawk', trait: 'aerial dominance and route precision' },
  TE: { animal: 'Grizzly Bear', trait: 'power and surprising agility' },
  OL: { animal: 'Bull', trait: 'immovable force and anchor strength' },
  OT: { animal: 'Bull', trait: 'immovable force and anchor strength' },
  OG: { animal: 'Bull', trait: 'immovable force and anchor strength' },
  C: { animal: 'Bull', trait: 'immovable force and anchor strength' },
  DL: { animal: 'Polar Bear', trait: 'relentless power and intimidation' },
  DE: { animal: 'Wolf', trait: 'pack hunting instinct and relentless pursuit' },
  DT: { animal: 'Rhino', trait: 'unstoppable interior force' },
  EDGE: { animal: 'Wolf', trait: 'pack hunting instinct and relentless pursuit' },
  LB: { animal: 'Lion', trait: 'king of the field, commanding presence' },
  CB: { animal: 'Panther', trait: 'stealth, reflexes, and shadow coverage' },
  S: { animal: 'Falcon', trait: 'high-altitude vision and diving strikes' },
  PG: { animal: 'Fox', trait: 'cunning court vision and quick decisions' },
  SG: { animal: 'Cobra', trait: 'lethal striking and quick release' },
  SF: { animal: 'Leopard', trait: 'versatile athleticism and finesse' },
  PF: { animal: 'Gorilla', trait: 'dominant physicality and wingspan' },
  SP: { animal: 'Cobra', trait: 'lethal accuracy and deceptive delivery' },
  GK: { animal: 'Cat', trait: 'reflexes and acrobatic saves' },
  ST: { animal: 'Shark', trait: 'predatory finishing instinct' },
};

export function getPlayerArchetype(position: string): { animal: string; trait: string } {
  const pos = position.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return ANIMAL_ARCHETYPES[pos] || { animal: 'Phoenix', trait: 'resilience and transformation' };
}

/* ── Logo variants ── */
export type LogoVariant = 'transparent' | 'dark';

export const LOGO_FILES: Record<LogoVariant, string> = {
  transparent: '/brand/perform-transparent.png',
  dark: '/brand/perform-dark-on-transparent.png',
};

export function pickLogoVariant(theme: 'dark' | 'light'): LogoVariant {
  return theme === 'dark' ? 'transparent' : 'dark';
}

/* ── Brand overlay instruction (no AI logos) ── */
function brandOverlay(): string {
  return 'TOP-LEFT CORNER: Leave a clean, uncluttered dark zone approximately 180x180 pixels for a logo overlay that will be added in post-processing. Do NOT draw any logos, brand marks, lion images, crown images, text watermarks, or any branding anywhere on the image.';
}

/**
 * Helmet-on / no-face rule (2026-04-18).
 * Every aesthetic card that depicts a football athlete must hide the face
 * behind a reflective black mirror visor. No likeness, no identifiable
 * facial features, no expression. The player reads as "team colorway in
 * helmet + uniform." Append this to every prompt that shows a football
 * athlete. Non-football sports (basketball/baseball/etc.) swap this for
 * their sport-specific face-occluding gear via `facelessRule(sport)`.
 */
function facelessRule(sport: Sport = 'football'): string {
  switch (sport) {
    case 'football':
    case 'flag_football':
      return 'ATHLETE FACE: Hidden behind a reflective BLACK MIRROR visor attached to the full football helmet. Fully opaque visor — ZERO facial features, ZERO expression, ZERO identifiable likeness. The player is anonymous; only the team colorway, helmet silhouette, and jersey number identify them. No eyes, no mouth, no skin tone visible on the face. NO logos, NO decals, NO team name text on helmet or jersey.';
    case 'hockey':
      return 'ATHLETE FACE: Hidden behind a reflective cage-and-visor combination on the hockey helmet. Fully shadowed — ZERO facial features, ZERO expression. Anonymous silhouette in team colorway.';
    case 'lacrosse':
      return 'ATHLETE FACE: Hidden behind the lacrosse helmet cage with a dark shadow across the face. ZERO facial features visible. Anonymous silhouette in team colorway.';
    case 'baseball':
    case 'softball':
      return 'ATHLETE FACE: Obscured — pulled-down cap brim casting full shadow across the upper face, or batting helmet with dark visor-like shading. ZERO identifiable features, ZERO expression. Anonymous silhouette in team colorway.';
    case 'basketball':
      return 'ATHLETE FACE: Obscured — motion blur, backlight silhouette, or dramatic shadow across the face. ZERO identifiable likeness, ZERO expression. Anonymous silhouette in team colorway.';
    default:
      return 'ATHLETE FACE: Obscured — dramatic shadow, motion blur, or gear-occlusion across the face. ZERO identifiable likeness, ZERO expression. Anonymous silhouette in team colorway.';
  }
}

/* ── The 5 aesthetic card specs ── */
export const CARD_AESTHETICS: Record<CardAesthetic, CardStyleSpec> = {
  blueprint: {
    name: 'Blueprint',
    description: "Architect's CAD pad — player emerges from technical line drawing. Works for any sport.",
    tierMatch: 'all',
    engine: 'recraft',
    aspectRatio: '3x4',
    promptTemplate: (p) => {
      return `Technical blueprint sports card on dark navy engineering paper with white and cyan grid lines, architectural ruler marks along edges.
CENTER: An athlete emerging from a technical CAD line drawing — the left half is precise white architectural wireframe sketch (measurements, dimension lines), transitioning into a fully rendered photorealistic athlete on the right half. The transition zone has ink-wash effect where lines become flesh.
ANNOTATIONS: Clean engineering callouts pointing to key body parts with measurement data in blueprint style.
BOTTOM NAMEPLATE: White technical stencil font "${p.name.toUpperCase()}" on dark navy
BELOW: "${p.position}" in cyan blueprint font
${brandOverlay()}
${facelessRule()}
Style: Premium architectural blueprint meets sports card, navy and white and cyan palette. All text crisp. NO logos, NO team names on any gear, NO brand marks.`;
    },
    negativePrompt: 'team logos, mascot logos, blurry text, cartoon, amateur, lion logo, crown, brand watermark',
  },

  animal_archetype: {
    name: 'Animal Archetype',
    description: 'Spirit animal shadow towering behind athlete — Golden Compass daemon style.',
    tierMatch: 'all',
    engine: 'recraft',
    aspectRatio: '3x4',
    promptTemplate: (p) => {
      const { animal, trait } = getPlayerArchetype(p.position);
      return `Premium sports trading card with dramatic spiritual energy aesthetic.
BACKGROUND: Deep atmospheric dark gradient with ethereal mist and subtle particle effects
FOREGROUND SUBJECT: An athlete in a powerful confident pose, looking forward
BEHIND THE ATHLETE: A massive towering ${animal} silhouette/shadow looming behind them — semi-transparent, ethereal, smoke-like edges, glowing eyes, made of dark energy and gold light particles. The ${animal} shadow is 3x larger than the athlete. The animal appears as a spiritual guardian, like a daemon from The Golden Compass.
BOTTOM NAMEPLATE: Bold gold "${p.name.toUpperCase()}" on dark matte plate
BELOW: "${p.position}" and small text "${animal.toUpperCase()} — ${trait}" in refined gold
${brandOverlay()}
${facelessRule()}
Style: Dark fantasy sports card, ethereal spirit animal, cinematic dramatic lighting, gold and obsidian palette. All text sharp. NO logos on gear, NO brand marks.`;
    },
    negativePrompt: 'cute cartoon animal, team logos, bright daylight, blurry text, amateur, lion logo, crown',
  },

  inhuman_emergence: {
    name: 'Inhuman Emergence',
    description: 'Terrigenesis cocoon transformation — athlete cracking out of crystalline chrysalis.',
    tierMatch: 'all',
    engine: 'recraft',
    aspectRatio: '3x4',
    promptTemplate: (p) => {
      const colors = p.teamColors || 'gold and obsidian';
      return `Dramatic sci-fi transformation sports card.
CENTER: An athlete breaking free from a massive crystalline cocoon/chrysalis structure. The cocoon is cracking open with ${colors} energy radiating outward from the fracture lines. Shards of the chrysalis float in mid-air, glowing with internal light. The athlete is mid-emergence — upper body free and powerful, lower body still partially encased.
BOTTOM NAMEPLATE: Bold metallic "${p.name.toUpperCase()}" with energy glow effect
BELOW: "${p.position}" in accent color
${brandOverlay()}
${facelessRule()}
Style: Marvel Agents of SHIELD Terrigenesis inspired, sci-fi meets sports, crystalline structures, energy effects, dramatic backlighting. NO logos on gear. All text sharp. NO brand marks.`;
    },
    negativePrompt: 'cartoon, cute, team logos, bright daylight, blurry text, amateur, lion logo, crown',
  },

  wall_breaker: {
    name: 'Wall Breaker',
    description: 'Athlete bursting through a concrete wall — debris flying, power pose.',
    tierMatch: 'all',
    engine: 'recraft',
    aspectRatio: '3x4',
    promptTemplate: (p) => {
      const colors = p.teamColors || 'gold and black';
      return `Ultra-dramatic action sports card.
CENTER: An athlete literally BURSTING THROUGH a thick concrete wall, captured at the exact moment of breakthrough. Massive chunks of concrete and rebar debris flying outward. Dust cloud explosion. The wall has ${colors} paint on the athlete's side.
The athlete (${p.position}) is in a powerful forward-charging pose — maximum intensity, breaking through with pure force (NO logos, NO team names on gear).
Dramatic backlighting through the hole creates a halo/rim light effect. Concrete particles suspended in mid-air.
BOTTOM NAMEPLATE: Bold industrial stencil "${p.name.toUpperCase()}" — looks stamped into metal
BELOW: "${p.position}" in accent color
${brandOverlay()}
${facelessRule()}
Style: Michael Bay-level destruction, hyper-realistic concrete physics, cinematic slow-motion debris. All text sharp. NO logos, NO brand marks.`;
    },
    negativePrompt: 'cartoon, gentle, team logos, clean wall, no debris, blurry text, amateur, lion logo, crown',
  },

  commitment: {
    name: 'Commitment',
    description: 'College commitment announcement graphic — Per|Form style.',
    tierMatch: 'all',
    engine: 'recraft',
    aspectRatio: '4x5',
    promptTemplate: (p) => {
      const colors = p.teamColors || 'deep crimson and gold';
      const { animal } = getPlayerArchetype(p.position);
      return `Premium college commitment announcement graphic.
TOP SECTION (40%): Dark atmospheric background with ${colors} gradient smoke/mist. Large bold 3D chrome text "COMMITTED" in an arc or banner — dramatic, extruded, metallic finish. NOT flat text.
CENTER (40%): The athlete in a powerful hero pose, slightly off-center left. Behind them, a faint ${animal} silhouette in ${colors}. To the right, ${colors} color blocks and patterns (NO logos, NO mascots).
BOTTOM SECTION (20%): Clean dark panel with:
- "${p.name.toUpperCase()}" in large bold ${colors} metallic text
- "${p.position} | Class of ${new Date().getFullYear() + 1}" in white
BOTTOM-RIGHT CORNER: Leave a clean zone for logo overlay (added in post-production).
${brandOverlay()}
${facelessRule()}
Style: Premium sports commitment graphic, broadcast quality, 3D metallic typography, cinematic. All text sharp. NO school logos, NO mascot images, NO brand marks.`;
    },
    negativePrompt: 'bright white background, school logos, mascot images, cartoon, amateur, lion logo, crown',
  },
};

/* ── Builders ── */
export function buildAestheticPrompt(
  aesthetic: CardAesthetic,
  input: CardPromptInput,
): { prompt: string; negativePrompt?: string; engine: 'ideogram' | 'recraft'; aspectRatio: string } {
  const spec = CARD_AESTHETICS[aesthetic];
  return { prompt: spec.promptTemplate(input), negativePrompt: spec.negativePrompt, engine: spec.engine, aspectRatio: spec.aspectRatio };
}

export function buildAnyCardPrompt(
  style: AnyCardStyle,
  input: CardPromptInput,
): { prompt: string; negativePrompt?: string; engine: 'ideogram' | 'recraft'; aspectRatio: string } {
  if (style in CARD_AESTHETICS) return buildAestheticPrompt(style as CardAesthetic, input);
  const { buildCardPrompt } = require('./card-styles');
  return buildCardPrompt(style, input);
}

export function listAllCardStyles(): Array<{ id: AnyCardStyle; name: string; description: string; category: 'classic' | 'aesthetic' }> {
  const { listCardVariations } = require('./card-styles');
  const classic = listCardVariations().map((v: { id: string; name: string; description: string }) => ({ ...v, category: 'classic' as const }));
  const aesthetics = Object.entries(CARD_AESTHETICS).map(([id, spec]) => ({
    id: id as AnyCardStyle, name: spec.name, description: spec.description, category: 'aesthetic' as const,
  }));
  return [...aesthetics, ...classic];
}
