/**
 * Per|Form Video Generation Router v2.0
 * =======================================
 * Reference-based multi-model video pipeline.
 *
 * THE RULE: Always use a reference (video, image, or Brave-searched clip).
 * Never generate from text alone.
 *
 * Model Selection (from SME_Ang knowledgebase):
 * - Kling O3 Pro — character consistency across multiple shots
 * - Kling V3 Pro — multi-shot storyboarding, with optional voice
 * - Seedance 2.0 Pro — ByteDance i2v with camera control ($0.62/5s 1080p)
 * - Seedance Lite reference-to-video — 1-4 reference images ($0.18/5s 720p)
 * - Kling 2.1 Master — premium i2v with motion fluidity ($1.40/5s)
 * - Veo 3 — Google cinematic with native audio ($2.00/5s)
 * - Wan 2.5 — cheapest bulk ($0.25/5s)
 *
 * All via fal.ai (getFalKey()) → Kie.ai fallback (KIE_AI_API_KEY)
 */

// Runtime-safe env getters (Next.js standalone bundles module-level consts at build time)
const getFalKey = () => process.env.FAL_KEY || process.env.FAL_API_KEY || '';
const getKieKey = () => process.env.KIE_AI_API_KEY || '';
const getBraveKey = () => process.env.BRAVE_API_KEY || '';
const FAL_QUEUE = 'https://queue.fal.run';

export type VideoModel =
  | 'kling_o3_pro'       // Character consistency + multi-character, native audio
  | 'kling_v3_pro'       // Multi-shot storyboarding with voice
  | 'kling_21_master_i2v'// Premium i2v, $1.40/5s
  | 'seedance_2_pro_i2v' // ByteDance 1080p i2v with camera control
  | 'seedance_lite_ref'  // Reference-to-video with 1-4 images
  | 'veo3'               // Google Veo 3 with native audio
  | 'wan25'              // Cheapest
  | 'hailuo_02_pro_i2v'  // MiniMax Hailuo
  | 'luma_dream';

export type VideoUseCase =
  | 'marketing_hero'     // Landing page hero (Veo 3 or Kling V3 Pro)
  | 'player_highlight'   // Player showcase from headshot + reference
  | 'broadcast_intro'    // Show/segment intro
  | 'social_reel'        // Square/vertical social
  | 'draft_animation'    // Draft day animated graphics
  | 'agent_broll'        // Analyst b-roll
  | 'character_series'   // Multi-shot with consistent character
  | 'seo_teaser';        // Short SEO clips

export interface VideoRequest {
  useCase: VideoUseCase;
  prompt: string;
  referenceImages?: string[];     // 1-4 URLs (for Seedance Lite ref-to-video)
  referenceVideoUrl?: string;     // Full reference video (Kling O3 element ref)
  sourceImageUrl?: string;        // Single image for i2v (headshot, etc.)
  duration?: number;              // 2-15 seconds
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '21:9';
  resolution?: '480p' | '720p' | '1080p';
  withAudio?: boolean;            // Veo 3 / Kling with voice
  voicePrompt?: string;           // For Kling V3 Pro voice control
  cameraFixed?: boolean;          // Lock camera (Seedance param)
  tier?: 'draft' | 'production' | 'premium';
}

export interface VideoResult {
  url: string;
  model: VideoModel;
  duration: number;
  cost: string;
  useCase: VideoUseCase;
  referenceUsed?: string;
  thumbnailUrl?: string;
}

/* ── Brave API Video/Image Search for References ── */
export async function braveSearchReference(
  query: string,
  type: 'video' | 'image' = 'video',
): Promise<string | null> {
  if (!getBraveKey()) return null;

  try {
    const endpoint = type === 'video'
      ? `https://api.search.brave.com/res/v1/videos/search?q=${encodeURIComponent(query)}&count=5`
      : `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(query)}&count=5`;

    const res = await fetch(endpoint, {
      headers: {
        'X-Subscription-Token': getBraveKey(),
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;
    const data = await res.json();

    if (type === 'video') {
      const results = data.results || [];
      return results[0]?.video?.url || results[0]?.url || null;
    } else {
      const results = data.results || [];
      return results[0]?.properties?.url || results[0]?.src || null;
    }
  } catch {
    return null;
  }
}

/* ── Model Routing by Use Case ── */
function selectModel(req: VideoRequest): VideoModel {
  // Premium tier defaults to Veo 3 or Kling V3 Pro
  if (req.tier === 'premium') {
    return req.withAudio ? 'kling_v3_pro' : 'veo3';
  }

  switch (req.useCase) {
    case 'marketing_hero':
    case 'broadcast_intro':
      if (req.tier === 'production') {
        return req.withAudio ? 'veo3' : 'kling_21_master_i2v';
      }
      return 'seedance_2_pro_i2v';

    case 'player_highlight':
      // Always uses i2v from headshot
      return req.tier === 'production' ? 'kling_21_master_i2v' : 'seedance_2_pro_i2v';

    case 'character_series':
      // Multi-shot with consistent character → Kling O3 Pro or Seedance Lite
      return req.referenceImages && req.referenceImages.length >= 2
        ? 'seedance_lite_ref'
        : 'kling_o3_pro';

    case 'social_reel':
    case 'agent_broll':
      return 'seedance_2_pro_i2v';  // Fast, good quality, reasonable cost

    case 'draft_animation':
      return 'wan25';  // Cheapest for bulk

    case 'seo_teaser':
      return 'seedance_lite_ref';  // Cheapest ref-based

    default:
      return 'seedance_2_pro_i2v';
  }
}

/* ── fal.ai Endpoint Map ── */
const FAL_ENDPOINTS: Record<VideoModel, string> = {
  kling_o3_pro: 'fal-ai/kling-video/o3/pro/text-to-video',
  kling_v3_pro: 'fal-ai/kling-video/v3/pro/text-to-video',
  kling_21_master_i2v: 'fal-ai/kling-video/v2.1/master/image-to-video',
  seedance_2_pro_i2v: 'fal-ai/bytedance/seedance/v1/pro/image-to-video',
  seedance_lite_ref: 'fal-ai/bytedance/seedance/v1/lite/reference-to-video',
  veo3: 'fal-ai/veo3',
  wan25: 'fal-ai/wan-v2.5/text-to-video',
  hailuo_02_pro_i2v: 'fal-ai/minimax/hailuo-02/pro/image-to-video',
  luma_dream: 'fal-ai/luma-dream-machine',
};

/* ── Cost Map ── */
const COST: Record<VideoModel, { base: number; perSecond: number }> = {
  kling_o3_pro: { base: 0, perSecond: 0.168 },      // $0.168/s audio off, $0.392/s with voice
  kling_v3_pro: { base: 0, perSecond: 0.392 },      // With voice
  kling_21_master_i2v: { base: 1.40, perSecond: 0.28 }, // $1.40 for 5s + $0.28/s
  seedance_2_pro_i2v: { base: 0, perSecond: 0.124 }, // $0.62/5s = $0.124/s
  seedance_lite_ref: { base: 0, perSecond: 0.036 },  // $0.18/5s = $0.036/s
  veo3: { base: 0, perSecond: 0.40 },
  wan25: { base: 0, perSecond: 0.05 },
  hailuo_02_pro_i2v: { base: 0, perSecond: 0.10 },
  luma_dream: { base: 0, perSecond: 0.15 },
};

/* ── Build model-specific request body ── */
function buildBody(model: VideoModel, req: VideoRequest): Record<string, unknown> {
  const duration = req.duration || 5;
  const body: Record<string, unknown> = { prompt: req.prompt };

  switch (model) {
    case 'kling_o3_pro':
    case 'kling_v3_pro':
      body.duration = duration;
      if (req.aspectRatio) body.aspect_ratio = req.aspectRatio;
      if (req.referenceVideoUrl) body.reference_video_url = req.referenceVideoUrl;
      if (model === 'kling_v3_pro' && req.voicePrompt) {
        body.voice_prompt = req.voicePrompt;
      }
      break;

    case 'kling_21_master_i2v':
      if (!req.sourceImageUrl) throw new Error('Kling 2.1 Master requires sourceImageUrl');
      body.image_url = req.sourceImageUrl;
      body.duration = `${duration}`;
      if (req.aspectRatio) body.aspect_ratio = req.aspectRatio;
      body.negative_prompt = 'blur, distort, low quality, garbled text';
      body.cfg_scale = 0.5;
      break;

    case 'seedance_2_pro_i2v':
      if (!req.sourceImageUrl) throw new Error('Seedance 2.0 Pro i2v requires sourceImageUrl');
      body.image_url = req.sourceImageUrl;
      body.duration = `${duration}`;
      body.resolution = req.resolution || '1080p';
      body.aspect_ratio = req.aspectRatio || 'auto';
      if (req.cameraFixed) body.camera_fixed = true;
      break;

    case 'seedance_lite_ref':
      if (!req.referenceImages || req.referenceImages.length === 0) {
        throw new Error('Seedance Lite reference-to-video requires referenceImages[]');
      }
      body.reference_image_urls = req.referenceImages.slice(0, 4);
      body.duration = `${duration}`;
      body.resolution = req.resolution || '720p';
      body.aspect_ratio = req.aspectRatio || 'auto';
      body.enable_safety_checker = true;
      break;

    case 'veo3':
      body.duration = duration;
      if (req.aspectRatio) body.aspect_ratio = req.aspectRatio;
      if (req.withAudio) body.generate_audio = true;
      break;

    case 'wan25':
      body.duration = duration;
      if (req.aspectRatio) body.aspect_ratio = req.aspectRatio;
      break;

    case 'hailuo_02_pro_i2v':
      if (!req.sourceImageUrl) throw new Error('Hailuo i2v requires sourceImageUrl');
      body.image_url = req.sourceImageUrl;
      body.duration = duration;
      break;

    case 'luma_dream':
      if (req.sourceImageUrl) body.image_url = req.sourceImageUrl;
      break;
  }

  return body;
}

/* ── Generate Video via fal.ai queue ── */
export async function generateVideo(req: VideoRequest): Promise<VideoResult | null> {
  if (!getFalKey()) return null;

  // If no reference provided, auto-search Brave for one
  if (!req.referenceImages && !req.referenceVideoUrl && !req.sourceImageUrl) {
    const braveRef = await braveSearchReference(req.prompt, 'image');
    if (braveRef) {
      req.sourceImageUrl = braveRef;
    }
  }

  const model = selectModel(req);
  const endpoint = FAL_ENDPOINTS[model];
  const duration = req.duration || 5;

  let body: Record<string, unknown>;
  try {
    body = buildBody(model, req);
  } catch (err) {
    console.error(`[Video] Build body failed:`, err);
    return null;
  }

  try {
    // Submit to queue
    const submitRes = await fetch(`${FAL_QUEUE}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${getFalKey()}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text().catch(() => '');
      console.error(`[Video/${model}] Submit ${submitRes.status}: ${errText}`);
      return null;
    }

    const { request_id, status_url } = await submitRes.json();

    // Poll for completion (up to 10 minutes for video)
    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 5000));

      const statusRes = await fetch(status_url, {
        headers: { Authorization: `Key ${getFalKey()}` },
      });
      if (!statusRes.ok) continue;
      const status = await statusRes.json();

      if (status.status === 'COMPLETED') {
        const resultRes = await fetch(`${FAL_QUEUE}/${endpoint}/requests/${request_id}`, {
          headers: { Authorization: `Key ${getFalKey()}` },
        });
        const result = await resultRes.json();

        const videoUrl = result.video?.url || result.video_url || result.url;
        if (!videoUrl) {
          console.error(`[Video/${model}] No video URL in result:`, result);
          return null;
        }

        const costData = COST[model];
        const totalCost = (costData.base + costData.perSecond * duration).toFixed(2);

        return {
          url: videoUrl,
          model,
          duration,
          cost: `$${totalCost}`,
          useCase: req.useCase,
          referenceUsed: req.referenceVideoUrl || req.sourceImageUrl || req.referenceImages?.[0],
          thumbnailUrl: result.thumbnail_url || result.video?.thumbnail_url,
        };
      }

      if (status.status === 'FAILED') {
        console.error(`[Video/${model}] Generation failed:`, status.error || status);
        return null;
      }
    }

    console.error(`[Video/${model}] Timeout after 10 minutes`);
    return null;
  } catch (err) {
    console.error(`[Video/${model}] Exception:`, err);
    return null;
  }
}

/* ── Convenience: Draft Day hero (full reference workflow) ── */
export async function generateDraftHero(): Promise<VideoResult | null> {
  // Step 1: Find a reference via Brave
  const reference = await braveSearchReference(
    'NFL Draft stage Pittsburgh stadium dramatic lights',
    'image',
  );

  return generateVideo({
    useCase: 'marketing_hero',
    prompt: 'Cinematic NFL Draft Day 2026 in Pittsburgh. Dark stadium with dramatic stage lights, gold confetti falling in slow motion, football on pedestal, camera pulls back to reveal packed Acrisure Stadium crowd. Epic broadcast quality.',
    sourceImageUrl: reference || undefined,
    duration: 8,
    aspectRatio: '16:9',
    resolution: '1080p',
    withAudio: true,
    voicePrompt: 'Deep orchestral swell, crowd roar building, dramatic timpani crescendo',
    tier: 'premium',
  });
}

/* ── Convenience: Player highlight with reference search ── */
export async function generatePlayerHighlight(
  playerName: string,
  position: string,
  headshotUrl: string,
  action: string,
): Promise<VideoResult | null> {
  // Search Brave for a reference video matching the action
  const referenceQuery = `NFL ${position} ${action} cinematic slow motion highlight`;
  const referenceVideo = await braveSearchReference(referenceQuery, 'video');

  return generateVideo({
    useCase: 'player_highlight',
    prompt: `${playerName}, ${position}, ${action}. Cinematic slow motion, dramatic sports broadcast lighting, rim lighting, stadium backdrop, professional NFL quality, TIE-graded prospect showcase.`,
    sourceImageUrl: headshotUrl,
    referenceVideoUrl: referenceVideo || undefined,
    duration: 5,
    aspectRatio: '16:9',
    resolution: '1080p',
    tier: 'production',
  });
}

/* ── Convenience: Character series (multi-shot consistency) ── */
export async function generateCharacterSeries(
  characterImages: string[],
  scenePrompt: string,
): Promise<VideoResult | null> {
  return generateVideo({
    useCase: 'character_series',
    prompt: scenePrompt,
    referenceImages: characterImages.slice(0, 4),
    duration: 5,
    aspectRatio: '16:9',
    resolution: '720p',
  });
}

export function isVideoConfigured(): boolean {
  return getFalKey().length > 0;
}
