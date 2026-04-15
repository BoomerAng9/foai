'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BackHomeNav } from '@/components/layout/BackHomeNav';

const T = {
  bg: 'var(--pf-bg)',
  surface: '#0B1E3F',
  border: '#1E3A5F',
  text: '#F4F6FA',
  textMuted: '#8B94A8',
  gold: '#D4A853',
  red: '#D40028',
};

export default function MLBComingSoonPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
      setEmail('');
    }
  }

  return (
    <div className="min-h-screen" style={{ background: T.bg, color: T.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ═══ TOP RIBBON ═══ */}
      <div style={{ background: T.bg, borderBottom: `2px solid ${T.red}` }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between text-[11px] font-bold tracking-[0.18em] uppercase">
          <div className="flex items-center gap-3">
            <BackHomeNav />
            <span className="opacity-50">|</span>
            <span>Per|Form for Podcasters</span>
          </div>
          <Link href="/podcasters" className="opacity-80 hover:opacity-100 transition" style={{ color: T.gold }}>
            Back to Podcasters
          </Link>
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div className="flex flex-col items-center justify-center px-6" style={{ minHeight: 'calc(100vh - 52px)' }}>
        <div className="text-center max-w-2xl">
          <div className="text-8xl md:text-9xl mb-6">
            <span role="img" aria-label="baseball">&#9918;</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-4">MLB</h1>

          <p className="text-3xl md:text-4xl font-bold mb-8" style={{ color: T.gold }}>
            Coming Soon
          </p>

          <p className="text-lg md:text-xl leading-relaxed mb-12" style={{ color: T.textMuted }}>
            30 MLB teams, full rosters, player stats, coaching staff, and farm system tracking — launching soon.
          </p>

          {/* ═══ EMAIL SIGNUP ═══ */}
          {submitted ? (
            <div
              className="inline-flex items-center gap-2 px-6 py-4 rounded-lg text-sm font-bold"
              style={{ background: T.surface, border: `1px solid ${T.border}` }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              You&apos;re on the list!
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3 justify-center">
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full sm:w-80 px-5 py-3 rounded-lg text-sm outline-none transition-all focus:ring-2"
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  color: T.text,
                  // @ts-expect-error -- ring color for focus
                  '--tw-ring-color': T.gold,
                }}
              />
              <button
                type="submit"
                className="px-8 py-3 rounded-lg text-sm font-bold tracking-wider uppercase transition-all hover:shadow-lg hover:shadow-yellow-900/20"
                style={{ background: T.gold, color: T.bg }}
              >
                Get Notified
              </button>
            </form>
          )}

          {/* ═══ BACK LINK ═══ */}
          <div className="mt-16">
            <Link
              href="/podcasters"
              className="text-xs font-semibold tracking-[0.15em] uppercase opacity-60 hover:opacity-100 transition"
              style={{ color: T.textMuted }}
            >
              &larr; Back to Podcasters Hub
            </Link>
          </div>
        </div>
      </div>

      {/* ═══ FOOTER BAR ═══ */}
      <footer
        className="py-6 text-center text-[10px] font-mono tracking-[0.25em]"
        style={{ background: T.bg, color: 'rgba(255,255,255,0.3)', borderTop: `1px solid ${T.border}` }}
      >
        PER|FORM FOR PODCASTERS &middot; PUBLISHED BY ACHIEVEMOR
      </footer>
    </div>
  );
}
