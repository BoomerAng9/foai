'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

interface AnalystInfo {
  id: string;
  name: string;
  archetype: string;
  color: string;
}

interface SideResult {
  content: string;
  analyst: AnalystInfo;
}

export default function DebatePage() {
  const [topic, setTopic] = useState('');
  const [bull, setBull] = useState<SideResult | null>(null);
  const [bear, setBear] = useState<SideResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function startDebate() {
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    setBull(null);
    setBear(null);

    try {
      const [bullRes, bearRes] = await Promise.all([
        fetch('/api/analysts/analyst-4', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentType: 'debate_bull', context: topic }),
        }),
        fetch('/api/analysts/analyst-2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentType: 'debate_bear', context: topic }),
        }),
      ]);

      const bullData = await bullRes.json();
      const bearData = await bearRes.json();

      if (!bullRes.ok) throw new Error(bullData.error || 'Bull case failed');
      if (!bearRes.ok) throw new Error(bearData.error || 'Bear case failed');

      setBull({ content: bullData.content, analyst: bullData.analyst });
      setBear({ content: bearData.content, analyst: bearData.analyst });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Debate generation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F', color: '#fff' }}>
      <Header />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-widest text-center mb-1" style={{ color: '#D4A853' }}>
          BULL VS BEAR
        </h1>
        <p className="text-center text-xs text-white/30 font-mono mb-8">
          DUAL-ANALYST DEBATE ENGINE
        </p>

        {/* Topic input */}
        <div className="max-w-2xl mx-auto mb-8">
          <label className="block text-[10px] font-mono text-white/40 tracking-wider mb-1.5">DEBATE TOPIC</label>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="e.g. Jeremiyah Love is the best RB prospect since Saquon Barkley"
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white/80 placeholder-white/20 font-mono focus:outline-none focus:border-[#D4A853]/40 mb-4"
            onKeyDown={e => e.key === 'Enter' && startDebate()}
          />
          <div className="text-center">
            <button
              onClick={startDebate}
              disabled={loading || !topic.trim()}
              className="px-6 py-2 rounded font-mono text-sm font-bold tracking-wider transition-all disabled:opacity-40"
              style={{
                background: 'rgba(212,168,83,0.15)',
                color: '#D4A853',
                border: '1px solid rgba(212,168,83,0.3)',
              }}
            >
              {loading ? 'DEBATING...' : 'START DEBATE'}
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-2 border-[#D4A853]/30 border-t-[#D4A853] rounded-full animate-spin" />
            <p className="text-xs font-mono text-white/30 mt-3">ANALYSTS ARE PREPARING ARGUMENTS...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-4">
            <p className="text-sm font-mono text-red-400">{error}</p>
          </div>
        )}

        {/* Debate results — split screen */}
        {!loading && bull && bear && (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-0 md:gap-0">
            {/* Bull side */}
            <div
              className="rounded-lg p-5"
              style={{
                background: 'rgba(34,197,94,0.03)',
                border: '1px solid rgba(34,197,94,0.2)',
                borderRight: 'none',
                borderTopRightRadius: 0,
                borderBottomRightRadius: 0,
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ background: '#22C55E' }} />
                <span className="text-xs font-mono font-bold" style={{ color: '#22C55E' }}>BULL CASE</span>
              </div>
              {bull.analyst && (
                <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid rgba(34,197,94,0.1)' }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: bull.analyst.color }} />
                  <span className="text-[10px] font-mono text-white/40">{bull.analyst.name}</span>
                  <span className="text-[9px] font-mono text-white/20">{bull.analyst.archetype}</span>
                </div>
              )}
              <div className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                {bull.content}
              </div>
            </div>

            {/* VS Divider */}
            <div className="hidden md:flex items-center justify-center px-4">
              <div className="flex flex-col items-center">
                <div className="w-px h-16" style={{ background: 'rgba(255,255,255,0.1)' }} />
                <span
                  className="text-xl font-extrabold my-2 tracking-wider"
                  style={{ color: '#D4A853' }}
                >
                  VS
                </span>
                <div className="w-px h-16" style={{ background: 'rgba(255,255,255,0.1)' }} />
              </div>
            </div>

            {/* Mobile VS */}
            <div className="md:hidden flex items-center justify-center py-3">
              <span className="text-lg font-extrabold tracking-wider" style={{ color: '#D4A853' }}>VS</span>
            </div>

            {/* Bear side */}
            <div
              className="rounded-lg p-5"
              style={{
                background: 'rgba(239,68,68,0.03)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderLeft: 'none',
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ background: '#EF4444' }} />
                <span className="text-xs font-mono font-bold" style={{ color: '#EF4444' }}>BEAR CASE</span>
              </div>
              {bear.analyst && (
                <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid rgba(239,68,68,0.1)' }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: bear.analyst.color }} />
                  <span className="text-[10px] font-mono text-white/40">{bear.analyst.name}</span>
                  <span className="text-[9px] font-mono text-white/20">{bear.analyst.archetype}</span>
                </div>
              )}
              <div className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                {bear.content}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
