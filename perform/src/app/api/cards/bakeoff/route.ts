import { NextRequest, NextResponse } from 'next/server';
import { safeCompare } from '@/lib/auth-guard';
import type { CardPromptInput } from '@/lib/images/card-styles';
import {
  type CardAesthetic,
  type Sport,
  CARD_AESTHETICS,
  buildAestheticPrompt,
} from '@/lib/images/card-aesthetics';

/**
 * Card Bake-Off: Generate the SAME card prompt across multiple engines
 * =====================================================================
 * POST /api/cards/bakeoff
 *
 * Body: {
 *   aesthetic: "blueprint" | "animal_archetype" | "inhuman_emergence" | "wall_breaker" | "commitment"
 *   player: { name, position, school, sport?, grade?, teamColors?, animalArchetype?, committedTo? }
 *   engines?: ["gpt_image", "ideogram", "recraft"]  // default: all three
 * }
 *
 * Returns results from each engine for side-by-side comparison.
 */

const VALID_AESTHETICS: CardAesthetic[] = [
  'blueprint', 'animal_archetype', 'inhuman_emergence', 'wall_breaker', 'commitment',
];

interface EngineResult {
  engine: string;
  model: string;
  url: string | null;
  cost: string;
  durationMs: number;
  error?: string;
}

/* ── GPT Image 1.5 via OpenRouter ── */
async function generateGPTImage(prompt: string, size: string): Promise<EngineResult> {
  const start = Date.now();
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { engine: 'gpt_image', model: 'gpt-image-1.5', url: null, cost: '$0.00', durationMs: 0, error: 'OPENROUTER_API_KEY not set' };

  try {
    const res = await fetch('https://openrouter.ai/api/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-image-1.5',
        prompt,
        n: 1,
        size,
        quality: 'high',
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return { engine: 'gpt_image', model: 'gpt-image-1.5', url: null, cost: '$0.00', durationMs: Date.now() - start, error: `${res.status}: ${err.slice(0, 200)}` };
    }

    const data = await res.json();
    const url = data.data?.[0]?.url || data.data?.[0]?.b64_json;
    return {
      engine: 'gpt_image',
      model: 'gpt-image-1.5',
      url: url || null,
      cost: '$0.02',
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return { engine: 'gpt_image', model: 'gpt-image-1.5', url: null, cost: '$0.00', durationMs: Date.now() - start, error: String(err) };
  }
}

/* ── Ideogram V3 Direct ── */
async function generateIdeogram(prompt: string, aspectRatio: string, negativePrompt?: string): Promise<EngineResult> {
  const start = Date.now();
  const key = process.env.IDEOGRAM_API_KEY;
  if (!key) return { engine: 'ideogram', model: 'Ideogram V3', url: null, cost: '$0.00', durationMs: 0, error: 'IDEOGRAM_API_KEY not set' };

  try {
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('rendering_speed', 'TURBO');
    formData.append('style_type', 'DESIGN');
    formData.append('aspect_ratio', aspectRatio);
    if (negativePrompt) formData.append('negative_prompt', negativePrompt);

    const res = await fetch('https://api.ideogram.ai/v1/ideogram-v3/generate', {
      method: 'POST',
      headers: { 'Api-Key': key },
      body: formData,
      signal: AbortSignal.timeout(90000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return { engine: 'ideogram', model: 'Ideogram V3', url: null, cost: '$0.00', durationMs: Date.now() - start, error: `${res.status}: ${err.slice(0, 200)}` };
    }

    const data = await res.json();
    const url = data.data?.[0]?.url;
    return {
      engine: 'ideogram',
      model: 'Ideogram V3',
      url: url || null,
      cost: '$0.08',
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return { engine: 'ideogram', model: 'Ideogram V3', url: null, cost: '$0.00', durationMs: Date.now() - start, error: String(err) };
  }
}

/* ── Recraft V4 Direct ── */
async function generateRecraft(prompt: string, size: string): Promise<EngineResult> {
  const start = Date.now();
  const key = process.env.RECRAFT_API_KEY;
  if (!key) return { engine: 'recraft', model: 'Recraft V4', url: null, cost: '$0.00', durationMs: 0, error: 'RECRAFT_API_KEY not set' };

  try {
    const res = await fetch('https://external.api.recraft.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        prompt,
        model: 'recraftv4',
        n: 1,
        size,
      }),
      signal: AbortSignal.timeout(90000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return { engine: 'recraft', model: 'Recraft V4', url: null, cost: '$0.00', durationMs: Date.now() - start, error: `${res.status}: ${err.slice(0, 200)}` };
    }

    const data = await res.json();
    const url = data.data?.[0]?.url;
    return {
      engine: 'recraft',
      model: 'Recraft V4',
      url: url || null,
      cost: '$0.04',
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return { engine: 'recraft', model: 'Recraft V4', url: null, cost: '$0.00', durationMs: Date.now() - start, error: String(err) };
  }
}

/* ── Aspect ratio → pixel size converters ── */
function aspectToGPTSize(ar: string): string {
  if (ar === '4x5' || ar === '3x4') return '1024x1536';
  if (ar === '1x1') return '1024x1024';
  return '1024x1536'; // default portrait
}

function aspectToRecraftSize(ar: string): string {
  if (ar === '4x5' || ar === '3x4') return '768x1344';
  if (ar === '1x1') return '1024x1024';
  return '768x1344'; // default portrait
}

function aspectToIdeogramAR(ar: string): string {
  if (ar === '4x5') return '4x5';
  if (ar === '3x4') return '3x4';
  if (ar === '1x1') return '1x1';
  return '3x4';
}

export async function POST(req: NextRequest) {
  const PIPELINE_KEY = process.env.PIPELINE_AUTH_KEY || '';
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!PIPELINE_KEY || !safeCompare(token, PIPELINE_KEY)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const aesthetic = body.aesthetic as CardAesthetic;
  if (!VALID_AESTHETICS.includes(aesthetic)) {
    return NextResponse.json({ error: `Invalid aesthetic. Choose: ${VALID_AESTHETICS.join(', ')}` }, { status: 400 });
  }

  const player = body.player || {};
  const input: CardPromptInput = {
    name: player.name || 'Cam Ward',
    position: player.position || 'QB',
    school: player.school || 'Miami',
    // sport not on CardPromptInput — used only in aesthetic prompts internally
    grade: player.grade || 92,
    tieGrade: player.tieGrade || 'A+',
    projectedRound: player.projectedRound || 1,
    teamColors: player.teamColors || 'deep green and orange',
    // animalArchetype and committedTo not on base CardPromptInput — handled internally by aesthetic prompts
  };

  const { prompt, negativePrompt, aspectRatio } = buildAestheticPrompt(aesthetic, input);

  const engines = body.engines || ['gpt_image', 'ideogram', 'recraft'];

  // Fire all engines in parallel
  const promises: Promise<EngineResult>[] = [];

  if (engines.includes('gpt_image')) {
    promises.push(generateGPTImage(prompt, aspectToGPTSize(aspectRatio)));
  }
  if (engines.includes('ideogram')) {
    promises.push(generateIdeogram(prompt, aspectToIdeogramAR(aspectRatio), negativePrompt));
  }
  if (engines.includes('recraft')) {
    promises.push(generateRecraft(prompt, aspectToRecraftSize(aspectRatio)));
  }

  const results = await Promise.allSettled(promises);
  const engineResults = results.map((r) =>
    r.status === 'fulfilled' ? r.value : { engine: 'unknown', model: 'unknown', url: null, cost: '$0.00', durationMs: 0, error: String(r.reason) }
  );

  const totalCost = engineResults
    .filter((r) => r.url)
    .reduce((sum, r) => sum + parseFloat(r.cost.replace('$', '')), 0);

  return NextResponse.json({
    aesthetic,
    player: { name: input.name, position: input.position, school: input.school },
    prompt: prompt.slice(0, 500) + (prompt.length > 500 ? '...' : ''),
    results: engineResults,
    totalCost: `$${totalCost.toFixed(2)}`,
    generatedAt: new Date().toISOString(),
  });
}
