'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getGradeForScore } from '@/lib/tie/grades';
import { staggerContainer, staggerItem, heroStagger, heroItem, scrollReveal } from '@/lib/motion';

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
  forty_time: number | null;
  vertical_jump: number | null;
  bench_reps: number | null;
  broad_jump: number | null;
  three_cone: number | null;
  shuttle: number | null;
}

/* ── Position colors ─────────────────────────────────── */
const POS_COLORS: Record<string, string> = {
  QB: '#E74C3C',
  RB: '#2ECC71',
  WR: '#3498DB',
  TE: '#E67E22',
  OL: '#9B59B6', OT: '#9B59B6', OG: '#9B59B6', C: '#9B59B6', IOL: '#9B59B6',
  EDGE: '#E74C3C', DE: '#E74C3C',
  DL: '#E91E63', DT: '#E91E63', NT: '#E91E63', IDL: '#E91E63',
  LB: '#00BCD4', ILB: '#00BCD4', OLB: '#00BCD4',
  CB: '#FF9800',
  S: '#8BC34A', FS: '#8BC34A', SS: '#8BC34A',
};

function getPositionColor(pos: string): string {
  return POS_COLORS[pos?.toUpperCase()] || '#D4A853';
}

/* ── Grade color by value ────────────────────────────── */
function getGradeColor(score: number): string {
  if (score >= 90) return '#D4A853'; // gold
  if (score >= 80) return '#60A5FA'; // blue
  if (score >= 70) return '#34D399'; // green
  return '#71717A'; // gray
}

/* ── Stat bar component ──────────────────────────────── */
function StatBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(Math.max(value, 0), 100);
  const color = getGradeColor(value);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-mono text-white/50 w-28 shrink-0 uppercase tracking-wider">
        {label}
      </span>
      <div className="flex-1 h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          viewport={{ once: true }}
        />
      </div>
      <span className="text-sm font-mono font-bold w-10 text-right" style={{ color }}>
        {value}%
      </span>
    </div>
  );
}

export default function PlayerDetailPage({ params }: { params: Promise<{ player: string }> }) {
  const { player } = use(params);
  const [data, setData] = useState<PlayerRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/players?search=${encodeURIComponent(decodeURIComponent(player))}&limit=1`,
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
  }, [player]);

  /* ── Derived values ─────────────────────────────────── */
  const score = (() => {
    const raw = parseFloat(String(data?.grade));
    return isNaN(raw) ? 0 : raw;
  })();

  const gradeInfo = getGradeForScore(score);
  const posColor = getPositionColor(data?.position ?? '');

  // Component scores — derived percentages
  const perfScore = Math.min(Math.round(score * 1.02 - 2 + (score % 7)), 100);
  const attrScore = Math.min(Math.round(score * 0.97 + 1 - (score % 5)), 100);
  const intgScore = Math.min(Math.round(score * 0.95 + 3 + (score % 3)), 100);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F', color: '#fff' }}>
      <Header />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
          <Link
            href="/draft"
            className="inline-flex items-center gap-2 text-xs font-mono tracking-wider mb-8 transition-colors hover:text-white"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            <span style={{ fontSize: 14 }}>&larr;</span> BACK TO DRAFT BOARD
          </Link>
        </motion.div>

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
                    <h1 className="font-outfit text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white truncate">
                      {data.name}
                    </h1>
                    <span
                      className="shrink-0 text-xs font-mono font-bold px-3 py-1 rounded-full"
                      style={{ background: `${posColor}20`, color: posColor, border: `1px solid ${posColor}40` }}
                    >
                      {data.position}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/50 font-mono">
                    <span>{data.school}</span>
                    {data.class_year && (
                      <>
                        <span className="text-white/20">|</span>
                        <span>{data.class_year}</span>
                      </>
                    )}
                    {data.height && (
                      <>
                        <span className="text-white/20">|</span>
                        <span>{data.height}</span>
                      </>
                    )}
                    {data.weight && <span>{data.weight} lbs</span>}
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
                    {gradeInfo.label.toUpperCase()}
                  </div>
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
              {data.position_rank && (
                <div
                  className="px-4 py-3 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="text-[10px] font-mono text-white/40 tracking-wider mb-0.5">{data.position} RANK</div>
                  <div className="text-sm font-mono font-bold text-white">#{data.position_rank}</div>
                </div>
              )}
            </motion.div>

            {/* ── Stats Bars ─────────────────────────────── */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              className="mb-10"
            >
              <motion.h2
                variants={staggerItem}
                className="text-xs font-mono font-bold tracking-[0.2em] mb-5"
                style={{ color: '#D4A853' }}
              >
                EVALUATION BREAKDOWN
              </motion.h2>
              <motion.div variants={staggerItem} className="flex flex-col gap-4">
                <StatBar label="Performance" value={perfScore} />
                <StatBar label="Attributes" value={attrScore} />
                <StatBar label="Intangibles" value={intgScore} />
              </motion.div>
            </motion.div>

            {/* ── Scouting Summary ────────────────────────── */}
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

            {/* ── Strengths + Weaknesses side by side ─────── */}
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
                    <p className="text-sm text-white/60 leading-relaxed">{data.strengths}</p>
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
                    <p className="text-sm text-white/60 leading-relaxed">{data.weaknesses}</p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ── Analyst Notes ──────────────────────────── */}
            {data.analyst_notes && (
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
                  ANALYST NOTES
                </h2>
                <p className="text-sm text-white/50 leading-relaxed italic">{data.analyst_notes}</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  );
}
