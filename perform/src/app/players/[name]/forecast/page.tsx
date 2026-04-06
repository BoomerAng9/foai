'use client';

/**
 * Per|Form Forecast Deep Dive
 * ==============================
 * The Olocip-depth athlete forecast page. Consumes /api/players/forecast
 * and renders:
 *   - Dual grade hero (actual vs clean)
 *   - Three-pillar radar via react-vega
 *   - Career arc longevity chart via react-vega
 *   - Medical timeline (if flagged)
 *   - Historical comps table
 *   - Decline risk meter
 *
 * This is the signature feature of the Per|Form data intelligence PaaS.
 */

import { useEffect, useState, use } from 'react';
import { motion } from 'framer-motion';
import { VegaEmbed } from 'react-vega';
import { TIEShield } from '@/components/tie/TIEShield';
import { TIELoader } from '@/components/tie/TIELoader';
import { PillarRadar } from '@/components/tie/PillarRadar';
import { CompLandscape } from '@/components/tie/CompLandscape';
import Link from 'next/link';

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
  visualizations: {
    engine: string;
    careerArc: Record<string, unknown> | null;
    pillarRadar: Record<string, unknown> | null;
    medicalTimeline: Record<string, unknown> | null;
    compOverlay: Record<string, unknown> | null;
  } | null;
}

export default function ForecastPage({ params }: { params: Promise<{ name: string }> }) {
  const resolvedParams = use(params);
  const playerName = decodeURIComponent(resolvedParams.name);

  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/players/forecast?name=${encodeURIComponent(playerName)}&viz=1`)
      .then(r => r.json())
      .then((json) => {
        if (json.error) {
          setError(json.error);
        } else {
          setData(json);
        }
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
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--pf-bg)' }}>
        <div className="text-center max-w-md">
          <div className="text-red-500 text-sm font-mono mb-4">{error || 'No data'}</div>
          <Link href="/rankings" className="text-xs font-mono underline" style={{ color: 'var(--pf-gold)' }}>
            ← Back to rankings
          </Link>
        </div>
      </div>
    );
  }

  const p = data.player;
  const viz = data.visualizations;
  const hasMedical = p.medical !== null;
  const delta = p.grade.medicalDelta;

  return (
    <div className="min-h-screen" style={{ background: 'var(--pf-bg)', color: 'var(--pf-text)' }}>
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-6 pt-8">
        <Link
          href="/rankings"
          className="text-[10px] font-mono tracking-[0.25em] uppercase opacity-60 hover:opacity-100 transition"
          style={{ color: 'var(--pf-gold)' }}
        >
          ← PER|FORM / FORECASTS
        </Link>
      </div>

      {/* ═══ HERO — dual grade ═══ */}
      <section className="max-w-7xl mx-auto px-6 pt-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 items-start">
          <div>
            <div className="text-[11px] font-mono tracking-[0.3em] opacity-50 mb-3">
              {p.identity.position} · {p.identity.school} · CLASS 2026
            </div>
            <h1 className="text-6xl md:text-7xl font-black leading-none tracking-tight mb-6">
              {p.identity.name}
            </h1>
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <div className="text-[9px] font-mono tracking-[0.25em] opacity-50">PER|FORM RANK</div>
                <div className="text-4xl font-black mt-1" style={{ color: 'var(--pf-gold)' }}>
                  #{p.identity.performRank}
                </div>
              </div>
              <div className="h-12 w-px" style={{ background: 'var(--pf-divider)' }} />
              <div>
                <div className="text-[9px] font-mono tracking-[0.25em] opacity-50">CONSENSUS</div>
                <div className="text-2xl font-bold mt-1 opacity-70">#{p.identity.consensusRank}</div>
              </div>
              <div className="h-12 w-px" style={{ background: 'var(--pf-divider)' }} />
              <div>
                <div className="text-[9px] font-mono tracking-[0.25em] opacity-50">PROJ ROUND</div>
                <div className="text-2xl font-bold mt-1">R{p.identity.projectedRound}</div>
              </div>
              <div className="h-12 w-px" style={{ background: 'var(--pf-divider)' }} />
              <div>
                <div className="text-[9px] font-mono tracking-[0.25em] opacity-50">TREND</div>
                <div className="text-2xl font-bold mt-1 capitalize">
                  {p.trend === 'rising' ? '↑' : p.trend === 'falling' ? '↓' : '→'} {p.trend}
                </div>
              </div>
            </div>
          </div>

          {/* Dual TIE Shields */}
          <div className="flex items-end gap-10">
            <div className="text-center">
              <div className="text-[8px] font-mono tracking-[0.3em] opacity-50 mb-3">ACTUAL TIE GRADE</div>
              <TIEShield score={p.grade.actual.score} size={200} showLabel />
              <div className="text-[9px] font-mono tracking-[0.2em] mt-4 opacity-70 max-w-[200px] mx-auto">
                {p.grade.actual.projection}
              </div>
            </div>
            {delta > 0 && (
              <div className="text-center">
                <div className="text-[8px] font-mono tracking-[0.3em] opacity-50 mb-3">CLEAN TIE GRADE</div>
                <div style={{ opacity: 0.55, filter: 'grayscale(0.5)' }}>
                  <TIEShield score={p.grade.clean.score} size={150} showLabel />
                </div>
                <div
                  className="mt-3 inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.15em]"
                  style={{
                    color: '#FF6B2B',
                    background: 'rgba(255,107,43,0.1)',
                    border: '1px solid rgba(255,107,43,0.4)',
                  }}
                >
                  Δ −{delta.toFixed(1)} MEDICAL TAX
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ PILLAR BREAKDOWN ═══ */}
      <section className="max-w-7xl mx-auto px-6 py-8 border-t" style={{ borderColor: 'var(--pf-divider)' }}>
        <div className="text-[10px] font-mono tracking-[0.3em] opacity-50 mb-6">
          / THREE-PILLAR BREAKDOWN
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PillarCard label="Game Performance" actual={p.pillars.actual.gamePerformance} clean={p.pillars.clean.gamePerformance} />
          <PillarCard label="Athleticism" actual={p.pillars.actual.athleticism} clean={p.pillars.clean.athleticism} />
          <PillarCard label="Intangibles" actual={p.pillars.actual.intangibles} clean={p.pillars.clean.intangibles} />
        </div>
      </section>

      {/* ═══ MEDICAL FLAG ═══ */}
      {hasMedical && p.medical && (
        <section className="max-w-7xl mx-auto px-6 py-8 border-t" style={{ borderColor: 'var(--pf-divider)' }}>
          <div className="text-[10px] font-mono tracking-[0.3em] mb-6" style={{ color: '#FF6B2B' }}>
            / MEDICAL FLAG · {p.medical.severity.toUpperCase()} · CURRENTLY {p.medical.currentStatus.toUpperCase()}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-8">
            <div>
              <div className="text-[9px] font-mono tracking-[0.2em] opacity-50">{p.medical.year} · {p.medical.injuryTypes.join(', ')}</div>
              <p className="mt-3 text-[15px] leading-relaxed opacity-90 max-w-2xl">
                {p.medical.notes}
              </p>
            </div>
            {p.medical.historicalComps && p.medical.historicalComps.length > 0 && (
              <div>
                <div className="text-[9px] font-mono tracking-[0.2em] opacity-50 mb-3">HISTORICAL COMPS</div>
                <div className="flex flex-wrap gap-2">
                  {p.medical.historicalComps.map(c => (
                    <span
                      key={c}
                      className="text-xs font-semibold px-3 py-1.5 rounded border"
                      style={{
                        borderColor: 'rgba(255,107,43,0.3)',
                        color: '#FFB08C',
                        background: 'rgba(255,107,43,0.06)',
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══ LONGEVITY FORECAST ═══ */}
      <section className="max-w-7xl mx-auto px-6 py-8 border-t" style={{ borderColor: 'var(--pf-divider)' }}>
        <div className="text-[10px] font-mono tracking-[0.3em] opacity-50 mb-6">
          / LONGEVITY FORECAST · MODEL v1
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatBox label="Expected Career" value={`${p.longevity.expectedCareerYears} yrs`} />
          <StatBox label="Peak Window" value={`Yr ${p.longevity.peakWindowYears[0]}–${p.longevity.peakWindowYears[1]}`} />
          <StatBox label="Decline Risk" value={p.longevity.declineRisk.toUpperCase()} accent={declineRiskColor(p.longevity.declineRisk)} />
          <StatBox label="Confidence" value={`${Math.round(p.longevity.confidence * 100)}%`} />
        </div>
        <div className="text-sm opacity-80 leading-relaxed mb-8 max-w-3xl">
          {p.longevity.careerOutlookLabel}
        </div>

        {/* Career arc chart */}
        {viz?.careerArc && (
          <div className="mt-8 p-6 rounded-xl border" style={{ borderColor: 'var(--pf-divider)', background: 'var(--pf-bg-secondary)' }}>
            <div className="text-[10px] font-mono tracking-[0.2em] opacity-50 mb-4">CAREER ARC PROJECTION WITH HISTORICAL COMPS</div>
            <VegaEmbed
              spec={viz.careerArc as Parameters<typeof VegaEmbed>[0]['spec']}
              options={{ actions: false, renderer: 'svg' }}
            />
          </div>
        )}

        {/* Comp triangle */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <CompCard kind="UPSIDE" comp={p.longevity.comps.upside} />
          <CompCard kind="BASELINE" comp={p.longevity.comps.baseline} />
          <CompCard kind="DOWNSIDE" comp={p.longevity.comps.downside} />
        </div>
      </section>

      {/* ═══ PILLAR RADAR — deterministic SVG ═══ */}
      <section className="max-w-7xl mx-auto px-6 py-12 border-t" style={{ borderColor: 'var(--pf-divider)' }}>
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-[10px] font-mono tracking-[0.3em] opacity-50">
            / PILLAR RADAR · ACTUAL VS CLEAN
          </div>
          <div className="text-[9px] font-mono opacity-40">CANONICAL 40·30·30 FORMULA</div>
        </div>
        <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
          {p.identity.name}: <span style={{ color: 'var(--pf-gold)' }}>Performance Pillars</span>
        </h2>
        <p className="text-sm opacity-60 mb-8">
          Gold = actual grade · Silver dotted = hypothetical grade with no medical history
        </p>
        <div className="rounded-2xl p-8 border" style={{
          borderColor: 'rgba(212,168,83,0.15)',
          background: 'linear-gradient(180deg, rgba(212,168,83,0.04), rgba(0,0,0,0.4))',
        }}>
          <div className="flex justify-center">
            <PillarRadar
              actual={{
                gamePerformance: p.pillars.actual.gamePerformance,
                athleticism: p.pillars.actual.athleticism,
                intangibles: p.pillars.actual.intangibles,
              }}
              clean={delta > 0.1 ? {
                gamePerformance: p.pillars.clean.gamePerformance,
                athleticism: p.pillars.clean.athleticism,
                intangibles: p.pillars.clean.intangibles,
              } : undefined}
              size={520}
            />
          </div>
        </div>
      </section>

      {/* ═══ HISTORICAL COMP LANDSCAPE — branded scatter ═══ */}
      <section className="max-w-7xl mx-auto px-6 py-12 border-t" style={{ borderColor: 'var(--pf-divider)' }}>
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-[10px] font-mono tracking-[0.3em] opacity-50">
            / HISTORICAL COMP LANDSCAPE
          </div>
          <div className="text-[9px] font-mono opacity-40">CAREER YEARS × PEAK GRADE</div>
        </div>
        <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
          Where <span style={{ color: 'var(--pf-gold)' }}>{p.identity.name.split(' ')[0]}</span> lands historically
        </h2>
        <p className="text-sm opacity-60 mb-8">
          The position of comparable RBs from the historical record. Bubble size = Pro Bowls.
        </p>
        <div className="rounded-2xl p-6 md:p-10 border" style={{
          borderColor: 'rgba(212,168,83,0.15)',
          background: 'linear-gradient(180deg, rgba(212,168,83,0.04), rgba(0,0,0,0.4))',
        }}>
          <CompLandscape
            playerName={p.identity.name}
            playerGrade={p.grade.actual.score}
            upside={p.longevity.comps.upside as Parameters<typeof CompLandscape>[0]['upside']}
            baseline={p.longevity.comps.baseline as Parameters<typeof CompLandscape>[0]['baseline']}
            downside={p.longevity.comps.downside as Parameters<typeof CompLandscape>[0]['downside']}
            size={840}
          />
        </div>
      </section>

      {/* ═══ TIE BRAND MARK ═══ */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t text-center" style={{ borderColor: 'var(--pf-divider)' }}>
        <div className="text-[10px] font-mono tracking-[0.3em] opacity-50 mb-8">
          / CERTIFIED BY THE TALENT &amp; INNOVATION ENGINE
        </div>
        <div className="flex justify-center mb-6">
          <TIEShield score={p.grade.actual.score} size={240} showLabel />
        </div>
        <p className="text-xs font-mono tracking-[0.15em] opacity-50 max-w-md mx-auto">
          Every grade is run through the canonical 40·30·30 formula and stamped by the TIE Engine.
          Per|Form does not pick favorites — the formula does.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-[10px] font-mono tracking-[0.25em] opacity-40" style={{ borderColor: 'var(--pf-divider)' }}>
        PER|FORM · CANONICAL FORECAST v1 · PUBLISHED BY ACHIEVEMOR
      </footer>
    </div>
  );
}

/* ── Sub-components ── */

function PillarCard({ label, actual, clean }: { label: string; actual: number; clean: number }) {
  const delta = clean - actual;
  return (
    <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--pf-divider)', background: 'var(--pf-bg-secondary)' }}>
      <div className="text-[9px] font-mono tracking-[0.2em] opacity-50 mb-3">{label.toUpperCase()}</div>
      <div className="flex items-baseline gap-3">
        <div className="text-4xl font-black" style={{ color: 'var(--pf-gold)' }}>
          {actual.toFixed(1)}
        </div>
        {delta > 0.1 && (
          <div className="text-sm font-mono opacity-50">
            clean {clean.toFixed(1)}
          </div>
        )}
      </div>
      <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${actual}%`,
            background: 'linear-gradient(90deg, rgba(212,168,83,0.5), var(--pf-gold))',
            boxShadow: '0 0 12px rgba(212,168,83,0.4)',
          }}
        />
      </div>
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--pf-divider)', background: 'var(--pf-bg-secondary)' }}>
      <div className="text-[9px] font-mono tracking-[0.2em] opacity-50">{label.toUpperCase()}</div>
      <div className="text-2xl font-black mt-1" style={{ color: accent || 'var(--pf-gold)' }}>
        {value}
      </div>
    </div>
  );
}

function declineRiskColor(risk: string): string {
  return risk === 'low' ? '#27AE60'
    : risk === 'moderate' ? '#F39C12'
    : risk === 'high' ? '#FF6B2B'
    : '#E74C3C';
}

function CompCard({
  kind,
  comp,
}: {
  kind: string;
  comp: { name: string; careerYears: number; peakYears: number; proBowls: number; outcome: string; note: string } | null;
}) {
  if (!comp) return null;
  const outcomeColor =
    comp.outcome === 'hall_of_fame' ? '#D4A853'
    : comp.outcome === 'pro_bowl' ? '#3FD3FF'
    : comp.outcome === 'starter' ? '#B8B8C0'
    : '#FF6B2B';

  return (
    <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--pf-divider)', background: 'var(--pf-bg-secondary)' }}>
      <div className="text-[9px] font-mono tracking-[0.25em] opacity-50 mb-2">{kind}</div>
      <div className="text-xl font-black">{comp.name}</div>
      <div className="flex gap-4 mt-3 text-xs font-mono opacity-70">
        <span>{comp.careerYears} yrs</span>
        <span>{comp.proBowls}× PB</span>
      </div>
      <div
        className="text-[9px] font-mono tracking-wider mt-3 inline-block px-2 py-1 rounded"
        style={{ background: `${outcomeColor}20`, color: outcomeColor }}
      >
        {comp.outcome.replace(/_/g, ' ').toUpperCase()}
      </div>
      <p className="text-xs mt-3 opacity-60 leading-relaxed">{comp.note}</p>
    </div>
  );
}

