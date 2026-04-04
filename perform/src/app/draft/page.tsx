'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getGradeForScore } from '@/lib/tie/grades';
import { staggerContainer, staggerItem } from '@/lib/motion';

/* ── types ─────────────────────────────────────────────────────────── */

interface PlayerRow {
  id: number;
  name: string;
  position: string;
  school: string;
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

type SortBy = 'rank' | 'grade' | 'name';

/* ── position colors ───────────────────────────────────────────────── */

const POS_COLORS: Record<string, string> = {
  QB: '#E74C3C',
  WR: '#8B5CF6',
  RB: '#22C55E',
  TE: '#F97316',
  OT: '#3B82F6',
  IOL: '#06B6D4',
  EDGE: '#EC4899',
  DT: '#EF4444',
  LB: '#A855F7',
  CB: '#14B8A6',
  S: '#EAB308',
};

const POSITIONS = ['ALL', 'QB', 'WR', 'RB', 'TE', 'OT', 'IOL', 'EDGE', 'DT', 'LB', 'CB', 'S'];

const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: 'rank', label: 'Rank' },
  { key: 'grade', label: 'Grade' },
  { key: 'name', label: 'Name' },
];

/* ── helpers ───────────────────────────────────────────────────────── */

function posColor(pos: string): string {
  return POS_COLORS[pos] ?? '#6B7280';
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function roundLabel(round: number | null): string {
  if (round == null) return '--';
  if (round === 1) return 'RD 1';
  if (round === 2) return 'RD 2';
  if (round === 3) return 'RD 3';
  if (round <= 4) return 'RD 4';
  return `RD ${round}`;
}

function safeGrade(raw: unknown): number {
  const n = parseFloat(String(raw));
  return Number.isNaN(n) ? 0 : n;
}

/* ── page ──────────────────────────────────────────────────────────── */

export default function DraftBoardPage() {
  const [prospects, setProspects] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<SortBy>('rank');
  const [dataSource, setDataSource] = useState<'LIVE' | 'SEED' | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/players?sort=overall_rank:asc&limit=100');
        const data = await res.json();
        const rows: PlayerRow[] = data.players ?? [];
        setProspects(rows);
        setDataSource(rows.length > 0 ? 'LIVE' : 'SEED');
      } catch {
        setProspects([]);
        setDataSource('SEED');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered =
    positionFilter === 'ALL'
      ? prospects
      : prospects.filter((p) => p.position === positionFilter);

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'rank') return (a.overall_rank ?? 999) - (b.overall_rank ?? 999);
    if (sortBy === 'grade') return safeGrade(b.grade) - safeGrade(a.grade);
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0B0E14' }}>
      <Header />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* ── Header Area ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8"
        >
          <div className="flex items-center gap-4">
            <h1
              className="font-outfit text-3xl sm:text-4xl font-extrabold tracking-tight"
              style={{ color: '#FFFFFF' }}
            >
              2026 NFL DRAFT BOARD
            </h1>
            <span
              className="hidden sm:inline-flex items-center justify-center text-[11px] font-bold px-3 py-1 rounded-full"
              style={{ background: 'rgba(212,168,83,0.15)', color: '#D4A853' }}
            >
              {sorted.length}
            </span>
          </div>

          {dataSource && (
            <span
              className="inline-flex items-center gap-2 text-[10px] font-mono font-semibold tracking-widest px-4 py-1.5 rounded-full self-start sm:self-auto"
              style={{
                background: dataSource === 'LIVE' ? 'rgba(34,197,94,0.1)' : 'rgba(212,168,83,0.1)',
                color: dataSource === 'LIVE' ? '#22C55E' : '#D4A853',
                border: `1px solid ${dataSource === 'LIVE' ? 'rgba(34,197,94,0.25)' : 'rgba(212,168,83,0.25)'}`,
              }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: dataSource === 'LIVE' ? '#22C55E' : '#D4A853' }}
              />
              {dataSource === 'LIVE' ? 'LIVE DATA' : 'NO DATA'}
            </span>
          )}
        </motion.div>

        {/* ── Position Filters ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="flex flex-wrap gap-2 mb-5"
        >
          {POSITIONS.map((pos) => {
            const isActive = positionFilter === pos;
            return (
              <button
                key={pos}
                onClick={() => setPositionFilter(pos)}
                className="relative px-4 py-2 text-[11px] font-semibold tracking-wide rounded-full transition-all duration-200 focus:outline-none"
                style={{
                  background: isActive ? '#D4A853' : 'rgba(255,255,255,0.04)',
                  color: isActive ? '#0B0E14' : 'rgba(255,255,255,0.5)',
                  border: isActive ? '1px solid #D4A853' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: isActive ? '0 0 16px rgba(212,168,83,0.25)' : 'none',
                }}
              >
                {pos}
              </button>
            );
          })}
        </motion.div>

        {/* ── Sort Controls ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="flex items-center gap-1 mb-8"
        >
          <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider mr-2">Sort</span>
          <div
            className="inline-flex rounded-lg overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {SORT_OPTIONS.map((opt) => {
              const isActive = sortBy === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className="px-4 py-1.5 text-[11px] font-semibold tracking-wide transition-all duration-200 focus:outline-none"
                  style={{
                    background: isActive ? '#D4A853' : 'transparent',
                    color: isActive ? '#0B0E14' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Content ─────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div
              className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'rgba(212,168,83,0.3)', borderTopColor: 'transparent' }}
            />
            <span className="text-xs font-mono text-white/30">Loading prospects...</span>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <p className="text-sm text-white/40">No prospects found.</p>
            <p className="text-xs font-mono text-white/20">
              Seed the database via{' '}
              <span style={{ color: '#D4A853' }}>POST /api/players</span> to populate the board.
            </p>
          </div>
        ) : (
          <>
            {/* Column headers — desktop only */}
            <div
              className="hidden md:grid items-center mb-2 px-5 text-[10px] font-mono uppercase tracking-widest text-white/25"
              style={{ gridTemplateColumns: '3rem 1fr 5rem 5rem 8rem' }}
            >
              <span>#</span>
              <span>Player</span>
              <span className="text-center">Grade</span>
              <span className="text-center">Round</span>
              <span>NFL Comp</span>
            </div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.05 }}
              className="flex flex-col gap-1.5"
            >
              {sorted.map((p) => {
                const score = safeGrade(p.grade);
                const gradeInfo = getGradeForScore(score);
                const pc = posColor(p.position);
                const isExpanded = expandedId === p.id;

                return (
                  <motion.div key={p.id} variants={staggerItem}>
                    {/* ── Player Row ────────────────────────────── */}
                    <div
                      className="group relative rounded-xl transition-all duration-200 cursor-pointer"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)',
                      }}
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget;
                        el.style.background = 'rgba(255,255,255,0.06)';
                        el.style.borderLeft = '3px solid #D4A853';
                        el.style.transform = 'translateY(-1px)';
                        el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget;
                        el.style.background = 'rgba(255,255,255,0.03)';
                        el.style.borderLeft = '1px solid rgba(255,255,255,0.05)';
                        el.style.transform = 'translateY(0)';
                        el.style.boxShadow = 'none';
                      }}
                    >
                      {/* Desktop layout */}
                      <div
                        className="hidden md:grid items-center py-4 px-5"
                        style={{ gridTemplateColumns: '3rem 1fr 5rem 5rem 8rem' }}
                      >
                        {/* Rank */}
                        <span className="text-sm font-mono font-bold text-white/30">
                          {p.overall_rank ?? '--'}
                        </span>

                        {/* Player info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: `${pc}20`, color: pc }}
                          >
                            {initials(p.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white truncate">
                                {p.name}
                              </span>
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded"
                                style={{ background: `${pc}18`, color: pc }}
                              >
                                {p.position}
                              </span>
                            </div>
                            <span className="text-xs text-white/35">{p.school}</span>
                          </div>
                        </div>

                        {/* Grade pill */}
                        <div className="flex justify-center">
                          <span
                            className="inline-flex items-center justify-center min-w-[3rem] px-2.5 py-1 rounded-full text-xs font-bold"
                            style={{
                              background: `${gradeInfo.badgeColor}20`,
                              color: gradeInfo.badgeColor,
                              border: `1px solid ${gradeInfo.badgeColor}30`,
                            }}
                          >
                            {score > 0 ? score.toFixed(1) : '--'}
                          </span>
                        </div>

                        {/* Round */}
                        <div className="flex justify-center">
                          <span className="text-xs font-mono text-white/40">
                            {roundLabel(p.projected_round)}
                          </span>
                        </div>

                        {/* NFL Comp */}
                        <span className="text-xs text-white/40 truncate">
                          {p.nfl_comparison ?? '--'}
                        </span>
                      </div>

                      {/* Mobile layout */}
                      <div className="md:hidden p-4">
                        <div className="flex items-start gap-3">
                          {/* Rank + Initials */}
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] font-mono font-bold text-white/25">
                              #{p.overall_rank ?? '--'}
                            </span>
                            <div
                              className="w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold"
                              style={{ background: `${pc}20`, color: pc }}
                            >
                              {initials(p.name)}
                            </div>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-semibold text-white truncate">
                                {p.name}
                              </span>
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded"
                                style={{ background: `${pc}18`, color: pc }}
                              >
                                {p.position}
                              </span>
                            </div>
                            <span className="text-xs text-white/35 block mb-2">{p.school}</span>
                            <div className="flex items-center gap-3">
                              <span
                                className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                                style={{
                                  background: `${gradeInfo.badgeColor}20`,
                                  color: gradeInfo.badgeColor,
                                }}
                              >
                                {score > 0 ? score.toFixed(1) : '--'}
                              </span>
                              <span className="text-[10px] font-mono text-white/30">
                                {roundLabel(p.projected_round)}
                              </span>
                              {p.nfl_comparison && (
                                <span className="text-[10px] text-white/30 truncate">
                                  {p.nfl_comparison}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Expanded Details ───────────────────────── */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div
                            className="mx-2 mb-1 px-5 py-4 rounded-b-xl"
                            style={{
                              background: 'rgba(255,255,255,0.02)',
                              borderLeft: '2px solid #D4A853',
                            }}
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                              {/* Grade info */}
                              <div>
                                <span className="block text-[10px] font-mono uppercase tracking-wider text-white/25 mb-1">
                                  T.I.E. Grade
                                </span>
                                <span className="font-semibold" style={{ color: gradeInfo.badgeColor }}>
                                  {p.tie_grade ?? gradeInfo.grade}
                                </span>
                                <span className="text-white/30 ml-2">{gradeInfo.label}</span>
                              </div>

                              {/* Strengths */}
                              {p.strengths && (
                                <div>
                                  <span className="block text-[10px] font-mono uppercase tracking-wider text-white/25 mb-1">
                                    Strengths
                                  </span>
                                  <span className="text-white/60 leading-relaxed">{p.strengths}</span>
                                </div>
                              )}

                              {/* Weaknesses */}
                              {p.weaknesses && (
                                <div>
                                  <span className="block text-[10px] font-mono uppercase tracking-wider text-white/25 mb-1">
                                    Weaknesses
                                  </span>
                                  <span className="text-white/60 leading-relaxed">{p.weaknesses}</span>
                                </div>
                              )}

                              {/* Scouting Summary */}
                              {p.scouting_summary && (
                                <div className="sm:col-span-2 lg:col-span-3">
                                  <span className="block text-[10px] font-mono uppercase tracking-wider text-white/25 mb-1">
                                    Scouting Summary
                                  </span>
                                  <span className="text-white/50 leading-relaxed">
                                    {p.scouting_summary}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* View full profile link */}
                            <Link
                              href={`/draft/${encodeURIComponent(p.name)}`}
                              className="inline-flex items-center gap-1 mt-4 text-[11px] font-semibold tracking-wide transition-colors duration-200"
                              style={{ color: '#D4A853' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              View Full Profile
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                              </svg>
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </motion.div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
