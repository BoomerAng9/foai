'use client';

/**
 * SpeakButton — plays analyst content as a podcast via TTS router.
 *
 * Usage:
 *   <SpeakButton analystId="the-haze" text={contentBody} />
 *
 * Phase 1: shows the button, calls the API, handles loading/error
 * states. Phase 2 plays real audio when TTS engines are wired.
 */

import { useState, useRef } from 'react';

interface SpeakButtonProps {
  analystId: string;
  text: string;
  label?: string;
  color?: string;
  className?: string;
}

type State = 'idle' | 'loading' | 'playing' | 'unavailable' | 'error';

export function SpeakButton({ analystId, text, label = 'PLAY PODCAST', color = '#D4A853', className = '' }: SpeakButtonProps) {
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function handleClick() {
    if (state === 'playing' && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setState('idle');
      return;
    }

    setState('loading');
    setError(null);

    try {
      const res = await fetch(`/api/analysts/${analystId}/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();

      if (data.error) {
        setState('error');
        setError(data.error);
        return;
      }

      if (!data.audioUrl) {
        // Phase 1 stub — TTS engines not yet wired
        setState('unavailable');
        return;
      }

      const audio = new Audio(data.audioUrl);
      audioRef.current = audio;
      audio.onended = () => setState('idle');
      audio.onerror = () => {
        setState('error');
        setError('Audio playback failed');
      };
      await audio.play();
      setState('playing');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Speak request failed');
    }
  }

  const icon = state === 'playing' ? <PauseIcon /> : state === 'loading' ? <SpinnerIcon /> : <SpeakerIcon />;
  const displayLabel =
    state === 'loading' ? 'LOADING…'
    : state === 'playing' ? 'STOP'
    : state === 'unavailable' ? 'VOICE COMING SOON'
    : state === 'error' ? 'RETRY'
    : label;

  return (
    <div className={`inline-flex flex-col items-start gap-1 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={state === 'loading'}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold tracking-[0.18em] uppercase transition-all disabled:opacity-60"
        style={{
          color,
          border: `1px solid ${color}55`,
          background: `${color}12`,
        }}
        title={state === 'unavailable' ? 'Voice engines wiring up — check back soon' : `Play ${label}`}
      >
        {icon}
        <span>{displayLabel}</span>
      </button>
      {state === 'error' && error && (
        <div className="text-[9px] font-mono" style={{ color: '#D40028' }}>
          {error.slice(0, 80)}
        </div>
      )}
    </div>
  );
}

/* ── Icons ── */
function SpeakerIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
