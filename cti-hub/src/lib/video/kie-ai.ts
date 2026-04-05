/**
 * Kie.AI — Seedance 2.0 Video Generation Client
 *
 * Text-to-video, image-to-video, dynamic camera, audio generation.
 * Two models: seedance-2 (quality) and seedance-2-fast (speed).
 */

const KIE_API_KEY = process.env.KIE_AI_API_KEY || process.env.KIE_API_KEY || '';
const KIE_BASE = 'https://api.kie.ai';

export interface VideoGenerationInput {
  prompt: string;
  firstFrameUrl?: string;
  lastFrameUrl?: string;
  referenceImageUrls?: string[];
  referenceVideoUrls?: string[];
  referenceAudioUrls?: string[];
  returnLastFrame?: boolean;
  generateAudio?: boolean;
  resolution?: '480p' | '720p';
  aspectRatio?: '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '21:9' | 'adaptive';
  duration?: number; // 4-15 seconds
  webSearch?: boolean;
}

export interface VideoTaskResult {
  taskId: string;
  status?: string;
  videoUrl?: string;
  error?: string;
}

/**
 * Generate video using Seedance 2.0
 */
export async function generateVideo(
  input: VideoGenerationInput,
  options: { fast?: boolean; callbackUrl?: string } = {},
): Promise<VideoTaskResult> {
  if (!KIE_API_KEY) throw new Error('KIE_API_KEY not configured');

  const model = options.fast ? 'bytedance/seedance-2-fast' : 'bytedance/seedance-2';

  const body: Record<string, unknown> = {
    model,
    input: {
      prompt: input.prompt,
      generate_audio: input.generateAudio ?? true,
      resolution: input.resolution || '720p',
      aspect_ratio: input.aspectRatio || '16:9',
      duration: input.duration || 8,
      web_search: input.webSearch ?? false,
      return_last_frame: input.returnLastFrame ?? false,
    },
  };

  // Optional fields
  if (input.firstFrameUrl) (body.input as Record<string, unknown>).first_frame_url = input.firstFrameUrl;
  if (input.lastFrameUrl) (body.input as Record<string, unknown>).last_frame_url = input.lastFrameUrl;
  if (input.referenceImageUrls?.length) (body.input as Record<string, unknown>).reference_image_urls = input.referenceImageUrls;
  if (input.referenceVideoUrls?.length) (body.input as Record<string, unknown>).reference_video_urls = input.referenceVideoUrls;
  if (input.referenceAudioUrls?.length) (body.input as Record<string, unknown>).reference_audio_urls = input.referenceAudioUrls;
  if (options.callbackUrl) body.callBackUrl = options.callbackUrl;

  const res = await fetch(`${KIE_BASE}/api/v1/jobs/createTask`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KIE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  const data = await res.json();

  if (data.code !== 200) {
    return { taskId: '', error: data.msg || `Kie.AI error ${data.code}` };
  }

  return { taskId: data.data.taskId };
}

/**
 * Check task status and get result
 */
export async function getTaskStatus(taskId: string): Promise<{
  status: string;
  progress?: number;
  videoUrl?: string;
  error?: string;
}> {
  if (!KIE_API_KEY) throw new Error('KIE_API_KEY not configured');

  const res = await fetch(`${KIE_BASE}/api/v1/jobs/getTaskDetail?taskId=${taskId}`, {
    headers: { 'Authorization': `Bearer ${KIE_API_KEY}` },
    signal: AbortSignal.timeout(10000),
  });

  const data = await res.json();

  if (data.code !== 200) {
    return { status: 'error', error: data.msg };
  }

  return {
    status: data.data?.status || 'unknown',
    progress: data.data?.progress,
    videoUrl: data.data?.output?.video_url || data.data?.output?.url,
    error: data.data?.error,
  };
}

/**
 * Get download URL for generated content (valid 20 min)
 */
export async function getDownloadUrl(fileUrl: string): Promise<string> {
  if (!KIE_API_KEY) throw new Error('KIE_API_KEY not configured');

  const res = await fetch(`${KIE_BASE}/api/v1/common/download-url`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KIE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: fileUrl }),
  });

  const data = await res.json();
  return data.data || fileUrl;
}

/**
 * Check Kie.AI credit balance
 */
export async function getCredits(): Promise<number> {
  if (!KIE_API_KEY) return 0;

  try {
    const res = await fetch(`${KIE_BASE}/api/v1/chat/credit`, {
      headers: { 'Authorization': `Bearer ${KIE_API_KEY}` },
    });
    const data = await res.json();
    return data.data || 0;
  } catch {
    return 0;
  }
}
