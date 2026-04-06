/**
 * Per|Form Video Generation Router
 * ==================================
 * Multi-model video pipeline via fal.ai
 *
 * Model Selection by Use Case:
 * - Cinematic hero with sound → Veo 3 ($0.40/s) — top tier
 * - Fast draft iteration → Kling 2.5 Turbo Pro ($0.07/s)
 * - Cost-optimized bulk → Wan 2.5 ($0.05/s)
 * - Short format square → Ovi ($0.20/video fixed)
 *
 * All models accessed via fal.ai unified API (FAL_KEY already on VPS)
 */

const FAL_KEY = process.env.FAL_KEY || process.env.FAL_API_KEY || '';
const FAL_BASE = 'https://fal.run';
const FAL_QUEUE = 'https://queue.fal.run';

export type VideoModel =
  | 'veo3'              // Google Veo 3 — $0.40/s, highest quality, has sound
  | 'veo2_i2v'          // Google Veo 2 — image-to-video with motion
  | 'kling_25_turbo'    // Kling 2.5 Turbo Pro — $0.07/s, fastest
  | 'kling_21_master'   // Kling 2.1 Master — image-to-video, cinematic
  | 'wan25'             // Wan 2.5 — $0.05/s, cheapest
  | 'ovi'               // Ovi — $0.20/video fixed price
  | 'minimax_hailuo'    // Hailuo — image-to-video
  | 'luma_dream'        // Luma Dream Machine 1.5
  | 'pixverse_4';       // Pixverse v4

export type VideoUseCase =
  | 'marketing_hero'     // Landing page hero video (Veo 3 with sound)
  | 'player_highlight'   // Player showcase video (Kling 2.1 Master i2v)
  | 'broadcast_intro'    // Show/segment intro (Veo 3)
  | 'social_reel'        // Square/vertical social (Kling 2.5 Turbo)
  | 'draft_animation'    // Draft day animated graphics (Wan 2.5)
  | 'agent_broll'        // Analyst b-roll footage (Kling 2.5 Turbo)
  | 'product_mockup'     // Animated product mockup (Luma/Veo 2 i2v)
  | 'seo_teaser';        // Short SEO-friendly teasers (Ovi)

export interface VideoRequest {
  useCase: VideoUseCase;
  prompt: string;
  imageUrl?: string;           // Optional source image for i2v
  duration?: number;           // Seconds (5 default, max depends on model)
  aspectRatio?: '16:9' | '9:16' | '1:1';
  audioPrompt?: string;        // For Veo 3 which supports sound
  tier?: 'draft' | 'production' | 'premium';
}

export interface VideoResult {
  url: string;
  model: VideoModel;
  duration: number;
  cost: string;
  useCase: VideoUseCase;
  thumbnailUrl?: string;
}

/* ── Model Routing by Use Case ── */
function selectModel(req: VideoRequest): VideoModel {
  // Premium tier always uses Veo 3 (best quality + sound)
  if (req.tier === 'premium') return 'veo3';

  switch (req.useCase) {
    case 'marketing_hero':
    case 'broadcast_intro':
      return req.tier === 'production' ? 'veo3' : 'kling_25_turbo';

    case 'player_highlight':
      return req.imageUrl ? 'kling_21_master' : 'kling_25_turbo';

    case 'social_reel':
    case 'agent_broll':
      return 'kling_25_turbo';  // Fast + cheap

    case 'draft_animation':
      return 'wan25';  // Cheapest for bulk

    case 'product_mockup':
      return req.imageUrl ? 'veo2_i2v' : 'kling_25_turbo';

    case 'seo_teaser':
      return 'ovi';  // Fixed price, good for short teasers

    default:
      return 'kling_25_turbo';
  }
}

/* ── fal.ai Model Endpoint Map ── */
const FAL_ENDPOINTS: Record<VideoModel, string> = {
  veo3: 'fal-ai/veo3',
  veo2_i2v: 'fal-ai/veo2/image-to-video',
  kling_25_turbo: 'fal-ai/kling-video/v2.5/turbo/pro/text-to-video',
  kling_21_master: 'fal-ai/kling-video/v2.1/master/image-to-video',
  wan25: 'fal-ai/wan-v2.5/text-to-video',
  ovi: 'fal-ai/ovi',
  minimax_hailuo: 'fal-ai/minimax/hailuo-02/pro/image-to-video',
  luma_dream: 'fal-ai/luma-dream-machine',
  pixverse_4: 'fal-ai/pixverse/v4.5/text-to-video',
};

/* ── Cost per second ── */
const COST_PER_SECOND: Record<VideoModel, number> = {
  veo3: 0.40,
  veo2_i2v: 0.20,
  kling_25_turbo: 0.07,
  kling_21_master: 0.15,
  wan25: 0.05,
  ovi: 0.04,  // $0.20 for 5s ≈ $0.04/s
  minimax_hailuo: 0.10,
  luma_dream: 0.15,
  pixverse_4: 0.08,
};

/* ── Generate Video ── */
export async function generateVideo(req: VideoRequest): Promise<VideoResult | null> {
  if (!FAL_KEY) return null;

  const model = selectModel(req);
  const endpoint = FAL_ENDPOINTS[model];
  const duration = req.duration || 5;

  // Build body based on model
  const body: Record<string, unknown> = { prompt: req.prompt };

  if (req.imageUrl) {
    body.image_url = req.imageUrl;
  }

  if (req.aspectRatio) {
    body.aspect_ratio = req.aspectRatio;
  }

  if (req.duration) {
    body.duration = duration;
  }

  // Veo 3 supports sound
  if (model === 'veo3' && req.audioPrompt) {
    body.audio_prompt = req.audioPrompt;
    body.generate_audio = true;
  }

  try {
    // Use queue endpoint for long-running video generation
    const submitRes = await fetch(`${FAL_QUEUE}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${FAL_KEY}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!submitRes.ok) {
      console.error(`[Video/${model}] Submit failed: ${submitRes.status}`);
      return null;
    }

    const submitData = await submitRes.json();
    const requestId = submitData.request_id;
    const statusUrl = submitData.status_url;

    // Poll until complete (max 5 minutes)
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const statusRes = await fetch(statusUrl, {
        headers: { Authorization: `Key ${FAL_KEY}` },
      });
      if (!statusRes.ok) continue;
      const status = await statusRes.json();

      if (status.status === 'COMPLETED') {
        // Fetch result
        const resultRes = await fetch(`${FAL_QUEUE}/${endpoint}/requests/${requestId}`, {
          headers: { Authorization: `Key ${FAL_KEY}` },
        });
        const result = await resultRes.json();

        const videoUrl = result.video?.url || result.video_url || result.url;
        if (!videoUrl) return null;

        const cost = (COST_PER_SECOND[model] * duration).toFixed(2);
        return {
          url: videoUrl,
          model,
          duration,
          cost: `$${cost}`,
          useCase: req.useCase,
          thumbnailUrl: result.thumbnail_url,
        };
      }

      if (status.status === 'FAILED') {
        console.error(`[Video/${model}] Failed:`, status.error);
        return null;
      }
    }

    return null; // Timeout
  } catch (err) {
    console.error(`[Video/${model}] Exception:`, err);
    return null;
  }
}

/* ── Convenience: Draft Day hero video ── */
export async function generateDraftHero(
  subject: string = 'NFL Draft Day 2026 Pittsburgh',
): Promise<VideoResult | null> {
  return generateVideo({
    useCase: 'marketing_hero',
    prompt: `Cinematic hero video: ${subject}. Dark stadium atmosphere, stage lights, dramatic slow motion, gold confetti falling, football on pedestal, camera pulls back to reveal packed stadium, epic orchestral cinematography, 4K quality, broadcast-ready`,
    audioPrompt: 'Deep orchestral swell, crowd roar building, dramatic timpani',
    duration: 8,
    aspectRatio: '16:9',
    tier: 'premium',
  });
}

/* ── Convenience: Player highlight from headshot ── */
export async function generatePlayerHighlight(
  playerName: string,
  headshot: string,
  action: string = 'running with the football',
): Promise<VideoResult | null> {
  return generateVideo({
    useCase: 'player_highlight',
    prompt: `${playerName} ${action}, cinematic slow motion, dramatic sports broadcast lighting, rim lighting, stadium backdrop, professional NFL quality`,
    imageUrl: headshot,
    duration: 5,
    aspectRatio: '16:9',
    tier: 'production',
  });
}

export function isVideoConfigured(): boolean {
  return FAL_KEY.length > 0;
}
