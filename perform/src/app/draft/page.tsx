'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getGradeForScore } from '@/lib/tie/grades';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { COLORS, positionColor } from '@/lib/design/tokens';
import PaywallGate from '@/components/PaywallGate';

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

/* ── position list ────────────────────────────────────────────────── */

const POSITIONS = ['ALL', 'QB', 'WR', 'RB', 'TE', 'OT', 'IOL', 'EDGE', 'DT', 'LB', 'CB', 'S'];

const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: 'rank', label: 'Rank' },
  { key: 'grade', label: 'Grade' },
  { key: 'name', label: 'Name' },
];

/* ── helpers ───────────────────────────────────────────────────────── */

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

  const handleRowHover = useCallback((e: React.MouseEvent<HTMLDivElement>, pc: string, entering: boolean) => {
    const el = e.currentTarget;
    if (entering) {
      el.style.background = 'rgba(255,255,255,0.05)';
      el.style.borderLeftColor = pc;
      el.style.borderLeftWidth = '3px';
      el.style.transform = 'translateY(-1px) scale(1.005)';
      el.style.boxShadow = `0 4px 24px rgba(0,0,0,0.4), inset 0 0 30px ${pc}08`;
    } else {
      el.style.background = 'rgba(255,255,255,0.02)';
      el.style.borderLeftColor = `${pc}40`;
      el.style.borderLeftWidth = '3px';
      el.style.transform = 'translateY(0) scale(1)';
      el.style.boxShadow = 'none';
    }
  }, []);

  return (
    <PaywallGate>
    <div className="min-h-screen flex flex-col" style={{ background: COLORS.bg }}>
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
              style={{ background: `${COLORS.gold}20`, color: COLORS.gold }}
            >
              {sorted.length}
            </span>
          </div>

          {/* LIVE UPDATES pulse indicator */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            {dataSource && (
              <span
                className="inline-flex items-center gap-2 text-[10px] font-mono font-semibold tracking-widest px-4 py-1.5 rounded-full"
                style={{
                  background: dataSource === 'LIVE' ? 'rgba(34,197,94,0.1)' : `${COLORS.gold}15`,
                  color: dataSource === 'LIVE' ? '#22C55E' : COLORS.gold,
                  border: `1px solid ${dataSource === 'LIVE' ? 'rgba(34,197,94,0.25)' : `${COLORS.gold}40`}`,
                }}
              >
                <span
                  className="relative flex h-2 w-2"
                >
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{ background: dataSource === 'LIVE' ? '#22C55E' : COLORS.gold }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-2 w-2"
                    style={{ background: dataSource === 'LIVE' ? '#22C55E' : COLORS.gold }}
                  />
                </span>
                {dataSource === 'LIVE' ? 'LIVE UPDATES' : 'NO DATA'}
              </span>
            )}
          </div>
        </motion.div>

        {/* ── Position Filters — each pill uses its position color ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="flex flex-wrap gap-2 mb-5"
        >
          {POSITIONS.map((pos) => {
            const isActive = positionFilter === pos;
            const pc = pos === 'ALL' ? { primary: COLORS.gold, light: '#FFF8E1', dark: '#8B6914' } : positionColor(pos);
            return (
              <button
                key={pos}
                onClick={() => setPositionFilter(pos)}
                className="relative px-4 py-2 text-[11px] font-semibold tracking-wide rounded-full transition-all duration-200 focus:outline-none"
                style={{
                  background: isActive ? pc.primary : 'rgba(255,255,255,0.04)',
                  color: isActive ? '#FFFFFF' : `${pc.primary}99`,
                  border: isActive ? `1px solid ${pc.primary}` : `1px solid ${pc.primary}30`,
                  boxShadow: isActive ? `0 0 16px ${pc.primary}30` : 'none',
                }}
              >
                {pos}
              </button>
            );
          })}
        </motion.div>

        {/* ── Sort Controls — animated toggle ────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="flex items-center gap-1 mb-8"
        >
          <span className="text-[10px] font-mono uppercase tracking-wider mr-2" style={{ color: COLORS.N400 }}>Sort</span>
          <div
            className="relative inline-flex rounded-lg overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {SORT_OPTIONS.map((opt) => {
              const isActive = sortBy === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className={`relative px-4 py-1.5 text-[11px] font-semibold tracking-wide transition-all duration-200 focus:outline-none ${isActive ? 'sort-active' : ''}`}
                  style={{
                    background: isActive ? COLORS.gold : 'transparent',
                    color: isActive ? COLORS.bg : 'rgba(255,255,255,0.4)',
                    zIndex: isActive ? 1 : 0,
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
              style={{ borderColor: `${COLORS.gold}40`, borderTopColor: 'transparent' }}
            />
            <span className="text-xs font-mono" style={{ color: COLORS.N400 }}>Loading prospects...</span>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <p className="text-sm" style={{ color: COLORS.N400 }}>No prospects found.</p>
            <p className="text-xs font-mono" style={{ color: COLORS.N500 }}>
              Seed the database via{' '}
              <span style={{ color: COLORS.gold }}>POST /api/players</span> to populate the board.
            </p>
          </div>
        ) : (
          <>
            {/* Column headers — desktop only */}
            <div
              className="hidden md:grid items-center mb-2 px-5 text-[10px] font-mono uppercase tracking-widest"
              style={{ gridTemplateColumns: '3rem 1fr 5rem 5rem 8rem', color: COLORS.N400 }}
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
                const pc = positionColor(p.position);
                const isExpanded = expandedId === p.id;

                return (
                  <motion.div key={p.id} variants={staggerItem}>
                    {/* ── Player Row — position-colored left border ── */}
                    <div
                      className="group relative rounded-xl transition-all duration-200 cursor-pointer"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        borderLeft: `3px solid ${pc.primary}40`,
                        borderTop: '1px solid rgba(255,255,255,0.04)',
                        borderRight: '1px solid rgba(255,255,255,0.04)',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                      }}
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      onMouseEnter={(e) => handleRowHover(e, pc.primary, true)}
                      onMouseLeave={(e) => handleRowHover(e, pc.primary, false)}
                    >
                      {/* Desktop layout */}
                      <div
                        className="hidden md:grid items-center py-4 px-5"
                        style={{ gridTemplateColumns: '3rem 1fr 5rem 5rem 8rem' }}
                      >
                        {/* Rank */}
                        <span className="text-sm font-mono font-bold" style={{ color: COLORS.N400 }}>
                          {p.overall_rank ?? '--'}
                        </span>

                        {/* Player info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: `${pc.primary}20`, color: pc.primary, border: `1px solid ${pc.primary}30` }}
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
                                style={{ background: `${pc.primary}18`, color: pc.primary }}
                              >
                                {p.position}
                              </span>
                            </div>
                            <span className="text-xs" style={{ color: COLORS.N400 }}>{p.school}</span>
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
                          <span className="text-xs font-mono" style={{ color: COLORS.N400 }}>
                            {roundLabel(p.projected_round)}
                          </span>
                        </div>

                        {/* NFL Comp */}
                        <span className="text-xs truncate" style={{ color: COLORS.N400 }}>
                          {p.nfl_comparison ?? '--'}
                        </span>
                      </div>

                      {/* Mobile layout */}
                      <div className="md:hidden p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] font-mono font-bold" style={{ color: COLORS.N400 }}>
                              #{p.overall_rank ?? '--'}
                            </span>
                            <div
                              className="w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold"
                              style={{ background: `${pc.primary}20`, color: pc.primary, border: `1px solid ${pc.primary}30` }}
                            >
                              {initials(p.name)}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-semibold text-white truncate">
                                {p.name}
                              </span>
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded"
                                style={{ background: `${pc.primary}18`, color: pc.primary }}
                              >
                                {p.position}
                              </span>
                            </div>
                            <span className="text-xs block mb-2" style={{ color: COLORS.N400 }}>{p.school}</span>
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
                              <span className="text-[10px] font-mono" style={{ color: COLORS.N400 }}>
                                {roundLabel(p.projected_round)}
                              </span>
                              {p.nfl_comparison && (
                                <span className="text-[10px] truncate" style={{ color: COLORS.N400 }}>
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
                              background: `${pc.primary}06`,
                              borderLeft: `2px solid ${pc.primary}`,
                            }}
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                              <div>
                                <span className="block text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: COLORS.N400 }}>
                                  T.I.E. Grade
                                </span>
                                <span className="font-semibold" style={{ color: gradeInfo.badgeColor }}>
                                  {p.tie_grade ?? gradeInfo.grade}
                                </span>
                                <span className="ml-2" style={{ color: COLORS.N400 }}>{gradeInfo.label}</span>
                              </div>

                              {p.strengths && (
                                <div>
                                  <span className="block text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: COLORS.N400 }}>
                                    Strengths
                                  </span>
                                  <span style={{ color: COLORS.N300 }}>{p.strengths}</span>
                                </div>
                              )}

                              {p.weaknesses && (
                                <div>
                                  <span className="block text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: COLORS.N400 }}>
                                    Weaknesses
                                  </span>
                                  <span style={{ color: COLORS.N300 }}>{p.weaknesses}</span>
                                </div>
                              )}

                              {p.scouting_summary && (
                                <div className="sm:col-span-2 lg:col-span-3">
                                  <span className="block text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: COLORS.N400 }}>
                                    Scouting Summary
                                  </span>
                                  <span style={{ color: COLORS.N400 }}>
                                    {p.scouting_summary}
                                  </span>
                                </div>
                              )}
                            </div>

                            <Link
                              href={`/draft/${encodeURIComponent(p.name)}`}
                              className="inline-flex items-center gap-1 mt-4 text-[11px] font-semibold tracking-wide transition-colors duration-200"
                              style={{ color: pc.primary }}
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
    </PaywallGate>
  );
}
