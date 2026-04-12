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

export type VoiceGender = 'male' | 'female';

export const GROK_VOICES = {
  ara: { id: 'ara', name: 'Ara', desc: 'Warm, confident female voice', gender: 'female' as VoiceGender },
  eve: { id: 'eve', name: 'Eve', desc: 'Clear, professional female voice', gender: 'female' as VoiceGender },
  leo: { id: 'leo', name: 'Leo', desc: 'Deep, authoritative male voice', gender: 'male' as VoiceGender },
  rex: { id: 'rex', name: 'Rex', desc: 'Energetic, dynamic male voice', gender: 'male' as VoiceGender },
  sal: { id: 'sal', name: 'Sal', desc: 'Calm, measured male voice', gender: 'male' as VoiceGender },
} as const;

export type GrokVoiceId = keyof typeof GROK_VOICES;

/** Agent persona definitions — gender-locked voice selection + traits */
export interface AgentPersona {
  voice: GrokVoiceId;
  gender: VoiceGender;
  label: string;
  role: string;
  allowedVoices: GrokVoiceId[];  // Only voices matching this agent's gender
  skills: string[];
}

export const AGENT_PERSONAS: Record<string, AgentPersona> = {
  acheevy: {
    voice: 'leo', gender: 'male',
    label: 'ACHEEVY', role: 'Digital CEO',
    allowedVoices: ['leo', 'rex', 'sal'],
    skills: ['Strategy', 'Execution', 'Dispatch', 'RFP-BAMARAM'],
  },
  consult_ang: {
    voice: 'sal', gender: 'male',
    label: 'Consult_Ang', role: 'Fast Responder',
    allowedVoices: ['sal', 'leo', 'rex'],
    skills: ['Clarification', 'Quick Answers', 'Triage'],
  },
  chicken_hawk: {
    voice: 'rex', gender: 'male',
    label: 'Chicken Hawk', role: 'Tactical Operator (2IC)',
    allowedVoices: ['rex', 'leo', 'sal'],
    skills: ['Scaffolding', 'Deployment', 'Ops'],
  },
  void_caster: {
    voice: 'rex', gender: 'male',
    label: 'Void-Caster', role: 'Broadcast Anchor',
    allowedVoices: ['rex', 'leo', 'sal'],
    skills: ['Analysis', 'Commentary', 'Draft Coverage'],
  },
  haze: {
    voice: 'rex', gender: 'male',
    label: 'Haze', role: 'Culture Commentator',
    allowedVoices: ['rex', 'sal', 'leo'],
    skills: ['Hot Takes', 'Debate', 'Culture Analysis'],
  },
  smoke: {
    voice: 'sal', gender: 'male',
    label: 'Smoke', role: 'Analytical Counter-Voice',
    allowedVoices: ['sal', 'leo', 'rex'],
    skills: ['Data Analysis', 'Counter-Arguments', 'Stats'],
  },
  the_colonel: {
    voice: 'eve', gender: 'male',
    label: 'The Colonel', role: 'Podcast Host — Jersey Guy',
    allowedVoices: ['leo', 'rex', 'sal'],
    skills: ['Podcasting', 'Commentary', 'Debate'],
  },
  astra_novatos: {
    voice: 'leo', gender: 'male',
    label: 'Astra Novatos', role: 'Luxury Brand Analyst',
    allowedVoices: ['leo', 'rex', 'sal'],
    skills: ['Brand Strategy', 'Market Analysis', 'Luxury Positioning'],
  },
  bun_e: {
    voice: 'ara', gender: 'female',
    label: 'Bun-E', role: 'Cosmic Polymath',
    allowedVoices: ['ara', 'eve'],
    skills: ['Women in Sports', 'Tech/Leadership', 'Legal Analysis'],
  },
  betty_anne_ang: {
    voice: 'eve', gender: 'female',
    label: 'Betty-Anne_Ang', role: 'HR PMO Evaluator',
    allowedVoices: ['eve', 'ara'],
    skills: ['Org Fit Index', 'Performance Review', 'Workforce Eval'],
  },
};

// Legacy compat — simple voice map derived from personas
export const AGENT_VOICE_MAP: Record<string, GrokVoiceId> = Object.fromEntries(
  Object.entries(AGENT_PERSONAS).map(([k, v]) => [k, v.voice])
);

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
    formData.append('file', new Blob([new Uint8Array(audioBuffer)], { type: 'audio/webm' }), 'audio.webm');
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
