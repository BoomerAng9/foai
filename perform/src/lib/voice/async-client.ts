/**
 * Async Voice API Client (async.com)
 * ====================================
 * Primary TTS for: analyst voices, podcast longform, user custom voices, studio production.
 * Voice cloning from 3-second samples. $0.50/hour. 15+ languages.
 *
 * Endpoints:
 *   POST /text_to_speech              — full transcript → audio
 *   POST /text_to_speech/streaming    — continuous streaming audio
 *   POST /text_to_speech/with_timestamps — word-level timing
 *   WSS  /text_to_speech/websocket/ws — WebSocket incremental
 *
 * Mode-router modes that use this adapter:
 *   analyst_voice, podcast_longform, user_custom_voice, studio_production
 */

const ASYNC_API_KEY = process.env.ASYNC_API_KEY || '';
const ASYNC_BASE_URL = 'https://api.async.com/v1';

export interface AsyncTTSRequest {
  text: string;
  voiceId: string;
  speed?: number;      // 0.5 - 2.0, default 1.0
  emotion?: string;    // neutral, happy, sad, angry, excited
  language?: string;   // en, es, fr, de, etc.
  outputFormat?: 'mp3' | 'wav' | 'pcm';
}

export interface AsyncCloneRequest {
  name: string;
  audioSample: Buffer;   // 3+ seconds of audio
  description?: string;
}

export interface AsyncVoice {
  id: string;
  name: string;
  language: string;
  isClone: boolean;
}

/**
 * Generate speech from text using Async TTS.
 * Returns audio buffer.
 */
export async function asyncTextToSpeech(req: AsyncTTSRequest): Promise<Buffer> {
  if (!ASYNC_API_KEY) throw new Error('ASYNC_API_KEY not configured');

  const res = await fetch(`${ASYNC_BASE_URL}/text_to_speech`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ASYNC_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text: req.text,
      voice_id: req.voiceId,
      speed: req.speed || 1.0,
      emotion: req.emotion || 'neutral',
      language: req.language || 'en',
      output_format: req.outputFormat || 'mp3',
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
 * Returns a ReadableStream of audio chunks.
 */
export async function asyncTextToSpeechStream(req: AsyncTTSRequest): Promise<ReadableStream<Uint8Array> | null> {
  if (!ASYNC_API_KEY) throw new Error('ASYNC_API_KEY not configured');

  const res = await fetch(`${ASYNC_BASE_URL}/text_to_speech/streaming`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ASYNC_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: req.text,
      voice_id: req.voiceId,
      speed: req.speed || 1.0,
      emotion: req.emotion || 'neutral',
      language: req.language || 'en',
      output_format: req.outputFormat || 'mp3',
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
 * Returns audio buffer + timestamp array.
 */
export async function asyncTextToSpeechWithTimestamps(req: AsyncTTSRequest): Promise<{
  audio: Buffer;
  timestamps: Array<{ word: string; start: number; end: number }>;
}> {
  if (!ASYNC_API_KEY) throw new Error('ASYNC_API_KEY not configured');

  const res = await fetch(`${ASYNC_BASE_URL}/text_to_speech/with_timestamps`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ASYNC_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: req.text,
      voice_id: req.voiceId,
      speed: req.speed || 1.0,
      language: req.language || 'en',
      output_format: req.outputFormat || 'mp3',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Async timestamps [${res.status}]: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    audio: Buffer.from(data.audio, 'base64'),
    timestamps: data.timestamps || [],
  };
}

/**
 * Clone a voice from a 3-second audio sample.
 * Returns the new voice ID.
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
      'Authorization': `Bearer ${ASYNC_API_KEY}`,
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

/**
 * List available voices (library + clones).
 */
export async function asyncListVoices(): Promise<AsyncVoice[]> {
  if (!ASYNC_API_KEY) throw new Error('ASYNC_API_KEY not configured');

  const res = await fetch(`${ASYNC_BASE_URL}/voices`, {
    headers: { 'Authorization': `Bearer ${ASYNC_API_KEY}` },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return (data.voices || data || []).map((v: Record<string, unknown>) => ({
    id: String(v.id || v.voice_id || ''),
    name: String(v.name || ''),
    language: String(v.language || 'en'),
    isClone: Boolean(v.is_clone || v.isClone),
  }));
}
