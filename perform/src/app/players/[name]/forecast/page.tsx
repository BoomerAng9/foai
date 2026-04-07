'use client';

/**
 * Per|Form Forecast Deep Dive — Broadcast Edition
 * ===================================================
 * Modern light-theme broadcast UI competing with PFF / ESPN / On3 / 247Sports.
 * Uses C1 Thesys for the AI-generated dashboard inside a clean shell.
 */

import { useEffect, useState, use } from 'react';
import Image from 'next/image';
import { TIELoader } from '@/components/tie/TIELoader';
import { PillarRadar } from '@/components/tie/PillarRadar';
import { CompLandscape } from '@/components/tie/CompLandscape';
import { C1Renderer } from '@/components/c1/C1Renderer';
import Link from 'next/link';

interface ForecastResponse {
  c1Card?: { spec: unknown; model?: string; error?: string } | null;
  player: {
    identity: {
      name: string;
      position: string;
      school: string;
      performRank: number;
      consensusRank: number;
      positionRank: number;
      projectedRound: number;
    };
    grade: {
      actual: { score: number; letter: string; icon: string; label: string; projection: string };
      clean: { score: number; letter: string; icon: string };
      medicalDelta: number;
    };
    pillars: {
      actual: { gamePerformance: number; athleticism: number; intangibles: number; multiPositionBonus: number };
      clean: { gamePerformance: number; athleticism: number; intangibles: number };
    };
    medical: {
      severity: string;
      currentStatus: string;
      injuryTypes: string[];
      year: number;
      notes: string;
      historicalComps?: string[];
    } | null;
    longevity: {
      expectedCareerYears: number;
      peakWindowYears: [number, number];
      declineRisk: 'low' | 'moderate' | 'high' | 'severe';
      careerOutlookLabel: string;
      comps: {
        upside: { name: string; careerYears: number; peakYears: number; proBowls: number; outcome: string; note: string } | null;
        baseline: { name: string; careerYears: number; peakYears: number; proBowls: number; outcome: string; note: string } | null;
        downside: { name: string; careerYears: number; peakYears: number; proBowls: number; outcome: string; note: string } | null;
      };
      confidence: number;
    };
    trend: 'rising' | 'falling' | 'steady';
  };
}

/* ── Broadcast theme tokens ── */
const T = {
  bg: '#F4F6FA',
  surface: '#FFFFFF',
  surfaceAlt: '#FAFBFD',
  border: '#E2E6EE',
  borderStrong: '#CDD3DF',
  text: '#0A0E1A',
  textMuted: '#5A6478',
  textSubtle: '#8B94A8',
  navy: '#0B1E3F',
  navyDeep: '#06122A',
  red: '#D40028',
  redSoft: '#FFE9ED',
  green: '#00874C',
  greenSoft: '#E0F5EB',
  amber: '#DC6B19',
  amberSoft: '#FFF1E0',
  blue: '#0A66E8',
};

export default function ForecastPage({ params }: { params: Promise<{ name: string }> }) {
  const resolvedParams = use(params);
  const playerName = decodeURIComponent(resolvedParams.name);

  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/players/forecast?name=${encodeURIComponent(playerName)}&c1=1`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setData(json);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load forecast');
        setLoading(false);
      });
  }, [playerName]);

  if (loading) {
    return <TIELoader subtitle={`Calibrating forecast for ${playerName.replace(/-/g, ' ')}`} />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: T.bg }}>
        <div className="text-center max-w-md">
          <div className="text-sm font-medium mb-4" style={{ color: T.red }}>{error || 'No data'}</div>
          <Link href="/rankings" className="text-xs font-mono underline" style={{ color: T.navy }}>
            ← Back to rankings
          </Link>
        </div>
      </div>
    );
  }

  const p = data.player;
  const delta = p.grade.medicalDelta;
  const hasMedical = p.medical !== null;

  return (
    <div className="min-h-screen" style={{ background: T.bg, color: T.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ═══ TOP RIBBON — broadcast scoreboard style ═══ */}
      <div style={{ background: T.navyDeep, color: '#FFFFFF', borderBottom: `2px solid ${T.red}` }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between text-[11px] font-bold tracking-[0.18em] uppercase">
          <div className="flex items-center gap-3">
            <span style={{ color: T.red }}>● LIVE</span>
            <span className="opacity-50">|</span>
            <span>Per|Form Talent Intelligence</span>
            <span className="opacity-50">|</span>
            <span className="opacity-70">2026 NFL Draft Class</span>
          </div>
          <Link href="/rankings" className="opacity-80 hover:opacity-100 transition">
            ← All Rankings
          </Link>
        </div>
      </div>

      {/* ═══ HERO — TIE character + athlete identity + dual grade ═══ */}
      <header className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${T.navy} 0%, ${T.navyDeep} 100%)`, color: '#FFFFFF' }}>
        {/* Diagonal stripe background */}
        <div className="absolute inset-0 opacity-[0.08]" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 80px, #FFFFFF 80px, #FFFFFF 81px)',
        }} />
        {/* Radial orange glow behind character */}
        <div className="absolute top-1/2 right-0 w-[600px] h-[600px] -translate-y-1/2 pointer-events-none" style={{
          background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 55%)',
        }} />

        <div className="relative max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_auto] gap-8 items-center">
            {/* LEFT — identity + dual grades */}
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-[0.2em] rounded" style={{ background: T.red }}>
                  {p.identity.position}
                </span>
                <span className="text-[11px] font-semibold tracking-[0.15em] uppercase opacity-70">
                  {p.identity.school} · Class of 2026
                </span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black leading-[0.92] tracking-tight">
                {p.identity.name}
              </h1>
              <div className="flex items-center gap-6 mt-6 flex-wrap">
                <RankBadge label="Per|Form Rank" value={`#${p.identity.performRank}`} accent />
                <RankBadge label="Consensus" value={`#${p.identity.consensusRank}`} />
                <RankBadge label="Position Rank" value={`${p.identity.position}${p.identity.positionRank}`} />
                <RankBadge label="Projected" value={`R${p.identity.projectedRound}`} />
                <RankBadge label="Trend" value={p.trend === 'rising' ? '↑ Rising' : p.trend === 'falling' ? '↓ Falling' : '→ Steady'} />
              </div>

              {/* Grade panel */}
              <div className="flex items-stretch gap-3 mt-7">
                <GradeHero
                  label="ACTUAL TIE GRADE"
                  score={p.grade.actual.score}
                  letter={p.grade.actual.letter}
                  projection={p.grade.actual.projection}
                  accent={T.red}
                  primary
                />
                {delta > 0.1 && (
                  <GradeHero
                    label="CLEAN GRADE"
                    score={p.grade.clean.score}
                    letter={p.grade.clean.letter}
                    projection={`Δ −${delta.toFixed(1)} medical tax`}
                    accent={T.amber}
                    ghost
                  />
                )}
              </div>
            </div>

            {/* RIGHT — TIE engine character (hero visual) */}
            <div className="relative flex-shrink-0 hidden lg:flex items-center justify-center" style={{ width: 340, height: 360 }}>
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(249,115,22,0.25) 0%, transparent 60%)',
                  filter: 'blur(24px)',
                }}
              />
              <Image
                src="/brand/tie-engine-hero.png"
                alt="TIE Engine"
                width={340}
                height={360}
                priority
                className="object-contain relative"
                style={{
                  filter: 'drop-shadow(0 16px 32px rgba(0,0,0,0.6)) drop-shadow(0 0 40px rgba(249,115,22,0.3))',
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ═══ STAT BAR — pillar breakdown ═══ */}
      <section className="border-b" style={{ background: T.surface, borderColor: T.border }}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PillarStatBar
              label="Game Performance"
              weight="40%"
              actual={p.pillars.actual.gamePerformance}
              clean={p.pillars.clean.gamePerformance}
            />
            <PillarStatBar
              label="Athleticism"
              weight="30%"
              actual={p.pillars.actual.athleticism}
              clean={p.pillars.clean.athleticism}
            />
            <PillarStatBar
              label="Intangibles"
              weight="30%"
              actual={p.pillars.actual.intangibles}
              clean={p.pillars.clean.intangibles}
            />
          </div>
        </div>
      </section>

      {/* ═══ MEDICAL FLAG — alert callout ═══ */}
      {hasMedical && p.medical && (
        <section className="border-b" style={{ background: T.bg, borderColor: T.border }}>
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(11,30,63,0.06)' }}>
              <div className="px-6 py-4 flex items-center justify-between" style={{ background: T.redSoft, borderBottom: `1px solid ${T.border}` }}>
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full" style={{ background: T.red }} />
                  <span className="text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: T.red }}>
                    Medical Risk · {p.medical.severity}
                  </span>
                  <span className="text-[10px] tracking-[0.15em] uppercase" style={{ color: T.textMuted }}>
                    Currently {p.medical.currentStatus}
                  </span>
                </div>
                <span className="text-[10px] font-mono" style={{ color: T.textMuted }}>
                  {p.medical.year} · {p.medical.injuryTypes.join(', ')}
                </span>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8">
                <p className="text-[15px] leading-relaxed" style={{ color: T.text }}>
                  {p.medical.notes}
                </p>
                {p.medical.historicalComps && p.medical.historicalComps.length > 0 && (
                  <div className="md:border-l md:pl-8" style={{ borderColor: T.border }}>
                    <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: T.textMuted }}>
                      Historical Comps
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {p.medical.historicalComps.map((c) => (
                        <div key={c} className="text-sm font-bold" style={{ color: T.navy }}>
                          {c}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══ LONGEVITY FORECAST ═══ */}
      <section className="border-b" style={{ background: T.surface, borderColor: T.border }}>
        <div className="max-w-7xl mx-auto px-6 py-10">
          <SectionHeader
            kicker="LONGEVITY FORECAST · MODEL v1"
            title="Career Projection"
            subtitle={p.longevity.careerOutlookLabel}
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <ForecastTile label="Expected Career" value={`${p.longevity.expectedCareerYears}`} unit="years" />
            <ForecastTile label="Peak Window" value={`Yr ${p.longevity.peakWindowYears[0]}–${p.longevity.peakWindowYears[1]}`} />
            <ForecastTile
              label="Decline Risk"
              value={p.longevity.declineRisk.toUpperCase()}
              accent={
                p.longevity.declineRisk === 'low' ? T.green
                : p.longevity.declineRisk === 'moderate' ? T.amber
                : p.longevity.declineRisk === 'high' ? T.red
                : T.red
              }
            />
            <ForecastTile label="Confidence" value={`${Math.round(p.longevity.confidence * 100)}`} unit="%" />
          </div>

          {/* Comp triangle */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <CompCard kind="UPSIDE" tone={T.green} comp={p.longevity.comps.upside} />
            <CompCard kind="BASELINE" tone={T.blue} comp={p.longevity.comps.baseline} />
            <CompCard kind="DOWNSIDE" tone={T.red} comp={p.longevity.comps.downside} />
          </div>
        </div>
      </section>

      {/* ═══ PILLAR RADAR + COMP LANDSCAPE — side by side ═══ */}
      <section className="border-b" style={{ background: T.bg, borderColor: T.border }}>
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl p-8" style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <SectionHeader kicker="PERFORMANCE PILLARS" title="Actual vs Clean" tight />
            <div className="flex justify-center mt-4">
              <PillarRadar
                actual={p.pillars.actual}
                clean={delta > 0.1 ? p.pillars.clean : undefined}
                size={520}
              />
            </div>
          </div>

          <div className="rounded-2xl p-8" style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <SectionHeader kicker="HISTORICAL COMP LANDSCAPE" title="Career × Ceiling" tight />
            <div className="mt-4">
              <CompLandscape
                playerName={p.identity.name}
                playerGrade={p.grade.actual.score}
                upside={p.longevity.comps.upside as Parameters<typeof CompLandscape>[0]['upside']}
                baseline={p.longevity.comps.baseline as Parameters<typeof CompLandscape>[0]['baseline']}
                downside={p.longevity.comps.downside as Parameters<typeof CompLandscape>[0]['downside']}
                size={700}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ C1 GENERATIVE INTELLIGENCE CARD ═══ */}
      {data.c1Card?.spec ? (
        <section className="border-b" style={{ background: '#070C16', borderColor: T.border }}>
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="text-center mb-8">
              <div className="text-[10px] font-bold tracking-[0.25em] uppercase mb-2" style={{ color: '#22D3EE' }}>
                ◢ Generative Intelligence Layer · C1 Thesys
              </div>
              <h2 className="text-3xl md:text-4xl font-black leading-tight" style={{ color: '#FFFFFF', fontFamily: "'Outfit', sans-serif" }}>
                Portable Player Card
              </h2>
              <p className="text-sm mt-2 max-w-xl mx-auto" style={{ color: '#A8B2C8' }}>
                One JSON spec. Renders here as a web card, also as native mobile, NFT metadata, marketplace listing, or share image.
              </p>
            </div>
            <div className="max-w-3xl mx-auto">
              <C1Renderer spec={data.c1Card.spec} />
            </div>
          </div>
        </section>
      ) : null}

      {/* ═══ TIE BRAND CERTIFICATION ═══ */}
      <section className="border-b" style={{ background: T.bg, borderColor: T.border }}>
        <div className="max-w-3xl mx-auto px-6 py-14 text-center">
          <div className="inline-flex items-center gap-4 mb-5">
            <div className="h-px w-12" style={{ background: T.borderStrong }} />
            <div
              className="inline-flex items-center justify-center px-5 py-2 rounded-md"
              style={{ background: T.navyDeep }}
            >
              <span
                className="text-3xl font-black tracking-tight"
                style={{
                  color: '#FFFFFF',
                  fontFamily: "'Outfit', sans-serif",
                  letterSpacing: '-0.02em',
                }}
              >
                T<span style={{ color: T.red }}>I</span>E
              </span>
            </div>
            <div className="h-px w-12" style={{ background: T.borderStrong }} />
          </div>
          <div className="text-[10px] font-bold tracking-[0.25em] uppercase mb-3" style={{ color: T.textMuted }}>
            Certified by the Talent &amp; Innovation Engine
          </div>
          <p className="text-xs leading-relaxed max-w-md mx-auto" style={{ color: T.textMuted }}>
            Every Per|Form grade runs through the canonical 40·30·30 formula. Per|Form does not pick favorites — the formula does.
          </p>
        </div>
      </section>

      <footer className="py-6 text-center text-[10px] font-mono tracking-[0.25em]" style={{ background: T.navyDeep, color: 'rgba(255,255,255,0.5)' }}>
        PER|FORM · CANONICAL FORECAST v1 · PUBLISHED BY ACHIEVEMOR
      </footer>
    </div>
  );
}

/* ═══ Sub-components — broadcast theme ═══ */

function RankBadge({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[9px] font-bold tracking-[0.22em] uppercase opacity-60">{label}</div>
      <div className={`text-2xl font-black leading-none mt-1 ${accent ? '' : 'opacity-90'}`} style={accent ? { color: '#FFD700' } : {}}>
        {value}
      </div>
    </div>
  );
}

function GradeHero({
  label,
  score,
  letter,
  projection,
  accent,
  primary,
  ghost,
}: {
  label: string;
  score: number;
  letter: string;
  projection: string;
  accent: string;
  primary?: boolean;
  ghost?: boolean;
}) {
  return (
    <div
      className="relative px-6 py-5 rounded-xl"
      style={{
        background: primary ? '#FFFFFF' : 'rgba(255,255,255,0.08)',
        border: `1.5px solid ${primary ? accent : 'rgba(255,255,255,0.2)'}`,
        minWidth: primary ? 220 : 170,
        opacity: ghost ? 0.85 : 1,
      }}
    >
      <div
        className="text-[9px] font-bold tracking-[0.22em] uppercase mb-2"
        style={{ color: primary ? '#5A6478' : 'rgba(255,255,255,0.6)' }}
      >
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className="text-5xl font-black leading-none tabular-nums"
          style={{ color: primary ? '#0B1E3F' : '#FFFFFF', fontFamily: "'Outfit', sans-serif" }}
        >
          {score.toFixed(1)}
        </span>
        <span
          className="text-2xl font-black"
          style={{ color: accent }}
        >
          {letter}
        </span>
      </div>
      <div
        className="text-[10px] font-semibold mt-2"
        style={{ color: primary ? '#5A6478' : 'rgba(255,255,255,0.7)' }}
      >
        {projection}
      </div>
    </div>
  );
}

function PillarStatBar({
  label,
  weight,
  actual,
  clean,
}: {
  label: string;
  weight: string;
  actual: number;
  clean: number;
}) {
  const delta = clean - actual;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: '#5A6478' }}>
          {label}
        </div>
        <div className="text-[9px] font-mono" style={{ color: '#8B94A8' }}>
          {weight}
        </div>
      </div>
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-4xl font-black leading-none tabular-nums" style={{ color: '#0B1E3F', fontFamily: "'Outfit', sans-serif" }}>
          {actual.toFixed(1)}
        </span>
        {delta > 0.1 && (
          <span className="text-xs font-mono" style={{ color: '#8B94A8' }}>
            clean {clean.toFixed(1)}
          </span>
        )}
      </div>
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: '#EAEDF3' }}>
        {delta > 0.1 && (
          <div
            className="absolute top-0 left-0 h-full"
            style={{
              width: `${clean}%`,
              background: 'repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(11,30,63,0.15) 4px, rgba(11,30,63,0.15) 6px)',
            }}
          />
        )}
        <div
          className="absolute top-0 left-0 h-full rounded-full"
          style={{
            width: `${actual}%`,
            background: 'linear-gradient(90deg, #0B1E3F, #1A4ECC)',
          }}
        />
      </div>
    </div>
  );
}

function SectionHeader({
  kicker,
  title,
  subtitle,
  tight,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  tight?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: '#D40028' }}>
        {kicker}
      </div>
      <h2 className={`${tight ? 'text-2xl' : 'text-3xl md:text-4xl'} font-black leading-tight mt-1`} style={{ color: '#0A0E1A' }}>
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm mt-2" style={{ color: '#5A6478' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function ForecastTile({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: string }) {
  return (
    <div className="px-5 py-4 rounded-xl" style={{ background: '#FAFBFD', border: '1px solid #E2E6EE' }}>
      <div className="text-[9px] font-bold tracking-[0.22em] uppercase" style={{ color: '#5A6478' }}>
        {label}
      </div>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className="text-3xl font-black tabular-nums" style={{ color: accent || '#0B1E3F', fontFamily: "'Outfit', sans-serif" }}>
          {value}
        </span>
        {unit && (
          <span className="text-xs font-bold" style={{ color: '#8B94A8' }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function CompCard({
  kind,
  tone,
  comp,
}: {
  kind: string;
  tone: string;
  comp: { name: string; careerYears: number; peakYears: number; proBowls: number; outcome: string; note: string } | null;
}) {
  if (!comp) return null;
  return (
    <div className="p-5 rounded-xl" style={{ background: '#FFFFFF', border: '1px solid #E2E6EE', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: tone }}>
          {kind}
        </div>
        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: `${tone}15`, color: tone }}>
          {comp.outcome.replace(/_/g, ' ')}
        </span>
      </div>
      <div className="text-2xl font-black tracking-tight" style={{ color: '#0A0E1A' }}>
        {comp.name}
      </div>
      <div className="flex gap-4 mt-2 text-xs font-mono" style={{ color: '#5A6478' }}>
        <span><strong style={{ color: '#0B1E3F' }}>{comp.careerYears}</strong> yrs</span>
        <span><strong style={{ color: '#0B1E3F' }}>{comp.proBowls}</strong>× PB</span>
      </div>
      <p className="text-xs mt-3 leading-relaxed" style={{ color: '#5A6478' }}>
        {comp.note}
      </p>
    </div>
  );
}

