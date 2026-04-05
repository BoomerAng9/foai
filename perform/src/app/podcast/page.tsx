'use client';

import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';

interface Episode {
  id: number;
  analyst_id: string;
  title: string;
  transcript: string;
  audio_url: string | null;
  duration_seconds: number;
  type: string;
  created_at: string;
}

const ANALYST_META: Record<string, { name: string; color: string; imagePath: string; gender: string }> = {
  'void-caster': { name: 'The Void-Caster', color: '#D4A853', imagePath: '/analysts/void-caster-realistic.png', gender: 'male' },
  'the-haze': { name: 'The Haze', color: '#60A5FA', imagePath: '/analysts/air-pod-studio.png', gender: 'male' },
  // Legacy IDs map to The Haze duo show
  'air-pod-host-1': { name: 'The Haze', color: '#60A5FA', imagePath: '/analysts/air-pod-studio.png', gender: 'male' },
  'air-pod-host-2': { name: 'The Haze', color: '#60A5FA', imagePath: '/analysts/air-pod-studio.png', gender: 'male' },
  'the-colonel': { name: 'The Colonel', color: '#34D399', imagePath: '/analysts/female-analyst.png', gender: 'female' },
  'astra-novatos': { name: 'Astra Novatos', color: '#F59E0B', imagePath: '/analysts/astra-novatos-tux.png', gender: 'male' },
  'bun-e': { name: 'Bun-E', color: '#EF4444', imagePath: '/analysts/robot-mascot.jpeg', gender: 'male' },
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function typeLabel(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PodcastPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [filterAnalyst, setFilterAnalyst] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const url = filterAnalyst
          ? `/api/podcast/episodes?analyst=${filterAnalyst}`
          : '/api/podcast/episodes';
        const res = await fetch(url);
        const data = await res.json();
        setEpisodes(data.episodes || []);
      } catch {
        setEpisodes([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filterAnalyst]);

  function handlePlay(ep: Episode) {
    if (playingId === ep.id) {
      // Toggle pause
      if (audioRef.current) {
        if (audioRef.current.paused) {
          audioRef.current.play();
        } else {
          audioRef.current.pause();
        }
      }
      return;
    }

    // Stop current
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (!ep.audio_url) return;

    const audio = new Audio(ep.audio_url);
    audio.play();
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    setPlayingId(ep.id);
  }

  function handleStop() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F', color: '#fff' }}>
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {/* Title */}
        <h1
          className="text-3xl md:text-4xl font-extrabold tracking-[0.25em] text-center mb-1"
          style={{ color: '#D4A853' }}
        >
          PER|FORM PICKS
        </h1>
        <p className="text-center text-xs text-white/30 font-mono tracking-wider mb-8">
          DAILY DRAFT COVERAGE FROM OUR ANALYST TEAM
        </p>

        {/* Analyst filter */}
        <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setFilterAnalyst('')}
            className="shrink-0 px-3 py-1 rounded-full text-[10px] font-mono tracking-wider transition-all"
            style={{
              background: !filterAnalyst ? 'rgba(212,168,83,0.2)' : 'rgba(255,255,255,0.04)',
              color: !filterAnalyst ? '#D4A853' : 'rgba(255,255,255,0.4)',
              border: `1px solid ${!filterAnalyst ? 'rgba(212,168,83,0.4)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            ALL
          </button>
          {Object.entries(ANALYST_META).map(([id, meta]) => (
            <button
              key={id}
              onClick={() => setFilterAnalyst(id)}
              className="shrink-0 px-3 py-1 rounded-full text-[10px] font-mono tracking-wider transition-all"
              style={{
                background: filterAnalyst === id ? `${meta.color}22` : 'rgba(255,255,255,0.04)',
                color: filterAnalyst === id ? meta.color : 'rgba(255,255,255,0.4)',
                border: `1px solid ${filterAnalyst === id ? `${meta.color}66` : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              {meta.name.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-block w-8 h-8 border-2 border-[#D4A853]/30 border-t-[#D4A853] rounded-full animate-spin" />
            <p className="text-xs font-mono text-white/30 mt-3">LOADING EPISODES...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && episodes.length === 0 && (
          <div className="text-center py-20">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(212,168,83,0.1)', border: '1px solid rgba(212,168,83,0.2)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4A853" strokeWidth="1.5">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
            <p className="text-sm text-white/40 font-mono">
              Episodes coming soon — our analysts are recording.
            </p>
          </div>
        )}

        {/* Episode list */}
        {!loading && episodes.length > 0 && (
          <div className="space-y-3">
            {episodes.map((ep) => {
              const meta = ANALYST_META[ep.analyst_id] || {
                name: ep.analyst_id,
                color: '#888',
                imagePath: '',
                gender: 'male',
              };
              const isPlaying = playingId === ep.id;

              return (
                <div
                  key={ep.id}
                  className="rounded-lg p-4 transition-all"
                  style={{
                    background: isPlaying
                      ? 'rgba(212,168,83,0.06)'
                      : 'rgba(255,255,255,0.025)',
                    border: `1px solid ${isPlaying ? 'rgba(212,168,83,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Analyst avatar */}
                    <div
                      className="shrink-0 w-12 h-12 rounded-full overflow-hidden relative"
                      style={{ border: `2px solid ${meta.color}44` }}
                    >
                      {meta.imagePath ? (
                        <Image
                          src={meta.imagePath}
                          alt={meta.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-xs font-bold"
                          style={{ background: `${meta.color}22`, color: meta.color }}
                        >
                          {meta.name[0]}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono font-bold" style={{ color: meta.color }}>
                          {meta.name}
                        </span>
                        <span
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            color: 'rgba(255,255,255,0.3)',
                          }}
                        >
                          {typeLabel(ep.type)}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-white/85 truncate mb-1">
                        {ep.title}
                      </h3>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-white/30">
                        <span>{formatDuration(ep.duration_seconds)}</span>
                        <span>{formatDate(ep.created_at)}</span>
                      </div>
                    </div>

                    {/* Play button */}
                    <button
                      onClick={() => (isPlaying ? handleStop() : handlePlay(ep))}
                      className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: isPlaying
                          ? 'rgba(212,168,83,0.2)'
                          : ep.audio_url
                            ? 'rgba(255,255,255,0.06)'
                            : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isPlaying ? 'rgba(212,168,83,0.4)' : 'rgba(255,255,255,0.1)'}`,
                        cursor: ep.audio_url ? 'pointer' : 'not-allowed',
                        opacity: ep.audio_url ? 1 : 0.3,
                      }}
                      disabled={!ep.audio_url}
                      title={!ep.audio_url ? 'Audio not available' : isPlaying ? 'Stop' : 'Play'}
                    >
                      {isPlaying ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="#D4A853">
                          <rect x="2" y="1" width="4" height="12" rx="1" />
                          <rect x="8" y="1" width="4" height="12" rx="1" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="rgba(255,255,255,0.6)">
                          <polygon points="3,1 13,7 3,13" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Expanded transcript when playing */}
                  {isPlaying && (
                    <div
                      className="mt-3 pt-3 text-xs text-white/50 leading-relaxed font-mono max-h-48 overflow-y-auto"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      {ep.transcript.split('\n').map((line, i) => (
                        <p key={i} className="mb-1">
                          {line || '\u00A0'}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
