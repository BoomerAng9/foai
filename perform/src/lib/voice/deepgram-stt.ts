/**
 * Deepgram STT Adapter
 * ======================
 * ~100ms latency. 36+ languages. $0.0043/min.
 * Lowest latency STT option in the stack.
 *
 * Two modes:
 *   Batch:    POST /v1/listen (file → transcript)
 *   Realtime: WSS  wss://api.deepgram.com/v1/listen (streaming)
 */

const DEEPGRAM_KEY = process.env.DEEPGRAM_API_KEY || '';

export interface DeepgramTranscriptResult {
  text: string;
  confidence: number;
  language: string;
  words: Array<{ word: string; start: number; end: number; confidence: number }>;
  speakers?: Array<{ speaker: number; text: string; start: number; end: number }>;
}

/**
 * Batch transcription — upload audio, get transcript.
 */
export async function deepgramTranscribe(
  audioBuffer: Buffer,
  options: {
    language?: string;
    diarize?: boolean;
    model?: 'nova-3' | 'nova-2' | 'enhanced' | 'base';
    punctuate?: boolean;
    smartFormat?: boolean;
  } = {}
): Promise<DeepgramTranscriptResult> {
  if (!DEEPGRAM_KEY) throw new Error('DEEPGRAM_API_KEY not configured');

  const params = new URLSearchParams({
    model: options.model || 'nova-3',
    punctuate: String(options.punctuate !== false),
    smart_format: String(options.smartFormat !== false),
    diarize: String(options.diarize || false),
  });

  if (options.language) params.set('language', options.language);

  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${DEEPGRAM_KEY}`,
      'Content-Type': 'audio/mpeg',
    },
    body: audioBuffer,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Deepgram [${res.status}]: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const channel = data.results?.channels?.[0];
  const alt = channel?.alternatives?.[0];

  return {
    text: alt?.transcript || '',
    confidence: alt?.confidence || 0,
    language: data.results?.channels?.[0]?.detected_language || options.language || 'en',
    words: (alt?.words || []).map((w: Record<string, unknown>) => ({
      word: String(w.word || ''),
      start: Number(w.start || 0),
      end: Number(w.end || 0),
      confidence: Number(w.confidence || 0),
    })),
    speakers: options.diarize ? (alt?.paragraphs?.paragraphs || []).map((p: Record<string, unknown>) => ({
      speaker: Number(p.speaker || 0),
      text: String((p.sentences as Array<Record<string, unknown>>)?.map(s => s.text).join(' ') || ''),
      start: Number(p.start || 0),
      end: Number(p.end || 0),
    })) : undefined,
  };
}

/**
 * Realtime WebSocket STT config for browser client.
 * Deepgram Nova-3 at ~100ms latency.
 */
export function getDeepgramRealtimeConfig(options: {
  language?: string;
  model?: string;
  smartFormat?: boolean;
  interimResults?: boolean;
} = {}) {
  const params = new URLSearchParams({
    model: options.model || 'nova-3',
    punctuate: 'true',
    smart_format: String(options.smartFormat !== false),
    interim_results: String(options.interimResults !== false),
    encoding: 'linear16',
    sample_rate: '16000',
    channels: '1',
  });

  if (options.language) params.set('language', options.language);

  return {
    url: `wss://api.deepgram.com/v1/listen?${params}`,
    headers: { 'Authorization': `Token ${DEEPGRAM_KEY}` },
    audioFormat: 'linear16',
    sampleRate: 16000,
  };
}
