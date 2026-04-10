'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BackHomeNav } from '@/components/layout/BackHomeNav';
import { Users, Rocket, Briefcase, Zap } from 'lucide-react';

/* ───────────────────────── workspace cards ───────────────────────── */

const SPACES = [
  {
    title: 'Huddle Workspace',
    description:
      'Real-time collaboration space. Draft commentary, share scouting reports, and build takes together with the full analyst crew.',
    icon: Users,
    color: '#D4A853',
  },
  {
    title: 'Huddle Deploy Space',
    description:
      'Ship content straight from the Huddle. One-click publish to social, podcast scripts, and broadcast packages.',
    icon: Rocket,
    color: '#60A5FA',
  },
  {
    title: 'Boomer_Ang Huddle',
    description:
      'C-suite strategic planning channel. Boomer_Ang agents coordinate coverage calendars, brand partnerships, and cross-show initiatives.',
    icon: Briefcase,
    color: '#EF4444',
  },
  {
    title: 'Lil_Hawks Huddle',
    description:
      'Worker fleet coordination. Lil_Hawks agents handle research, data pulls, clip generation, and background tasks for the analyst crew.',
    icon: Zap,
    color: '#22C55E',
  },
];

/* ───────────────────────── page ───────────────────────── */

export default function HuddleWorkspacePage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
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
        <span className="text-[10px] font-mono text-white/30 tracking-widest">
          THE HUDDLE / WORKSPACE
        </span>
      </div>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(212,168,83,0.05) 0%, transparent 60%)',
          }}
        />

        <div className="relative max-w-4xl mx-auto px-6 py-16 sm:py-24 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#D4A853]/40" />
            <span
              className="text-[10px] font-mono px-3 py-1 rounded-full tracking-[0.2em]"
              style={{
                background: 'rgba(212,168,83,0.1)',
                color: '#D4A853',
                border: '1px solid rgba(212,168,83,0.2)',
              }}
            >
              COMING SOON
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#D4A853]/40" />
          </div>

          <h1 className="font-outfit text-4xl sm:text-6xl font-black tracking-[0.06em] text-white mb-4">
            HUDDLE{' '}
            <span style={{ color: '#D4A853' }}>WORKSPACE</span>
          </h1>

          <p className="text-sm text-white/25 font-mono tracking-wider max-w-lg mx-auto">
            The collaboration layer for the Per|Form analyst network. Create, coordinate, and ship
            — together.
          </p>
        </div>
      </section>

      {/* ── Space cards ── */}
      <section className="max-w-4xl mx-auto w-full px-6 pb-16 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SPACES.map((space) => {
          const Icon = space.icon;
          return (
            <div
              key={space.title}
              className="rounded-lg p-5 transition-all hover:border-white/10"
              style={{
                background: '#111827',
                border: '1px solid #1F2937',
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: `${space.color}15` }}
                >
                  <Icon size={18} style={{ color: space.color }} />
                </div>
                <h3 className="font-outfit text-base font-bold text-white tracking-wide">
                  {space.title}
                </h3>
              </div>
              <p className="text-xs text-white/40 leading-relaxed font-mono">
                {space.description}
              </p>
            </div>
          );
        })}
      </section>

      {/* ── Notify Me ── */}
      <section className="flex justify-center pb-16">
        <button
          className="px-8 py-3 rounded-full text-sm font-mono font-bold tracking-wider transition-all hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, rgba(212,168,83,0.2), rgba(212,168,83,0.08))',
            color: '#D4A853',
            border: '1px solid rgba(212,168,83,0.3)',
          }}
        >
          NOTIFY ME
        </button>
      </section>

      {/* ── Footer badge ── */}
      <div className="text-center pb-8">
        <span className="text-[9px] font-mono text-white/15 tracking-[0.2em]">
          POWERED BY THE DEPLOY PLATFORM
        </span>
      </div>

      <Footer />
    </div>
  );
}
