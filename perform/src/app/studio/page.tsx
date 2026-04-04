'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import Link from 'next/link';

interface AnalystTake {
  analyst: string;
  color: string;
  archetype: string;
  content: string;
}

const ANALYSTS_STATIC = [
  { id: 'analyst-1', name: 'Analyst 1', archetype: 'Stuart Scott energy', color: '#D4A853' },
  { id: 'analyst-2', name: 'Analyst 2', archetype: 'Deion Sanders swagger', color: '#60A5FA' },
  { id: 'analyst-3', name: 'Analyst 3', archetype: 'Film room grinder', color: '#34D399' },
  { id: 'analyst-4', name: 'Analyst 4', archetype: 'Hot-take debate energy', color: '#F97316' },
];

const SEGMENTS = [
  {
    slug: 'around-the-horn',
    title: 'AROUND THE HORN',
    desc: 'Quick-fire takes from all 4 analysts. 30 seconds on the clock.',
    icon: '\u23F1',
  },
  {
    slug: 'bull-vs-bear',
    title: 'BULL VS BEAR',
    desc: 'Two analysts argue opposite sides of one player or pick.',
    icon: '\u2694',
  },
  {
    slug: 'film-room',
    title: 'FILM ROOM',
    desc: 'Deep dive breakdown on a single player — tape don\'t lie.',
    icon: '\uD83C\uDFAC',
  },
  {
    slug: 'mock-draft-live',
    title: 'MOCK DRAFT LIVE',
    desc: 'Analysts make picks in real-time. No take-backs.',
    icon: '\uD83D\uDCCB',
  },
];

export default function StudioPage() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [takes, setTakes] = useState<AnalystTake[]>([]);
  const [debateStarted, setDebateStarted] = useState(false);

  async function startDebate() {
    if (!topic.trim()) return;
    setLoading(true);
    setDebateStarted(true);
    setTakes([]);

    try {
      const res = await fetch('/api/studio/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), format: 'around-the-horn' }),
      });
      const data = await res.json();
      if (data.takes) {
        setTakes(data.takes);
      }
    } catch {
      // silent fail — panels stay empty
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
      <Header />

      <main className="flex-1 px-4 md:px-8 py-8 max-w-7xl mx-auto w-full">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="inline-block px-3 py-1 mb-3 rounded" style={{ background: 'rgba(212,168,83,0.12)', border: '1px solid rgba(212,168,83,0.25)' }}>
            <span className="text-[10px] font-mono tracking-[0.3em]" style={{ color: '#D4A853' }}>BROADCAST STUDIO</span>
          </div>
          <h1 className="font-outfit text-4xl md:text-6xl font-black tracking-tight text-white">
            THE WAR ROOM
          </h1>
          <p className="mt-2 text-sm font-mono text-white/40">
            Live analyst debate &mdash; powered by TIE data
          </p>
          {/* Decorative bar */}
          <div className="mt-4 mx-auto w-48 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #D4A853, transparent)' }} />
        </div>

        {/* Topic input */}
        <div className="max-w-2xl mx-auto mb-8 flex gap-3">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startDebate()}
            placeholder="Enter debate topic... e.g. Who should go #1 overall?"
            className="flex-1 px-4 py-3 rounded-lg text-sm font-mono text-white placeholder-white/25 outline-none transition-colors"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          />
          <button
            onClick={startDebate}
            disabled={loading || !topic.trim()}
            className="px-6 py-3 rounded-lg text-xs font-mono font-bold tracking-[0.2em] transition-all"
            style={{
              background: loading ? 'rgba(212,168,83,0.3)' : '#D4A853',
              color: loading ? '#D4A853' : '#0A0A0F',
              cursor: loading || !topic.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'DEBATING...' : 'START DEBATE'}
          </button>
        </div>

        {/* 2x2 Analyst Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {ANALYSTS_STATIC.map((analyst, i) => {
            const take = takes.find(t => t.analyst === analyst.name);
            const isActive = debateStarted;

            return (
              <div
                key={analyst.id}
                className="relative rounded-lg overflow-hidden transition-all"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isActive ? analyst.color + '40' : 'rgba(255,255,255,0.06)'}`,
                  borderLeft: `3px solid ${analyst.color}`,
                  minHeight: debateStarted ? '200px' : '120px',
                }}
              >
                {/* Panel header */}
                <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: analyst.color, boxShadow: `0 0 8px ${analyst.color}60` }} />
                  <span className="font-outfit text-sm font-bold text-white tracking-wide">{analyst.name.toUpperCase()}</span>
                  <span className="text-[10px] font-mono text-white/30 ml-auto">{analyst.archetype}</span>
                </div>

                {/* Panel content */}
                <div className="px-4 py-3">
                  {loading && !take && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ background: analyst.color }}
                      />
                      <span className="text-xs font-mono text-white/20">Forming take...</span>
                    </div>
                  )}
                  {take && (
                    <p className="text-sm text-white/70 leading-relaxed font-sans">
                      {take.content}
                    </p>
                  )}
                  {!debateStarted && (
                    <p className="text-xs font-mono text-white/15 italic">
                      Waiting for topic...
                    </p>
                  )}
                </div>

                {/* Live indicator when active */}
                {isActive && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#EF4444' }} />
                    <span className="text-[9px] font-mono text-white/30">LIVE</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Segments section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-[1px]" style={{ background: '#D4A853' }} />
            <h2 className="font-outfit text-xl font-bold text-white tracking-wide">SEGMENTS</h2>
            <div className="flex-1 h-[1px]" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SEGMENTS.map((seg) => (
              <Link
                key={seg.slug}
                href={`/studio/${seg.slug}`}
                className="group rounded-lg p-5 transition-all hover:scale-[1.02]"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div className="text-2xl mb-3">{seg.icon}</div>
                <h3 className="font-outfit text-sm font-bold text-white tracking-[0.15em] mb-2 group-hover:text-[#D4A853] transition-colors">
                  {seg.title}
                </h3>
                <p className="text-xs font-mono text-white/30 leading-relaxed">
                  {seg.desc}
                </p>
                <div className="mt-3 text-[10px] font-mono tracking-wider" style={{ color: '#D4A853' }}>
                  ENTER STUDIO &rarr;
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
