/**
 * Recraft V4 API Client
 * ---------------------
 * Primary image engine for Per|Form:
 * - Hyper-realistic imagery
 * - Marketing mockups
 * - Platform hero visuals
 * - Brand-consistent design assets
 *
 * Base URL: https://external.api.recraft.ai/v1
 * Auth: Bearer token
 * Cost: $0.04/image (V4), $0.08/vector, $0.25/V4 Pro
 */

const RECRAFT_KEY = process.env.RECRAFT_API_KEY || '';
const BASE = 'https://external.api.recraft.ai/v1';

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
 * Generate an image via Recraft V4
 */
export async function generateImage(
  opts: RecraftGenerateOptions,
): Promise<RecraftImage | null> {
  if (!RECRAFT_KEY) return null;

  const body: Record<string, unknown> = {
    prompt: opts.prompt,
    model: opts.model || 'recraftv4',
    n: opts.n || 1,
  };

  if (opts.style) body.style = opts.style;
  if (opts.size) body.size = opts.size;
  if (opts.styleId) body.style_id = opts.styleId;

  try {
    const res = await fetch(`${BASE}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RECRAFT_KEY}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.error(`[Recraft] ${res.status}: ${err}`);
      return null;
    }

    const data: RecraftResponse = await res.json();
    return data.data?.[0] ?? null;
  } catch (err) {
    console.error('[Recraft] Generation failed:', err);
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
 * Create a custom style from a reference image
 * Returns the style UUID for reuse across generations
 */
export async function createCustomStyle(
  imageUrl: string,
  baseStyle: RecraftStyle = 'digital_illustration',
): Promise<string | null> {
  if (!RECRAFT_KEY) return null;

  try {
    // Download the reference image first
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;
    const imgBlob = await imgRes.blob();

    const form = new FormData();
    form.append('style', baseStyle);
    form.append('file', imgBlob, 'reference.png');

    const res = await fetch(`${BASE}/styles`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RECRAFT_KEY}`,
      },
      body: form,
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Remove background from an image
 */
export async function removeBackground(
  imageUrl: string,
): Promise<string | null> {
  if (!RECRAFT_KEY) return null;

  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;
    const imgBlob = await imgRes.blob();

    const form = new FormData();
    form.append('file', imgBlob, 'image.png');
    form.append('response_format', 'url');

    const res = await fetch(`${BASE}/images/removeBackground`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${RECRAFT_KEY}` },
      body: form,
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.url ?? null;
  } catch {
    return null;
  }
}

/** Check if Recraft API is configured */
export function isRecraftConfigured(): boolean {
  return RECRAFT_KEY.length > 0;
}
