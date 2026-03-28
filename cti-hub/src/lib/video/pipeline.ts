/**
 * Video Creation Pipeline — Topview-style sequential shot generation.
 *
 * Process:
 *   1. Narrative planning (LLM breaks prompt into shot sequence)
 *   2. Shot-by-shot generation (Seedance 2.0 flagship, alternatives available)
 *   3. Shot reengineering (user regenerates individual shots)
 *   4. Assembly (combine shots into final video)
 *   5. Delivery: full video OR all segments separately
 *
 * Models: Seedance 2.0 (flagship via fal.ai), Kling, Runway, Veo as alternatives.
 * LUC routes to optimal model. User never sees model names.
 */

const FAL_API_KEY = process.env.FAL_API_KEY;
const KIE_API_KEY = process.env.KIE_AI_API_KEY;
const GOOGLE_KEY = process.env.GOOGLE_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;
const LUC_URL = process.env.LUC_URL || 'http://localhost:8081';

export type VideoEngine = 'seedance' | 'veo';

export interface ShotPlan {
  scene_number: number;
  description: string;
  duration_seconds: number;
  camera: string;       // tracking, static, zoom_in, pan, etc.
  mood: string;         // warm, dramatic, corporate, energetic
  transition: string;   // cut, fade, dissolve
  audio_note: string;
}

export interface VideoShot {
  scene_number: number;
  status: 'pending' | 'generating' | 'done' | 'failed';
  video_url?: string;
  thumbnail_url?: string;
  duration_seconds: number;
  generation_id?: string;
}

export interface VideoPlan {
  id: string;
  title: string;
  brief: string;
  total_duration: number;
  shots: ShotPlan[];
  generated_shots: VideoShot[];
  status: 'planning' | 'generating' | 'review' | 'assembling' | 'done';
}

// ─── Step 1: Narrative Planning ──────────────────────────────

export async function planNarrative(brief: string, durationSeconds: number = 30): Promise<ShotPlan[]> {
  if (!OPENROUTER_API_KEY) throw new Error('No LLM key configured');

  // LUC picks the model
  let model = 'deepseek/deepseek-v3.2';
  try {
    const res = await fetch(`${LUC_URL}/pick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'content', quality: 'good' }),
    });
    if (res.ok) model = (await res.json()).model;
  } catch {}

  const prompt = `You are a video production planner. Break down this video brief into a shot-by-shot sequence.

BRIEF: ${brief}
TARGET DURATION: ${durationSeconds} seconds

For each shot, provide:
- scene_number (starting at 1)
- description (what the viewer sees — detailed visual description)
- duration_seconds (how long this shot lasts)
- camera (tracking_in, static, zoom_out, pan_left, crane_up, close_up, wide, etc.)
- mood (warm, dramatic, corporate, energetic, calm, dark, bright)
- transition (cut, fade, dissolve)
- audio_note (music mood or sound effect)

Return ONLY a valid JSON array of shot objects. Ensure total duration matches target.`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });

  const completion = await res.json();
  let rawText = completion.choices?.[0]?.message?.content || '';

  if (rawText.includes('```json')) rawText = rawText.split('```json')[1].split('```')[0];
  else if (rawText.includes('```')) rawText = rawText.split('```')[1].split('```')[0];

  const parsed = JSON.parse(rawText.trim());
  const shots: ShotPlan[] = Array.isArray(parsed) ? parsed : parsed.shots || parsed.data || [parsed];

  return shots;
}

// ─── Step 2: Shot Generation (Seedance 2.0 via fal.ai) ──────

export async function generateShot(
  shot: ShotPlan,
  referenceUrl?: string,
): Promise<{ generation_id: string; status: string }> {
  if (!FAL_API_KEY) throw new Error('Video generation not configured');

  const prompt = `${shot.description}. Camera: ${shot.camera}. Mood: ${shot.mood}. Duration: ${shot.duration_seconds}s.`;

  // Seedance 2.0 via fal.ai — async job-based
  const res = await fetch('https://queue.fal.run/fal-ai/seedance-2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${FAL_API_KEY}`,
    },
    body: JSON.stringify({
      prompt,
      duration: Math.min(shot.duration_seconds, 10), // Seedance max per shot
      aspect_ratio: '16:9',
      ...(referenceUrl ? { image_url: referenceUrl } : {}),
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Video generation request failed');

  return {
    generation_id: data.request_id || data.id,
    status: 'queued',
  };
}

// ─── Step 3: Check Generation Status ─────────────────────────

export async function checkShotStatus(generationId: string): Promise<{
  status: 'pending' | 'processing' | 'done' | 'failed';
  video_url?: string;
  thumbnail_url?: string;
}> {
  if (!FAL_API_KEY) throw new Error('Video generation not configured');

  const res = await fetch(`https://queue.fal.run/fal-ai/seedance-2/requests/${generationId}/status`, {
    headers: { Authorization: `Key ${FAL_API_KEY}` },
  });

  const data = await res.json();

  if (data.status === 'COMPLETED') {
    // Fetch the result
    const resultRes = await fetch(`https://queue.fal.run/fal-ai/seedance-2/requests/${generationId}`, {
      headers: { Authorization: `Key ${FAL_API_KEY}` },
    });
    const result = await resultRes.json();

    return {
      status: 'done',
      video_url: result.video?.url || result.output?.url,
      thumbnail_url: result.thumbnail?.url,
    };
  }

  if (data.status === 'FAILED') {
    return { status: 'failed' };
  }

  return { status: data.status === 'IN_PROGRESS' ? 'processing' : 'pending' };
}

// ─── Step 2b: Shot Generation (Veo 3.1 via Gemini API) ─────

export async function generateShotVeo(
  shot: ShotPlan,
): Promise<{ generation_id: string; status: string }> {
  if (!GOOGLE_KEY) throw new Error('GOOGLE_KEY not configured for Veo');

  const prompt = `${shot.description}. Camera: ${shot.camera}. Mood: ${shot.mood}. Duration: ${shot.duration_seconds}s.`;

  // Veo 3.1 via Gemini generativelanguage API
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1:generateVideo?key=${GOOGLE_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        config: {
          aspectRatio: '16:9',
          durationSeconds: Math.min(shot.duration_seconds, 8),
        },
      }),
    },
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Veo generation failed');

  return {
    generation_id: data.name || data.operationId || `veo-${Date.now()}`,
    status: 'queued',
  };
}

// ─── Step 2c: Check Veo Status ──────────────────────────────

export async function checkVeoStatus(operationName: string): Promise<{
  status: 'pending' | 'processing' | 'done' | 'failed';
  video_url?: string;
}> {
  if (!GOOGLE_KEY) throw new Error('GOOGLE_KEY not configured');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${GOOGLE_KEY}`,
  );
  const data = await res.json();

  if (data.done && data.response?.generatedVideos?.[0]?.video?.uri) {
    return {
      status: 'done',
      video_url: data.response.generatedVideos[0].video.uri,
    };
  }

  if (data.error) return { status: 'failed' };

  return { status: 'processing' };
}

// ─── Universal Shot Generator ───────────────────────────────

export async function generateShotUniversal(
  shot: ShotPlan,
  engine: VideoEngine = 'seedance',
  referenceUrl?: string,
): Promise<{ generation_id: string; status: string; engine: VideoEngine }> {
  if (engine === 'veo') {
    const result = await generateShotVeo(shot);
    return { ...result, engine: 'veo' };
  }
  const result = await generateShot(shot, referenceUrl);
  return { ...result, engine: 'seedance' };
}

// ─── Step 4: Estimate Cost ───────────────────────────────────

export function estimateVideoCost(shots: ShotPlan[], engine: VideoEngine = 'seedance'): {
  total_seconds: number;
  estimated_cost: number;
  cost_per_shot: number[];
} {
  // Seedance 2.0: ~$0.022/sec, Veo 3.1: ~$0.035/sec (estimated)
  const COST_PER_SECOND = engine === 'veo' ? 0.035 : 0.022;

  const costPerShot = shots.map(s => s.duration_seconds * COST_PER_SECOND);
  const totalSeconds = shots.reduce((sum, s) => sum + s.duration_seconds, 0);

  return {
    total_seconds: totalSeconds,
    estimated_cost: totalSeconds * COST_PER_SECOND,
    cost_per_shot: costPerShot,
  };
}
