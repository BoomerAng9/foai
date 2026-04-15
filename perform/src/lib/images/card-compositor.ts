/**
 * Card Compositor — Overlays REAL Per|Form logos onto AI-generated card art
 * ==========================================================================
 * AI generators cannot replicate our actual brand assets. This module:
 * 1. Takes a generated card image (URL or buffer)
 * 2. Composites the correct Per|Form logo variant on top
 * 3. Optionally adds a TIE grade badge
 * 4. Saves the final card to /public/generated/cards/
 *
 * Logo variants:
 *   - Crown (perform-crown-black.png) → grade 100+ / generational talents
 *   - Lion Dark (perform-lion-dark.png) → standard, dark card backgrounds
 *   - Lion Blue (perform-lion-blue.png) → blue/alternate colorway cards
 */

import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { type LogoVariant, LOGO_FILES, pickLogoVariant } from './card-aesthetics';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const OUTPUT_DIR = path.join(PUBLIC_DIR, 'generated', 'cards');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

export interface CompositeOptions {
  /** The base card image — URL or local file path */
  cardSource: string | Buffer;
  /** Player grade for logo variant selection */
  grade: number;
  /** Force a specific logo variant */
  logoVariant?: LogoVariant;
  /** Logo placement position */
  logoPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Logo size as percentage of card width (default: 20%) */
  logoScale?: number;
  /** Margin from edge in pixels (default: 24) */
  margin?: number;
  /** Output filename (without extension) */
  outputName: string;
}

export interface CompositeResult {
  localPath: string;      // /generated/cards/filename.png
  absolutePath: string;   // Full filesystem path
  width: number;
  height: number;
  logoVariant: LogoVariant;
}

/**
 * Download an image from URL to buffer
 */
async function fetchImage(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Composite a Per|Form logo onto a card image
 */
export async function compositeCard(opts: CompositeOptions): Promise<CompositeResult> {
  const {
    cardSource,
    grade,
    logoVariant: forcedVariant,
    logoPosition = 'top-left',
    logoScale = 20,
    margin = 24,
    outputName,
  } = opts;

  // Resolve logo variant — cards are always dark bg, so default to transparent logo
  const variant = forcedVariant || pickLogoVariant('dark');
  const logoPath = path.join(PUBLIC_DIR, LOGO_FILES[variant]);

  if (!fs.existsSync(logoPath)) {
    throw new Error(`Logo file not found: ${logoPath}`);
  }

  // Load card image
  let cardBuffer: Buffer;
  if (Buffer.isBuffer(cardSource)) {
    cardBuffer = cardSource;
  } else if (cardSource.startsWith('http')) {
    cardBuffer = await fetchImage(cardSource);
  } else {
    cardBuffer = fs.readFileSync(cardSource);
  }

  // Get card dimensions
  const cardMeta = await sharp(cardBuffer).metadata();
  const cardWidth = cardMeta.width || 1024;
  const cardHeight = cardMeta.height || 1536;

  // Resize logo to target size (percentage of card width)
  const logoTargetWidth = Math.round(cardWidth * (logoScale / 100));
  const logoResized = await sharp(logoPath)
    .resize(logoTargetWidth, null, { fit: 'inside', withoutEnlargement: false })
    .toBuffer();

  const logoMeta = await sharp(logoResized).metadata();
  const logoW = logoMeta.width || logoTargetWidth;
  const logoH = logoMeta.height || logoTargetWidth;

  // Calculate position
  let left = margin;
  let top = margin;

  switch (logoPosition) {
    case 'top-left':
      left = margin;
      top = margin;
      break;
    case 'top-right':
      left = cardWidth - logoW - margin;
      top = margin;
      break;
    case 'bottom-left':
      left = margin;
      top = cardHeight - logoH - margin;
      break;
    case 'bottom-right':
      left = cardWidth - logoW - margin;
      top = cardHeight - logoH - margin;
      break;
  }

  // Composite
  const outputBuffer = await sharp(cardBuffer)
    .composite([
      {
        input: logoResized,
        left: Math.max(0, left),
        top: Math.max(0, top),
      },
    ])
    .png()
    .toBuffer();

  // Save
  const outputFile = `${outputName}.png`;
  const outputPath = path.join(OUTPUT_DIR, outputFile);
  fs.writeFileSync(outputPath, outputBuffer);

  return {
    localPath: `/generated/cards/${outputFile}`,
    absolutePath: outputPath,
    width: cardWidth,
    height: cardHeight,
    logoVariant: variant,
  };
}

/**
 * Batch composite — process multiple cards
 */
export async function compositeCardBatch(
  cards: Array<{ source: string | Buffer; grade: number; name: string; theme?: 'dark' | 'light' }>,
): Promise<CompositeResult[]> {
  const results: CompositeResult[] = [];

  for (const card of cards) {
    try {
      const result = await compositeCard({
        cardSource: card.source,
        grade: card.grade,
        logoVariant: pickLogoVariant(card.theme || 'dark'),
        outputName: card.name,
      });
      results.push(result);
    } catch (err) {
      console.error(`[Compositor] Failed for ${card.name}:`, err);
    }
  }

  return results;
}
