/**
 * Recraft V4 via fal.ai + Kie AI
 * --------------------------------
 * Primary image engine for Per|Form:
 * - Hyper-realistic imagery
 * - Marketing mockups
 * - Platform hero visuals
 * - Brand-consistent design assets
 *
 * Access via fal.ai (FAL_KEY) and Kie AI (KIE_AI_API_KEY)
 */

const FAL_KEY = process.env.FAL_KEY || process.env.FAL_API_KEY || '';
const KIE_KEY = process.env.KIE_AI_API_KEY || '';
const FAL_BASE = 'https://fal.run';
const KIE_BASE = 'https://api.kie.ai/v1';

export type RecraftModel =
  | 'recraftv4'         // $0.04 — standard raster ~1024x1024, ~10s
  | 'recraftv4_vector'  // $0.08 — SVG vector output
  | 'recraftv4_pro'     // $0.25 — hi-res raster ~2048x2048, ~28s
  | 'recraftv4_pro_vector'; // $0.30 — hi-res SVG

export type RecraftStyle =
  | 'Photorealism'
  | 'digital_illustration'
  | 'Hand-drawn'
  | 'Illustration'
  | 'Enterprise'
  | 'realistic_image'
  | 'vector_illustration';

export type RecraftSize =
  | '1024x1024'
  | '1280x1024'
  | '1024x1280'
  | '1536x1024'
  | '1024x1536'
  | '1280x768'
  | '768x1280';

export interface RecraftGenerateOptions {
  prompt: string;
  model?: RecraftModel;
  style?: RecraftStyle;
  size?: RecraftSize;
  styleId?: string;     // Custom style UUID
  n?: number;           // Number of images (default 1)
}

export interface RecraftImage {
  url: string;
  id?: string;
}

export interface RecraftResponse {
  data: RecraftImage[];
  created: number;
}

/**
 * Generate an image via Recraft V4 (fal.ai → Kie AI fallback)
 */
export async function generateImage(
  opts: RecraftGenerateOptions,
): Promise<RecraftImage | null> {
  // Try fal.ai first (Recraft V4 model)
  if (FAL_KEY) {
    const result = await _generateViaFal(opts);
    if (result) return result;
  }

  // Fallback to Kie AI
  if (KIE_KEY) {
    const result = await _generateViaKie(opts);
    if (result) return result;
  }

  return null;
}

async function _generateViaFal(opts: RecraftGenerateOptions): Promise<RecraftImage | null> {
  try {
    const res = await fetch(`${FAL_BASE}/fal-ai/recraft-v3`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${FAL_KEY}`,
      },
      body: JSON.stringify({
        prompt: opts.prompt,
        image_size: opts.size ? { width: parseInt(opts.size.split('x')[0]), height: parseInt(opts.size.split('x')[1]) } : { width: 1024, height: 1024 },
        style: opts.style?.toLowerCase().replace(/[^a-z_]/g, '_') || 'realistic_image',
        num_images: opts.n || 1,
      }),
      signal: AbortSignal.timeout(90000),
    });

    if (!res.ok) {
      console.error(`[Recraft/fal] ${res.status}`);
      return null;
    }

    const data = await res.json();
    const img = data.images?.[0] || data.data?.[0];
    if (!img) return null;

    return { url: img.url || img, id: data.request_id };
  } catch (err) {
    console.error('[Recraft/fal] Failed:', err);
    return null;
  }
}

async function _generateViaKie(opts: RecraftGenerateOptions): Promise<RecraftImage | null> {
  try {
    const res = await fetch(`${KIE_BASE}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${KIE_KEY}`,
      },
      body: JSON.stringify({
        prompt: opts.prompt,
        model: opts.model || 'recraftv4',
        size: opts.size || '1024x1024',
        style: opts.style || 'realistic_image',
        n: opts.n || 1,
      }),
      signal: AbortSignal.timeout(90000),
    });

    if (!res.ok) {
      console.error(`[Recraft/kie] ${res.status}`);
      return null;
    }

    const data = await res.json();
    const img = data.data?.[0];
    if (!img) return null;

    return { url: img.url, id: img.id };
  } catch (err) {
    console.error('[Recraft/kie] Failed:', err);
    return null;
  }
}

/**
 * Generate a hyper-realistic hero/marketing image
 */
export async function generateHeroImage(
  subject: string,
  context: string,
): Promise<RecraftImage | null> {
  return generateImage({
    prompt: `Cinematic hyper-realistic photograph: ${subject}. ${context}. Professional sports broadcast quality, dramatic studio lighting, dark background with gold accent lighting, 8K detail, shallow depth of field. Brand colors: black (#0A0A0F), gold (#D4A853).`,
    model: 'recraftv4',
    style: 'Photorealism',
    size: '1536x1024',
  });
}

/**
 * Generate a marketing mockup (device screens, posters, billboards)
 */
export async function generateMockup(
  product: string,
  placement: string,
): Promise<RecraftImage | null> {
  return generateImage({
    prompt: `Product mockup: ${product} displayed on ${placement}. Clean, modern, professional. Dark matte background, soft directional lighting, photorealistic rendering. The screen/surface shows clear readable text and UI elements. Premium brand aesthetic.`,
    model: 'recraftv4',
    style: 'Photorealism',
    size: '1280x1024',
  });
}

/**
 * Generate an analyst/personality portrait
 */
export async function generatePortrait(
  description: string,
  setting: string,
): Promise<RecraftImage | null> {
  return generateImage({
    prompt: `Professional portrait photograph: ${description}. Setting: ${setting}. Broadcast-quality studio lighting, rich colors, cinematic depth. The subject exudes confidence and authority. Dark background with subtle gold rim lighting.`,
    model: 'recraftv4_pro', // Hi-res for portraits
    style: 'Photorealism',
    size: '1024x1536',
  });
}

/**
 * Generate a brand logo or icon as vector SVG
 */
export async function generateVector(
  description: string,
): Promise<RecraftImage | null> {
  return generateImage({
    prompt: description,
    model: 'recraftv4_vector',
    style: 'vector_illustration',
    size: '1024x1024',
  });
}

/**
 * Remove background from an image via fal.ai
 */
export async function removeBackground(
  imageUrl: string,
): Promise<string | null> {
  if (!FAL_KEY) return null;

  try {
    const res = await fetch(`${FAL_BASE}/fal-ai/birefnet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${FAL_KEY}`,
      },
      body: JSON.stringify({ image_url: imageUrl }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.image?.url ?? null;
  } catch {
    return null;
  }
}

/** Check if Recraft API is configured (via fal.ai or Kie) */
export function isRecraftConfigured(): boolean {
  return FAL_KEY.length > 0 || KIE_KEY.length > 0;
}
