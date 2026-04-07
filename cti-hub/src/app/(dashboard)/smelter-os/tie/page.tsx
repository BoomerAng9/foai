'use client';

/**
 * /smelter-os/tie — TIE Platform (Talent & Innovation Engine)
 * ==============================================================
 * Platform-wide talent + innovation framework. NOT Per|Form-
 * exclusive — sports is ONE domain instantiation. This surface
 * lets the owner pick a domain (Sports / Workforce / Student /
 * Contractor / Founder / Creative), see the three-pillar mapping,
 * and dispatch a grading task to ACHEEVY.
 *
 * Owner-only. See memory: project_tie_platform_canon.md
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Trophy,
  Briefcase,
  GraduationCap,
  Wrench,
  Rocket,
  Palette,
  Target,
  Zap,
  Award,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isOwner } from '@/lib/allowlist';

interface Domain {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  pillars: {
    talent: { label: string; examples: string };
    innovation: { label: string; examples: string };
    execution: { label: string; examples: string };
  };
  weights: { t: number; i: number; e: number };
  status: 'live' | 'design' | 'planned';
}

const DOMAINS: Domain[] = [
  {
    id: 'sports',
    title: 'Sports',
    description:
      "Current Per|Form implementation. NFL Draft prospects, recruiting, game-by-game performance.",
    icon: Trophy,
    pillars: {
      talent: {
        label: 'Athleticism',
        examples: 'Speed, strength, agility, physical tools',
      },
      innovation: {
        label: 'Intangibles',
        examples: 'Leadership, durability, football IQ, character',
      },
      execution: {
        label: 'Game Performance',
        examples: 'Snap-by-snap grades, statistical output, clutch moments',
      },
    },
    weights: { t: 30, i: 30, e: 40 },
    status: 'live',
  },
  {
    id: 'workforce',
    title: 'Workforce',
    description:
      'Knowledge-worker and professional evaluation. Employee reviews, contractor vetting, team composition.',
    icon: Briefcase,
    pillars: {
      talent: {
        label: 'Skill Mastery',
        examples: 'Domain expertise, technical craft, specialized knowledge',
      },
      innovation: {
        label: 'Creativity / Adaptability',
        examples: 'Problem-solving, growth, novel approaches, learning velocity',
      },
      execution: {
        label: 'Delivery',
        examples: 'Project outcomes, shipping cadence, stakeholder satisfaction',
      },
    },
    weights: { t: 30, i: 40, e: 30 },
    status: 'design',
  },
  {
    id: 'student',
    title: 'Student / Recruit',
    description:
      'Academic and developmental grading. HS → college recruit pipelines, scholarship scoring.',
    icon: GraduationCap,
    pillars: {
      talent: {
        label: 'Academic Aptitude',
        examples: 'Test scores, grasp of fundamentals, curriculum mastery',
      },
      innovation: {
        label: 'Growth Mindset',
        examples: 'Curiosity, self-direction, willingness to tackle hard problems',
      },
      execution: {
        label: 'Coursework',
        examples: 'Grades, completion rate, project quality',
      },
    },
    weights: { t: 35, i: 35, e: 30 },
    status: 'planned',
  },
  {
    id: 'contractor',
    title: 'Contractor / Trade',
    description:
      'Skilled trades, freelance, service providers. Craft certification, gig platforms.',
    icon: Wrench,
    pillars: {
      talent: {
        label: 'Craft Skill',
        examples: 'Technical mastery, certifications, hands-on ability',
      },
      innovation: {
        label: 'Problem-Solving',
        examples: 'Adaptation to spec variance, efficient solutions',
      },
      execution: {
        label: 'Completion Record',
        examples: 'On-time delivery, quality of work, repeat client rate',
      },
    },
    weights: { t: 40, i: 20, e: 40 },
    status: 'planned',
  },
  {
    id: 'founder',
    title: 'Founder / Entrepreneur',
    description:
      'Startup operator assessment. Pre-seed scoring, founder-market fit, pitch grading.',
    icon: Rocket,
    pillars: {
      talent: {
        label: 'Domain Expertise + Vision',
        examples: 'Founder-market fit, technical depth, narrative',
      },
      innovation: {
        label: 'Pivot Agility + Market Insight',
        examples: 'Speed of learning, willingness to kill bad ideas, customer obsession',
      },
      execution: {
        label: 'Traction',
        examples: 'Revenue, growth, shipping cadence, runway discipline',
      },
    },
    weights: { t: 25, i: 35, e: 40 },
    status: 'planned',
  },
  {
    id: 'creative',
    title: 'Creative / Artist',
    description:
      'Creative professionals, artists, designers, performers. Portfolio + audience scoring.',
    icon: Palette,
    pillars: {
      talent: {
        label: 'Technical Craft',
        examples: 'Fundamentals, technique, tool mastery',
      },
      innovation: {
        label: 'Originality / Taste',
        examples: 'Distinctive voice, aesthetic sensibility, conceptual range',
      },
      execution: {
        label: 'Portfolio + Audience',
        examples: 'Output quality, audience response, commercial or critical success',
      },
    },
    weights: { t: 30, i: 45, e: 25 },
    status: 'planned',
  },
];

export default function TIEPlatformPage() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string>('sports');

  if (!user || !isOwner(user.email)) {
    return <OwnerGate />;
  }

  const domain = DOMAINS.find((d) => d.id === selected)!;

  function handleDispatch() {
    const prompt = [
      `[TIE Engine — ${domain.title} domain]`,
      ``,
      `Grade a new subject in the ${domain.title} domain using the canonical`,
      `TIE framework (Talent + Innovation + Execution).`,
      ``,
      `Pillar mapping for this domain:`,
      `  T = ${domain.pillars.talent.label}       (${domain.weights.t}% weight)`,
      `    → ${domain.pillars.talent.examples}`,
      `  I = ${domain.pillars.innovation.label}   (${domain.weights.i}% weight)`,
      `    → ${domain.pillars.innovation.examples}`,
      `  E = ${domain.pillars.execution.label}    (${domain.weights.e}% weight)`,
      `    → ${domain.pillars.execution.examples}`,
      ``,
      `Canonical grade bands (same across all domains):`,
      `  Prime Player 🛸   101+`,
      `  A+ 🚀             90–100`,
      `  A  🔥             85–89`,
      `  A- ⭐             80–84`,
      `  B+ ⏳             75–79`,
      `  B  🏈             70–74`,
      `  B- ⚡             65–69`,
      `  C+ 🔧             60–64`,
      `  UDFA ❌            <60`,
      ``,
      `Dual grade output: grade_clean (no risk adjustment) + grade_actual.`,
      `Include longevity forecast (upside / baseline / downside comps).`,
      ``,
      `Ask me for the subject to grade.`,
    ].join('\n');

    const encoded = encodeURIComponent(prompt);
    window.location.href = `/chat?q=${encoded}`;
  }

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background: 'radial-gradient(ellipse at top, #121212 0%, #050505 70%)',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-10">
        <Link
          href="/smelter-os"
          className="text-[10px] font-mono tracking-[0.25em] opacity-60 hover:opacity-100 inline-block mb-6"
          style={{ color: '#ff5722' }}
        >
          ← SMELTEROS BRIDGE
        </Link>

        <div className="mb-8">
          <div className="text-[10px] font-mono tracking-[0.3em] mb-2" style={{ color: '#ff5722' }}>
            / PLATFORM-WIDE · TALENT + INNOVATION FRAMEWORK
          </div>
          <h1 className="font-doto font-black text-5xl md:text-7xl tracking-tight uppercase leading-none">
            T<span style={{ color: '#ff5722' }} className="smelter-glow-soft">I</span>E
          </h1>
          <p className="text-sm mt-4 max-w-3xl text-white/70">
            <span className="text-white font-semibold">TIE = Talent & Innovation Engine.</span> A
            canonical three-pillar framework for evaluating talent, innovation, and execution
            capacity across every ACHIEVEMOR domain. Sports (Per|Form) is one implementation.
            Workforce, student, contractor, founder, and creative domains are planned — each
            reinterprets the three pillars for its context while keeping the canonical grade
            bands intact.
          </p>
        </div>

        {/* ═══ THE THREE PILLARS (universal) ═══ */}
        <div className="mb-10">
          <div
            className="text-[10px] font-mono tracking-[0.3em] mb-4 uppercase"
            style={{ color: '#ff5722' }}
          >
            / The Three Pillars (universal)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <PillarTile
              letter="T"
              label="TALENT"
              generic="Raw ability, mastery, aptitude"
              icon={Target}
              accent="#ff5722"
            />
            <PillarTile
              letter="I"
              label="INNOVATION"
              generic="Creativity, adaptability, problem-solving, growth"
              icon={Zap}
              accent="#ff7a45"
            />
            <PillarTile
              letter="E"
              label="EXECUTION"
              generic="Delivery, results, track record, consistency"
              icon={Award}
              accent="#ffa76b"
            />
          </div>
        </div>

        {/* ═══ DOMAIN PICKER ═══ */}
        <div className="mb-10">
          <div
            className="text-[10px] font-mono tracking-[0.3em] mb-4 uppercase"
            style={{ color: '#ff5722' }}
          >
            / Domain Instantiations
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
            {DOMAINS.map((d) => {
              const isActive = d.id === selected;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelected(d.id)}
                  className="smelter-glass smelter-glass-hover p-4 text-left transition-all"
                  style={{
                    borderTop: `2px solid ${isActive ? '#ff5722' : 'rgba(255,87,34,0.25)'}`,
                    borderRadius: '3px',
                    boxShadow: isActive ? '0 0 24px rgba(255,87,34,0.3)' : undefined,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="w-8 h-8 flex items-center justify-center rounded border"
                      style={{
                        background: 'rgba(255,87,34,0.1)',
                        borderColor: 'rgba(255,87,34,0.35)',
                      }}
                    >
                      <d.icon className="w-4 h-4" style={{ color: '#ff5722' }} />
                    </div>
                    <StatusPill status={d.status} />
                  </div>
                  <div className="font-doto font-black text-sm uppercase tracking-tight">
                    {d.title}
                  </div>
                  <div
                    className="text-[9px] opacity-60 mt-1 leading-snug"
                    style={{ color: '#94A3B8' }}
                  >
                    {d.description}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ═══ SELECTED DOMAIN DETAIL ═══ */}
          <div
            className="smelter-glass p-6"
            style={{
              borderTop: '2px solid rgba(255,87,34,0.5)',
              borderRadius: '3px',
              boxShadow: '0 0 24px rgba(255,87,34,0.2)',
            }}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 flex items-center justify-center rounded-lg border"
                  style={{
                    background: 'rgba(255,87,34,0.12)',
                    borderColor: 'rgba(255,87,34,0.4)',
                  }}
                >
                  <domain.icon className="w-6 h-6" style={{ color: '#ff5722' }} />
                </div>
                <div>
                  <div className="text-[10px] font-mono tracking-[0.3em] opacity-60 mb-0.5">
                    DOMAIN
                  </div>
                  <div className="font-doto font-black text-3xl uppercase leading-none">
                    {domain.title}
                  </div>
                </div>
              </div>
              <StatusPill status={domain.status} large />
            </div>

            <p className="text-sm mb-6" style={{ color: '#CBD5E1' }}>
              {domain.description}
            </p>

            {/* Pillar breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              <DomainPillar
                letter="T"
                label={domain.pillars.talent.label}
                weight={domain.weights.t}
                examples={domain.pillars.talent.examples}
                accent="#ff5722"
              />
              <DomainPillar
                letter="I"
                label={domain.pillars.innovation.label}
                weight={domain.weights.i}
                examples={domain.pillars.innovation.examples}
                accent="#ff7a45"
              />
              <DomainPillar
                letter="E"
                label={domain.pillars.execution.label}
                weight={domain.weights.e}
                examples={domain.pillars.execution.examples}
                accent="#ffa76b"
              />
            </div>

            {/* Weight math */}
            <div
              className="p-3 mb-6 border"
              style={{
                borderColor: 'rgba(255,87,34,0.2)',
                background: 'rgba(255,87,34,0.04)',
                borderRadius: '2px',
              }}
            >
              <div className="text-[9px] font-mono tracking-[0.25em] opacity-60 mb-1">
                WEIGHTS (must sum to 100)
              </div>
              <div className="font-mono text-xs" style={{ color: '#ffa76b' }}>
                {domain.weights.t}% T · {domain.weights.i}% I · {domain.weights.e}% E ={' '}
                {domain.weights.t + domain.weights.i + domain.weights.e}%
              </div>
            </div>

            {/* Dispatch */}
            {domain.status === 'live' ? (
              <button
                onClick={handleDispatch}
                className="px-7 py-3.5 font-bold text-sm tracking-wider flex items-center gap-3"
                style={{
                  background: '#ff5722',
                  color: 'white',
                  boxShadow: '0 0 24px rgba(255,87,34,0.35)',
                  borderRadius: '2px',
                }}
              >
                <Trophy className="w-5 h-5" />
                GRADE A SUBJECT — {domain.title.toUpperCase()} DOMAIN
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div
                className="p-4 border-l-2"
                style={{
                  borderColor:
                    domain.status === 'design' ? '#ff7a45' : 'rgba(255,255,255,0.25)',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                <div
                  className="text-[10px] font-mono tracking-[0.2em] font-bold mb-1"
                  style={{
                    color: domain.status === 'design' ? '#ff7a45' : '#94A3B8',
                  }}
                >
                  {domain.status === 'design' ? 'IN DESIGN' : 'PLANNED'}
                </div>
                <div className="text-[11px] opacity-70" style={{ color: '#CBD5E1' }}>
                  This domain instantiation has not shipped yet. The three-pillar mapping above
                  is the design target. Expansion priority tracked in{' '}
                  <span className="font-mono" style={{ color: '#ff7a45' }}>
                    project_tie_platform_canon.md
                  </span>
                  .
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ CANONICAL GRADE BANDS ═══ */}
        <div className="mb-10">
          <div
            className="text-[10px] font-mono tracking-[0.3em] mb-4 uppercase"
            style={{ color: '#ff5722' }}
          >
            / Canonical Grade Bands (same across all domains)
          </div>
          <div className="grid grid-cols-3 md:grid-cols-9 gap-2">
            {[
              { emoji: '🛸', label: 'Prime', range: '101+' },
              { emoji: '🚀', label: 'A+', range: '90-100' },
              { emoji: '🔥', label: 'A', range: '85-89' },
              { emoji: '⭐', label: 'A-', range: '80-84' },
              { emoji: '⏳', label: 'B+', range: '75-79' },
              { emoji: '🏈', label: 'B', range: '70-74' },
              { emoji: '⚡', label: 'B-', range: '65-69' },
              { emoji: '🔧', label: 'C+', range: '60-64' },
              { emoji: '❌', label: 'UDFA', range: '<60' },
            ].map((band) => (
              <div
                key={band.label}
                className="smelter-glass p-2 text-center"
                style={{ borderRadius: '2px' }}
              >
                <div className="text-xl mb-0.5">{band.emoji}</div>
                <div className="text-[10px] font-bold font-mono" style={{ color: '#ff7a45' }}>
                  {band.label}
                </div>
                <div className="text-[8px] font-mono opacity-50">{band.range}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Reference footer */}
        <div className="text-[10px] font-mono opacity-50 flex items-center gap-2">
          <FileText className="w-3 h-3" />
          <span>Canon:</span>
          <span style={{ color: '#ff7a45' }}>project_tie_platform_canon.md</span>
          <span className="opacity-60">·</span>
          <span>Sports reference impl:</span>
          <span style={{ color: '#ff7a45' }}>perform/src/lib/draft/</span>
        </div>
      </div>
    </div>
  );
}

function PillarTile({
  letter,
  label,
  generic,
  icon: Icon,
  accent,
}: {
  letter: string;
  label: string;
  generic: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accent: string;
}) {
  return (
    <div
      className="smelter-glass p-5"
      style={{
        borderLeft: `4px solid ${accent}`,
        borderRadius: '3px',
      }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="font-doto font-black text-5xl leading-none"
          style={{ color: accent }}
        >
          {letter}
        </div>
        <Icon className="w-5 h-5 mt-2" style={{ color: accent }} />
      </div>
      <div
        className="text-[10px] font-mono tracking-[0.25em] font-bold mb-1 uppercase"
        style={{ color: accent }}
      >
        {label}
      </div>
      <div className="text-[11px]" style={{ color: '#CBD5E1' }}>
        {generic}
      </div>
    </div>
  );
}

function DomainPillar({
  letter,
  label,
  weight,
  examples,
  accent,
}: {
  letter: string;
  label: string;
  weight: number;
  examples: string;
  accent: string;
}) {
  return (
    <div
      className="p-4 border"
      style={{
        borderColor: `${accent}40`,
        background: `${accent}08`,
        borderRadius: '2px',
      }}
    >
      <div className="flex items-baseline justify-between mb-2">
        <div
          className="font-doto font-black text-2xl leading-none"
          style={{ color: accent }}
        >
          {letter}
        </div>
        <div
          className="text-[10px] font-mono font-bold"
          style={{ color: accent }}
        >
          {weight}%
        </div>
      </div>
      <div
        className="text-[11px] font-bold mb-1.5 uppercase tracking-tight"
        style={{ color: '#F1F5F9' }}
      >
        {label}
      </div>
      <div className="text-[10px] opacity-70 leading-snug" style={{ color: '#94A3B8' }}>
        {examples}
      </div>
    </div>
  );
}

function StatusPill({
  status,
  large,
}: {
  status: 'live' | 'design' | 'planned';
  large?: boolean;
}) {
  const colors = {
    live: { bg: 'rgba(34,211,238,0.1)', border: '#22D3EE', text: '#22D3EE', label: 'LIVE' },
    design: { bg: 'rgba(255,122,69,0.1)', border: '#ff7a45', text: '#ff7a45', label: 'DESIGN' },
    planned: { bg: 'rgba(148,163,184,0.1)', border: '#64748B', text: '#94A3B8', label: 'PLANNED' },
  };
  const c = colors[status];
  return (
    <span
      className={`font-mono tracking-[0.2em] font-bold ${large ? 'text-[10px] px-3 py-1' : 'text-[8px] px-1.5 py-0.5'}`}
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        borderRadius: '2px',
      }}
    >
      {c.label}
    </span>
  );
}

function OwnerGate() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 smelter-ember-bg"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="text-center max-w-md">
        <div className="text-[10px] font-mono tracking-[0.3em] mb-3" style={{ color: '#ff5722' }}>
          OWNER ACCESS REQUIRED
        </div>
        <h1 className="font-doto font-black text-4xl mb-4 uppercase">
          T<span style={{ color: '#ff5722' }}>I</span>E
        </h1>
        <p className="text-sm text-white/60 mb-8">
          Platform-wide Talent & Innovation Engine. Owner-only.
        </p>
        <Link
          href="/auth/login?next=/smelter-os/tie"
          className="inline-flex items-center gap-2 font-bold text-sm tracking-wider px-6 py-3"
          style={{ background: '#ff5722', color: 'white' }}
        >
          SIGN IN <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
