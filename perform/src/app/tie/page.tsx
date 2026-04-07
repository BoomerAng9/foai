'use client';

/**
 * TIE — Talent & Innovation Engine hub page
 * ============================================
 * The dedicated landing + hero + intro for running grading simulations.
 * Users upload their own rosters/data, get back a canonical TIE report.
 *
 * Sub-routes (next phase):
 *   /tie/grading  — run the 40·30·30 engine against uploaded data
 *   /tie/rankings — browse the canonical big board (moved from /rankings)
 *   /tie/badges   — already exists (grade badge showcase)
 */

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

const T = {
  bg: '#060A14',
  bgAlt: '#0D1424',
  surface: '#111A2F',
  border: '#1F2A45',
  text: '#FFFFFF',
  textMuted: '#9DA7BD',
  textSubtle: '#6B7589',
  gold: '#D4A853',
  goldBright: '#FFD700',
  orange: '#F97316',
  red: '#D40028',
  cyan: '#22D3EE',
  green: '#34D399',
};

export default function TIELandingPage() {
  return (
    <div className="min-h-screen" style={{ background: T.bg, color: T.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ═══ LIVE RIBBON ═══ */}
      <div style={{ background: '#000000', borderBottom: `1px solid ${T.border}` }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between text-[11px] font-bold tracking-[0.18em] uppercase">
          <div className="flex items-center gap-3">
            <span style={{ color: T.red }}>● LIVE</span>
            <span className="opacity-50">|</span>
            <span style={{ color: T.gold }}>Talent &amp; Innovation Engine</span>
          </div>
          <div className="flex items-center gap-5 text-[10px]">
            <Link href="/tie/grading" className="opacity-80 hover:opacity-100 transition">Grading</Link>
            <Link href="/tie/rankings" className="opacity-80 hover:opacity-100 transition">Rankings</Link>
            <Link href="/tie/badges" className="opacity-80 hover:opacity-100 transition">Badges</Link>
            <Link href="/draft" className="opacity-80 hover:opacity-100 transition">Draft Board →</Link>
          </div>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden min-h-[92vh] flex items-center">
        {/* TIE HQ lobby scene */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/brand/scenes/tie-hq-lobby.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {/* Dark gradient wash */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(6,10,20,0.88) 0%, rgba(6,10,20,0.6) 50%, rgba(6,10,20,0.92) 100%)',
          }}
        />
        {/* Vignette for depth */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 30% 50%, transparent 0%, rgba(0,0,0,0.6) 80%)',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-12 items-center z-10">
          {/* LEFT — copy + CTA */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6" style={{ background: `${T.gold}15`, border: `1px solid ${T.gold}40` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: T.gold }} />
              <span className="text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: T.gold }}>
                Canonical · 40·30·30 · Published by ACHIEVEMOR
              </span>
            </div>

            <h1
              className="text-6xl md:text-8xl font-black leading-[0.88] tracking-tight mb-6"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              THE{' '}
              <span
                style={{
                  background: `linear-gradient(135deg, ${T.goldBright} 0%, ${T.gold} 50%, ${T.orange} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                TALENT
              </span>
              <br />
              <span
                style={{
                  background: `linear-gradient(135deg, ${T.goldBright} 0%, ${T.gold} 50%, ${T.orange} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                ENGINE
              </span>
            </h1>

            <p className="text-lg md:text-xl leading-relaxed max-w-xl mb-8" style={{ color: T.textMuted }}>
              TIE grades any athlete through the same canonical formula Per|Form uses on the 600-player NFL Draft board. Upload your own rosters, combine results, or scouting sheets — and get back a full tier-ranked report with dual grades, medical deltas, and historical longevity comps.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/tie/grading"
                className="inline-flex items-center gap-3 px-7 py-4 rounded-lg font-bold text-sm tracking-[0.15em] uppercase transition-all hover:scale-[1.02]"
                style={{
                  background: `linear-gradient(135deg, ${T.goldBright} 0%, ${T.gold} 100%)`,
                  color: '#0A0E1A',
                  boxShadow: `0 8px 28px rgba(212,168,83,0.35)`,
                }}
              >
                ▸ Run Your Numbers
              </Link>
              <Link
                href="/tie/rankings"
                className="inline-flex items-center gap-2 px-6 py-4 rounded-lg font-bold text-sm tracking-[0.15em] uppercase transition-all"
                style={{
                  background: 'transparent',
                  color: T.gold,
                  border: `1.5px solid ${T.gold}40`,
                }}
              >
                See Our Rankings
              </Link>
            </div>

            {/* Pillar row */}
            <div className="mt-12 grid grid-cols-3 gap-6 max-w-lg">
              <PillarMini label="Game Performance" weight="40%" tone={T.goldBright} />
              <PillarMini label="Athleticism" weight="30%" tone={T.cyan} />
              <PillarMini label="Intangibles" weight="30%" tone={T.orange} />
            </div>
          </motion.div>

          {/* RIGHT — TIE Engine character */}
          <motion.div
            className="relative flex justify-center items-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(249,115,22,0.25) 0%, transparent 60%)',
                filter: 'blur(40px)',
              }}
            />
            <Image
              src="/brand/tie-engine-hero.png"
              alt="TIE Engine"
              width={520}
              height={520}
              priority
              className="relative object-contain"
              style={{
                filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.7)) drop-shadow(0 0 60px rgba(249,115,22,0.35))',
              }}
            />
          </motion.div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="relative py-24" style={{ background: T.bgAlt }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-[10px] font-bold tracking-[0.25em] uppercase mb-3" style={{ color: T.gold }}>
              ◢ How It Works
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Upload → Grade → Report
            </h2>
            <p className="text-base mt-3 max-w-2xl mx-auto" style={{ color: T.textMuted }}>
              Three steps. The same canonical formula used on the 600-player 2026 NFL Draft board, applied to any roster you drop in.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <StepCard
              n="01"
              title="Upload Your Roster"
              body="Drop a CSV, spreadsheet, or scouting sheet. TIE parses it and maps it to the canonical schema automatically."
              icon="📥"
            />
            <StepCard
              n="02"
              title="TIE Runs the Engine"
              body="The 40·30·30 formula scores Game Performance, Athleticism, and Intangibles, applies position weighting, and pulls in historical comps."
              icon="⚙"
            />
            <StepCard
              n="03"
              title="Get Your Full Report"
              body="Dual grades (actual + clean), tier breakdown, medical deltas, longevity forecasts, and exportable cards for every athlete."
              icon="📊"
            />
          </div>
        </div>
      </section>

      {/* ═══ WAR ROOM HERO ═══ */}
      <section className="relative py-20 overflow-hidden" style={{ background: '#000000' }}>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="text-[10px] font-bold tracking-[0.25em] uppercase mb-4" style={{ color: T.gold }}>
              ◢ Inside The War Room
            </div>
            <h2 className="text-4xl md:text-5xl font-black leading-[0.95] tracking-tight mb-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
              The team behind<br />the formula.
            </h2>
            <p className="text-base leading-relaxed mb-6" style={{ color: T.textMuted }}>
              TIE is the canonical grading engine built by the Per|Form analytics team. Real scouts, data engineers, and film analysts running the same formula across every athlete — from high school recruits to NFL Draft locks.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: T.textSubtle }}>
              Every grade is stamped by TIE. Every tier is earned through 40·30·30. Every decision is opinion-agnostic — the formula doesn't play favorites.
            </p>
          </motion.div>

          <motion.div
            className="relative rounded-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.15 }}
            style={{
              boxShadow: `0 30px 80px rgba(0,0,0,0.8), 0 0 1px ${T.gold}`,
              border: `1px solid ${T.border}`,
            }}
          >
            <Image
              src="/brand/tie-engine-war-room.png"
              alt="TIE Engine in the analytics war room"
              width={1536}
              height={768}
              className="w-full h-auto object-cover"
            />
            {/* Gradient overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.6) 100%)',
              }}
            />
            <div className="absolute bottom-5 left-5 right-5">
              <div className="text-[9px] font-bold tracking-[0.22em] uppercase" style={{ color: T.gold }}>
                TIE ENGINE · LIVE
              </div>
              <div className="text-sm font-bold text-white mt-1">
                Grading 600 prospects · 2026 NFL Draft class
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ SCALE CALLOUT ═══ */}
      <section className="py-20 border-t" style={{ background: T.bg, borderColor: T.border }}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="text-[10px] font-bold tracking-[0.25em] uppercase mb-4" style={{ color: T.gold }}>
            ◢ The Canonical Scale
          </div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-8" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Nine Tiers. One Formula.
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-9 gap-2 max-w-4xl mx-auto">
            {[
              { label: '101+', tier: 'PRIME',      color: '#C89BFF' },
              { label: '90-100', tier: 'A+',       color: '#FFD700' },
              { label: '85-89', tier: 'A',         color: '#FF6B2B' },
              { label: '80-84', tier: 'A-',        color: '#C8C8D8' },
              { label: '75-79', tier: 'B+',        color: '#CD7F32' },
              { label: '70-74', tier: 'B',         color: '#A0693A' },
              { label: '65-69', tier: 'B-',        color: '#3FD3FF' },
              { label: '60-64', tier: 'C+',        color: '#9AA3B3' },
              { label: '<60',   tier: 'UDFA',      color: '#6B6B6B' },
            ].map((t) => (
              <div
                key={t.tier}
                className="flex flex-col items-center p-3 rounded-lg"
                style={{ background: `${t.color}0D`, border: `1px solid ${t.color}40` }}
              >
                <div className="text-2xl font-black" style={{ color: t.color, fontFamily: "'Outfit', sans-serif" }}>
                  {t.tier}
                </div>
                <div className="text-[9px] font-mono mt-1" style={{ color: T.textSubtle }}>
                  {t.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA STRIP ═══ */}
      <section className="relative py-20 border-t" style={{ background: T.bgAlt, borderColor: T.border }}>
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: "url('/brand/tie-shield-stripes.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-5" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Ready to grade your roster?
          </h2>
          <p className="text-base max-w-xl mx-auto mb-8" style={{ color: T.textMuted }}>
            Drop a file. TIE does the rest. Free tier handles the first 25 athletes.
          </p>
          <Link
            href="/tie/grading"
            className="inline-flex items-center gap-3 px-10 py-5 rounded-lg font-black text-base tracking-[0.15em] uppercase transition-all hover:scale-[1.02]"
            style={{
              background: `linear-gradient(135deg, ${T.goldBright} 0%, ${T.gold} 100%)`,
              color: '#0A0E1A',
              boxShadow: `0 12px 40px rgba(212,168,83,0.4)`,
            }}
          >
            ▸ Start Grading
          </Link>
        </div>
      </section>

      <footer className="py-8 text-center text-[10px] font-mono tracking-[0.25em]" style={{ background: '#000000', color: 'rgba(255,255,255,0.4)', borderTop: `1px solid ${T.border}` }}>
        TIE · TALENT &amp; INNOVATION ENGINE · PUBLISHED BY ACHIEVEMOR
      </footer>
    </div>
  );
}

/* ═══ Sub-components ═══ */

function PillarMini({ label, weight, tone }: { label: string; weight: string; tone: string }) {
  return (
    <div>
      <div className="text-2xl font-black tabular-nums" style={{ color: tone, fontFamily: "'Outfit', sans-serif" }}>
        {weight}
      </div>
      <div className="text-[10px] font-bold tracking-[0.12em] uppercase mt-0.5" style={{ color: T.textMuted }}>
        {label}
      </div>
    </div>
  );
}

function StepCard({ n, title, body, icon }: { n: string; title: string; body: string; icon: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="relative p-7 rounded-2xl"
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="text-5xl font-black tabular-nums leading-none"
          style={{
            color: 'transparent',
            WebkitTextStroke: `2px ${T.gold}40`,
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          {n}
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
      <h3 className="text-xl font-black mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: T.textMuted }}>
        {body}
      </p>
    </motion.div>
  );
}
