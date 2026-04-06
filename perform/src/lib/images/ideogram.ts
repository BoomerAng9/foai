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

const IDEOGRAM_KEY = process.env.IDEOGRAM_API_KEY || '';
const BASE = 'https://api.ideogram.ai';

export interface IdeogramOptions {
  prompt: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3';
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
  if (!IDEOGRAM_KEY) return null;

  try {
    const res = await fetch(`${BASE}/generate`, {
      method: 'POST',
      headers: {
        'Api-Key': IDEOGRAM_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_request: {
          prompt: opts.prompt,
          aspect_ratio: opts.aspectRatio || '3:4',
          model: opts.model || 'V_3',
          magic_prompt_option: opts.magicPromptOption || 'AUTO',
          negative_prompt: opts.negativePrompt,
          style_type: opts.styleType || 'DESIGN',
        },
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      console.error(`[Ideogram] ${res.status}`);
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
    aspectRatio: '3:4',
    model: 'V_3',
    styleType: 'DESIGN',
    negativePrompt: 'blurry text, misspelled words, distorted faces, low quality, watermark',
  });
}

/** Check if Ideogram API is configured */
export function isIdeogramConfigured(): boolean {
  return IDEOGRAM_KEY.length > 0;
}
