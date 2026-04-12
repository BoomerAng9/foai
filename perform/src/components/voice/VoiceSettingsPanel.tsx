'use client';

import { useState } from 'react';
import VoiceProviderSwitcher from './VoiceProviderSwitcher';
import { getCost, type VoiceProvider } from '@/lib/voice/pricing';

const T = {
  bg: '#0a0a0f',
  surface: '#111118',
  card: '#161620',
  gold: '#D4A853',
  text: 'rgba(255,255,255,0.9)',
  textMuted: 'rgba(255,255,255,0.5)',
  border: 'rgba(255,255,255,0.08)',
};

interface VoiceSettings {
  ttsProvider: VoiceProvider;
  sttProvider: VoiceProvider;
  voiceEnabled: boolean;
  autoSpeak: boolean;
}

interface Props {
  isPPU: boolean;
  planTier?: string;
  onSettingsChange?: (settings: VoiceSettings) => void;
}

export default function VoiceSettingsPanel({ isPPU, planTier, onSettingsChange }: Props) {
  const [ttsProvider, setTtsProvider] = useState<VoiceProvider>('elevenlabs');
  const [sttProvider, setSttProvider] = useState<VoiceProvider>('deepgram');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const notify = (settings: Partial<VoiceSettings>) => {
    const full: VoiceSettings = {
      ttsProvider,
      sttProvider,
      voiceEnabled,
      autoSpeak,
      ...settings,
    };
    onSettingsChange?.(full);
  };

  // Estimate cost for a 1-minute conversation (30s speaking, 30s listening)
  const estTTS = getCost(ttsProvider, 0.5, isPPU);
  const estSTT = getCost(sttProvider, 0.5, isPPU);
  const estTotal = estTTS + estSTT;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: T.surface, border: `1px solid ${T.border}` }}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={voiceEnabled ? T.gold : T.textMuted} strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          <div>
            <span className="text-sm font-bold" style={{ color: T.text }}>Voice Mode</span>
            {voiceEnabled && (
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${T.gold}20`, color: T.gold }}>
                ON
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {voiceEnabled && (
            <span className="text-[10px]" style={{ color: T.textMuted }}>
              ~${estTotal.toFixed(4)}/min
              {isPPU && <span style={{ color: T.gold }}> (PPU)</span>}
            </span>
          )}
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={T.textMuted} strokeWidth="2"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Expanded settings */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4" style={{ borderTop: `1px solid ${T.border}` }}>
          {/* Voice toggle */}
          <div className="flex items-center justify-between pt-4">
            <span className="text-xs" style={{ color: T.text }}>Enable voice chat</span>
            <button
              onClick={() => {
                const next = !voiceEnabled;
                setVoiceEnabled(next);
                notify({ voiceEnabled: next });
              }}
              className="w-10 h-5 rounded-full transition-colors relative"
              style={{ background: voiceEnabled ? T.gold : 'rgba(255,255,255,0.1)' }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                style={{ left: voiceEnabled ? '22px' : '2px' }}
              />
            </button>
          </div>

          {/* Auto-speak toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: T.text }}>Auto-speak responses</span>
            <button
              onClick={() => {
                const next = !autoSpeak;
                setAutoSpeak(next);
                notify({ autoSpeak: next });
              }}
              className="w-10 h-5 rounded-full transition-colors relative"
              style={{ background: autoSpeak ? T.gold : 'rgba(255,255,255,0.1)' }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                style={{ left: autoSpeak ? '22px' : '2px' }}
              />
            </button>
          </div>

          {/* TTS Provider */}
          <VoiceProviderSwitcher
            direction="tts"
            selected={ttsProvider}
            onSelect={(p) => {
              setTtsProvider(p);
              notify({ ttsProvider: p });
            }}
            isPPU={isPPU}
          />

          {/* STT Provider */}
          <VoiceProviderSwitcher
            direction="stt"
            selected={sttProvider}
            onSelect={(p) => {
              setSttProvider(p);
              notify({ sttProvider: p });
            }}
            isPPU={isPPU}
          />

          {/* Cost breakdown */}
          <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <h5 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: T.textMuted }}>
              Estimated cost per minute
            </h5>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span style={{ color: T.textMuted }}>Voice output (TTS)</span>
                <span style={{ color: T.gold }}>${estTTS.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: T.textMuted }}>Voice input (STT)</span>
                <span style={{ color: T.gold }}>${estSTT.toFixed(4)}</span>
              </div>
              <div className="flex justify-between pt-1" style={{ borderTop: `1px solid ${T.border}` }}>
                <span className="font-bold" style={{ color: T.text }}>Total</span>
                <span className="font-bold" style={{ color: T.gold }}>${estTotal.toFixed(4)}/min</span>
              </div>
              {isPPU && (
                <p className="text-[10px] mt-1" style={{ color: T.textMuted }}>
                  PPU pricing includes 30% markup. Subscribe to a plan for lower rates.
                </p>
              )}
              {planTier && (
                <p className="text-[10px]" style={{ color: T.gold }}>
                  Plan: {planTier.toUpperCase()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
