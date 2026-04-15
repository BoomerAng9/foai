'use client';

/**
 * Per|Form Forecast Deep Dive
 * Clean, breathable layout: identity, dual grade, pillars, longevity, NFL comps.
 */

import { useEffect, useState, use } from 'react';
import { TIELoader } from '@/components/tie/TIELoader';
import { PillarRadar } from '@/components/tie/PillarRadar';
import { CompLandscape } from '@/components/tie/CompLandscape';
import Link from 'next/link';
import { BackHomeNav } from '@/components/layout/BackHomeNav';

interface ForecastResponse {
  player: {
    identity: {
      name: string;
      position: string;
      school: string;
      performRank: number;
      consensusRank: number;
      positionRank: number;
      projectedRound: number;
      headshotUrl?: string | null;
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

const T = {
  bg: 'var(--pf-bg)',
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
  blue: '#0A66E8',
};

export default function ForecastPage({ params }: { params: Promise<{ name: string }> }) {
  const resolvedParams = use(params);
  const playerName = decodeURIComponent(resolvedParams.name);

  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/players/forecast?name=${encodeURIComponent(playerName)}`)
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
    return <TIELoader subtitle={`Loading forecast for ${playerName.replace(/-/g, ' ')}`} />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: T.bg }}>
        <div className="text-center max-w-md">
          <div className="text-sm font-medium mb-4" style={{ color: T.red }}>{error || 'No data'}</div>
          <Link href="/rankings" className="text-sm underline" style={{ color: T.navy }}>Back to rankings</Link>
        </div>
      </div>
    );
  }

  const p = data.player;
  const delta = p.grade.medicalDelta;
  const hasMedical = p.medical !== null;

  return (
    <div className="min-h-screen" style={{ background: T.bg, color: T.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Navigation bar */}
      <nav style={{ background: T.navyDeep, color: '#FFFFFF' }}>
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center">
            <BackHomeNav />
            <span className="opacity-70">Per|Form Talent Intelligence</span>
          </div>
          <Link href="/rankings" className="opacity-70 hover:opacity-100 transition">All Rankings</Link>
        </div>
      </nav>

      {/* Hero — player identity + dual grade */}
      <header className="relative overflow-hidden" style={{ background: T.navyDeep, color: '#FFFFFF' }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/brand/scenes/film-room.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0" style={{ background: 'rgba(6,18,42,0.88)' }} />

        <div className="relative max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="px-2.5 py-1 text-xs font-bold rounded" style={{ background: T.red }}>
                  {p.identity.position}
                </span>
                <span className="text-sm opacity-70">{p.identity.school}</span>
              </div>

              <h1 className="text-4xl md:text-6xl font-black leading-tight tracking-tight">
                {p.identity.name}
              </h1>

              <div className="flex items-center gap-6 mt-6 flex-wrap text-sm">
                <Stat label="Per|Form Rank" value={`#${p.identity.performRank}`} highlight />
                <Stat label="Consensus" value={`#${p.identity.consensusRank}`} />
                <Stat label="Pos. Rank" value={`${p.identity.position}${p.identity.positionRank}`} />
                <Stat label="Projected" value={`Round ${p.identity.projectedRound}`} />
                <Stat label="Trend" value={p.trend === 'rising' ? 'Rising' : p.trend === 'falling' ? 'Falling' : 'Steady'} />
              </div>

              {/* Dual grades */}
              <div className="flex items-stretch gap-4 mt-8">
                <GradeCard label="Actual TIE Grade" score={p.grade.actual.score} letter={p.grade.actual.letter} accent={T.red} primary />
                {delta > 0.1 && (
                  <GradeCard
                    label="Clean Grade"
                    score={p.grade.clean.score}
                    letter={p.grade.clean.letter}
                    subline={`-${delta.toFixed(1)} medical adjustment`}
                    accent={T.amber}
                  />
                )}
              </div>
            </div>

            {/* Headshot */}
            <div className="hidden lg:flex items-center justify-center">
              <div
                className="relative rounded-full overflow-hidden"
                style={{
                  width: 240,
                  height: 240,
                  border: '2px solid rgba(255,255,255,0.15)',
                  background: 'radial-gradient(circle at 50% 30%, #1A2A4A, #06122A)',
                }}
              >
                {p.identity.headshotUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.identity.headshotUrl}
                    alt={p.identity.name}
                    className="absolute inset-0 w-full h-full object-cover object-top"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ color: 'rgba(255,255,255,0.15)' }}>
                    <span className="text-6xl font-black">
                      {p.identity.name.split(' ').map(s => s[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Pillar breakdown */}
      <section style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h2 className="text-lg font-bold mb-6" style={{ color: T.text }}>Performance Pillars</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <PillarBar label="Game Performance" actual={p.pillars.actual.gamePerformance} clean={p.pillars.clean.gamePerformance} />
            <PillarBar label="Athleticism" actual={p.pillars.actual.athleticism} clean={p.pillars.clean.athleticism} />
            <PillarBar label="Intangibles" actual={p.pillars.actual.intangibles} clean={p.pillars.clean.intangibles} />
          </div>
        </div>
      </section>

      {/* Medical flag */}
      {hasMedical && p.medical && (
        <section style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="rounded-xl p-5" style={{ background: T.redSoft, border: `1px solid ${T.border}` }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-2 h-2 rounded-full" style={{ background: T.red }} />
                <span className="text-sm font-bold" style={{ color: T.red }}>
                  Medical Risk: {p.medical.severity}
                </span>
                <span className="text-xs" style={{ color: T.textMuted }}>
                  {p.medical.currentStatus} -- {p.medical.year}
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: T.text }}>{p.medical.notes}</p>
              {p.medical.historicalComps && p.medical.historicalComps.length > 0 && (
                <div className="flex gap-3 mt-3 text-sm font-medium" style={{ color: T.navy }}>
                  <span style={{ color: T.textMuted }}>Comps:</span>
                  {p.medical.historicalComps.join(', ')}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Longevity forecast */}
      <section style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="mb-6">
            <h2 className="text-2xl font-black" style={{ color: T.text }}>Career Projection</h2>
            <p className="text-sm mt-1" style={{ color: T.textMuted }}>{p.longevity.careerOutlookLabel}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Tile label="Expected Career" value={`${p.longevity.expectedCareerYears}`} unit="years" />
            <Tile label="Peak Window" value={`Yr ${p.longevity.peakWindowYears[0]}--${p.longevity.peakWindowYears[1]}`} />
            <Tile
              label="Decline Risk"
              value={p.longevity.declineRisk}
              accent={p.longevity.declineRisk === 'low' ? T.green : p.longevity.declineRisk === 'moderate' ? T.amber : T.red}
            />
            <Tile label="Confidence" value={`${Math.round(p.longevity.confidence * 100)}%`} />
          </div>

          {/* NFL comparison triangle */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <CompCard kind="Upside" tone={T.green} comp={p.longevity.comps.upside} />
            <CompCard kind="Baseline" tone={T.blue} comp={p.longevity.comps.baseline} />
            <CompCard kind="Downside" tone={T.red} comp={p.longevity.comps.downside} />
          </div>
        </div>
      </section>

      {/* Radar + Comp Landscape */}
      <section style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl p-6" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <h3 className="text-lg font-bold mb-4">Actual vs Clean Pillars</h3>
            <div className="flex justify-center">
              <PillarRadar
                actual={p.pillars.actual}
                clean={delta > 0.1 ? p.pillars.clean : undefined}
                size={480}
              />
            </div>
          </div>
          <div className="rounded-xl p-6" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <h3 className="text-lg font-bold mb-4">Historical Comp Landscape</h3>
            <CompLandscape
              playerName={p.identity.name}
              playerGrade={p.grade.actual.score}
              upside={p.longevity.comps.upside as Parameters<typeof CompLandscape>[0]['upside']}
              baseline={p.longevity.comps.baseline as Parameters<typeof CompLandscape>[0]['baseline']}
              downside={p.longevity.comps.downside as Parameters<typeof CompLandscape>[0]['downside']}
              size={640}
            />
          </div>
        </div>
      </section>

      <footer className="py-5 text-center text-xs" style={{ background: T.navyDeep, color: 'rgba(255,255,255,0.4)' }}>
        Per|Form -- Canonical Forecast v1 -- Published by ACHIEVEMOR
      </footer>
    </div>
  );
}

/* ── Sub-components ── */

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-xs opacity-60">{label}</div>
      <div className="text-xl font-black leading-none mt-0.5" style={highlight ? { color: '#FFD700' } : {}}>
        {value}
      </div>
    </div>
  );
}

function GradeCard({ label, score, letter, subline, accent, primary }: {
  label: string; score: number; letter: string; subline?: string; accent: string; primary?: boolean;
}) {
  return (
    <div
      className="px-5 py-4 rounded-lg"
      style={{
        background: primary ? '#FFFFFF' : 'rgba(255,255,255,0.08)',
        border: `1.5px solid ${primary ? accent : 'rgba(255,255,255,0.15)'}`,
        minWidth: primary ? 200 : 160,
      }}
    >
      <div className="text-xs mb-2" style={{ color: primary ? T.textMuted : 'rgba(255,255,255,0.5)' }}>
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-black tabular-nums" style={{ color: primary ? T.navy : '#FFFFFF', fontFamily: "'Outfit', sans-serif" }}>
          {score.toFixed(1)}
        </span>
        <span className="text-xl font-black" style={{ color: accent }}>{letter}</span>
      </div>
      {subline && (
        <div className="text-xs mt-1.5" style={{ color: primary ? T.textMuted : 'rgba(255,255,255,0.6)' }}>
          {subline}
        </div>
      )}
    </div>
  );
}

function PillarBar({ label, actual, clean }: { label: string; actual: number; clean: number }) {
  const delta = clean - actual;
  return (
    <div>
      <div className="text-xs font-semibold mb-2" style={{ color: T.textMuted }}>{label}</div>
      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-3xl font-black tabular-nums" style={{ color: T.navy, fontFamily: "'Outfit', sans-serif" }}>
          {actual.toFixed(1)}
        </span>
        {delta > 0.1 && (
          <span className="text-xs" style={{ color: T.textSubtle }}>clean {clean.toFixed(1)}</span>
        )}
      </div>
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: '#EAEDF3' }}>
        {delta > 0.1 && (
          <div className="absolute top-0 left-0 h-full rounded-full opacity-30" style={{ width: `${clean}%`, background: T.navy }} />
        )}
        <div className="absolute top-0 left-0 h-full rounded-full" style={{ width: `${actual}%`, background: T.navy }} />
      </div>
    </div>
  );
}

function Tile({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: string }) {
  return (
    <div className="px-4 py-3 rounded-lg" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
      <div className="text-xs" style={{ color: T.textMuted }}>{label}</div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-2xl font-black tabular-nums" style={{ color: accent || T.navy, fontFamily: "'Outfit', sans-serif" }}>
          {value}
        </span>
        {unit && <span className="text-xs" style={{ color: T.textSubtle }}>{unit}</span>}
      </div>
    </div>
  );
}

function CompCard({ kind, tone, comp }: {
  kind: string; tone: string;
  comp: { name: string; careerYears: number; peakYears: number; proBowls: number; outcome: string; note: string } | null;
}) {
  if (!comp) return null;
  return (
    <div className="p-4 rounded-lg" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold" style={{ color: tone }}>{kind}</span>
        <span className="text-xs px-2 py-0.5 rounded" style={{ background: `${tone}15`, color: tone }}>
          {comp.outcome.replace(/_/g, ' ')}
        </span>
      </div>
      <div className="text-xl font-black" style={{ color: T.text }}>{comp.name}</div>
      <div className="flex gap-4 mt-1.5 text-xs" style={{ color: T.textMuted }}>
        <span><strong style={{ color: T.navy }}>{comp.careerYears}</strong> yrs</span>
        <span><strong style={{ color: T.navy }}>{comp.proBowls}</strong> Pro Bowls</span>
      </div>
      <p className="text-xs mt-2 leading-relaxed" style={{ color: T.textMuted }}>{comp.note}</p>
    </div>
  );
}
