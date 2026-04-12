/**
 * Voice Provider Pricing & Quality Rankings
 * ============================================
 * PPU (Pay Per Use) users pay 1.3x markup over plan users.
 * Pricing per minute of audio generated/transcribed.
 */

export type VoiceProvider = 'elevenlabs' | 'async' | 'deepgram' | 'scribe';
export type VoiceDirection = 'tts' | 'stt';

export interface ProviderOption {
  id: VoiceProvider;
  name: string;
  direction: VoiceDirection;
  qualityRank: number;        // 1 = best
  latencyMs: number;          // measured from stress test
  costPerMinPlan: number;     // $ per minute for plan users
  costPerMinPPU: number;      // $ per minute for PPU users (1.3x)
  languages: number;
  features: string[];
  badge?: 'fastest' | 'cheapest' | 'best-quality' | 'most-languages';
}

// Measured from real stress tests 2026-04-12
export const TTS_PROVIDERS: ProviderOption[] = [
  {
    id: 'elevenlabs',
    name: 'ElevenLabs v3',
    direction: 'tts',
    qualityRank: 1,
    latencyMs: 3004,
    costPerMinPlan: 0.30,
    costPerMinPPU: 0.39,
    languages: 32,
    features: ['Lowest latency streaming (75ms Flash)', '6 custom Per|Form analyst voices', 'Voice Design', 'Professional cloning'],
    badge: 'best-quality',
  },
  {
    id: 'async',
    name: 'Async Flash v1.0',
    direction: 'tts',
    qualityRank: 2,
    latencyMs: 1573,
    costPerMinPlan: 0.008,      // $0.50/hr = $0.0083/min
    costPerMinPPU: 0.011,
    languages: 15,
    features: ['3-second voice cloning', 'Cheapest per hour ($0.50/hr)', 'WebSocket streaming', 'Custom voice library'],
    badge: 'cheapest',
  },
];

export const STT_PROVIDERS: ProviderOption[] = [
  {
    id: 'deepgram',
    name: 'Deepgram Nova-3',
    direction: 'stt',
    qualityRank: 1,
    latencyMs: 629,
    costPerMinPlan: 0.0043,
    costPerMinPPU: 0.0056,
    languages: 36,
    features: ['Fastest STT (~100ms realtime)', 'Smart formatting', 'Speaker diarization', 'Punctuation'],
    badge: 'fastest',
  },
  {
    id: 'scribe',
    name: 'ElevenLabs Scribe v2',
    direction: 'stt',
    qualityRank: 2,
    latencyMs: 610,
    costPerMinPlan: 0.0050,
    costPerMinPPU: 0.0065,
    languages: 90,
    features: ['90+ languages', 'Audio event tagging (laughter, music)', 'Word timestamps', 'Speaker diarization'],
    badge: 'most-languages',
  },
];

export const ALL_PROVIDERS = [...TTS_PROVIDERS, ...STT_PROVIDERS];

export function getProvidersByDirection(direction: VoiceDirection): ProviderOption[] {
  return ALL_PROVIDERS.filter(p => p.direction === direction).sort((a, b) => a.qualityRank - b.qualityRank);
}

export function getCost(provider: VoiceProvider, durationMinutes: number, isPPU: boolean): number {
  const p = ALL_PROVIDERS.find(opt => opt.id === provider);
  if (!p) return 0;
  const rate = isPPU ? p.costPerMinPPU : p.costPerMinPlan;
  return Math.round(rate * durationMinutes * 10000) / 10000;
}
