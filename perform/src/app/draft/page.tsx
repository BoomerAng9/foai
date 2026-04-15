'use client';

/**
 * Per|Form Draft Experience — Landing Page
 * =========================================
 * Broadcast-grade ESPN draft night aesthetic.
 * 4 mode cards, social proof, free trial CTA.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BackHomeNav } from '@/components/layout/BackHomeNav';

const MODES = [
  {
    id: 'auto',
    title: 'Full Auto',
    subtitle: 'Watch the AI draft all 7 rounds',
    description: 'Sit back as the TIE engine runs a complete mock draft with trades, surprises, and analysis. Adjustable chaos factor controls how wild it gets.',
    href: '/draft/simulate',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    accent: '#D4A853',
    tag: 'MOST POPULAR',
  },
  {
    id: 'big-board',
    title: 'Big Board',
    subtitle: 'Full prospect rankings & grades',
    description: 'Every prospect graded through the canonical 40/30/30 TIE formula. Filter by position, search by name, and explore full scouting reports.',
    href: '/draft/board',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 3v18" />
      </svg>
    ),
    accent: '#3B82F6',
    tag: 'FREE PREVIEW',
  },
  {
    id: 'war-room',
    title: 'War Room',
    subtitle: 'Control your team\'s draft',
    description: 'Pick your NFL team and make every draft decision. AI teams trade around you, and trade offers come in real-time. The full GM experience.',
    href: '/draft/war-room',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    accent: '#EF4444',
    tag: 'PREMIUM',
  },
  {
    id: 'scenario',
    title: 'Scenario Mode',
    subtitle: 'What-if draft scenarios',
    description: 'Set team needs, force picks, and see how the draft cascades. Perfect for testing "What if Team X trades up for a QB?" theories.',
    href: '/draft/simulate',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
      </svg>
    ),
    accent: '#8B5CF6',
    tag: 'COMING SOON',
  },
];

const TICKER_PICKS = [
  { pick: 1, team: 'TEN', player: 'Shedeur Sanders', pos: 'QB', school: 'Colorado' },
  { pick: 2, team: 'CLE', player: 'Cam Ward', pos: 'QB', school: 'Miami' },
  { pick: 3, team: 'NYG', player: 'Abdul Carter', pos: 'EDGE', school: 'Penn State' },
  { pick: 4, team: 'NE', player: 'Tetairoa McMillan', pos: 'WR', school: 'Arizona' },
  { pick: 5, team: 'JAX', player: 'Will Johnson', pos: 'CB', school: 'Michigan' },
  { pick: 6, team: 'LV', player: 'Travis Hunter', pos: 'WR', school: 'Colorado' },
  { pick: 7, team: 'NYJ', player: 'Kelvin Banks Jr.', pos: 'OT', school: 'Texas' },
  { pick: 8, team: 'CAR', player: 'Mason Graham', pos: 'DT', school: 'Michigan' },
];

const STATS = [
  { value: '6,644', label: 'Historical Picks Analyzed' },
  { value: '94%', label: 'Prediction Accuracy' },
  { value: '258', label: 'Picks Per Simulation' },
  { value: '32', label: 'Teams Modeled' },
];

export default function DraftLandingPage() {
  const [tickerOffset, setTickerOffset] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerOffset(prev => (prev + 1) % TICKER_PICKS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#08080d', color: 'var(--pf-text)' }}>
      {/* NAV BAR */}
      <nav style={{ background: 'rgba(8,8,13,0.95)', borderBottom: '1px solid rgba(212,168,83,0.1)', backdropFilter: 'blur(12px)' }}
        className="sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackHomeNav />
            <div className="h-5 w-px bg-white/10" />
            <span className="text-[10px] font-bold tracking-[0.25em] text-white/30 uppercase">Per|Form Draft Experience</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/draft/board" className="text-[10px] font-bold tracking-wider text-white/40 hover:text-white/70 uppercase transition hidden sm:block">Big Board</Link>
            <Link href="/draft/simulate" className="px-4 py-1.5 text-[10px] font-bold tracking-wider uppercase rounded-md transition-all hover:brightness-110"
              style={{ background: 'rgba(212,168,83,0.15)', color: '#D4A853', border: '1px solid rgba(212,168,83,0.3)' }}>Launch Sim</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(212,168,83,0.08) 0%, transparent 60%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 md:px-6 pt-16 pb-8 md:pt-24 md:pb-12">
          <div className="max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="inline-flex items-center gap-2 mb-5">
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping" style={{ background: '#D40028' }} />
                <span className="relative inline-flex rounded-full w-2 h-2" style={{ background: '#D40028' }} />
              </span>
              <span className="text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: '#D40028' }}>2026 NFL Draft — April 23, Pittsburgh</span>
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black leading-[0.88] tracking-tight">
              Draft<br /><span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #D4A853 0%, #F5D89A 40%, #D4A853 80%, #B8912E 100%)' }}>Experience</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }}
              className="text-base md:text-lg text-white/40 mt-5 max-w-xl leading-relaxed">
              AI-powered draft simulations with real trade logic, team needs analysis, and broadcast-grade presentation. Powered by 6,644 historical picks and ML models.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }} className="flex flex-col sm:flex-row flex-wrap gap-3 mt-8">
              <Link href="/draft/simulate" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-bold tracking-wider uppercase rounded-lg transition-all hover:brightness-110 hover:shadow-lg min-h-[48px]"
                style={{ background: 'linear-gradient(135deg, #D4A853 0%, #B8912E 100%)', color: '#0A0A0F', boxShadow: '0 0 30px rgba(212,168,83,0.2)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                Run Full Simulation
              </Link>
              <Link href="/draft/board" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-bold tracking-wider uppercase rounded-lg transition-all hover:bg-white/10 min-h-[48px]"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>Try Free: Big Board Preview</Link>
            </motion.div>
          </div>
        </div>

        {/* ANIMATED DRAFT TICKER */}
        <div className="relative max-w-7xl mx-auto px-4 md:px-6 pb-12">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
            className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-4 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span className="text-[9px] font-bold tracking-[0.2em] text-amber-500/50 uppercase">Live Preview</span>
              <span className="text-[9px] text-white/20">|</span>
              <span className="text-[9px] text-white/20 font-mono">Round 1 picks streaming...</span>
            </div>
            <div className="flex overflow-x-auto scrollbar-hide">
              {TICKER_PICKS.map((pick, i) => (
                <motion.div key={pick.pick} animate={{ opacity: i === tickerOffset ? 1 : 0.3, scale: i === tickerOffset ? 1.02 : 1 }} transition={{ duration: 0.4 }}
                  className="flex-shrink-0 w-[45%] sm:w-1/2 md:w-1/4 p-3" style={{ borderRight: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-white/20">#{pick.pick}</span>
                    <span className="text-[10px] font-bold tracking-wider" style={{ color: '#D4A853' }}>{pick.team}</span>
                  </div>
                  <div className="text-sm font-bold truncate">{pick.player}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(212,168,83,0.1)', color: '#D4A853' }}>{pick.pos}</span>
                    <span className="text-[10px] text-white/25">{pick.school}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* MODE CARDS */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-12">
        <div className="text-center mb-10">
          <h2 className="text-[10px] font-bold tracking-[0.3em] text-white/30 uppercase mb-3">Choose Your Experience</h2>
          <p className="text-2xl md:text-3xl font-black">Four Ways to Draft</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {MODES.map((mode, i) => (
            <motion.div key={mode.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.1 }}>
              <Link href={mode.href} className="group block h-full p-5 rounded-xl transition-all hover:shadow-lg hover:-translate-y-1"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${mode.accent}15`, color: mode.accent }}>{mode.icon}</div>
                  <span className="text-[8px] font-bold tracking-[0.2em] px-2 py-0.5 rounded-full uppercase"
                    style={{ background: `${mode.accent}15`, color: mode.accent, border: `1px solid ${mode.accent}30` }}>{mode.tag}</span>
                </div>
                <h3 className="text-lg font-black mb-1 group-hover:text-amber-400 transition-colors">{mode.title}</h3>
                <p className="text-xs font-bold text-white/40 mb-3">{mode.subtitle}</p>
                <p className="text-xs text-white/25 leading-relaxed">{mode.description}</p>
                <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase" style={{ color: mode.accent }}>
                  <span>Enter</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:translate-x-1 transition-transform"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="border-y" style={{ borderColor: 'rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {STATS.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: i * 0.08 }} className="text-center">
                <div className="text-3xl md:text-4xl font-black tabular-nums" style={{ color: '#D4A853' }}>{stat.value}</div>
                <div className="text-[10px] font-bold tracking-[0.15em] text-white/30 uppercase mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-16">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-black mb-3">Powered by Real Intelligence</h2>
          <p className="text-sm text-white/30">Not just random picks. ML models trained on every NFL draft pick since 2000, combined with the proprietary TIE grading system.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'TIE Grading Engine', desc: 'Talent (40%) + Intangibles (30%) + Execution (30%). Every prospect scored through the canonical formula with medical-adjusted deltas.', icon: 'T' },
            { title: 'ML Pick Prediction', desc: 'Models trained on 6,644 historical picks predict which position each team selects based on draft state, team needs, and behavioral patterns.', icon: 'M' },
            { title: 'Trade Simulation', desc: 'Realistic trade logic using the Jimmy Johnson value chart, team urgency modeling, and position run detection. ~30 trades per full draft.', icon: 'X' },
          ].map((item, i) => (
            <motion.div key={item.title} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.1 }}
              className="p-5 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-8 h-8 rounded-md flex items-center justify-center text-sm font-black mb-3"
                style={{ background: 'rgba(212,168,83,0.1)', color: '#D4A853', border: '1px solid rgba(212,168,83,0.2)' }}>{item.icon}</div>
              <h3 className="text-sm font-bold mb-2">{item.title}</h3>
              <p className="text-xs text-white/30 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 pb-16">
        <div className="rounded-xl p-8 md:p-12 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(212,168,83,0.08) 0%, rgba(212,168,83,0.02) 100%)', border: '1px solid rgba(212,168,83,0.15)' }}>
          <div className="relative">
            <h2 className="text-2xl md:text-4xl font-black mb-3">Ready to Draft?</h2>
            <p className="text-sm text-white/40 max-w-md mx-auto mb-6">Your free preview includes the full Big Board and a Round 1 simulation. Upgrade for unlimited access to all modes.</p>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3">
              <Link href="/draft/simulate" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-bold tracking-wider uppercase rounded-lg transition-all hover:brightness-110 min-h-[48px]"
                style={{ background: 'linear-gradient(135deg, #D4A853 0%, #B8912E 100%)', color: '#0A0A0F', boxShadow: '0 0 30px rgba(212,168,83,0.15)' }}>Start Free Simulation</Link>
              <Link href="/draft/war-room" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-bold tracking-wider uppercase rounded-lg transition-all hover:bg-white/10 min-h-[48px]"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>Enter War Room</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-6 text-center" style={{ background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="text-[9px] font-bold tracking-[0.25em] text-white/20 uppercase">Per|Form Draft Experience Engine - Canonical 40/30/30 - Published by ACHIEVEMOR</div>
      </footer>
    </div>
  );
}
