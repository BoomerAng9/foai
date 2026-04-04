'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

interface TopProspect {
  id: number;
  name: string;
  position: string;
  school: string;
  overall_rank: number;
  tie_grade: string;
  tie_tier: string;
  grade: string;
  nfl_comparison: string;
  projected_round: number;
}

export default function HomePage() {
  const [prospects, setProspects] = useState<TopProspect[]>([]);

  useEffect(() => {
    fetch('/api/players')
      .then(r => r.json())
      .then(d => setProspects((d.players || []).slice(0, 10)))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
      <Header />

      {/* ── HERO ── */}
      <section className="relative px-6 pt-24 pb-20 text-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0" style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(212,168,83,0.08) 0%, transparent 100%)',
        }} />
        <p className="text-xs font-mono tracking-[0.4em] mb-4" style={{ color: 'rgba(212,168,83,0.5)' }}>
          2026 NFL DRAFT · PITTSBURGH · APRIL 23-25
        </p>
        <h1 className="font-outfit text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-4">
          PER<span style={{ color: '#555' }}>|</span><span style={{ color: '#D4A853' }}>FORM</span>
        </h1>
        <p className="text-lg text-white/40 font-mono mb-2">
          Sports Grading &amp; Ranking Platform
        </p>
        <p className="text-sm text-white/25 font-mono max-w-lg mx-auto mb-10">
          Every prospect graded. Every pick projected. Autonomous analyst coverage that never sleeps.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/draft" className="px-8 py-3.5 text-sm font-outfit font-bold tracking-wider transition-all hover:brightness-110" style={{ background: '#D4A853', color: '#0A0A0F' }}>
            2026 DRAFT BOARD
          </Link>
          <Link href="/draft/mock" className="px-8 py-3.5 text-sm font-mono tracking-wider border transition-colors hover:bg-white/5" style={{ borderColor: 'rgba(212,168,83,0.4)', color: '#D4A853' }}>
            MOCK DRAFT SIMULATOR
          </Link>
        </div>
      </section>

      {/* ── TOP 10 PROSPECTS ── */}
      <section className="px-6 py-16 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[10px] font-mono tracking-[0.4em] mb-1" style={{ color: 'rgba(212,168,83,0.5)' }}>LIVE RANKINGS</p>
            <h2 className="font-outfit text-2xl font-extrabold text-white tracking-wide">TOP 10 PROSPECTS</h2>
          </div>
          <Link href="/draft" className="text-xs font-mono tracking-wider hover:text-white/70 transition-colors" style={{ color: '#D4A853' }}>
            VIEW ALL 50 →
          </Link>
        </div>

        {prospects.length > 0 ? (
          <div className="space-y-2">
            {prospects.map((p, i) => (
              <Link key={p.id} href={`/draft/${p.id}`} className="flex items-center gap-4 px-4 py-3 transition-all hover:bg-white/[0.03]" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="w-8 text-center font-outfit text-lg font-extrabold" style={{ color: '#D4A853' }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-outfit text-sm font-bold text-white">{p.name}</span>
                  <span className="text-xs text-white/30 font-mono ml-3">{p.position} · {p.school}</span>
                </div>
                <span className="text-xs font-mono text-white/20 hidden sm:block">
                  comp: {p.nfl_comparison || '—'}
                </span>
                <span className="text-xs font-mono px-2 py-0.5" style={{
                  background: 'rgba(212,168,83,0.1)',
                  color: '#D4A853',
                  border: '1px solid rgba(212,168,83,0.2)',
                }}>
                  {p.tie_grade || `${p.grade}`}
                </span>
                <span className="text-xs font-mono text-white/20">
                  Rd {p.projected_round || '?'}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-white/20 font-mono text-sm">Loading draft board...</div>
        )}
      </section>

      {/* ── WHAT IS PER|FORM ── */}
      <section className="px-6 py-16" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="font-outfit text-2xl font-extrabold text-white tracking-wide mb-6 text-center">HOW IT WORKS</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'TIE GRADES', desc: 'Every prospect evaluated and scored by our proprietary grading system. The results speak for themselves.' },
              { title: 'AI ANALYSTS', desc: 'Four autonomous analysts generate scouting reports, film breakdowns, hot takes, and ranking updates daily.' },
              { title: 'LIVE DATA', desc: 'Pipeline scrapes sports news around the clock. Grades update automatically when new data arrives.' },
            ].map(item => (
              <div key={item.title} className="p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="font-outfit text-sm font-bold tracking-wider mb-3" style={{ color: '#D4A853' }}>{item.title}</h3>
                <p className="text-xs text-white/40 font-mono leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COVERAGE LINKS ── */}
      <section className="px-6 py-16" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Draft Board', href: '/draft', desc: '50 prospects' },
            { label: 'Mock Draft', href: '/draft/mock', desc: '7-round sim' },
            { label: 'Analysts', href: '/analysts', desc: '4 AI voices' },
            { label: 'Flag Football', href: '/flag-football', desc: 'LA 2028' },
          ].map(link => (
            <Link key={link.href} href={link.href} className="p-5 text-center transition-all hover:border-[#D4A853]/40" style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              <span className="font-outfit text-sm font-bold text-white block mb-1">{link.label}</span>
              <span className="text-[10px] font-mono text-white/30">{link.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── DRAFT INFO ── */}
      <section className="px-6 py-16" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-outfit text-2xl font-extrabold text-white tracking-wide mb-4">2026 NFL DRAFT</h2>
          <p className="text-sm text-white/40 font-mono leading-relaxed mb-2">
            April 23-25, 2026 · Pittsburgh, Pennsylvania
          </p>
          <p className="text-sm text-white/30 font-mono leading-relaxed mb-6">
            257 selections across 7 rounds. Coverage on ESPN, ABC, NFL Network.
          </p>
          <p className="text-xs text-white/20 font-mono leading-relaxed max-w-xl mx-auto">
            Per|Form delivers autonomous grading and analysis powered by the TIE system.
            Our AI analyst team generates daily content — scouting reports, film breakdowns,
            mock drafts, and debate segments — without human writers.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
