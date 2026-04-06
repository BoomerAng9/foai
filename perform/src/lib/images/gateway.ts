/**
 * Unified Image Generation Gateway — Runtime-Safe
 * ==================================================
 * SINGLE source of truth for all image generation.
 *
 * Why this exists:
 * Next.js standalone mode bundles module-level const values at BUILD TIME.
 * `const KEY = process.env.X || ''` freezes the empty string into the bundle.
 * All env var access MUST happen inside function calls, not at module scope.
 *
 * This gateway is the one place that handles:
 * - Recraft V4 (direct API, fal.ai, Kie.ai)
 * - Ideogram V3 (direct API, fal.ai)
 * - Fallback routing
 * - Cost tracking
 *
 * All other image code should call through this gateway.
 */

/* ── Runtime-safe env accessors ── */
const env = () => ({
  recraft: process.env.RECRAFT_API_KEY || '',
  ideogram: process.env.IDEOGRAM_API_KEY || '',
  fal: process.env.FAL_KEY || process.env.FAL_API_KEY || '',
  kie: process.env.KIE_AI_API_KEY || '',
});

export type GatewayEngine = 'recraft_direct' | 'ideogram_direct' | 'fal' | 'kie';

export interface GatewayImageRequest {
  prompt: string;
  engine?: 'auto' | 'recraft' | 'ideogram';
  preferText?: boolean;    // Route to Ideogram if true
  size?: string;           // e.g. "1024x1024"
  aspectRatio?: string;    // Ideogram format: "1x1", "16x9", etc.
  style?: string;
  model?: string;          // Override default model
  negativePrompt?: string;
  n?: number;
}

export interface GatewayImageResult {
  url: string;
  engine: GatewayEngine;
  model: string;
  cost: string;
  prompt: string;
}

/* ── Status Check (runtime) ── */
export function getGatewayStatus() {
  const e = env();
  return {
    recraft_direct: e.recraft.length > 0,
    ideogram_direct: e.ideogram.length > 0,
    fal: e.fal.length > 0,
    kie: e.kie.length > 0,
    anyAvailable: e.recraft.length > 0 || e.ideogram.length > 0 || e.fal.length > 0 || e.kie.length > 0,
  };
}

/* ── Main Entry Point ── */
export async function generateImage(req: GatewayImageRequest): Promise<GatewayImageResult | null> {
  const e = env();
  const wantsText = req.preferText || req.engine === 'ideogram';
  const wantsRecraft = req.engine === 'recraft';

  // Priority chain based on engine preference
  const chain: Array<() => Promise<GatewayImageResult | null>> = [];

  if (wantsText || req.engine === 'auto' || req.engine === undefined) {
    // Ideogram is best for text-heavy content
    if (e.ideogram) chain.push(() => _tryIdeogramDirect(req, e.ideogram));
  }

  if (wantsRecraft || req.engine === 'auto' || req.engine === undefined) {
    if (e.recraft) chain.push(() => _tryRecraftDirect(req, e.recraft));
    if (e.fal) chain.push(() => _tryRecraftViaFal(req, e.fal));
    if (e.kie) chain.push(() => _tryRecraftViaKie(req, e.kie));
  }

  if (wantsText) {
    // Ideogram fallbacks
    if (e.fal) chain.push(() => _tryIdeogramViaFal(req, e.fal));
  }

  // Execute chain
  for (const attempt of chain) {
    try {
      const result = await attempt();
      if (result) return result;
    } catch (err) {
      console.error('[Gateway] Attempt failed:', err);
    }
  }

  return null;
}

/* ── Recraft Direct API ── */
async function _tryRecraftDirect(req: GatewayImageRequest, key: string): Promise<GatewayImageResult | null> {
  try {
    const body: Record<string, unknown> = {
      prompt: req.prompt,
      model: req.model || 'recraftv4',
      n: req.n || 1,
    };
    if (req.style) body.style = req.style;
    if (req.size) body.size = req.size;

    const res = await fetch('https://external.api.recraft.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[Gateway/recraft-direct] ${res.status}: ${errText}`);
      return null;
    }

    const data = await res.json();
    const img = data.data?.[0];
    if (!img?.url) return null;

    const costMap: Record<string, string> = {
      recraftv4: '$0.04',
      recraftv4_vector: '$0.08',
      recraftv4_pro: '$0.25',
      recraftv4_pro_vector: '$0.30',
      recraftv3: '$0.04',
      recraftv2: '$0.022',
    };

    return {
      url: img.url,
      engine: 'recraft_direct',
      model: (body.model as string) || 'recraftv4',
      cost: costMap[body.model as string] || '$0.04',
      prompt: req.prompt,
    };
  } catch (err) {
    console.error('[Gateway/recraft-direct] Exception:', err);
    return null;
  }
}

/* ── Ideogram V3 Direct ── */
async function _tryIdeogramDirect(req: GatewayImageRequest, key: string): Promise<GatewayImageResult | null> {
  try {
    const formData = new FormData();
    formData.append('prompt', req.prompt);
    formData.append('rendering_speed', 'TURBO');
    formData.append('style_type', req.style || 'DESIGN');
    if (req.aspectRatio) formData.append('aspect_ratio', req.aspectRatio);
    if (req.negativePrompt) formData.append('negative_prompt', req.negativePrompt);

    const res = await fetch('https://api.ideogram.ai/v1/ideogram-v3/generate', {
      method: 'POST',
      headers: { 'Api-Key': key },
      body: formData,
      signal: AbortSignal.timeout(90000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[Gateway/ideogram-direct] ${res.status}: ${errText}`);
      return null;
    }

    const data = await res.json();
    const img = data.data?.[0];
    if (!img?.url) return null;

    return {
      url: img.url,
      engine: 'ideogram_direct',
      model: 'Ideogram V3',
      cost: '$0.08',
      prompt: req.prompt,
    };
  } catch (err) {
    console.error('[Gateway/ideogram-direct] Exception:', err);
    return null;
  }
}

/* ── Recraft via fal.ai ── */
async function _tryRecraftViaFal(req: GatewayImageRequest, key: string): Promise<GatewayImageResult | null> {
  try {
    const [w, h] = (req.size || '1024x1024').split('x').map(Number);
    const res = await fetch('https://fal.run/fal-ai/recraft-v4', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${key}`,
      },
      body: JSON.stringify({
        prompt: req.prompt,
        image_size: { width: w, height: h },
        style: req.style?.toLowerCase().replace(/[^a-z_]/g, '_') || 'realistic_image',
      }),
      signal: AbortSignal.timeout(90000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const url = data.images?.[0]?.url || data.data?.[0]?.url;
    if (!url) return null;

    return {
      url,
      engine: 'fal',
      model: 'Recraft V4 (via fal.ai)',
      cost: '$0.04',
      prompt: req.prompt,
    };
  } catch {
    return null;
  }
}

/* ── Ideogram via fal.ai ── */
async function _tryIdeogramViaFal(req: GatewayImageRequest, key: string): Promise<GatewayImageResult | null> {
  try {
    const res = await fetch('https://fal.run/fal-ai/ideogram/v3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${key}`,
      },
      body: JSON.stringify({
        prompt: req.prompt,
        rendering_speed: 'TURBO',
        style: req.style || 'DESIGN',
      }),
      signal: AbortSignal.timeout(90000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const url = data.images?.[0]?.url || data.data?.[0]?.url;
    if (!url) return null;

    return {
      url,
      engine: 'fal',
      model: 'Ideogram V3 (via fal.ai)',
      cost: '$0.08',
      prompt: req.prompt,
    };
  } catch {
    return null;
  }
}

/* ── Recraft via Kie.ai ── */
async function _tryRecraftViaKie(req: GatewayImageRequest, key: string): Promise<GatewayImageResult | null> {
  try {
    const res = await fetch('https://api.kie.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        prompt: req.prompt,
        model: req.model || 'recraftv4',
        size: req.size || '1024x1024',
        style: req.style || 'realistic_image',
      }),
      signal: AbortSignal.timeout(90000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const url = data.data?.[0]?.url;
    if (!url) return null;

    return {
      url,
      engine: 'kie',
      model: 'Recraft V4 (via Kie.ai)',
      cost: '$0.03',
      prompt: req.prompt,
    };
  } catch {
    return null;
  }
}
