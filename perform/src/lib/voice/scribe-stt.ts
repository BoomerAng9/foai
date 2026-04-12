/**
 * ElevenLabs Scribe v2 — Speech-to-Text Adapter
 * ================================================
 * Phase 1 of SMLT-ACHEEVY-VOICE-STACK-001
 *
 * Two modes:
 *   Batch:    POST /v1/speech-to-text (file upload → transcript)
 *   Realtime: WSS  /v1/speech-to-text/realtime (streaming audio → live text)
 *
 * Output feeds into Grammar/NTNTN filter → ACHEEVY executor
 */

// Scribe v2 now, auto-swaps to v3 when model_id becomes available
const SCRIBE_MODEL = process.env.SCRIBE_MODEL_ID || 'scribe_v2';
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY || '';

export interface TranscriptResult {
  text: string;
  language: string;
  words?: Array<{ word: string; start: number; end: number; confidence: number }>;
  speakers?: Array<{ speaker: string; text: string; start: number; end: number }>;
}

/**
 * Batch transcription — upload an audio file, get full transcript.
 * Used for: podcast uploads, workbench recordings, content ingestion.
 */
export async function transcribeFile(
  audioBuffer: Buffer,
  options: {
    language?: string;
    diarize?: boolean;
    numSpeakers?: number;
    timestamps?: 'none' | 'word' | 'character';
    tagAudioEvents?: boolean;
  } = {}
): Promise<TranscriptResult> {
  if (!ELEVENLABS_KEY) throw new Error('ELEVENLABS_API_KEY not configured');

  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer], { type: 'audio/mpeg' }), 'audio.mp3');
  formData.append('model_id', SCRIBE_MODEL);

  if (options.language) formData.append('language_code', options.language);
  if (options.diarize) formData.append('diarize', 'true');
  if (options.numSpeakers) formData.append('num_speakers', String(options.numSpeakers));
  if (options.timestamps) formData.append('timestamps_granularity', options.timestamps);
  if (options.tagAudioEvents) formData.append('tag_audio_events', 'true');

  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_KEY },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Scribe STT [${res.status}]: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    text: data.text || '',
    language: data.language_code || data.detected_language || 'en',
    words: data.words || [],
    speakers: data.speakers || [],
  };
}

/**
 * Realtime WebSocket STT configuration.
 * Used for: ACHEEVY live chat voice input.
 *
 * Returns the WebSocket URL and connection config.
 * The actual WebSocket connection is managed by the client (browser).
 */
export function getRealtimeSTTConfig(options: {
  language?: string;
  commitStrategy?: 'manual' | 'vad';
  includeTimestamps?: boolean;
} = {}) {
  const params = new URLSearchParams({
    model_id: SCRIBE_MODEL,
    audio_format: 'pcm_16000',
    commit_strategy: options.commitStrategy || 'vad',
    include_timestamps: String(options.includeTimestamps || false),
    vad_silence_threshold_secs: '1.5',
    min_speech_duration_ms: '100',
  });

  if (options.language) params.set('language_code', options.language);

  return {
    url: `wss://api.elevenlabs.io/v1/speech-to-text/realtime?${params}`,
    headers: { 'xi-api-key': ELEVENLABS_KEY },
    audioFormat: 'pcm_16000',
    sampleRate: 16000,
  };
}

/**
 * API route handler for batch transcription.
 * Wire to: POST /api/voice/transcribe
 */
export async function handleTranscribeRequest(audioBuffer: Buffer, options?: {
  language?: string;
  diarize?: boolean;
}): Promise<TranscriptResult> {
  return transcribeFile(audioBuffer, {
    language: options?.language,
    diarize: options?.diarize,
    timestamps: 'word',
    tagAudioEvents: true,
  });
}
