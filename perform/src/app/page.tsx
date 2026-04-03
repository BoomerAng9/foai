'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { TIEBadge } from '@/components/tie/TIEBadge';
import {
  Trophy,
  LayoutGrid,
  Swords,
  Mic2,
  Gem,
  GraduationCap,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  HERO                                                              */
/* ------------------------------------------------------------------ */
function Hero() {
  return (
    <section className="relative flex flex-col items-center justify-center text-center px-6 pt-28 pb-20 overflow-hidden">
      {/* Subtle radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 50% 40% at 50% 30%, rgba(212,168,83,0.08) 0%, transparent 100%)',
        }}
      />

      {/* Large inline TIE hexagon */}
      <svg
        width="200"
        height="200"
        viewBox="0 0 100 100"
        fill="none"
        className="mb-8 drop-shadow-lg"
      >
        <polygon
          points="50,2 93,25 93,75 50,98 7,75 7,25"
          fill="rgba(10,10,15,0.9)"
          stroke="#D4A853"
          strokeWidth="2.5"
        />
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#D4A853"
          fontSize="30"
          fontWeight="800"
          fontFamily="'Outfit', sans-serif"
        >
          TIE
        </text>
        <text
          x="50"
          y="72"
          textAnchor="middle"
          fill="rgba(255,255,255,0.45)"
          fontSize="8"
          fontWeight="600"
          fontFamily="'IBM Plex Mono', monospace"
          letterSpacing="2"
        >
          ENGINE
        </text>
      </svg>

      {/* Wordmark */}
      <h1
        className="font-outfit text-6xl md:text-7xl font-extrabold tracking-[0.12em]"
        style={{ color: '#D4A853' }}
      >
        PER<span style={{ color: '#C0C0C0', opacity: 0.5 }}>|</span>FORM
      </h1>

      {/* Subtitle */}
      <p
        className="mt-4 text-lg md:text-xl font-outfit tracking-wide"
        style={{ color: '#C0C0C0' }}
      >
        Sports Grading &amp; Ranking Platform
      </p>

      {/* Tagline */}
      <p className="mt-2 text-sm text-white/40 font-mono">
        The PFF competitor that runs itself.
      </p>

      {/* CTAs */}
      <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
        <a
          href="https://buymeacoffee.com/foai"
          target="_blank"
          rel="noopener noreferrer"
          className="px-8 py-3 rounded-md text-sm font-outfit font-bold tracking-wider transition-all hover:brightness-110"
          style={{ background: '#D4A853', color: '#0A0A0F' }}
        >
          BUY ME A COFFEE
        </a>
        <Link
          href="/draft"
          className="px-8 py-3 rounded-md text-sm font-mono tracking-wider border transition-colors hover:bg-white/5"
          style={{ borderColor: 'rgba(212,168,83,0.3)', color: '#C0C0C0' }}
        >
          VIEW DRAFT BOARD
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  WHAT IS TIE?                                                      */
/* ------------------------------------------------------------------ */
function WhatIsTIE() {
  return (
    <section className="px-6 py-20 max-w-4xl mx-auto">
      <h2
        className="font-outfit text-3xl font-extrabold tracking-wider text-center mb-4"
        style={{ color: '#D4A853' }}
      >
        What is TIE?
      </h2>
      <p className="text-center text-white/60 font-mono text-sm max-w-2xl mx-auto leading-relaxed mb-12">
        Talent &amp; Innovation Engine — our proprietary grading formula scores
        every player on Performance, Attributes, and Intangibles. One score.
        One grade. No ambiguity.
      </p>

      {/* Sample badges */}
      <div className="flex items-center justify-center gap-10 md:gap-16">
        {[
          { score: 92, grade: 'A+', color: '#22C55E' },
          { score: 77, grade: 'B+', color: '#D4A853' },
          { score: 62, grade: 'C+', color: '#F97316' },
        ].map((b) => (
          <div key={b.grade} className="flex flex-col items-center gap-3">
            <TIEBadge
              score={b.score}
              grade={b.grade}
              badgeColor={b.color}
              size="lg"
            />
            <span className="text-xs font-mono text-white/30">{b.grade}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FEATURES GRID                                                     */
/* ------------------------------------------------------------------ */
const FEATURES = [
  {
    icon: Trophy,
    title: 'TIE Grades',
    desc: 'Score every player with a single proprietary number and letter grade.',
  },
  {
    icon: LayoutGrid,
    title: 'Mock Draft Simulator',
    desc: 'Full 7-round draft engine with trade logic and team needs.',
  },
  {
    icon: Swords,
    title: 'Analyst Debates',
    desc: 'Bull vs Bear breakdowns from four distinct analyst voices.',
  },
  {
    icon: Mic2,
    title: 'Podcast Engine',
    desc: 'AI-generated podcast scripts ready for production.',
  },
  {
    icon: Gem,
    title: 'NFT Player Cards',
    desc: 'Collectible graded cards tied to real TIE scores.',
  },
  {
    icon: GraduationCap,
    title: 'Recruiting Pipeline',
    desc: 'Track prospects from high school through college to the NFL.',
  },
];

function FeaturesGrid() {
  return (
    <section className="px-6 py-20 max-w-5xl mx-auto">
      <h2
        className="font-outfit text-3xl font-extrabold tracking-wider text-center mb-12"
        style={{ color: '#D4A853' }}
      >
        Platform Features
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-xl p-6 transition-colors"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <f.icon size={24} color="#D4A853" className="mb-4 opacity-80" />
            <h3 className="font-outfit text-sm font-bold text-white/90 tracking-wide mb-1">
              {f.title}
            </h3>
            <p className="text-xs font-mono text-white/40 leading-relaxed">
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  MEET THE ANALYSTS                                                 */
/* ------------------------------------------------------------------ */
const ANALYST_PREVIEW = [
  {
    id: '01',
    archetype: 'Stuart Scott energy — smooth, iconic, poetic',
    specialty: 'Headlines, breaking news, draft night coverage',
    color: '#D4A853',
  },
  {
    id: '02',
    archetype: 'Deion Sanders swagger — bold, confident',
    specialty: 'Player evaluations, recruiting takes, NIL analysis',
    color: '#60A5FA',
  },
  {
    id: '03',
    archetype: 'Film room grinder — methodical, precise',
    specialty: 'Film breakdown, scheme analysis, X\'s and O\'s',
    color: '#34D399',
  },
  {
    id: '04',
    archetype: 'Hot-take debate energy — provocative, engaging',
    specialty: 'Hot takes, Bull vs Bear debates, controversy',
    color: '#F97316',
  },
];

function MeetTheAnalysts() {
  return (
    <section className="px-6 py-20 max-w-5xl mx-auto">
      <h2
        className="font-outfit text-3xl font-extrabold tracking-wider text-center mb-12"
        style={{ color: '#D4A853' }}
      >
        Meet the Analysts
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {ANALYST_PREVIEW.map((a) => (
          <div
            key={a.id}
            className="rounded-xl p-6"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${a.color}20`,
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-outfit font-bold"
                style={{
                  background: `${a.color}15`,
                  color: a.color,
                  border: `1px solid ${a.color}30`,
                }}
              >
                {a.id}
              </div>
              <div>
                <p
                  className="text-xs font-outfit font-bold tracking-wide"
                  style={{ color: a.color }}
                >
                  ANALYST {a.id}
                </p>
              </div>
            </div>
            <p className="text-sm text-white/60 font-mono leading-relaxed mb-2">
              {a.archetype}
            </p>
            <p className="text-xs text-white/30 font-mono">
              {a.specialty}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  NFL DRAFT 2026                                                    */
/* ------------------------------------------------------------------ */
function DraftBanner() {
  return (
    <section className="px-6 py-16 max-w-4xl mx-auto text-center">
      <div
        className="rounded-xl px-8 py-10"
        style={{
          background: 'rgba(212,168,83,0.05)',
          border: '1px solid rgba(212,168,83,0.15)',
        }}
      >
        <p className="text-xs font-mono tracking-[0.3em] text-white/30 mb-3">
          NFL DRAFT 2026
        </p>
        <h2
          className="font-outfit text-2xl md:text-3xl font-extrabold tracking-wider mb-3"
          style={{ color: '#D4A853' }}
        >
          Draft Day: April 23, Pittsburgh
        </h2>
        <p className="text-sm text-white/50 font-mono mb-8">
          50+ prospects graded and ranked by TIE.
        </p>
        <Link
          href="/draft"
          className="inline-block px-8 py-3 rounded-md text-sm font-outfit font-bold tracking-wider transition-all hover:brightness-110"
          style={{ background: '#D4A853', color: '#0A0A0F' }}
        >
          VIEW DRAFT BOARD
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                              */
/* ------------------------------------------------------------------ */
export default function Home() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
      <Header />
      <main className="flex-1">
        <Hero />
        <WhatIsTIE />
        <FeaturesGrid />
        <MeetTheAnalysts />
        <DraftBanner />
      </main>
      <Footer />
    </div>
  );
}
