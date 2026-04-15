'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BackHomeNav } from '@/components/layout/BackHomeNav';
import { HuddleFeed } from '@/components/huddle/HuddleFeed';
import type { HuddleProfile } from '@/components/huddle/PostCard';
import { ANALYSTS } from '@/lib/analysts/personas';

/* ───────────────────────── helpers ───────────────────────── */

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/* ───────────────────────── page ───────────────────────── */

export default function HuddlePage() {
  const [profiles, setProfiles] = useState<HuddleProfile[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/huddle/profiles');
        const data = await res.json();
        setProfiles(data.profiles || []);
      } catch {
        setProfiles([]);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--pf-bg)' }}>
      <Header />

      {/* ── Ribbon ── */}
      <div
        className="flex items-center px-6 py-2"
        style={{
          background: 'rgba(212,168,83,0.04)',
          borderBottom: '1px solid rgba(212,168,83,0.1)',
        }}
      >
        <BackHomeNav />
        <span className="text-[10px] font-mono text-white/30 tracking-widest">THE HUDDLE</span>
      </div>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(212,168,83,0.08) 0%, transparent 40%, rgba(10,25,58,0.3) 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(212,168,83,0.06) 0%, transparent 70%)',
          }}
        />

        <div className="relative max-w-5xl mx-auto px-6 py-16 sm:py-24 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#D4A853]/40" />
            <span className="text-[10px] font-mono text-[#D4A853]/60 tracking-[0.3em]">
              PER|FORM SOCIAL
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#D4A853]/40" />
          </div>

          <h1 className="font-outfit text-5xl sm:text-7xl font-black tracking-[0.08em] text-white mb-3">
            THE <span style={{ color: '#D4A853' }}>HUDDLE</span>
          </h1>

          <p className="text-sm sm:text-base font-mono text-white/30 tracking-wider mb-2">
            by <span className="text-white/50">The Deploy Platform</span>
          </p>

          <p className="text-sm text-white/20 font-mono tracking-wider max-w-md mx-auto">
            Where the conversation never stops.
          </p>
        </div>
      </section>

      {/* ── Analyst avatar strip ── */}
      <div
        className="flex items-center justify-center gap-4 px-6 py-5 overflow-x-auto scrollbar-hide"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        {ANALYSTS.map((a) => (
          <Link
            key={a.id}
            href={`/huddle/${a.id}`}
            className="shrink-0 flex flex-col items-center gap-1.5 group"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold transition-all group-hover:scale-110"
              style={{
                background: `${a.color}22`,
                color: a.color,
                border: `2px solid ${a.color}44`,
              }}
            >
              {initials(a.name)}
            </div>
            <span className="text-[9px] font-mono text-white/30 group-hover:text-white/60 transition-colors tracking-wider">
              {a.name.split(' ').pop()}
            </span>
          </Link>
        ))}
      </div>

      {/* ── Feed ── */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <HuddleFeed profiles={profiles} />
      </main>

      <Footer />
    </div>
  );
}
