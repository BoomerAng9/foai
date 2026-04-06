/**
 * Unified Card & Image Generator
 * --------------------------------
 * Routes to the best engine per task:
 *
 * Recraft V4 — Hyper-realistic mockups, heroes, portraits ($0.04)
 * Ideogram 3.0 — Player cards with text rendering (free, 25/day)
 * Fallback — OpenRouter image gen (existing)
 */

import { generateImage, generateHeroImage, generateMockup, isRecraftConfigured } from './recraft';
import { generatePlayerCard as ideogramCard, isIdeogramConfigured } from './ideogram';

export type CardStyle = 'classic' | 'neon' | 'gold' | 'minimal';

export interface GeneratedCard {
  url: string;
  engine: 'recraft' | 'ideogram' | 'openrouter';
  model: string;
  cost: string;
}

/**
 * Generate a player card — routes to best available engine
 */
export async function generatePlayerCardImage(
  name: string,
  position: string,
  school: string,
  grade: number,
  tieGrade: string,
  projectedRound: number,
  nflComparison?: string,
  style: CardStyle = 'gold',
): Promise<GeneratedCard | null> {

  // Priority 1: Ideogram 3.0 — best text rendering for cards (free)
  if (isIdeogramConfigured()) {
    const result = await ideogramCard(name, position, school, grade, tieGrade, projectedRound, nflComparison);
    if (result) {
      return {
        url: result.url,
        engine: 'ideogram',
        model: 'Ideogram 3.0',
        cost: '$0.00',
      };
    }
  }

  // Priority 2: Recraft V4 — great design taste ($0.04)
  if (isRecraftConfigured()) {
    const styleMap: Record<CardStyle, string> = {
      gold: 'Premium gold and black sports card, cinematic lighting, matte finish',
      neon: 'Neon cyberpunk sports card, glowing edges, dark background',
      classic: 'Classic Topps-style sports card, clean white border, vintage typography',
      minimal: 'Minimalist sports card, clean lines, lots of whitespace, modern sans-serif',
    };

    const result = await generateImage({
      prompt: `NFL Draft prospect card: ${name}, ${position}, ${school}. TIE Grade: ${grade} (${tieGrade}). Round ${projectedRound}. ${styleMap[style]}. Text must be perfectly legible. Professional design.`,
      model: 'recraftv4',
      style: 'digital_illustration',
      size: '1024x1536',
    });

    if (result) {
      return {
        url: result.url,
        engine: 'recraft',
        model: 'Recraft V4',
        cost: '$0.04',
      };
    }
  }

  return null;
}

/**
 * Generate platform marketing visuals via Recraft V4
 */
export async function generateMarketingAsset(
  type: 'hero' | 'mockup' | 'banner' | 'social',
  subject: string,
  context: string = '',
): Promise<GeneratedCard | null> {
  if (!isRecraftConfigured()) return null;

  let result;
  switch (type) {
    case 'hero':
      result = await generateHeroImage(subject, context);
      break;
    case 'mockup':
      result = await generateMockup(subject, context || 'a premium laptop screen in a dark studio');
      break;
    case 'banner':
      result = await generateImage({
        prompt: `Wide banner: ${subject}. ${context}. Professional sports broadcast quality, dark theme, gold accents (#D4A853), cinematic.`,
        model: 'recraftv4',
        style: 'Photorealism',
        size: '1536x1024',
      });
      break;
    case 'social':
      result = await generateImage({
        prompt: `Social media post: ${subject}. ${context}. Square format, eye-catching, bold text overlay area, dark background with gold highlights.`,
        model: 'recraftv4',
        style: 'digital_illustration',
        size: '1024x1024',
      });
      break;
  }

  if (result) {
    return {
      url: result.url,
      engine: 'recraft',
      model: type === 'hero' ? 'Recraft V4' : 'Recraft V4',
      cost: '$0.04',
    };
  }

  return null;
}
