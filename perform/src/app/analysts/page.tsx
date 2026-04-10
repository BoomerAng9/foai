'use client';

/**
 * /analysts — The Per|Form Broadcast Network talent roster
 * ==========================================================
 * Premium talent page with hero treatment for the lead anchor
 * and alternating card layouts for the rest of the crew.
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
  gold:         '#D4A853',
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.55, ease: [0.2, 0.8, 0.2, 1] as [number, number, number, number] },
  }),
};

/** Show name mapping — the show each analyst headlines */
const SHOW_NAMES: Record<string, string> = {
  'void-caster': 'Per|Form Draft Night',
  'the-haze': 'The Haze',
  'the-colonel': 'Live from Marlisecio\'s',
  'astra-novatos': 'The Finer Game',
  'bun-e': 'Phone Home With Bun-E',
};

/** Episode count badges (placeholder counts, swap for real data) */
const EPISODE_COUNTS: Record<string, number> = {
  'void-caster': 42,
  'the-haze': 38,
  'the-colonel': 31,
  'astra-novatos': 24,
  'bun-e': 27,
};

export default function AnalystsPage() {
  const hero = ANALYSTS[0]; // Void-Caster — lead anchor
  const rest = ANALYSTS.slice(1);

  return (
    <PaywallGate>
      <div className="min-h-screen" style={{ background: T.bg, color: T.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
        {/* ═══ TOP RIBBON ═══ */}
        <div style={{ background: T.navyDeep, color: '#FFFFFF', borderBottom: `2px solid ${T.gold}` }}>
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between text-[11px] font-bold tracking-[0.18em] uppercase">
            <div className="flex items-center gap-3">
              <BackHomeNav />
              <span style={{ color: T.gold }}>Per|Form Broadcast Network</span>
            </div>
            <Link href="/podcast/shows" className="opacity-80 hover:opacity-100 transition">All Shows →</Link>
          </div>
        </div>

        {/* ═══ HERO SECTION ═══ */}
        <header className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${T.navy} 0%, ${T.navyDeep} 100%)`, color: '#FFFFFF' }}>
          <div className="absolute inset-0 opacity-[0.06]" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 80px, #FFFFFF 80px, #FFFFFF 81px)',
          }} />
          <div className="relative max-w-7xl mx-auto px-6 py-16 md:py-20">
            <div className="inline-flex items-center gap-2 mb-5">
              <span className="px-2.5 py-0.5 text-[10px] font-bold tracking-[0.2em] rounded" style={{ background: T.gold, color: T.navyDeep }}>
                TALENT ROSTER
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[0.88] tracking-tight uppercase">
              The Voices<br />of Per|Form
            </h1>
            <p className="text-lg md:text-xl mt-5 opacity-75 max-w-2xl leading-relaxed">
              Five analysts. Five shows. From the anchor desk to a pizza shop in Jersey, these are the voices that define the broadcast.
            </p>
          </div>
        </header>

        {/* ═══ LEAD ANCHOR — HERO CARD ═══ */}
        <section className="max-w-7xl mx-auto px-6 -mt-8 relative z-10 mb-14">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className="group rounded-2xl overflow-hidden grid md:grid-cols-2"
            style={{
              background: T.navyDeep,
              boxShadow: '0 4px 40px rgba(6,18,42,0.35)',
            }}
          >
            {/* Image half */}
            <div className="relative aspect-square md:aspect-auto overflow-hidden">
              <Image
                src={hero.imagePath}
                alt={hero.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent 60%, rgba(6,18,42,0.95) 100%)' }} />
              <div className="absolute inset-0 md:hidden" style={{ background: 'linear-gradient(180deg, transparent 50%, rgba(6,18,42,0.95) 100%)' }} />
              {/* Accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: hero.color }} />
            </div>
            {/* Content half */}
            <div className="relative flex flex-col justify-center p-8 md:p-12 text-white">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-2 py-0.5 text-[9px] font-bold tracking-[0.2em] rounded" style={{ background: hero.color, color: T.navyDeep }}>
                  LEAD ANCHOR
                </span>
                <span className="text-[10px] font-semibold tracking-[0.15em] uppercase opacity-50">
                  {SHOW_NAMES[hero.id]}
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight uppercase" style={{ fontFamily: "'Outfit', sans-serif" }}>
                {hero.name}
              </h2>
              <p className="text-[11px] font-semibold tracking-[0.12em] uppercase mt-1.5" style={{ color: hero.color }}>
                {hero.archetype}
              </p>
              <p className="mt-5 text-[15px] leading-relaxed opacity-85">
                {hero.descriptor}
              </p>
              <div className="flex items-center gap-4 mt-8">
                <Link
                  href="/podcast/shows"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-xs font-bold tracking-[0.15em] uppercase transition-all hover:brightness-110"
                  style={{ background: hero.color, color: T.navyDeep }}
                >
                  Listen
                </Link>
                <span className="text-[11px] font-semibold opacity-50 tracking-wider uppercase">
                  {EPISODE_COUNTS[hero.id]} Episodes
                </span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ═══ REMAINING ANALYSTS — ALTERNATING ROWS ═══ */}
        <main className="max-w-7xl mx-auto px-6 pb-16 space-y-8">
          {rest.map((analyst, i) => {
            const isReversed = i % 2 === 1;
            return (
              <motion.div
                key={analyst.id}
                custom={i + 1}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                variants={fadeUp}
                className={`group rounded-2xl overflow-hidden grid md:grid-cols-5 transition-all hover:-translate-y-0.5 ${isReversed ? 'md:direction-rtl' : ''}`}
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  boxShadow: '0 1px 3px rgba(10,14,26,0.04), 0 8px 24px rgba(11,30,63,0.06)',
                }}
              >
                {/* Image — 2 cols */}
                <div className={`relative aspect-[4/3] md:aspect-auto overflow-hidden md:col-span-2 ${isReversed ? 'md:order-2' : ''}`}>
                  <Image
                    src={analyst.imagePath}
                    alt={analyst.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    sizes="(max-width: 768px) 100vw, 40vw"
                  />
                  {/* Gradient overlay toward content side */}
                  <div className="absolute inset-0" style={{
                    background: isReversed
                      ? 'linear-gradient(270deg, transparent 50%, rgba(255,255,255,0.15) 100%)'
                      : 'linear-gradient(90deg, transparent 50%, rgba(255,255,255,0.15) 100%)',
                  }} />
                  {/* Top accent */}
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ background: analyst.color }} />
                  {/* Episode badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md" style={{ background: 'rgba(6,18,42,0.75)' }}>
                    <span className="text-[10px] font-bold tracking-wider text-white uppercase">
                      {EPISODE_COUNTS[analyst.id]} Ep
                    </span>
                  </div>
                </div>

                {/* Content — 3 cols */}
                <div className={`p-6 md:p-8 flex flex-col justify-center md:col-span-3 ${isReversed ? 'md:order-1 md:text-right' : ''}`} style={{ direction: 'ltr' }}>
                  <div className={`flex items-center gap-2 mb-3 ${isReversed ? 'md:justify-end' : ''}`}>
                    <span className="px-2 py-0.5 text-[9px] font-bold tracking-[0.18em] uppercase rounded" style={{ background: `${analyst.color}20`, color: analyst.color, border: `1px solid ${analyst.color}40` }}>
                      {SHOW_NAMES[analyst.id]}
                    </span>
                  </div>
                  <h3
                    className="text-2xl md:text-3xl font-black tracking-tight uppercase"
                    style={{ fontFamily: "'Outfit', sans-serif", color: T.text }}
                  >
                    {analyst.name}
                  </h3>
                  <p className="text-[11px] font-semibold tracking-[0.1em] uppercase mt-1" style={{ color: analyst.color }}>
                    {analyst.archetype}
                  </p>
                  <p className="mt-3 text-[14px] leading-relaxed" style={{ color: T.textMuted }}>
                    {analyst.descriptor}
                  </p>

                  {/* Co-host callout */}
                  {analyst.coHost && (
                    <div className={`mt-3 inline-flex items-center gap-2 text-[11px] ${isReversed ? 'md:justify-end' : ''}`}>
                      <span className="font-bold" style={{ color: T.textMuted }}>with</span>
                      <span className="font-bold" style={{ color: T.text }}>{analyst.coHost.name}</span>
                    </div>
                  )}

                  {/* Specialty tags */}
                  <div className={`flex flex-wrap gap-1.5 mt-4 ${isReversed ? 'md:justify-end' : ''}`}>
                    {analyst.specialty.split(', ').slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-block px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded"
                        style={{
                          background: `${analyst.color}12`,
                          color: analyst.color,
                          border: `1px solid ${analyst.color}30`,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className={`mt-5 ${isReversed ? 'md:text-right' : ''}`}>
                    <Link
                      href="/podcast/shows"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold tracking-[0.15em] uppercase transition-all hover:brightness-110"
                      style={{ background: analyst.color, color: T.navyDeep }}
                    >
                      Listen
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </main>

        <footer className="py-8 text-center" style={{ background: T.navyDeep }}>
          <p className="text-[11px] font-bold tracking-[0.25em] uppercase" style={{ color: T.gold }}>
            Part of the Per|Form Broadcast Network
          </p>
          <p className="text-[9px] font-mono tracking-[0.2em] mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Published by ACHIEVEMOR
          </p>
        </footer>
      </div>
    </PaywallGate>
  );
}
