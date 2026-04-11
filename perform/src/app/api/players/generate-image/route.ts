import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { safeCompare } from '@/lib/auth-guard';

/**
 * POST /api/players/generate-image
 *
 * Body: { playerName, position, school }
 *
 * Uses OpenRouter to generate a player card image via an image-capable model.
 * Falls back gracefully if the API key is not set.
 * Saves the resulting image URL to the perform_players table.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Preferred models in order — first available wins
const IMAGE_MODELS = [
  'openai/gpt-image-1',
  'google/gemini-2.0-flash-exp:free',
];

function buildPrompt(playerName: string, position: string, school: string) {
  return (
    `Generate a professional college football player headshot portrait. ` +
    `The player is ${playerName}, a ${position} from ${school}. ` +
    `Dark background, dramatic lighting, athletic build, wearing team jersey. ` +
    `Photorealistic sports photography style. No text overlays.`
  );
}

export async function POST(req: NextRequest) {
  try {
    const PIPELINE_KEY = process.env.PIPELINE_AUTH_KEY || '';
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!PIPELINE_KEY || !safeCompare(token, PIPELINE_KEY)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { playerName, position, school } = body;

    if (!playerName || !position || !school) {
      return NextResponse.json(
        { error: 'Missing required fields: playerName, position, school' },
        { status: 400 },
      );
    }

    // Try Kie.AI first if key is available
    const kieKey = process.env.KIE_AI_API_KEY;
    if (kieKey) {
      try {
        const kieResult = await generateWithKie(
          kieKey,
          playerName,
          position,
          school,
        );
        if (kieResult) {
          await saveImageUrl(playerName, school, kieResult);
          return NextResponse.json({
            url: kieResult,
            source: 'kie-ai',
            player: playerName,
          });
        }
      } catch {
        // Fall through to OpenRouter
      }
    }

    // Fallback: OpenRouter
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterKey) {
      return NextResponse.json(
        {
          error: 'No image generation API key configured',
          hint: 'Set KIE_AI_API_KEY or OPENROUTER_API_KEY',
        },
        { status: 503 },
      );
    }

    const prompt = buildPrompt(playerName, position, school);

    for (const model of IMAGE_MODELS) {
      try {
        const res = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://perform.foai.cloud',
            'X-Title': 'PerForm Player Cards',
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
            max_tokens: 1024,
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (!res.ok) continue;

        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content || '';

        // Extract image URL from response (could be markdown ![](url) or direct URL)
        const urlMatch = content.match(
          /https?:\/\/[^\s)"']+\.(png|jpg|jpeg|webp)[^\s)"']*/i,
        );

        if (urlMatch) {
          const imageUrl = urlMatch[0];
          await saveImageUrl(playerName, school, imageUrl);
          return NextResponse.json({
            url: imageUrl,
            source: 'openrouter',
            model,
            player: playerName,
          });
        }
      } catch {
        continue;
      }
    }

    return NextResponse.json(
      { error: 'Image generation failed across all models', player: playerName },
      { status: 502 },
    );
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : 'Failed to generate image';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * Attempt image generation via Kie.AI API
 */
async function generateWithKie(
  apiKey: string,
  playerName: string,
  position: string,
  school: string,
): Promise<string | null> {
  const prompt = buildPrompt(playerName, position, school);

  // Kie.AI text-to-image endpoint
  const res = await fetch('https://api.kie.ai/api/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      n: 1,
      size: '512x512',
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const url = data?.data?.[0]?.url || data?.data?.[0]?.b64_json || null;

  return typeof url === 'string' ? url : null;
}

/**
 * Save the generated image URL to the perform_players table.
 * Adds the image_url column if it doesn't exist yet.
 */
async function saveImageUrl(
  playerName: string,
  school: string,
  imageUrl: string,
): Promise<void> {
  if (!sql) return;

  try {
    // Ensure column exists
    await sql.unsafe(
      `ALTER TABLE perform_players ADD COLUMN IF NOT EXISTS image_url TEXT`,
    );

    await sql.unsafe(
      `UPDATE perform_players SET image_url = $1, updated_at = NOW() WHERE LOWER(name) = LOWER($2) AND LOWER(school) = LOWER($3)`,
      [imageUrl, playerName, school],
    );
  } catch {
    // Non-critical — image was still generated
  }
}
