'use client';

/**
 * /analysts — The Per|Form broadcast crew
 * ==========================================
 * Broadcast-themed analyst roster. Each analyst gets a premium
 * studio card with their themed background, signature color
 * accent, and tag line. Matches the /draft + /forecast aesthetic.
 */

import Link from 'next/link';
import Image from 'next/image';
import { motion, type Variants } from 'framer-motion';
import { ANALYSTS } from '@/lib/analysts/personas';
import PaywallGate from '@/components/PaywallGate';
import { BackHomeNav } from '@/components/layout/BackHomeNav';

const T = {
  bg:           '#F4F6FA',
  surface:      '#FFFFFF',
  surfaceAlt:   '#FAFBFD',
  border:       '#E2E6EE',
  borderStrong: '#CDD3DF',
  text:         '#0A0E1A',
  textMuted:    '#5A6478',
  textSubtle:   '#8B94A8',
  navy:         '#0B1E3F',
  navyDeep:     '#06122A',
  red:          '#D40028',
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] as [number, number, number, number] },
  }),
};

export default function AnalystsPage() {
  return (
    <PaywallGate>
      <div className="min-h-screen" style={{ background: T.bg, color: T.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
        {/* ═══ TOP RIBBON ═══ */}
        <div style={{ background: T.navyDeep, color: '#FFFFFF', borderBottom: `2px solid ${T.red}` }}>
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between text-[11px] font-bold tracking-[0.18em] uppercase">
            <div className="flex items-center gap-3">
              <BackHomeNav />
              <span style={{ color: T.red }}>● LIVE</span>
              <span className="opacity-50">|</span>
              <span>Per|Form Broadcast Crew</span>
              <span className="opacity-50">|</span>
              <span className="opacity-70">On the Clock</span>
            </div>
            <Link href="/rankings" className="opacity-80 hover:opacity-100 transition">Rankings →</Link>
          </div>
        </div>

        {/* ═══ HERO ═══ */}
        <header className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${T.navy} 0%, ${T.navyDeep} 100%)`, color: '#FFFFFF' }}>
          <div className="absolute inset-0 opacity-[0.08]" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 80px, #FFFFFF 80px, #FFFFFF 81px)',
          }} />
          <div className="relative max-w-7xl mx-auto px-6 py-14">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-[0.2em] rounded" style={{ background: T.red }}>
                THE CREW
              </span>
              <span className="text-[11px] font-semibold tracking-[0.15em] uppercase opacity-70">
                2026 NFL Draft Coverage
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black leading-[0.92] tracking-tight uppercase">
              On the Clock
            </h1>
            <p className="text-lg mt-4 opacity-80 max-w-2xl">
              Five voices. One draft. Per|Form&rsquo;s broadcast crew breaks down every pick — from the anchor desk to the pizzeria in Jersey.
            </p>
          </div>
        </header>

        {/* ═══ ANALYST GRID ═══ */}
        <main className="max-w-7xl mx-auto px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ANALYSTS.map((analyst, i) => (
              <motion.div
                key={analyst.id}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                variants={cardVariants}
                className="group rounded-2xl overflow-hidden flex flex-col transition-all hover:-translate-y-1"
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  boxShadow: '0 1px 3px rgba(10,14,26,0.04), 0 8px 24px rgba(11,30,63,0.05)',
                }}
              >
                {/* Studio image */}
                <div className="relative w-full aspect-square overflow-hidden">
                  <Image
                    src={analyst.imagePath}
                    alt={analyst.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  {/* Bottom gradient for name readability */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(180deg, transparent 50%, rgba(6,18,42,0.92) 100%)',
                    }}
                  />
                  {/* Accent stripe top */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ background: analyst.color }}
                  />
                  {/* LIVE chip */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded backdrop-blur-sm" style={{ background: 'rgba(6,18,42,0.7)' }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: analyst.color }} />
                    <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-white">Live</span>
                  </div>
                  {/* Name + archetype — bottom-left */}
                  <div className="absolute bottom-4 left-5 right-5">
                    <h2
                      className="text-2xl font-black tracking-tight text-white uppercase"
                      style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                      {analyst.name}
                    </h2>
                    <div className="text-[11px] font-semibold tracking-[0.1em] uppercase mt-0.5" style={{ color: analyst.color }}>
                      {analyst.archetype}
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 flex flex-col gap-3 flex-1">
                  <p className="text-[13px] leading-relaxed" style={{ color: T.text }}>
                    {analyst.descriptor}
                  </p>

                  {/* Specialty tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {analyst.specialty.split(', ').slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-block px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded"
                        style={{
                          background: `${analyst.color}15`,
                          color: analyst.color,
                          border: `1px solid ${analyst.color}35`,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Co-host pill (Colonel only currently) */}
                  {analyst.coHost && (
                    <div
                      className="mt-1 p-3 rounded-lg text-[11px]"
                      style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}
                    >
                      <div className="text-[9px] font-bold tracking-[0.22em] uppercase mb-0.5" style={{ color: T.textMuted }}>
                        ◢ Co-Host
                      </div>
                      <div className="font-bold" style={{ color: T.text }}>{analyst.coHost.name}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: T.textMuted }}>
                        {analyst.coHost.role}
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  <Link
                    href={`/analysts/${analyst.id}`}
                    className="mt-auto inline-block text-center px-4 py-2.5 rounded-md text-xs font-bold tracking-[0.15em] uppercase transition-all hover:brightness-110"
                    style={{ background: analyst.color, color: '#0A0E1A' }}
                  >
                    View Feed →
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </main>

        <footer className="py-6 text-center text-[10px] font-mono tracking-[0.25em]" style={{ background: T.navyDeep, color: 'rgba(255,255,255,0.5)' }}>
          PER|FORM · THE CREW · PUBLISHED BY ACHIEVEMOR
        </footer>
      </div>
    </PaywallGate>
  );
}
