/**
 * Grok 4.20 Voice Agent Client
 *
 * Real-time bidirectional voice via WebSocket.
 * <1s time-to-first-audio. 5 voice personalities.
 * Supports tool calling and web search.
 *
 * Docs: https://docs.x.ai/developers/model-capabilities/audio/voice-agent
 * API: wss://api.x.ai/v1/realtime
 */

export const GROK_VOICES = {
  ara: { id: 'ara', name: 'Ara', desc: 'Warm, confident female voice' },
  eve: { id: 'eve', name: 'Eve', desc: 'Clear, professional female voice' },
  leo: { id: 'leo', name: 'Leo', desc: 'Deep, authoritative male voice' },
  rex: { id: 'rex', name: 'Rex', desc: 'Energetic, dynamic male voice' },
  sal: { id: 'sal', name: 'Sal', desc: 'Calm, measured male voice' },
} as const;

export type GrokVoiceId = keyof typeof GROK_VOICES;

// ACHEEVY default voice mapping
export const AGENT_VOICE_MAP: Record<string, GrokVoiceId> = {
  acheevy: 'leo',        // Deep, authoritative — CEO energy
  consult_ang: 'sal',    // Calm, measured — consultant
  void_caster: 'rex',    // Energetic — broadcast anchor
  the_colonel: 'eve',    // Professional female — military precision
  haze: 'rex',           // Energetic — culture commentator
  smoke: 'sal',          // Calm — analytical counter-voice
  astra_novatos: 'leo',  // Authoritative — luxury brand
  chicken_hawk: 'rex',   // Dynamic — tactical ops
};

export interface GrokVoiceConfig {
  voice?: GrokVoiceId;
  systemPrompt?: string;
  temperature?: number;
  enableSearch?: boolean;
}

/**
 * Get WebSocket URL for Grok Voice Agent
 */
export function getGrokVoiceUrl(): string {
  return 'wss://api.x.ai/v1/realtime';
}

/**
 * Build the initial session config message for the WebSocket
 */
export function buildSessionConfig(config: GrokVoiceConfig = {}): object {
  return {
    type: 'session.update',
    session: {
      model: 'grok-4.20-beta',
      voice: config.voice || 'leo',
      instructions: config.systemPrompt || 'You are ACHEEVY, the Digital CEO of The Deploy Platform.',
      input_audio_transcription: { model: 'grok-4.20-beta' },
      temperature: config.temperature ?? 0.7,
      tools: config.enableSearch ? [
        { type: 'web_search', description: 'Search the web for real-time information' },
      ] : [],
    },
  };
}

/**
 * TTS-only: Generate speech from text using Grok TTS API
 */
export async function grokTextToSpeech(
  text: string,
  voice: GrokVoiceId = 'leo',
): Promise<ArrayBuffer | null> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.x.ai/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-4.20-beta-tts',
        input: text.slice(0, 4096),
        voice,
        response_format: 'mp3',
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;
    return res.arrayBuffer();
  } catch {
    return null;
  }
}

/**
 * STT-only: Transcribe audio using Grok
 */
export async function grokSpeechToText(
  audioBuffer: ArrayBuffer,
): Promise<string | null> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;

  try {
    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer], { type: 'audio/webm' }), 'audio.webm');
    formData.append('model', 'grok-4.20-beta');

    const res = await fetch('https://api.x.ai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.text || null;
  } catch {
    return null;
  }
}
