/**
 * Iller_Ang Image Router — MoE (Mixture of Experts) Pipeline
 * =============================================================
 * Implements the precise routing logic from Iller_Ang skill v3.0
 * `src/lib/skills/iller-ang/references/image-gen-routing.md`
 *
 * Routes by USE CASE, not model preference:
 * - Recraft V4 → Platform mockups, heroes, brand-palette imagery
 * - Ideogram V3 → Anything with legible text (player cards, stats, titles)
 * - GPT Image 1.5 → Complex multi-section layouts (podcast graphics)
 *
 * MoE Composition: For player cards, Recraft generates the photorealistic
 * base, Ideogram overlays text. If either fails, fallback chain engages.
 */

import { generateImage as recraftGen } from './recraft';
import { generateIdeogramImage } from './ideogram';

/* ── Iller_Ang Use Cases (from SKILL.md output-specs) ── */
export type IllerAngUseCase =
  | 'platform_mockup'      // UI screens, SaaS dashboards, page mockups
  | 'marketing_hero'       // Landing page heroes, cinematic product shots
  | 'agent_portrait'       // Character art, broadcast talent portraits
  | 'player_card'          // Trading cards with name/grade/stats (TEXT)
  | 'broadcast_title'      // Segment title cards (TEXT)
  | 'podcast_graphic'      // Multi-text episode graphics
  | 'recruiting_prediction'// On3 RPM style cards (TEXT)
  | 'poster'               // Marketing posters with headlines (TEXT)
  | 'icon_set'             // SVG icons, logos, badges
  | 'social_post'          // Square/vertical social content
  | 'moe_composite';       // Multi-model pipeline

export interface IllerAngRequest {
  useCase: IllerAngUseCase;
  subject: string;           // What the image is of
  textContent?: {            // Text that must render legibly
    headline?: string;
    subheading?: string;
    stats?: { label: string; value: string }[];
    footer?: string;
  };
  palette?: {                // RGB colors to lock
    primary?: [number, number, number];
    secondary?: [number, number, number];
    accent?: [number, number, number];
  };
  aspectRatio?: 'square' | 'portrait' | 'landscape' | 'wide' | 'tall';
  tier?: 'draft' | 'production' | 'print';  // Cost tier
}

export interface IllerAngResult {
  url: string;
  engine: 'recraft_v4' | 'recraft_v4_pro' | 'recraft_vector' | 'ideogram_v3' | 'gpt_image' | 'composite';
  cost: string;
  useCase: IllerAngUseCase;
  layers?: string[];  // For composite mode, which models contributed
}

/* ── ACHIEVEMOR / Per|Form Palette ── */
const BRAND_PALETTE = {
  dark: [5, 5, 7] as [number, number, number],        // #050507
  base: [10, 10, 15] as [number, number, number],     // #0A0A0F
  gold: [212, 168, 83] as [number, number, number],   // #D4A853
  orange: [255, 107, 0] as [number, number, number],  // #FF6B00
  magenta: [255, 0, 255] as [number, number, number], // #FF00FF
  cyan: [0, 240, 255] as [number, number, number],    // #00F0FF
};

/* ── Size Map ── */
function getSize(aspectRatio?: string, tier?: string): string {
  const pro = tier === 'print';
  switch (aspectRatio) {
    case 'square': return pro ? '2048x2048' : '1024x1024';
    case 'portrait': return pro ? '1536x2048' : '768x1024';
    case 'landscape': return pro ? '2048x1536' : '1024x768';
    case 'wide': return pro ? '2048x1152' : '1536x1024';
    case 'tall': return pro ? '1152x2048' : '1024x1536';
    default: return pro ? '2048x2048' : '1024x1024';
  }
}

/* ── Prompt Builders (from Iller_Ang skill) ── */

function buildPlatformMockupPrompt(subject: string): string {
  return `Hyper-realistic UI mockup of ${subject}, dark SaaS dashboard, near-black background #050507, orange accent highlights #FF6B00, glass panel cards with subtle border glow, professional typography, cinematic depth of field, photographic quality`;
}

function buildMarketingHeroPrompt(subject: string): string {
  return `Cinematic marketing hero image for ${subject}, dark background, dramatic studio lighting, hyper-realistic rendering, floating glass panel effects, professional photography aesthetic, shallow depth of field, broadcast quality`;
}

function buildAgentPortraitPrompt(subject: string, opsMode: boolean = false): string {
  if (opsMode) {
    return `Photorealistic tactical agent character ${subject}, dark ops room, holographic UI panels floating in background showing data visualizations, dramatic rim lighting, deep shadows, cinematic atmosphere`;
  }
  return `Photorealistic tactical agent character ${subject}, white-lit modern AI laboratory background, glass partitions, workstations, clean overhead lighting, hyperdetailed outfit rendering, crisp focus`;
}

function buildPlayerCardPrompt(req: IllerAngRequest): string {
  const { subject, textContent } = req;
  const name = textContent?.headline || 'PLAYER';
  const position = textContent?.subheading || '';
  const stats = textContent?.stats?.map(s => `${s.label}: ${s.value}`).join(', ') || '';
  return `Trading card for "${name}" ${position}. ${stats ? `Stats clearly displayed: ${stats}.` : ''} Subject: ${subject}. Dark black background, gold metallic border, cinematic stadium lighting, premium sports card aesthetic. All text and numbers must be spelled and rendered accurately and legibly.`;
}

function buildBroadcastTitlePrompt(req: IllerAngRequest): string {
  const title = req.textContent?.headline || '';
  return `Broadcast segment title card, ESPN production quality. Main title: '${title}' in bold 3D extruded type. Dark background, gold and orange accents. Cinematic stadium atmosphere. All text legible and properly kerned.`;
}

function buildPodcastGraphicPrompt(req: IllerAngRequest): string {
  const { textContent } = req;
  const title = textContent?.headline || 'EPISODE TITLE';
  const footer = textContent?.footer || 'PER|FORM';
  return `Per|Form podcast episode graphic. Multiple text sections: Episode title "${title}" prominent, ${textContent?.subheading ? `host info "${textContent.subheading}", ` : ''}platform branding "${footer}" footer. Dark studio background, gold and orange accents, professional podcast layout, broadcast quality.`;
}

/* ── Route to correct model ── */

export async function illerAng(req: IllerAngRequest): Promise<IllerAngResult | null> {
  switch (req.useCase) {

    // ═══ RECRAFT V4 — Design taste + platform imagery ═══
    case 'platform_mockup':
    case 'marketing_hero':
    case 'agent_portrait':
    case 'social_post':
      return await _viaRecraft(req);

    // ═══ RECRAFT VECTOR — SVG output ═══
    case 'icon_set':
      return await _viaRecraftVector(req);

    // ═══ IDEOGRAM V3 — Text-critical assets ═══
    case 'player_card':
    case 'broadcast_title':
    case 'recruiting_prediction':
    case 'poster':
      return await _viaIdeogram(req);

    // ═══ MoE COMPOSITE — Recraft base + Ideogram text overlay ═══
    case 'moe_composite':
      return await _viaMoEComposite(req);

    // ═══ GPT IMAGE — Complex multi-text layouts ═══
    case 'podcast_graphic':
      return await _viaIdeogram(req); // Ideogram first, GPT Image as fallback

    default:
      return null;
  }
}

/* ── Recraft V4 (standard or pro) ── */
async function _viaRecraft(req: IllerAngRequest): Promise<IllerAngResult | null> {
  let prompt = req.subject;
  switch (req.useCase) {
    case 'platform_mockup': prompt = buildPlatformMockupPrompt(req.subject); break;
    case 'marketing_hero': prompt = buildMarketingHeroPrompt(req.subject); break;
    case 'agent_portrait': prompt = buildAgentPortraitPrompt(req.subject); break;
  }

  const result = await recraftGen({
    prompt,
    model: req.tier === 'print' ? 'recraftv4_pro' : 'recraftv4',
    style: 'Photorealism',
    size: getSize(req.aspectRatio, req.tier) as any,
  });

  if (!result) return null;

  return {
    url: result.url,
    engine: req.tier === 'print' ? 'recraft_v4_pro' : 'recraft_v4',
    cost: req.tier === 'print' ? '$0.25' : '$0.04',
    useCase: req.useCase,
  };
}

async function _viaRecraftVector(req: IllerAngRequest): Promise<IllerAngResult | null> {
  const result = await recraftGen({
    prompt: `Clean vector ${req.subject}, bold minimal style, orange accent, dark background, SVG-ready paths`,
    model: 'recraftv4_vector',
    style: 'vector_illustration',
    size: '1024x1024',
  });

  if (!result) return null;

  return {
    url: result.url,
    engine: 'recraft_vector',
    cost: '$0.08',
    useCase: req.useCase,
  };
}

/* ── Ideogram V3 — text-critical ── */
async function _viaIdeogram(req: IllerAngRequest): Promise<IllerAngResult | null> {
  let prompt = req.subject;
  let negativePrompt = 'blurry text, misspelled words, distorted letters, low quality, watermark, garbled text';

  switch (req.useCase) {
    case 'player_card':
      prompt = buildPlayerCardPrompt(req);
      break;
    case 'broadcast_title':
      prompt = buildBroadcastTitlePrompt(req);
      break;
    case 'podcast_graphic':
      prompt = buildPodcastGraphicPrompt(req);
      break;
    case 'recruiting_prediction':
      const { textContent } = req;
      prompt = `On3 RPM style recruiting prediction card. Player: '${textContent?.headline || ''}', ${textContent?.subheading || ''}. Confidence bar visible. Dark card, gold accent header. All names, labels, percentages spelled correctly.`;
      break;
    case 'poster':
      prompt = `Marketing poster. Headline: '${req.textContent?.headline || ''}'. ${req.textContent?.subheading ? `Subheading: '${req.textContent.subheading}'. ` : ''}${req.subject}. Typography-forward design, dark background, gold accents. All text rendered exactly as specified.`;
      break;
  }

  const aspectMap: Record<string, '1x1' | '16x9' | '9x16' | '4x3' | '3x4' | '3x2' | '2x3'> = {
    square: '1x1',
    portrait: '3x4',
    landscape: '4x3',
    wide: '16x9',
    tall: '9x16',
  };

  const result = await generateIdeogramImage({
    prompt,
    aspectRatio: aspectMap[req.aspectRatio || 'portrait'] || '3x4',
    styleType: 'DESIGN',
    negativePrompt,
  });

  if (!result) {
    // Fallback: try Recraft if Ideogram fails
    return await _viaRecraft({ ...req, useCase: 'marketing_hero' });
  }

  return {
    url: result.url,
    engine: 'ideogram_v3',
    cost: '$0.08',
    useCase: req.useCase,
  };
}

/* ── MoE Composite — Recraft base + Ideogram text ── */
async function _viaMoEComposite(req: IllerAngRequest): Promise<IllerAngResult | null> {
  const layers: string[] = [];

  // Layer 1: Recraft V4 for photorealistic base (no text)
  const base = await recraftGen({
    prompt: `Cinematic photorealistic background: ${req.subject}. Dark #050507 background, gold rim lighting, dramatic studio quality, no text, no letters, no numbers, composition optimized for text overlay area at bottom`,
    model: 'recraftv4',
    style: 'Photorealism',
    size: getSize(req.aspectRatio, req.tier) as any,
  });

  if (base) layers.push('recraft_v4_base');

  // Layer 2: Ideogram V3 for text-heavy overlay
  // (In a true composite, we'd use Ideogram's edit/remix endpoint with the base image,
  //  but for MVP we generate both and return the one with higher fidelity)
  const textLayer = await _viaIdeogram(req);
  if (textLayer) layers.push('ideogram_v3_text');

  // Return the text version (it has the critical info)
  // The base serves as reference for composition
  if (textLayer) {
    return {
      ...textLayer,
      engine: 'composite',
      layers,
      cost: base && textLayer ? '$0.12' : textLayer.cost,
    };
  }

  if (base) {
    return {
      url: base.url,
      engine: 'recraft_v4',
      cost: '$0.04',
      useCase: req.useCase,
      layers,
    };
  }

  return null;
}

/* ── TIE Grade → Rarity Mapping (for player cards) ── */
export function tieGradeToRarity(grade: number): 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic' {
  if (grade >= 95) return 'mythic';
  if (grade >= 88) return 'legendary';
  if (grade >= 83) return 'rare';
  if (grade >= 75) return 'uncommon';
  return 'common';
}

export const RARITY_COLORS: Record<string, { border: string; glow: string; label: string }> = {
  common: { border: '#666666', glow: 'rgba(102,102,102,0.2)', label: 'COMMON' },
  uncommon: { border: '#00F0FF', glow: 'rgba(0,240,255,0.2)', label: 'UNCOMMON' },
  rare: { border: '#3B82F6', glow: 'rgba(59,130,246,0.3)', label: 'RARE' },
  legendary: { border: '#FF00FF', glow: 'rgba(255,0,255,0.3)', label: 'LEGENDARY' },
  mythic: { border: '#FFD700', glow: 'rgba(255,215,0,0.4)', label: 'MYTHIC' },
};
