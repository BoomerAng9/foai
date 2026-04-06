/**
 * Ideogram 3.0 API Client
 * -----------------------
 * Best-in-class text rendering for player cards:
 * - Player name, school, position
 * - TIE grade badge
 * - Stats overlay
 *
 * Free tier: ~25 prompts/day
 * API: https://api.ideogram.ai
 */

// Runtime-safe: Next.js bundles module-level consts at build time
const getIdeogramKey = () => process.env.IDEOGRAM_API_KEY || '';
const BASE = 'https://api.ideogram.ai';
// V3 endpoints: /v1/ideogram-v3/generate, /v1/ideogram-v3/remix, /v1/ideogram-v3/edit

export interface IdeogramOptions {
  prompt: string;
  aspectRatio?: '1x1' | '16x9' | '9x16' | '4x3' | '3x4' | '3x2' | '2x3';
  model?: 'V_3' | 'V_2';
  magicPromptOption?: 'AUTO' | 'ON' | 'OFF';
  negativePrompt?: string;
  styleType?: 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'RENDER_3D' | 'ANIME';
}

export interface IdeogramImage {
  url: string;
  prompt: string;
  isImageSafe: boolean;
}

/**
 * Generate an image via Ideogram 3.0
 */
export async function generateIdeogramImage(
  opts: IdeogramOptions,
): Promise<IdeogramImage | null> {
  if (!getIdeogramKey()) return null;

  try {
    // Use V3 endpoint for best text rendering
    const formData = new FormData();
    formData.append('prompt', opts.prompt);
    formData.append('rendering_speed', 'TURBO');
    formData.append('style_type', opts.styleType || 'DESIGN');
    if (opts.aspectRatio) formData.append('aspect_ratio', opts.aspectRatio);
    if (opts.negativePrompt) formData.append('negative_prompt', opts.negativePrompt);

    const res = await fetch(`${BASE}/v1/ideogram-v3/generate`, {
      method: 'POST',
      headers: {
        'Api-Key': getIdeogramKey(),
      },
      body: formData,
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[Ideogram] ${res.status}: ${errText}`);
      return null;
    }

    const data = await res.json();
    const img = data.data?.[0];
    if (!img) return null;

    return {
      url: img.url,
      prompt: img.prompt || opts.prompt,
      isImageSafe: img.is_image_safe !== false,
    };
  } catch (err) {
    console.error('[Ideogram] Generation failed:', err);
    return null;
  }
}

/**
 * Generate a Per|Form player card with proper text rendering
 */
export async function generatePlayerCard(
  name: string,
  position: string,
  school: string,
  grade: number,
  tieGrade: string,
  projectedRound: number,
  nflComparison?: string,
): Promise<IdeogramImage | null> {
  const roundLabel = projectedRound <= 1 ? 'ROUND 1' :
    projectedRound <= 3 ? `ROUND ${projectedRound}` :
    projectedRound <= 7 ? `DAY 3` : 'UDFA';

  const prompt = `Professional NFL Draft prospect card design. Dark black background (#0A0A0F) with gold (#D4A853) accents and borders.

TOP: "Per|Form" logo text in gold, small
CENTER: Silhouette of a football player in ${position} stance, dramatic gold rim lighting
BOTTOM TEXT (must be perfectly legible):
  Large bold: "${name}"
  Below: "${position} | ${school}"
  Gold badge: "TIE GRADE: ${grade} — ${tieGrade}"
  Small: "${roundLabel}"${nflComparison ? `\n  Italic: "NFL Comp: ${nflComparison}"` : ''}

Style: Premium sports trading card, matte finish, cinematic lighting, broadcast quality. All text must be sharp, properly spelled, and centered.`;

  return generateIdeogramImage({
    prompt,
    aspectRatio: '3x4',
    model: 'V_3',
    styleType: 'DESIGN',
    negativePrompt: 'blurry text, misspelled words, distorted faces, low quality, watermark',
  });
}

/** Check if Ideogram API is configured */
export function isIdeogramConfigured(): boolean {
  return getIdeogramKey().length > 0;
}
