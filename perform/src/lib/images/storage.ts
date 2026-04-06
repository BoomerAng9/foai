/**
 * Image Storage Layer
 * ====================
 * Downloads ephemeral image URLs from Recraft/Ideogram/fal.ai
 * and saves them permanently to the Per|Form public directory.
 *
 * Recraft URLs = signed HTTP/2 paths with webp format
 * Ideogram URLs = ephemeral presigned URLs (expire in ~2 hours)
 *
 * Save everything locally so we own the assets and can serve
 * them from perform.foai.cloud at stable paths.
 */

import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';

const PUBLIC_IMAGES_DIR = join(process.cwd(), 'public', 'generated');
const PUBLIC_URL_PREFIX = '/generated';

/**
 * Download an image URL and save it to the public directory.
 * Returns the public URL path (relative to the site root).
 */
export async function saveImageFromUrl(
  sourceUrl: string,
  category: 'hero' | 'card' | 'banner' | 'social' | 'mockup' | 'video' | 'misc' = 'misc',
  filename?: string,
): Promise<string | null> {
  try {
    const res = await fetch(sourceUrl, {
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      console.error(`[Storage] Failed to download: ${res.status} ${sourceUrl}`);
      return null;
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    // Determine extension from content-type
    const contentType = res.headers.get('content-type') || 'image/png';
    const ext = contentType.includes('webp') ? 'webp'
      : contentType.includes('jpeg') ? 'jpg'
      : contentType.includes('svg') ? 'svg'
      : contentType.includes('mp4') ? 'mp4'
      : 'png';

    // Generate stable filename if not provided
    const name = filename || createHash('md5').update(sourceUrl).digest('hex').slice(0, 12);
    const finalName = `${name}.${ext}`;

    // Ensure directory exists
    const categoryDir = join(PUBLIC_IMAGES_DIR, category);
    await mkdir(categoryDir, { recursive: true });

    // Write the file
    const filePath = join(categoryDir, finalName);
    await writeFile(filePath, buffer);

    // Return public URL path
    return `${PUBLIC_URL_PREFIX}/${category}/${finalName}`;
  } catch (err) {
    console.error('[Storage] Save failed:', err);
    return null;
  }
}

/**
 * Save a player card image with the player's name as the filename
 */
export async function savePlayerCard(
  sourceUrl: string,
  playerName: string,
): Promise<string | null> {
  const slug = playerName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return saveImageFromUrl(sourceUrl, 'card', slug);
}

/**
 * Save a hero image with a descriptive name
 */
export async function saveHero(
  sourceUrl: string,
  name: string,
): Promise<string | null> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
  return saveImageFromUrl(sourceUrl, 'hero', slug);
}

/**
 * Save any generated image with a category
 */
export async function saveGenerated(
  sourceUrl: string,
  category: 'hero' | 'card' | 'banner' | 'social' | 'mockup' | 'video' | 'misc',
  name?: string,
): Promise<string | null> {
  const slug = name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
  return saveImageFromUrl(sourceUrl, category, slug);
}
