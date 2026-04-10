'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BackHomeNav } from '@/components/layout/BackHomeNav';
import { getGradeForScore } from '@/lib/tie/grades';
import { getVerticalTierLabel } from '@/lib/tie/verticals';
import { normalizePerForm, detectAgreement, generateNarrativeAngle } from '@/lib/tie/consensus';
import type { ConsensusGrade } from '@/lib/tie/consensus';
import { heroStagger, heroItem, staggerContainer, staggerItem, scrollReveal } from '@/lib/motion';
import PaywallGate from '@/components/PaywallGate';

interface PlayerRow {
  id: number;
  name: string;
  position: string;
  school: string;
  height: string | null;
  weight: string | null;
  class_year: string | null;
  overall_rank: number | null;
  position_rank: number | null;
  projected_round: number | null;
  grade: number | null;
  tie_grade: string | null;
  tie_tier: string | null;
  trend: string | null;
  strengths: string | null;
  weaknesses: string | null;
  nfl_comparison: string | null;
  scouting_summary: string | null;
  analyst_notes: string | null;
}

/* ── Position colors ─────────────────────────────────── */
const POS_COLORS: Record<string, string> = {
  QB: '#E74C3C', RB: '#2ECC71', WR: '#3498DB', TE: '#E67E22',
  OL: '#9B59B6', OT: '#9B59B6', OG: '#9B59B6', C: '#9B59B6', IOL: '#9B59B6',
  EDGE: '#E74C3C', DE: '#E74C3C',
  DL: '#E91E63', DT: '#E91E63', NT: '#E91E63', IDL: '#E91E63',
  LB: '#00BCD4', ILB: '#00BCD4', OLB: '#00BCD4',
  CB: '#FF9800', S: '#8BC34A', FS: '#8BC34A', SS: '#8BC34A',
};

function getPositionColor(pos: string): string {
  return POS_COLORS[pos?.toUpperCase()] || '#D4A853';
}

function getGradeColor(score: number): string {
  return getGradeForScore(score).badgeColor;
}

/* ── Agreement badge color ───────────────────────────── */
function getAgreementColor(agreement: string): string {
  switch (agreement) {
    case 'UNANIMOUS': return '#34D399';
    case 'MAJORITY': return '#60A5FA';
    case 'SPLIT': return '#FBBF24';
    case 'CONTRARIAN': return '#EF4444';
    default: return '#A1A1AA';
  }
}

export default function PlayerProfilePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const [data, setData] = useState<PlayerRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/players?search=${encodeURIComponent(decodeURIComponent(name))}&limit=1`,
        );
        const json = await res.json();
        const rows: PlayerRow[] = json.players ?? [];
        if (rows.length === 0) {
          setNotFound(true);
        } else {
          setData(rows[0]);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [name]);

  /* ── Derived values ─────────────────────────────────── */
  const score = (() => {
    const raw = parseFloat(String(data?.grade));
    return isNaN(raw) ? 0 : raw;
  })();

  const gradeInfo = getGradeForScore(score);
  const tierLabels = getVerticalTierLabel(gradeInfo.tier, 'SPORTS');
  const posColor = getPositionColor(data?.position ?? '');

  /* ── Consensus comparison ──────────────────────────── */
  const performGrade = normalizePerForm(score);
  const otherGrades: ConsensusGrade[] = [];
  const agreement = score > 0 ? detectAgreement([performGrade, ...otherGrades]) : null;
  const narrative = score > 0 && agreement
    ? generateNarrativeAngle(data?.name || '', agreement, performGrade, otherGrades)
    : null;

  /* ── Strength / weakness pill parser ────────────────── */
  function parsePills(raw: string | null): string[] {
    if (!raw) return [];
    return raw.split(/[,;]/).map(s => s.trim()).filter(Boolean);
  }

  return (
    <PaywallGate>
      <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F', color: '#fff' }}>
        <Header />

        <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back + Home nav */}
          <div className="mb-6">
            <BackHomeNav />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-32">
              <span className="text-sm font-mono text-white/30 animate-pulse">Loading player...</span>
            </div>
          ) : notFound || !data ? (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
              <p className="text-base font-mono text-white/40">Player not found.</p>
              <Link
                href="/draft"
                className="text-xs font-mono px-5 py-2.5 rounded transition-colors"
                style={{ color: '#D4A853', border: '1px solid rgba(212,168,83,0.3)' }}
              >
                RETURN TO DRAFT BOARD
              </Link>
            </div>
          ) : (
            <motion.div variants={heroStagger} initial="hidden" animate="visible">
              {/* ── Hero: Name + Position + Grade ───────────── */}
              <motion.div variants={heroItem} className="mb-10">
                <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                  {/* Left: Name block */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center ring-2 ring-white/10 font-outfit font-bold text-lg"
                        style={{ background: `${posColor}25`, color: posColor }}
                      >
                        {data.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <h1 className="font-outfit text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
                          {data.name}
                        </h1>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-white/50 font-mono">
                          <span
                            className="text-xs font-mono font-bold px-3 py-0.5 rounded-full"
                            style={{ background: `${posColor}20`, color: posColor, border: `1px solid ${posColor}40` }}
                          >
                            {data.position}
                          </span>
                          <span>{data.school}</span>
                          {data.class_year && (
                            <>
                              <span className="text-white/20">|</span>
                              <span>{data.class_year}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Grade display */}
                  <div className="shrink-0 flex flex-col items-center">
                    <div
                      className="text-5xl sm:text-6xl font-mono font-black leading-none"
                      style={{ color: getGradeColor(score) }}
                    >
                      {score > 0 ? score.toFixed(1) : '--'}
                    </div>
                    <div
                      className="text-[10px] font-mono font-bold tracking-wider mt-1.5 px-3 py-0.5 rounded-full text-center"
                      style={{ background: `${getGradeColor(score)}15`, color: getGradeColor(score) }}
                    >
                      {tierLabels.label.toUpperCase()}
                    </div>
                    {data.tie_grade && (
                      <div className="text-[10px] font-mono text-white/30 mt-1">
                        TIE: {data.tie_grade}
                      </div>
                    )}
                    {data.tie_tier && (
                      <div className="text-[10px] font-mono text-white/20">
                        {data.tie_tier}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* ── Info row: Projected + Comp + Ranks ─────── */}
              <motion.div
                variants={heroItem}
                className="flex flex-wrap gap-4 mb-10 pb-8"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                {data.projected_round && (
                  <div
                    className="px-4 py-3 rounded-lg"
                    style={{ background: 'rgba(212,168,83,0.08)', border: '1px solid rgba(212,168,83,0.15)' }}
                  >
                    <div className="text-[10px] font-mono text-white/40 tracking-wider mb-0.5">PROJECTED</div>
                    <div className="text-sm font-mono font-bold" style={{ color: '#D4A853' }}>
                      Round {data.projected_round}
                    </div>
                  </div>
                )}
                {data.nfl_comparison && (
                  <div
                    className="px-4 py-3 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="text-[10px] font-mono text-white/40 tracking-wider mb-0.5">NFL COMPARISON</div>
                    <div className="text-sm font-mono font-bold text-white">{data.nfl_comparison}</div>
                  </div>
                )}
                {data.overall_rank && (
                  <div
                    className="px-4 py-3 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="text-[10px] font-mono text-white/40 tracking-wider mb-0.5">OVERALL RANK</div>
                    <div className="text-sm font-mono font-bold text-white">#{data.overall_rank}</div>
                  </div>
                )}
              </motion.div>

              {/* ── Consensus Comparison ──────────────────── */}
              {score > 0 && agreement && (
                <motion.div
                  variants={scrollReveal}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-40px' }}
                  className="mb-10 p-6 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <h2
                      className="text-xs font-mono font-bold tracking-[0.2em]"
                      style={{ color: '#D4A853' }}
                    >
                      CONSENSUS COMPARISON
                    </h2>
                    <span
                      className="text-[10px] font-mono font-bold px-3 py-0.5 rounded-full"
                      style={{
                        background: `${getAgreementColor(agreement)}15`,
                        color: getAgreementColor(agreement),
                        border: `1px solid ${getAgreementColor(agreement)}30`,
                      }}
                    >
                      {agreement}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    <div className="p-3 rounded-lg" style={{ background: 'rgba(212,168,83,0.08)', border: '1px solid rgba(212,168,83,0.15)' }}>
                      <div className="text-[10px] font-mono text-white/40 tracking-wider mb-1">PER|FORM GRADE</div>
                      <div className="text-lg font-mono font-black" style={{ color: '#D4A853' }}>{score.toFixed(1)}</div>
                      <div className="text-[10px] font-mono text-white/30">{performGrade.normalizedTier}</div>
                      <div className="text-[10px] font-mono text-white/20">{performGrade.projectedRound}</div>
                    </div>
                    <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="text-[10px] font-mono text-white/40 tracking-wider mb-1">METHODOLOGY</div>
                      <div className="text-xs font-mono text-white/50 leading-relaxed">{performGrade.methodology}</div>
                    </div>
                    <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="text-[10px] font-mono text-white/40 tracking-wider mb-1">NARRATIVE</div>
                      <div className="text-xs font-mono text-white/50 leading-relaxed">{narrative}</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Scouting Summary ──────────────────────── */}
              {data.scouting_summary && (
                <motion.div
                  variants={scrollReveal}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-40px' }}
                  className="mb-10 p-6 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <h2
                    className="text-xs font-mono font-bold tracking-[0.2em] mb-4"
                    style={{ color: '#D4A853' }}
                  >
                    SCOUTING SUMMARY
                  </h2>
                  <p className="text-sm text-white/60 leading-relaxed">{data.scouting_summary}</p>
                </motion.div>
              )}

              {/* ── Strengths + Weaknesses as pill badges ───── */}
              {(data.strengths || data.weaknesses) && (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-40px' }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10"
                >
                  {data.strengths && (
                    <motion.div
                      variants={staggerItem}
                      className="p-6 rounded-xl"
                      style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.12)' }}
                    >
                      <h2
                        className="text-xs font-mono font-bold tracking-[0.2em] mb-4"
                        style={{ color: '#34D399' }}
                      >
                        STRENGTHS
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {parsePills(data.strengths).map((s, i) => (
                          <span
                            key={i}
                            className="text-xs font-mono px-3 py-1.5 rounded-full"
                            style={{ background: 'rgba(52,211,153,0.12)', color: '#34D399', border: '1px solid rgba(52,211,153,0.2)' }}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                  {data.weaknesses && (
                    <motion.div
                      variants={staggerItem}
                      className="p-6 rounded-xl"
                      style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)' }}
                    >
                      <h2
                        className="text-xs font-mono font-bold tracking-[0.2em] mb-4"
                        style={{ color: '#EF4444' }}
                      >
                        WEAKNESSES
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {parsePills(data.weaknesses).map((w, i) => (
                          <span
                            key={i}
                            className="text-xs font-mono px-3 py-1.5 rounded-full"
                            style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
                          >
                            {w}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* ── Deep Dive Links ──────────────────────────── */}
              <motion.div
                variants={scrollReveal}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                className="flex flex-wrap gap-4 mb-10"
              >
                <Link
                  href={`/players/${encodeURIComponent(data.name)}/forecast`}
                  className="group flex items-center gap-3 px-6 py-4 rounded-xl transition-all hover:scale-[1.02]"
                  style={{ background: 'rgba(212,168,83,0.08)', border: '1px solid rgba(212,168,83,0.2)' }}
                >
                  <span className="text-2xl">&#128202;</span>
                  <div>
                    <div className="text-sm font-mono font-bold" style={{ color: '#D4A853' }}>FORECAST DEEP DIVE</div>
                    <div className="text-[10px] font-mono text-white/30">Dual grade, pillars, longevity projections</div>
                  </div>
                  <span className="ml-auto text-white/20 group-hover:text-white/50 transition-colors">&rarr;</span>
                </Link>
                <Link
                  href={`/draft/${encodeURIComponent(data.name)}`}
                  className="group flex items-center gap-3 px-6 py-4 rounded-xl transition-all hover:scale-[1.02]"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <span className="text-2xl">&#127944;</span>
                  <div>
                    <div className="text-sm font-mono font-bold text-white">DRAFT BOARD VIEW</div>
                    <div className="text-[10px] font-mono text-white/30">Combine data, highlights, stats</div>
                  </div>
                  <span className="ml-auto text-white/20 group-hover:text-white/50 transition-colors">&rarr;</span>
                </Link>
              </motion.div>
            </motion.div>
          )}
        </main>

        <Footer />
      </div>
    </PaywallGate>
  );
}
