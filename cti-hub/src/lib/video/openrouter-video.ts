/**
 * OpenRouter — Video Generation Client
 *
 * Drop-in replacement for @/lib/video/kie-ai that routes through OpenRouter's
 * unified /api/v1/videos endpoint. Supports Seedance 2.0 standard + fast variants.
 *
 * Why OpenRouter:
 * - Single provider abstraction (LLM + video, one key, one billing)
 * - Native Seedance 2.0 support as of 2026-04
 * - Polling pattern: POST -> {polling_url} -> GET until status=completed
 *
 * Supersedes direct Kie.ai / fal.ai / SEEDANCE_API_KEY paths. See
 * project_seedance_status_2026_04_08.md for the consolidation rationale.
 */

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
const OR_BASE = 'https://openrouter.ai';

export interface VideoGenerationInput {
  prompt: string;
  firstFrameUrl?: string;
  lastFrameUrl?: string;
  referenceImageUrls?: string[];
  referenceVideoUrls?: string[];
  referenceAudioUrls?: string[];
  returnLastFrame?: boolean;
  generateAudio?: boolean;
  resolution?: '480p' | '720p' | '1080p';
  aspectRatio?: '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '21:9' | 'adaptive';
  duration?: number; // 3-15 seconds typical
  webSearch?: boolean;
  provider?: 'seedance' | 'kling';
}

export interface VideoTaskResult {
  taskId: string;
  status?: string;
  videoUrl?: string;
  error?: string;
}

/**
 * Generate video via OpenRouter /api/v1/videos
 * Model routing: Seedance 2.0 standard vs Seedance 2.0 fast.
 * Kling 3.0 not yet verified on OpenRouter — falls through to Seedance.
 */
export async function generateVideo(
  input: VideoGenerationInput,
  options: { fast?: boolean; callbackUrl?: string } = {},
): Promise<VideoTaskResult> {
  if (!OPENROUTER_KEY) {
    return { taskId: '', error: 'OPENROUTER_API_KEY not configured' };
  }

  const provider = input.provider || 'seedance';
  // OpenRouter model IDs confirmed 2026-04-16:
  //   bytedance/seedance-2.0       (standard quality, ~$0.28/3s)
  //   bytedance/seedance-2.0-fast  (fast iteration, ~$0.07/3s)
  //   kling/kling-3.0              (NOT YET verified on OpenRouter; placeholder)
  const model =
    provider === 'kling'
      ? 'kling/kling-3.0'
      : options.fast
        ? 'bytedance/seedance-2.0-fast'
        : 'bytedance/seedance-2.0';

  // Build body. OpenRouter accepts a flat schema on /api/v1/videos.
  // Optional modality fields are forwarded; unknown fields are ignored upstream.
  const body: Record<string, unknown> = {
    model,
    prompt: input.prompt,
    duration: input.duration ?? 8,
    aspect_ratio: input.aspectRatio || '16:9',
    resolution: input.resolution || '720p',
    generate_audio: input.generateAudio ?? true,
  };
  if (input.firstFrameUrl) body.first_frame_url = input.firstFrameUrl;
  if (input.lastFrameUrl) body.last_frame_url = input.lastFrameUrl;
  if (input.referenceImageUrls?.length) body.reference_image_urls = input.referenceImageUrls;
  if (input.referenceVideoUrls?.length) body.reference_video_urls = input.referenceVideoUrls;
  if (input.referenceAudioUrls?.length) body.reference_audio_urls = input.referenceAudioUrls;
  if (input.returnLastFrame) body.return_last_frame = true;
  if (input.webSearch) body.web_search = true;
  if (options.callbackUrl) body.callback_url = options.callbackUrl;

  try {
    const res = await fetch(`${OR_BASE}/api/v1/videos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      const msg = data.error?.message || data.error || `OpenRouter video HTTP ${res.status}`;
      return { taskId: '', error: String(msg) };
    }

    if (!data.id) {
      return { taskId: '', error: 'OpenRouter returned no task id' };
    }

    return { taskId: data.id, status: data.status || 'pending' };
  } catch (err) {
    return {
      taskId: '',
      error: err instanceof Error ? err.message : 'Video generation request failed',
    };
  }
}

/**
 * Poll task status. OpenRouter returns status: "pending" | "completed" | "failed".
 * On completion: unsigned_urls[] contains downloadable video URLs.
 */
export async function getTaskStatus(taskId: string): Promise<{
  status: string;
  progress?: number;
  videoUrl?: string;
  error?: string;
}> {
  if (!OPENROUTER_KEY) return { status: 'error', error: 'OPENROUTER_API_KEY not configured' };

  try {
    const res = await fetch(`${OR_BASE}/api/v1/videos/${taskId}`, {
      headers: { Authorization: `Bearer ${OPENROUTER_KEY}` },
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();

    if (!res.ok) {
      return { status: 'error', error: `HTTP ${res.status}` };
    }

    const status: string = data.status || 'unknown';

    // OpenRouter status -> normalized status the UI already handles
    // UI checks for: 'SUCCESS', 'completed', 'FAILED', 'failed', 'generating'
    let normalized = status;
    if (status === 'completed') normalized = 'SUCCESS';
    if (status === 'failed') normalized = 'FAILED';
    if (status === 'pending' || status === 'processing') normalized = 'generating';

    // OpenRouter's unsigned_urls require Bearer auth which a browser <video>
    // element cannot attach. Return a server-side proxy URL instead so the
    // preview canvas can play back without exposing the OpenRouter key.
    const urls: string[] = Array.isArray(data.unsigned_urls) ? data.unsigned_urls : [];
    const videoUrl = urls.length > 0
      ? `/api/video/stream?taskId=${encodeURIComponent(taskId)}&index=0`
      : undefined;

    return {
      status: normalized,
      progress: data.progress,
      videoUrl,
      error: data.error,
    };
  } catch (err) {
    return {
      status: 'error',
      error: err instanceof Error ? err.message : 'Status poll failed',
    };
  }
}

/**
 * OpenRouter credits endpoint. Returns remaining USD credit balance.
 * Owner-bypass in the route means this is advisory only for dev accounts.
 */
export async function getCredits(): Promise<number> {
  if (!OPENROUTER_KEY) return 0;
  try {
    const res = await fetch(`${OR_BASE}/api/v1/credits`, {
      headers: { Authorization: `Bearer ${OPENROUTER_KEY}` },
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    // OpenRouter returns { data: { total_credits, total_usage } }
    const total = data.data?.total_credits ?? 0;
    const used = data.data?.total_usage ?? 0;
    return Math.max(0, total - used);
  } catch {
    return 0;
  }
}
