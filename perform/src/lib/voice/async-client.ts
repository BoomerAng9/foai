/**
 * Async Voice API Client (async.com) — STRESS TESTED
 * =====================================================
 * Verified working 2026-04-12. Correct field names + auth.
 *
 * Auth: X-Api-Key header (NOT Authorization Bearer)
 * Version: v1 header required
 * Voice: { mode: "id", id: "<UUID>" } (NOT string)
 * Text field: "transcript" (NOT "text")
 * Model: "async_flash_v1.0"
 *
 * Endpoints:
 *   POST /text_to_speech              — full transcript → audio
 *   POST /text_to_speech/streaming    — continuous streaming
 *   POST /text_to_speech/with_timestamps — word-level timing
 *   WSS  /text_to_speech/websocket/ws — WebSocket incremental
 */

const ASYNC_API_KEY = process.env.ASYNC_API_KEY || '';
const ASYNC_BASE_URL = 'https://api.async.com';
const ASYNC_MODEL = 'async_flash_v1.0';

// Default voice UUID from Async library (verified working)
const DEFAULT_VOICE_ID = 'e0f39dc4-f691-4e78-bba5-5c636692cc04';

export interface AsyncTTSRequest {
  transcript?: string;
  text?: string;          // Alias for transcript (hermes-tts-router compat)
  voiceId?: string;       // UUID format
  speed?: number;
  sampleRate?: number;
  outputFormat?: 'pcm_f32le' | 'pcm_s16le' | 'pcm_mulaw' | 'pcm_alaw';
  emotion?: string;
  language?: string;
}

export interface AsyncCloneRequest {
  name: string;
  audioSample: Buffer;
  description?: string;
}

/**
 * Generate speech from text using Async TTS.
 * Returns raw PCM audio buffer.
 */
export async function asyncTextToSpeech(req: AsyncTTSRequest): Promise<Buffer> {
  if (!ASYNC_API_KEY) throw new Error('ASYNC_API_KEY not configured');

  const res = await fetch(`${ASYNC_BASE_URL}/text_to_speech`, {
    method: 'POST',
    headers: {
      'x-api-key': ASYNC_API_KEY,
      'version': 'v1',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_id: ASYNC_MODEL,
      transcript: req.transcript || req.text,
      voice: {
        mode: 'id',
        id: req.voiceId || DEFAULT_VOICE_ID,
      },
      output_format: {
        container: 'raw',
        encoding: req.outputFormat || 'pcm_f32le',
        sample_rate: req.sampleRate || 44100,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Async TTS [${res.status}]: ${err.slice(0, 200)}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

/**
 * Generate speech with streaming output.
 */
export async function asyncTextToSpeechStream(req: AsyncTTSRequest): Promise<ReadableStream<Uint8Array> | null> {
  if (!ASYNC_API_KEY) throw new Error('ASYNC_API_KEY not configured');

  const res = await fetch(`${ASYNC_BASE_URL}/text_to_speech/streaming`, {
    method: 'POST',
    headers: {
      'x-api-key': ASYNC_API_KEY,
      'version': 'v1',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_id: ASYNC_MODEL,
      transcript: req.transcript || req.text,
      voice: {
        mode: 'id',
        id: req.voiceId || DEFAULT_VOICE_ID,
      },
      output_format: {
        container: 'raw',
        encoding: req.outputFormat || 'pcm_f32le',
        sample_rate: req.sampleRate || 44100,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Async stream [${res.status}]: ${err.slice(0, 200)}`);
  }

  return res.body;
}

/**
 * Generate speech with word-level timestamps.
 */
export async function asyncTextToSpeechWithTimestamps(req: AsyncTTSRequest): Promise<{
  audio: Buffer;
  timestamps: Array<{ word: string; start: number; end: number }>;
}> {
  if (!ASYNC_API_KEY) throw new Error('ASYNC_API_KEY not configured');

  const res = await fetch(`${ASYNC_BASE_URL}/text_to_speech/with_timestamps`, {
    method: 'POST',
    headers: {
      'x-api-key': ASYNC_API_KEY,
      'version': 'v1',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_id: ASYNC_MODEL,
      transcript: req.transcript || req.text,
      voice: {
        mode: 'id',
        id: req.voiceId || DEFAULT_VOICE_ID,
      },
      output_format: {
        container: 'raw',
        encoding: 'pcm_f32le',
        sample_rate: 44100,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Async timestamps [${res.status}]: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    audio: Buffer.from(data.audio || '', 'base64'),
    timestamps: data.word_timestamps || data.timestamps || [],
  };
}

/**
 * Clone a voice from a 3-second audio sample.
 * Returns the new voice UUID.
 */
export async function asyncCloneVoice(req: AsyncCloneRequest): Promise<string> {
  if (!ASYNC_API_KEY) throw new Error('ASYNC_API_KEY not configured');

  const formData = new FormData();
  formData.append('name', req.name);
  if (req.description) formData.append('description', req.description);
  formData.append('audio', new Blob([new Uint8Array(req.audioSample)], { type: 'audio/mpeg' }), 'sample.mp3');

  const res = await fetch(`${ASYNC_BASE_URL}/voices/clone`, {
    method: 'POST',
    headers: {
      'x-api-key': ASYNC_API_KEY,
      'version': 'v1',
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Async clone [${res.status}]: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.voice_id || data.id;
}
