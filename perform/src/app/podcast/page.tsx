'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { EpisodeCard } from '@/components/podcast/EpisodeCard';

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
  'air-pod-host-1': { name: 'The Haze', color: '#60A5FA', imagePath: '/analysts/air-pod-studio.png', gender: 'male' },
  'air-pod-host-2': { name: 'The Haze', color: '#60A5FA', imagePath: '/analysts/air-pod-studio.png', gender: 'male' },
  'the-colonel': { name: 'The Colonel', color: '#EF4444', imagePath: '/analysts/the-colonel-studio.png', gender: 'male' },
  'astra-novatos': { name: 'Astra Novatos', color: '#F59E0B', imagePath: '/analysts/astra-novatos-tux.png', gender: 'male' },
  'bun-e': { name: 'Bun-E', color: '#8B5CF6', imagePath: '/analysts/bun-e-studio.png', gender: 'female' },
};

export default function PodcastPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAnalyst, setFilterAnalyst] = useState<string>('');

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

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--pf-bg)', color: 'var(--pf-text)' }}>
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 pb-24">
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
          {Object.entries(ANALYST_META)
            .filter(([id]) => !['air-pod-host-1', 'air-pod-host-2'].includes(id))
            .map(([id, meta]) => (
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

              return (
                <EpisodeCard key={ep.id} episode={ep} meta={meta} />
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
