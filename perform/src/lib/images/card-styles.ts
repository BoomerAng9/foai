/**
 * Per|Form Player Card Style System
 * ===================================
 * Multiple visual variations, each tied to specific use cases and TIE grades.
 * Routes to Ideogram V3 for text-critical cards, Recraft V4 for image-heavy cards.
 *
 * HILLSIDE COMETS is one template. Here are the others.
 */

export type CardVariation =
  | 'classic_silver'      // HILLSIDE COMETS style — silver metallic, school branding
  | 'mythic_gold'         // Top-tier prospects, gold foil, holographic
  | 'blue_chip'           // Legendary tier, royal blue + orange (alt Per|Form colors)
  | 'obsidian'            // Dark matte, minimal, premium
  | 'neon_future'         // Cyberpunk, electric cyan/magenta, for "rising" trend prospects
  | 'retro_topps'         // 80s throwback, cream border, classic typography
  | 'broadcast_espn'      // ESPN broadcast title card style
  | 'draft_night'         // Dark stage, dramatic rim lighting, confetti
  | 'performance_stat'    // Data-forward, chart overlays, analytics aesthetic
  | 'hs_recruit'          // High school recruit card, school colors variable
  | 'nil_portfolio'       // NIL portfolio card, endorsement-ready, premium
  | 'flag_football';      // Olympic flag football athlete card

export interface CardStyleSpec {
  name: string;
  description: string;
  tierMatch: 'all' | 'mythic' | 'legendary' | 'rare' | 'uncommon' | 'common';
  engine: 'ideogram' | 'recraft';
  aspectRatio: '3x4' | '4x5' | '2x3' | '1x1';
  promptTemplate: (p: CardPromptInput) => string;
  negativePrompt?: string;
}

export interface CardPromptInput {
  name: string;
  position: string;
  school: string;
  jerseyNumber?: string | number;
  grade: number;
  tieGrade: string;
  projectedRound: number;
  nflComparison?: string;
  trend?: 'rising' | 'falling' | 'steady';
  teamMascot?: string;
  teamColors?: string;
}

/* ── Per|Form Card Style Library ── */
export const CARD_STYLES: Record<CardVariation, CardStyleSpec> = {

  /* ═══ CLASSIC SILVER — HILLSIDE COMETS canonical ═══ */
  classic_silver: {
    name: 'Classic Silver',
    description: 'Silver metallic border, school team branding, jersey number watermark. The HILLSIDE COMETS template.',
    tierMatch: 'all',
    engine: 'ideogram',
    aspectRatio: '3x4',
    promptTemplate: (p) => `Premium sports trading card in portrait format. Silver metallic border with slight holographic sheen.
TOP LEFT: Team logo badge with "${p.teamMascot || p.school}" text
TOP RIGHT: Large jersey number "${p.jerseyNumber || '7'}" in bold metallic font
CENTER: Full body portrait of a young athlete in "${p.school}" football jersey (${p.teamColors || 'maroon and gray'}), confident expression, black eye paint, professional sports card photography, plain dark stadium background with subtle depth
BOTTOM PLATE: Silver banner with bold text "${p.name.toUpperCase()}" prominently displayed
BELOW NAME: "${p.position.toUpperCase()}" in slightly smaller metallic text
Style: Premium NFL trading card quality, realistic rendering, cinematic lighting. All text must be sharp, properly spelled, and centered. No distortion.`,
    negativePrompt: 'blurry text, misspelled words, distorted face, amateur, low quality, watermark, garbled letters',
  },

  /* ═══ MYTHIC GOLD — Top 5 overall, Generational tier ═══ */
  mythic_gold: {
    name: 'Mythic Gold',
    description: 'Gold foil holographic for Generational grade (95+). Rarest tier. Floating player with light rays.',
    tierMatch: 'mythic',
    engine: 'ideogram',
    aspectRatio: '3x4',
    promptTemplate: (p) => `Ultra-premium mythic-tier sports trading card. Gold foil holographic border with radiating light rays.
CENTERPIECE: Epic portrait of "${p.name}" in "${p.school}" football jersey, dramatic backlight, slow-motion particle effects in gold
TOP BANNER: "GENERATIONAL" in gold letterpress text
BOTTOM NAMEPLATE: Large bold "${p.name.toUpperCase()}" in gold metallic foil
BELOW: "${p.position}  |  ${p.school.toUpperCase()}" in refined serif
BADGE: Gold circular TIE grade badge showing "${p.grade}" in elegant typography
Style: Legendary sports card aesthetic, gold and black palette, cinematic rim lighting, museum-quality trading card. All text must be sharp and legible.`,
    negativePrompt: 'blurry text, amateur, low resolution, watermark, generic, flat lighting, misspelled',
  },

  /* ═══ BLUE CHIP — Per|Form alt colorway ═══ */
  blue_chip: {
    name: 'Blue Chip',
    description: 'Royal blue base with orange accents — Per|Form alternate brand colorway. Legendary tier.',
    tierMatch: 'legendary',
    engine: 'ideogram',
    aspectRatio: '3x4',
    promptTemplate: (p) => `Premium sports trading card. Royal blue metallic border with orange electric accents.
BACKGROUND: Dark royal blue gradient with subtle orange rim lighting
CENTER: Confident portrait of "${p.name}" in ${p.school} football uniform, three-quarter body shot, dramatic orange stage lighting
TOP: Orange banner with "BLUE CHIP" text in bold white
BOTTOM: Large bold "${p.name.toUpperCase()}" in white serif on dark blue plate
BELOW NAME: "${p.position}  ${p.school}" in orange refined text
CORNER BADGE: Orange diamond-shaped TIE badge with "${p.grade}" centered
Style: Premium trading card quality, royal blue and orange palette only, cinematic sports photography. Crisp text, no distortion.`,
    negativePrompt: 'gold, silver, blurry text, amateur, low quality, generic',
  },

  /* ═══ OBSIDIAN — Premium dark matte ═══ */
  obsidian: {
    name: 'Obsidian',
    description: 'Ultra-minimal black matte card, premium aesthetic. For any grade. Signature luxury feel.',
    tierMatch: 'all',
    engine: 'ideogram',
    aspectRatio: '3x4',
    promptTemplate: (p) => `Ultra-premium minimalist sports trading card. Pure black matte background with subtle gold pinstripe border.
COMPOSITION: Athletic portrait of "${p.name}" in ${p.school} uniform, side lit dramatically from single gold light source, deep black shadows
MINIMAL TEXT: Only name "${p.name.toUpperCase()}" in elegant thin serif at bottom in gold
TINY SUBTEXT: "${p.position} · ${p.school}" in light gold sans serif
Style: Louis Vuitton meets sports card, understated luxury, premium matte finish, Netflix documentary lighting, ultra-clean, negative space. Sharp legible text.`,
    negativePrompt: 'busy, cluttered, amateur, bright colors, cartoon, blurry',
  },

  /* ═══ NEON FUTURE — Cyberpunk rising prospects ═══ */
  neon_future: {
    name: 'Neon Future',
    description: 'Cyberpunk aesthetic for rising prospects. Electric cyan and magenta glow.',
    tierMatch: 'all',
    engine: 'ideogram',
    aspectRatio: '3x4',
    promptTemplate: (p) => `Cyberpunk sports trading card. Electric cyan and magenta neon border glow.
BACKGROUND: Dark futuristic grid with glowing neon lines, holographic haze
CENTER: Dynamic action pose of "${p.name}" in ${p.school} football uniform, chrome and neon rim lighting, particle effects
TOP BANNER: Glowing cyan "RISING" label with upward arrow
BOTTOM: Bold neon "${p.name.toUpperCase()}" in chrome+neon typography
BELOW: "${p.position}  |  ${p.school}" in smaller neon text
STAT BADGE: Hexagonal cyan badge showing "${p.grade}"
Style: Blade Runner sports card, synthwave, neon grid, chrome surfaces. All text sharp and legible against the neon glow.`,
    negativePrompt: 'dim, washed out, blurry text, amateur, daytime',
  },

  /* ═══ RETRO TOPPS — 80s throwback ═══ */
  retro_topps: {
    name: 'Retro Topps',
    description: '1980s Topps-style throwback. Cream border, classic typography, nostalgic vibe.',
    tierMatch: 'all',
    engine: 'ideogram',
    aspectRatio: '3x4',
    promptTemplate: (p) => `Classic 1980s style sports trading card. Cream white border with subtle halftone print texture.
TOP BANNER: Colorful diagonal "${p.school}" banner in school colors with vintage felt texture
CENTER: Action photo of "${p.name}" in ${p.school} football uniform, authentic 1980s sports photography aesthetic, slight film grain
BOTTOM PLATE: Cream nameplate with "${p.name.toUpperCase()}" in bold vintage serif
POSITION LABEL: "${p.position}" in retro block letters
CORNER: Small circular team logo stamp
Style: Authentic 1987 Topps trading card, cream and school-color palette, slight vintage wear, newsprint halftone background, nostalgic baseball card aesthetic adapted for football. All text crisp and legible despite retro feel.`,
    negativePrompt: 'modern, digital, neon, futuristic, holographic',
  },

  /* ═══ BROADCAST ESPN — TV graphics style ═══ */
  broadcast_espn: {
    name: 'Broadcast ESPN',
    description: 'ESPN broadcast title card style. For show graphics, not actual trading cards.',
    tierMatch: 'all',
    engine: 'ideogram',
    aspectRatio: '4x5',
    promptTemplate: (p) => `ESPN-quality broadcast title card graphic. Widescreen composition.
LEFT SIDE: Large portrait cutout of "${p.name}" in ${p.school} football uniform, dramatic broadcast studio lighting
RIGHT SIDE: Statistics panel with bold white text
TOP RIGHT: "Per|Form" logo mark (small, top corner)
MAIN TITLE: "${p.name.toUpperCase()}" in huge ESPN-style 3D extruded white letters
SUBTITLE: "${p.position}  |  ${p.school.toUpperCase()}" in cyan broadcast font
STAT BOX: Gold "TIE ${p.grade}" badge prominently displayed
Background: Dark broadcast studio with subtle team color gradient accent
Style: ESPN College GameDay title card production quality, 3D extruded typography, dramatic sports broadcast aesthetic. All text sharp, properly kerned, ESPN-legible.`,
    negativePrompt: 'amateur graphics, blurry text, cartoon, vintage',
  },

  /* ═══ DRAFT NIGHT — For top-tier draft prospects ═══ */
  draft_night: {
    name: 'Draft Night',
    description: 'Dramatic draft-day stage aesthetic. For NFL Draft vertical top prospects.',
    tierMatch: 'all',
    engine: 'ideogram',
    aspectRatio: '3x4',
    promptTemplate: (p) => `Cinematic NFL Draft stage trading card.
BACKGROUND: Dark draft stage with dramatic spotlight from above, gold confetti falling in slow motion, blurred packed crowd silhouettes
CENTERPIECE: "${p.name}" in ${p.school} football uniform stepping forward into the spotlight, gold rim lighting, emotional moment captured
TOP: "NFL DRAFT 2026" banner in bold gold typography
BOTTOM PLATE: Black leather nameplate with "${p.name.toUpperCase()}" in gold foil
BELOW: "${p.position} · ${p.school}" in elegant sans serif
CORNER STAMP: Gold circular "ROUND ${p.projectedRound}" stamp
Style: Draft day photojournalism, ESPN broadcast quality, cinematic lighting, emotional sports moment. All text sharp and legible against dark background.`,
    negativePrompt: 'daytime, bright, cartoon, blurry text, amateur',
  },

  /* ═══ PERFORMANCE STAT — Data-forward ═══ */
  performance_stat: {
    name: 'Performance Stat',
    description: 'Data-driven analytics aesthetic. Chart overlays, stat-forward design.',
    tierMatch: 'all',
    engine: 'ideogram',
    aspectRatio: '3x4',
    promptTemplate: (p) => `Data-forward analytics sports card. Clean modern design.
TOP 60%: Portrait of "${p.name}" in ${p.school} uniform, blurred background, professional headshot lighting
OVERLAY: Subtle grid lines and data points, chart-style graphics floating around portrait
BOTTOM 40%: Dark panel with stat readouts in monospace font, charts, percentile bars
HEADER TEXT: "${p.name.toUpperCase()}" in clean bold sans serif
STAT LABELS: "TIE GRADE ${p.grade}", "POS RANK", "PROJ RD ${p.projectedRound}"
Style: Bloomberg Terminal meets sports card, data-forward, minimal, monochromatic with accent color. All numbers and text razor-sharp.`,
    negativePrompt: 'cartoon, busy, blurry text, washed out',
  },

  /* ═══ HS RECRUIT — High school recruiting card ═══ */
  hs_recruit: {
    name: 'HS Recruit',
    description: 'High school recruit card — school colors variable, ranks/stars visible.',
    tierMatch: 'all',
    engine: 'ideogram',
    aspectRatio: '3x4',
    promptTemplate: (p) => `High school football recruit card.
TOP: School banner "${p.school.toUpperCase()}" with team logo
CENTER: Confident portrait of young high school player in ${p.school} uniform
STAR RATING: Row of 4 gold stars prominently displayed
BOTTOM: "${p.name.toUpperCase()}" in bold varsity block letters
POSITION BANNER: "${p.position}" in school colors
BADGE: "CLASS OF 2027" in white text
Style: 247Sports / Rivals recruiting card aesthetic, authentic high school sports photography, school pride, clean composition. All text sharp and legible.`,
    negativePrompt: 'pro, NFL, blurry text, amateur quality',
  },

  /* ═══ NIL PORTFOLIO — Endorsement-ready ═══ */
  nil_portfolio: {
    name: 'NIL Portfolio',
    description: 'NIL endorsement-ready portfolio card. Premium, brand-forward, lifestyle.',
    tierMatch: 'all',
    engine: 'ideogram',
    aspectRatio: '4x5',
    promptTemplate: (p) => `Premium NIL portfolio card for student-athlete. Brand-forward lifestyle aesthetic.
COMPOSITION: Three-quarter fashion-style photograph of "${p.name}" in ${p.school} apparel, looking confident at camera, clean studio background
TOP: Minimal "Per|Form" mark and "${p.school}" tag
BOTTOM NAMEPLATE: "${p.name.toUpperCase()}" in elegant modern sans serif
TAGS: Small pills showing "${p.position}" | "NIL READY" | "VERIFIED"
Style: Nike campaign meets luxury portfolio, clean lifestyle photography, magazine cover aesthetic, premium brand positioning. All text crisp.`,
    negativePrompt: 'cluttered, busy, amateur, blurry text',
  },

  /* ═══ FLAG FOOTBALL — Olympic 5v5 athlete ═══ */
  flag_football: {
    name: 'Flag Football',
    description: 'Flag football athlete card for the LA 2028 Olympic vertical.',
    tierMatch: 'all',
    engine: 'ideogram',
    aspectRatio: '3x4',
    promptTemplate: (p) => `Olympic flag football athlete card.
TOP: "LA 2028" Olympic rings banner
CENTER: Dynamic action shot of "${p.name}" in flag football jersey with flag belt, no helmet, mid-stride on 5v5 field
BOTTOM PLATE: "${p.name.toUpperCase()}" in bold Olympic typography
POSITION: "${p.position}" in smaller Olympic text
BADGE: "TEAM USA" flag emblem
Style: Olympic broadcast quality, dynamic sports photography, no tackle football helmets or pads, authentic 5v5 flag football aesthetic. All text crisp.`,
    negativePrompt: 'helmet, pads, tackle football, amateur, blurry text',
  },
};

/* ── Helper: Pick card style by TIE grade ── */
export function pickStyleByGrade(grade: number, preferredVariation?: CardVariation): CardVariation {
  if (preferredVariation) return preferredVariation;

  if (grade >= 95) return 'mythic_gold';
  if (grade >= 88) return 'blue_chip';
  if (grade >= 83) return 'classic_silver';
  if (grade >= 75) return 'obsidian';
  return 'retro_topps';
}

/* ── Helper: Build prompt for a specific style ── */
export function buildCardPrompt(
  variation: CardVariation,
  input: CardPromptInput,
): { prompt: string; negativePrompt?: string; engine: 'ideogram' | 'recraft'; aspectRatio: string } {
  const spec = CARD_STYLES[variation];
  return {
    prompt: spec.promptTemplate(input),
    negativePrompt: spec.negativePrompt,
    engine: spec.engine,
    aspectRatio: spec.aspectRatio,
  };
}

/* ── Export all variations as a list for UI pickers ── */
export function listCardVariations(): Array<{ id: CardVariation; name: string; description: string }> {
  return Object.entries(CARD_STYLES).map(([id, spec]) => ({
    id: id as CardVariation,
    name: spec.name,
    description: spec.description,
  }));
}
