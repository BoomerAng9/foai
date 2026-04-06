/**
 * Per|Form Player Card Style System
 * ===================================
 * Multiple visual variations, each tied to specific use cases and TIE grades.
 * Routes to Ideogram V3 for text-critical cards, Recraft V4 for image-heavy cards.
 *
 * CRITICAL RULES (from user feedback):
 * 1. Every card subject wears a football HELMET with BLACK/MIRROR VISOR
 * 2. NEVER describe or reference team logos, mascots, conference marks — AI hallucinates them
 * 3. Use team COLORS to imply branding, never team NAMES on uniforms/helmets
 * 4. Text (name, position) goes on NAMEPLATE/BANNER zones, never on jerseys or helmets
 */

export type CardVariation =
  | 'classic_silver'
  | 'mythic_gold'
  | 'blue_chip'
  | 'obsidian'
  | 'neon_future'
  | 'retro_topps'
  | 'broadcast_espn'
  | 'draft_night'
  | 'performance_stat'
  | 'hs_recruit'
  | 'nil_portfolio'
  | 'flag_football';

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
  teamColors?: string;       // Actual school colors (for reveal state)
  state?: 'locked' | 'reveal'; // Two-state card system
}

/* ── Brand colors per tier (for LOCKED state) ── */
function brandColorsForGrade(grade: number): string {
  if (grade >= 95) return 'pure gold and deep black';
  if (grade >= 88) return 'royal blue and electric orange';
  if (grade >= 83) return 'brushed silver and charcoal';
  if (grade >= 75) return 'matte black and bronze';
  return 'cream and navy';
}

/* ── SHARED ATHLETE SPEC — differs by state ── */
function athleteVisual(p: CardPromptInput): string {
  const state = p.state || 'locked';

  if (state === 'locked') {
    // LOCKED: Per|Form brand colors only, no school identity revealed
    const colors = brandColorsForGrade(p.grade);
    return `football athlete wearing a modern sleek helmet with a reflective BLACK MIRROR visor (fully opaque, face hidden behind visor), matte ${colors} helmet shell with minimal geometric stripe (NO logos, NO decals, NO team marks, NO text on helmet), jersey in ${colors}, solid blank chest panels without any lettering numbers or logos, athletic shoulder pads beneath jersey. Mysterious silhouetted pose.`;
  }

  // REVEAL: Actual school colors, still no hallucinated logos
  const colors = p.teamColors || 'deep crimson and gold';
  return `football athlete wearing a modern sleek helmet with a reflective BLACK MIRROR visor (fully opaque, face partially obscured), matte ${colors} helmet shell with simple geometric stripe pattern (NO logos, NO decals, NO conference marks, NO NCAA marks, NO team name text), jersey in ${colors}, solid chest panels without any lettering or numbers or logos on the chest, athletic shoulder pads beneath jersey. Confident hero pose.`;
}

/* ── Per|Form Card Style Library ── */
export const CARD_STYLES: Record<CardVariation, CardStyleSpec> = {

  /* ═══ CLASSIC SILVER ═══ */
  classic_silver: {
    name: 'Classic Silver',
    description: 'Silver metallic border with clean chrome aesthetic. Sports card classic.',
    tierMatch: 'all',
    engine: 'ideogram',
    aspectRatio: '3x4',
    promptTemplate: (p) => `Premium sports trading card in portrait format. Brushed silver metallic border with subtle holographic sheen.
CENTER SUBJECT: A ${athleteVisual(p)}, facing camera in heroic three-quarter pose, dramatic studio lighting, atmospheric dark background with slight gold rim light
TOP RIGHT CORNER: Large silver chrome numeral "${p.jerseyNumber || '7'}" as a decorative element (not on the jersey)
BOTTOM NAMEPLATE: Silver gradient banner with dark text "${p.name.toUpperCase()}" in bold modern sans serif
BELOW NAMEPLATE: "${p.position.toUpperCase()}" in slightly smaller silver metallic text
Style: Premium sports trading card, hyper-realistic rendering, cinematic lighting, professional photography quality. All text must be sharp, properly spelled, and centered. No fake logos anywhere.`,
    negativePrompt: 'team logos, mascot logos, conference logos, NFL logo, NCAA logo, letters on helmet, letters on jersey, no helmet, blurry text, misspelled, distorted, cartoon, amateur, watermark, garbled letters, text on chest, team name on uniform',
  },

  /* ═══ MYTHIC GOLD ═══ */
  mythic_gold: {
    name: 'Mythic Gold',
    description: 'Gold foil holographic for Generational grade (95+). Rarest tier.',
    tierMatch: 'mythic',
    engine: 'ideogram',
    aspectRatio: '3x4',
    promptTemplate: (p) => {
      const isLocked = (p.state || 'locked') === 'locked';
      return `Ultra-premium mythic-tier sports trading card. Gold foil holographic border with radiating light rays behind the subject.
CENTER SUBJECT: An epic ${athleteVisual(p)}, hero pose, dramatic backlight with gold particle effects and lens flare, slow-motion sparks
TOP BANNER: "${isLocked ? 'CLASSIFIED' : 'GENERATIONAL'}" in gold letterpress type, clean and legible
BOTTOM NAMEPLATE: Large bold "${isLocked ? '████████████' : p.name.toUpperCase()}" in gold metallic foil typography
BELOW NAMEPLATE: "${isLocked ? '???' : p.position}" in refined gold serif
CIRCULAR BADGE TOP LEFT: Gold TIE grade medallion displaying the ${isLocked ? 'text "?"' : `number "${p.grade}"`} in elegant engraved typography
Style: Legendary museum-quality trading card, gold and obsidian black palette, cinematic rim lighting, prestige sports aesthetic. Every text element sharp and legible.`;
    },
    negativePrompt: 'team logos, mascot logos, conference marks, letters on helmet, letters on jersey, no helmet, visible face full on, open visor, blurry text, amateur, watermark, generic, flat lighting, misspelled, cartoon',
  },

  /* ═══ BLUE CHIP ═══ */
  blue_chip: {
    name: 'Blue Chip',
    description: 'Royal blue + orange — Per|Form alternate brand colorway. Legendary tier.',
    tierMatch: 'legendary',
    engine: 'ideogram',
    aspectRatio: '3x4',
    promptTemplate: (p) => `Premium sports trading card. Royal blue metallic border with bright orange electric accents.
BACKGROUND: Deep royal blue gradient with subtle orange rim lighting from camera left
CENTER SUBJECT: A ${athleteVisual(p).replace(/deep crimson and black|[^,]* helmet shell/, 'royal blue helmet shell')}, confident three-quarter pose, dramatic orange stage lighting
TOP: Orange banner with "BLUE CHIP" text in bold white
BOTTOM NAMEPLATE: Large bold "${p.name.toUpperCase()}" in clean white serif on dark blue plate
BELOW NAMEPLATE: "${p.position}" in orange refined text
CORNER DIAMOND: Orange diamond-shaped TIE badge with the number "${p.grade}" centered
Style: Premium trading card quality, royal blue and orange palette only, cinematic sports photography. Crisp text, no distortion, no fake logos.`,
    negativePrompt: 'gold, silver, team logos, mascot logos, letters on helmet, letters on jersey, no helmet, open visor, blurry text, amateur, generic, misspelled',
  },

  /* ═══ OBSIDIAN ═══ */
  obsidian: {
    name: 'Obsidian',
    description: 'Ultra-minimal black matte card, luxury aesthetic.',
    tierMatch: 'all',
    engine: 'ideogram',
    aspectRatio: '3x4',
    promptTemplate: (p) => `Ultra-premium minimalist sports trading card. Pure matte black background with hairline gold pinstripe border.
CENTER SUBJECT: A ${athleteVisual(p)}, sidelit dramatically from single gold light source, deep black shadows consuming most of the frame, only the helmet silhouette and shoulder line defined
MINIMAL TEXT: Only the name "${p.name.toUpperCase()}" in elegant thin gold serif at the bottom, lots of negative space around it
TINY SUBTEXT: "${p.position}" centered below name in light gold sans serif
Style: Louis Vuitton meets sports card, understated luxury, matte finish, Netflix documentary cinematography, maximum negative space, razor-sharp text.`,
    negativePrompt: 'busy, cluttered, bright, colorful, cartoon, team logos, letters on helmet, letters on jersey, no helmet, open visor, blurry text, amateur',
  },

  /* ═══ NEON FUTURE ═══ */
  neon_future: {
    name: 'Neon Future',
    description: 'Cyberpunk aesthetic for rising prospects. Electric cyan and magenta glow.',
    tierMatch: 'all',
    engine: 'ideogram',
    aspectRatio: '3x4',
    promptTemplate: (p) => `Cyberpunk sports trading card. Electric cyan and magenta neon border glow.
BACKGROUND: Dark futuristic grid with glowing neon horizon lines, holographic haze particles
CENTER SUBJECT: A ${athleteVisual(p)}, dynamic action pose, chrome and neon rim lighting, particle effects, slight motion blur on edges
TOP BANNER: Glowing cyan "RISING" label with upward triangle arrow
BOTTOM NAMEPLATE: Bold chrome "${p.name.toUpperCase()}" with cyan and magenta edge glow
BELOW NAMEPLATE: "${p.position}" in smaller neon magenta text
HEXAGONAL BADGE: Cyan hexagon showing "${p.grade}" in bright digital typography
Style: Blade Runner sports card, synthwave aesthetic, neon grid, chrome surfaces, cyberpunk mood. All text razor sharp against the neon glow.`,
    negativePrompt: 'daytime, washed out, team logos, letters on helmet, letters on jersey, no helmet, open visor, blurry text, amateur',
  },

  /* ═══ RETRO TOPPS ═══ */
  retro_topps: {
    name: 'Retro Topps',
    description: '1980s Topps-style throwback with cream border and classic typography.',
    tierMatch: 'all',
    engine: 'ideogram',
    aspectRatio: '3x4',
    promptTemplate: (p) => `Classic 1980s style sports trading card. Cream white border with subtle halftone print texture.
TOP BANNER: Colorful diagonal banner in team colors with vintage felt texture (NO text or logos on the banner)
CENTER SUBJECT: A ${athleteVisual(p)}, authentic 1980s sports photography aesthetic, film grain, muted color palette
BOTTOM PLATE: Cream nameplate with "${p.name.toUpperCase()}" in bold vintage serif
POSITION LABEL: "${p.position}" in retro block letters
Style: Authentic 1987 Topps trading card, cream and team-color palette, vintage wear, newsprint halftone background, nostalgic aesthetic. All text crisp and legible despite retro feel. No fake logos, no team names visible.`,
    negativePrompt: 'modern, digital, neon, futuristic, holographic, team logos, letters on helmet, no helmet, open visor, blurry text',
  },

  /* ═══ BROADCAST ESPN ═══ */
  broadcast_espn: {
    name: 'Broadcast ESPN',
    description: 'ESPN broadcast title card style. For show graphics.',
    tierMatch: 'all',
    engine: 'ideogram',
    aspectRatio: '4x5',
    promptTemplate: (p) => `ESPN-quality broadcast title card graphic.
LEFT SIDE: Large portrait cutout of a ${athleteVisual(p)}, dramatic broadcast studio lighting
RIGHT SIDE: Statistics panel with clean white text on dark background
MAIN TITLE: "${p.name.toUpperCase()}" in huge white 3D extruded broadcast typography
SUBTITLE: "${p.position}" in cyan broadcast font
STAT BOX: Gold "TIE ${p.grade}" badge prominently displayed
Background: Dark broadcast studio with subtle team-color gradient accent
Style: ESPN College GameDay title card production quality, 3D extruded typography, dramatic sports broadcast aesthetic. All text sharp, properly kerned, network legible. No team logos or conference marks.`,
    negativePrompt: 'amateur graphics, team logos, conference marks, letters on helmet, no helmet, open visor, blurry text, cartoon, vintage',
  },

  /* ═══ DRAFT NIGHT ═══ */
  draft_night: {
    name: 'Draft Night',
    description: 'Dramatic draft-day stage aesthetic for NFL Draft vertical top prospects.',
    tierMatch: 'all',
    engine: 'ideogram',
    aspectRatio: '3x4',
    promptTemplate: (p) => `Cinematic NFL Draft stage trading card.
BACKGROUND: Dark draft stage with dramatic spotlight from above, gold confetti falling in slow motion, blurred packed crowd silhouettes
CENTERPIECE: A ${athleteVisual(p)} stepping forward into the spotlight, gold rim lighting, emotional hero moment
TOP BANNER: "2026 NFL DRAFT" in bold gold typography (clean, no fake league marks)
BOTTOM NAMEPLATE: Black leather plate with "${p.name.toUpperCase()}" in gold foil
BELOW NAMEPLATE: "${p.position}" in elegant sans serif
CORNER STAMP: Gold circular "ROUND ${p.projectedRound}" wax seal
Style: Draft day photojournalism, broadcast quality, cinematic lighting, emotional sports moment. All text sharp and legible. No fake NFL shield or conference marks.`,
    negativePrompt: 'daytime, bright, cartoon, NFL shield logo, team logos, conference marks, letters on helmet, no helmet, open visor, blurry text, amateur',
  },

  /* ═══ PERFORMANCE STAT ═══ */
  performance_stat: {
    name: 'Performance Stat',
    description: 'Data-driven analytics aesthetic with chart overlays.',
    tierMatch: 'all',
    engine: 'ideogram',
    aspectRatio: '3x4',
    promptTemplate: (p) => `Data-forward analytics sports card. Clean modern design.
TOP 60%: A ${athleteVisual(p)}, professional headshot-style crop, blurred background with subtle data grid overlay
OVERLAY: Subtle grid lines and data points, chart-style graphics floating around the subject
BOTTOM 40%: Dark panel with stat readouts in monospace font, percentile bars
HEADER TEXT: "${p.name.toUpperCase()}" in clean bold sans serif
STAT LABELS: "TIE GRADE ${p.grade}", "PROJ RD ${p.projectedRound}", "${p.position}"
Style: Bloomberg Terminal meets sports card, data-forward, minimal, monochromatic with single accent color. All numbers and text razor sharp.`,
    negativePrompt: 'cartoon, busy, team logos, letters on helmet, no helmet, open visor, blurry text, washed out',
  },

  /* ═══ HS RECRUIT ═══ */
  hs_recruit: {
    name: 'HS Recruit',
    description: 'High school recruit card — star rating visible.',
    tierMatch: 'all',
    engine: 'ideogram',
    aspectRatio: '3x4',
    promptTemplate: (p) => `High school football recruit card.
TOP: Clean banner with "RECRUIT" in white varsity block letters (no school name, no logos)
CENTER: A ${athleteVisual(p)}, confident portrait of young high school player, clean studio lighting
STAR RATING: Row of 4 bright gold five-pointed stars prominently displayed below the subject
BOTTOM PLATE: "${p.name.toUpperCase()}" in bold varsity block letters
POSITION BANNER: "${p.position}" in accent color
BOTTOM RIGHT: "CLASS OF 2027" in small white text
Style: 247Sports / Rivals recruiting card aesthetic, authentic high school sports photography, school-pride vibe, clean composition. All text sharp and legible. No fake school logos.`,
    negativePrompt: 'pro, NFL logo, team logos, conference logos, letters on helmet, no helmet, open visor, blurry text, amateur',
  },

  /* ═══ NIL PORTFOLIO ═══ */
  nil_portfolio: {
    name: 'NIL Portfolio',
    description: 'NIL endorsement-ready lifestyle card.',
    tierMatch: 'all',
    engine: 'ideogram',
    aspectRatio: '4x5',
    promptTemplate: (p) => `Premium NIL portfolio card for student-athlete. Brand-forward lifestyle aesthetic.
COMPOSITION: Three-quarter fashion-style photograph of a ${athleteVisual(p)}, looking confident at camera, clean studio seamless background
TOP: Minimal "Per|Form" wordmark in small gold text, top-left
BOTTOM NAMEPLATE: "${p.name.toUpperCase()}" in elegant modern sans serif
PILL TAGS: Small rounded tags below the name showing "${p.position}" | "NIL READY" | "VERIFIED"
Style: Nike campaign meets luxury portfolio, clean lifestyle photography, magazine cover aesthetic, premium brand positioning. All text crisp. No fake sponsor logos.`,
    negativePrompt: 'cluttered, busy, team logos, sponsor logos, conference marks, letters on helmet, no helmet, open visor, blurry text, amateur',
  },

  /* ═══ FLAG FOOTBALL ═══ */
  flag_football: {
    name: 'Flag Football',
    description: 'LA 2028 Olympic 5v5 flag football athlete card.',
    tierMatch: 'all',
    engine: 'ideogram',
    aspectRatio: '3x4',
    promptTemplate: (p) => `Olympic flag football athlete card.
TOP: Clean "LA 2028" banner in Olympic-style typography (no Olympic rings since IOC is strict)
CENTER: Dynamic action shot of a flag football athlete wearing a flag belt with yellow flags, lightweight performance jersey (NO helmet for flag football, NO logos on jersey), mid-stride on a green 5v5 field, bright daylight, no pads
BOTTOM PLATE: "${p.name.toUpperCase()}" in bold clean sans serif
POSITION: "${p.position}" in smaller text
BADGE: "TEAM USA" text badge in bottom-right corner
Style: Olympic broadcast quality, dynamic sports photography, authentic 5v5 flag football aesthetic. All text crisp. No helmets, no pads, no tackle football gear.`,
    negativePrompt: 'helmet, pads, tackle football, team logos, Olympic rings, IOC marks, blurry text, amateur',
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
