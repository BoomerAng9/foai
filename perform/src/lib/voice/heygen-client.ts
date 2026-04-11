/**
 * HeyGen Video Avatar Client
 * =============================
 * Generates talking-head podcast videos from analyst images + audio.
 * Uses HeyGen Avatar IV API (POST /v2/video/generate).
 *
 * Pipeline:
 *   1. ElevenLabs generates the audio (podcast narration)
 *   2. HeyGen takes the audio + analyst photo → talking-head video
 *   3. Post-process adds Lyria ambient background
 *
 * For two-person podcasts (Haze+Smoke, Colonel+Gino):
 *   - Generate each speaker's audio separately via ElevenLabs dialogue
 *   - Generate each speaker's video separately via HeyGen
 *   - Composite into split-screen or alternating-camera layout
 *   - OR use Lovart's Talking feature for native two-person format
 *
 * Credential: HEYGEN_API_KEY in openclaw (not yet provisioned).
 *
 * Per Rish 2026-04-09: test first attempt with Bun-E, then figure
 * out two-person podcast format (Lovart reference).
 */

const getApiKey = () => process.env.HEYGEN_API_KEY || '';
const BASE_URL = 'https://api.heygen.com';

export function heygenAvailable(): boolean {
  return getApiKey().length > 0;
}

export interface HeygenVideoRequest {
  /** Analyst ID (used for naming + photo lookup) */
  analystId: string;
  /** URL or asset_id of the analyst's photo (talking_photo mode) */
  photoUrl?: string;
  /** Pre-generated audio URL from ElevenLabs (public URL or asset_id) */
  audioUrl?: string;
  /** If no audioUrl, provide text and HeyGen will TTS it (fallback) */
  inputText?: string;
  /** HeyGen voice_id (only used when inputText is provided) */
  heygenVoiceId?: string;
  /** Video dimensions */
  width?: number;
  height?: number;
  /** Background color or image URL */
  backgroundType?: 'color' | 'image';
  backgroundColor?: string;
  backgroundImageUrl?: string;
  /** Talking style */
  talkingStyle?: 'stable' | 'expressive';
  /** Title for the video */
  title?: string;
}

export interface HeygenVideoResult {
  /** HeyGen video_id for status polling */
  videoId: string | null;
  /** Status URL to poll */
  statusUrl: string | null;
  error?: string;
}

/**
 * Generate a talking-head video for a single analyst.
 * Returns a video_id that must be polled for completion.
 */
export async function generateHeygenVideo(
  req: HeygenVideoRequest,
): Promise<HeygenVideoResult> {
  const key = getApiKey();
  if (!key) {
    return { videoId: null, statusUrl: null, error: 'HEYGEN_API_KEY not set' };
  }

  // Build voice config — prefer pre-generated audio from ElevenLabs
  const voice: Record<string, unknown> = req.audioUrl
    ? { type: 'audio', audio_url: req.audioUrl }
    : {
        type: 'text',
        voice_id: req.heygenVoiceId || '',
        input_text: req.inputText || '',
        speed: 1.0,
        emotion: 'Friendly',
      };

  // If using ElevenLabs audio + HeyGen video, pass ElevenLabs settings
  if (req.audioUrl) {
    // Audio is pre-generated — HeyGen just lip-syncs to it
  }

  // Build character config
  const character: Record<string, unknown> = {
    type: 'talking_photo',
    talking_photo_url: req.photoUrl,
    talking_style: req.talkingStyle || 'expressive',
    // Avatar IV model for better quality when available
    // use_avatar_iv_model: true,
  };

  // Build background
  const background: Record<string, unknown> = req.backgroundType === 'image'
    ? { type: 'image', url: req.backgroundImageUrl }
    : { type: 'color', value: req.backgroundColor || '#1a1a2e' };

  const body = {
    title: req.title || `${req.analystId} podcast`,
    dimension: {
      width: req.width || 1920,
      height: req.height || 1080,
    },
    video_inputs: [
      { character, voice, background },
    ],
  };

  try {
    const res = await fetch(`${BASE_URL}/v2/video/generate`, {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return {
        videoId: null,
        statusUrl: null,
        error: `HeyGen ${res.status}: ${err.slice(0, 300)}`,
      };
    }

    const json = await res.json();
    const videoId = json.data?.video_id;

    return {
      videoId,
      statusUrl: videoId ? `${BASE_URL}/v1/video_status.get?video_id=${videoId}` : null,
    };
  } catch (err) {
    return {
      videoId: null,
      statusUrl: null,
      error: err instanceof Error ? err.message : 'HeyGen video generation failed',
    };
  }
}

/**
 * Poll for video completion. Returns the video URL when ready.
 */
export async function pollHeygenVideo(
  videoId: string,
  maxWaitMs = 300000,
  pollIntervalMs = 5000,
): Promise<{ videoUrl: string | null; status: string; error?: string }> {
  const key = getApiKey();
  if (!key) {
    return { videoUrl: null, status: 'error', error: 'HEYGEN_API_KEY not set' };
  }

  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetch(
        `${BASE_URL}/v1/video_status.get?video_id=${videoId}`,
        { headers: { 'x-api-key': key } },
      );
      const json = await res.json();
      const status = json.data?.status;

      if (status === 'completed') {
        return { videoUrl: json.data.video_url, status: 'completed' };
      }
      if (status === 'failed') {
        return { videoUrl: null, status: 'failed', error: json.data.error || 'HeyGen video failed' };
      }
      // Still processing — wait and retry
      await new Promise(r => setTimeout(r, pollIntervalMs));
    } catch (err) {
      return {
        videoUrl: null,
        status: 'error',
        error: err instanceof Error ? err.message : 'polling failed',
      };
    }
  }
  return { videoUrl: null, status: 'timeout', error: `timed out after ${maxWaitMs / 1000}s` };
}
