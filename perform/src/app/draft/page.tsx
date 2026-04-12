'use client';

/**
 * Draft Board — Broadcast Edition
 * ==================================
 * PFF big-board meets ESPN scoreboard. Light theme, navy + red accents,
 * clean tabular row layout, position-colored row indicators.
 */

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import PaywallGate from '@/components/PaywallGate';
import { BackHomeNav } from '@/components/layout/BackHomeNav';

/* ── types ─────────────────────────────────────────────── */
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
  medical_severity?: string | null;
  medical_current_status?: string | null;
  grade_clean?: number | null;
  medical_delta?: number | null;
}

type SortKey = 'rank' | 'grade' | 'name' | 'school';

/* ── Broadcast theme tokens ─────────────────────────────── */
const T = {
  bg:           '#F4F6FA',
  surface:      '#FFFFFF',
  surfaceAlt:   '#FAFBFD',
  border:       '#E2E6EE',
  borderStrong: '#CDD3DF',
  text:         '#0A0E1A',
  textMuted:    '#5A6478',
  textSubtle:   '#8B94A8',
  navy:         '#0B1E3F',
  navyDeep:     '#06122A',
  red:          '#D40028',
  redSoft:      '#FFE9ED',
  green:        '#00874C',
  amber:        '#DC6B19',
  blue:         '#0A66E8',
};

/* ── Position → accent color (ESPN-style) ────────────────── */
const POSITION_COLOR: Record<string, string> = {
  QB: '#D40028', RB: '#00874C', WR: '#7C3AED', TE: '#DC6B19',
  OT: '#0A66E8', IOL: '#0A66E8', OL: '#0A66E8',
  EDGE: '#8B1A00', DT: '#DC2626', DL: '#DC2626',
  LB: '#0891B2', OLB: '#0891B2', ILB: '#0891B2',
  CB: '#F59E0B', S: '#84CC16',
};
const posColor = (pos: string | null | undefined): string => {
  if (!pos) return T.navy;
  return POSITION_COLOR[pos.toUpperCase()] || T.navy;
};

const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'OT', 'IOL', 'EDGE', 'DT', 'LB', 'CB', 'S'];
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'rank',   label: 'Rank' },
  { key: 'grade',  label: 'Grade' },
  { key: 'name',   label: 'Name' },
  { key: 'school', label: 'School' },
];

function safeGrade(raw: unknown): number {
  const n = parseFloat(String(raw));
  return Number.isNaN(n) ? 0 : n;
}
function nameSlug(name: string): string {
  return encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'));
}

/* ── Grade tier pill color from canonical scale ────────────── */
function gradePillColor(score: number): { bg: string; text: string; label: string } {
  if (score >= 101) return { bg: '#F3E8FF', text: '#7C3AED', label: 'PRIME' };
  if (score >= 90)  return { bg: '#FEF3C7', text: '#A16207', label: 'A+' };
  if (score >= 85)  return { bg: '#FFEDD5', text: '#C2410C', label: 'A' };
  if (score >= 80)  return { bg: '#E0F2FE', text: '#0369A1', label: 'A-' };
  if (score >= 75)  return { bg: '#E0F5EB', text: '#00874C', label: 'B+' };
  if (score >= 70)  return { bg: '#F1F5F9', text: '#475569', label: 'B'  };
  if (score >= 65)  return { bg: '#F1F5F9', text: '#64748B', label: 'B-' };
  if (score >= 60)  return { bg: '#F5F5F5', text: '#737373', label: 'C+' };
  return              { bg: '#FAFAFA', text: '#9CA3AF', label: 'UDFA' };
}

/* ── Page ──────────────────────────────────────────────── */
export default function DraftBoardPage() {
  const [prospects, setProspects] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<SortKey>('rank');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [dataSource, setDataSource] = useState<'LIVE' | 'NO_DATA' | null>(null);

  useEffect(() => {
    fetch('/api/players?sort=overall_rank:asc&limit=250')
      .then((r) => r.json())
      .then((data) => {
        const rows: PlayerRow[] = data.players ?? [];
        setProspects(rows);
        setDataSource(rows.length > 0 ? 'LIVE' : 'NO_DATA');
        setLoading(false);
      })
      .catch(() => {
        setDataSource('NO_DATA');
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    let list = prospects.filter((p) => p && p.name);
    if (positionFilter !== 'ALL') list = list.filter((p) => (p.position || '').toUpperCase() === positionFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.school || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [prospects, positionFilter, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === 'rank')   return (a.overall_rank ?? 999) - (b.overall_rank ?? 999);
      if (sortBy === 'grade')  return safeGrade(b.grade) - safeGrade(a.grade);
      if (sortBy === 'school') return (a.school || '').localeCompare(b.school || '');
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [filtered, sortBy]);

  return (
    <PaywallGate>
      <div className="min-h-screen" style={{ background: T.bg, color: T.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
        {/* ═══ TOP RIBBON ═══ */}
        <div style={{ background: T.navyDeep, color: '#FFFFFF', borderBottom: `2px solid ${T.red}` }}>
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between text-[11px] font-bold tracking-[0.18em] uppercase">
            <div className="flex items-center gap-3">
              <BackHomeNav />
              <span style={{ color: T.red }}>● LIVE</span>
              <span className="opacity-50">|</span>
              <span>Per|Form Big Board</span>
              <span className="opacity-50">|</span>
              <span className="opacity-70">2026 NFL Draft Class</span>
            </div>
            <Link href="/rankings" className="opacity-80 hover:opacity-100 transition">
              Rankings →
            </Link>
          </div>
        </div>

        {/* ═══ HEADER — war room scene ═══ */}
        <header className="relative overflow-hidden" style={{ background: T.navyDeep, color: '#FFFFFF' }}>
          {/* War room background */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "url('/brand/scenes/draft-war-room.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          {/* Dark overlay so foreground text stays readable */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(135deg, rgba(6,18,42,0.92) 0%, rgba(6,18,42,0.78) 50%, rgba(6,18,42,0.85) 100%)',
            }}
          />
          <div className="absolute inset-0 opacity-[0.05]" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 80px, #FFFFFF 80px, #FFFFFF 81px)',
          }} />
          <div className="relative max-w-7xl mx-auto px-6 py-10">
            <div className="flex items-end justify-between flex-wrap gap-6">
              <div>
                <div className="inline-flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 text-[10px] font-bold tracking-[0.2em] rounded" style={{ background: T.red }}>
                    BIG BOARD
                  </span>
                  <span className="text-[11px] font-semibold tracking-[0.15em] uppercase opacity-70">
                    Per|Form Canonical Ranking
                  </span>
                </div>
                <h1 className="text-5xl md:text-6xl font-black leading-[0.92] tracking-tight">
                  2026 NFL Draft
                </h1>
                <p className="text-sm opacity-70 mt-3 max-w-xl">
                  All {prospects.length} graded prospects through the canonical 40·30·30 formula, ranked by actual grade with medical-adjusted deltas.
                </p>
              </div>

              {/* Count + live badge */}
              <div className="flex items-center gap-4">
                <div className="px-5 py-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <div className="text-[9px] font-bold tracking-[0.22em] opacity-60">PROSPECTS GRADED</div>
                  <div className="text-4xl font-black leading-none mt-1 tabular-nums" style={{ color: '#FFD700' }}>
                    {prospects.length.toLocaleString()}
                  </div>
                </div>
                {dataSource === 'LIVE' && (
                  <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase">
                    <span className="relative flex w-2.5 h-2.5">
                      <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping" style={{ background: '#22C55E' }} />
                      <span className="relative inline-flex rounded-full w-2.5 h-2.5" style={{ background: '#22C55E' }} />
                    </span>
                    <span style={{ color: '#22C55E' }}>LIVE</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* SIM EXPERIENCE CARDS */}
        <div style={{ background: T.navyDeep, color: '#FFFFFF', borderBottom: `1px solid ${T.border}` }}>
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: T.red }}>NEW</span>
              <span className="text-[11px] font-bold tracking-[0.15em] uppercase opacity-70">Draft Simulation Experience</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { title: 'Full Auto', desc: 'Watch all 7 rounds unfold', href: '/draft/simulate', accent: '#D4A853' },
                { title: 'War Room', desc: 'Pick your team, control every decision', href: '/draft/war-room', accent: '#EF4444' },
                { title: 'Mock Draft', desc: 'Classic mock draft board', href: '/draft/mock', accent: '#3B82F6' },
                { title: 'Round 1 Preview', desc: 'Free first round preview', href: '/draft/simulate', accent: '#22C55E' },
              ].map(card => (
                <Link key={card.title} href={card.href} className="group p-4 rounded-xl transition-all hover:translate-y-[-2px]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="text-sm font-bold mb-1" style={{ color: card.accent }}>{card.title}</div>
                  <div className="text-[11px] text-white/40 leading-relaxed">{card.desc}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ CONTROLS BAR ═══ */}
        <div className="sticky top-0 z-20 border-b" style={{ background: T.surface, borderColor: T.border, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Position pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {POSITIONS.map((pos) => {
                const active = positionFilter === pos;
                const color = pos === 'ALL' ? T.navy : posColor(pos);
                return (
                  <button
                    key={pos}
                    onClick={() => setPositionFilter(pos)}
                    className="px-3 py-1.5 text-[11px] font-bold tracking-[0.1em] uppercase rounded-md transition-all whitespace-nowrap"
                    style={{
                      background: active ? color : 'transparent',
                      color: active ? '#FFFFFF' : color,
                      border: `1.5px solid ${active ? color : T.border}`,
                    }}
                  >
                    {pos}
                  </button>
                );
              })}
            </div>

            {/* Search + Sort */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search player or school…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-md focus:outline-none focus:ring-2"
                style={{
                  background: T.surfaceAlt,
                  border: `1px solid ${T.border}`,
                  color: T.text,
                  minWidth: 220,
                }}
              />
              <div className="flex rounded-md overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
                {SORT_OPTIONS.map((opt) => {
                  const active = sortBy === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setSortBy(opt.key)}
                      className="px-3 py-1.5 text-[10px] font-bold tracking-[0.12em] uppercase transition-colors"
                      style={{
                        background: active ? T.navy : T.surface,
                        color: active ? '#FFFFFF' : T.textMuted,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ RESULTS ═══ */}
        <main className="max-w-7xl mx-auto px-6 py-6">
          {loading ? (
            <div className="py-24 text-center">
              <div className="inline-block w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: T.border, borderTopColor: T.navy }} />
              <div className="text-xs font-mono mt-3" style={{ color: T.textMuted }}>Loading prospects…</div>
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-24 text-center">
              <div className="text-sm" style={{ color: T.textMuted }}>No prospects match.</div>
            </div>
          ) : (
            <>
              {/* Column headers — desktop */}
              <div
                className="hidden md:grid items-center py-3 px-5 text-[10px] font-bold tracking-[0.2em] uppercase mb-1"
                style={{
                  gridTemplateColumns: '3.5rem 1fr 6rem 6rem 4.5rem 1fr 3rem',
                  color: T.textSubtle,
                  borderBottom: `1px solid ${T.border}`,
                }}
              >
                <span>#</span>
                <span>Player</span>
                <span className="text-center">Grade</span>
                <span className="text-center">Clean</span>
                <span className="text-center">Rd</span>
                <span>NFL Comp</span>
                <span className="text-center">Flag</span>
              </div>

              {/* Rows */}
              <div className="space-y-1.5 mt-2">
                {sorted.map((p, idx) => {
                  const score = safeGrade(p.grade);
                  const cleanScore = safeGrade(p.grade_clean);
                  const delta = p.medical_delta ?? 0;
                  const pc = posColor(p.position);
                  const pill = gradePillColor(score);
                  const cleanPill = gradePillColor(cleanScore);
                  const isExpanded = expandedId === p.id;
                  const hasMedical = p.medical_severity && p.medical_severity !== 'minor';

                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(idx * 0.015, 0.4) }}
                    >
                      <div
                        className="group rounded-lg cursor-pointer transition-all hover:shadow-md"
                        style={{
                          background: T.surface,
                          border: `1px solid ${T.border}`,
                          borderLeft: `3px solid ${pc}`,
                        }}
                        onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      >
                        {/* Desktop row */}
                        <div
                          className="hidden md:grid items-center py-3 px-5"
                          style={{ gridTemplateColumns: '3.5rem 1fr 6rem 6rem 4.5rem 1fr 3rem' }}
                        >
                          {/* Rank */}
                          <span className="text-2xl font-black tabular-nums" style={{ color: T.text, fontFamily: "'Outfit', sans-serif" }}>
                            {p.overall_rank ?? '—'}
                          </span>

                          {/* Player + school + position pill */}
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className="flex-shrink-0 px-2 py-0.5 text-[10px] font-black tracking-wider rounded"
                              style={{ background: pc, color: '#FFFFFF' }}
                            >
                              {p.position}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-[15px] font-bold truncate" style={{ color: T.text }}>
                                {p.name}
                              </div>
                              <div className="text-xs truncate" style={{ color: T.textMuted }}>
                                {p.school}
                              </div>
                            </div>
                          </div>

                          {/* Actual grade */}
                          <div className="flex justify-center">
                            <div
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md"
                              style={{ background: pill.bg, border: `1px solid ${pill.text}30` }}
                            >
                              <span className="text-sm font-black tabular-nums" style={{ color: pill.text }}>
                                {score > 0 ? score.toFixed(1) : '—'}
                              </span>
                              <span className="text-[9px] font-bold tracking-wider" style={{ color: pill.text, opacity: 0.8 }}>
                                {pill.label}
                              </span>
                            </div>
                          </div>

                          {/* Clean grade + delta */}
                          <div className="flex justify-center">
                            {delta > 0.1 ? (
                              <div className="text-center">
                                <div className="text-xs font-bold tabular-nums" style={{ color: cleanPill.text }}>
                                  {cleanScore.toFixed(1)}
                                </div>
                                <div className="text-[9px] font-bold" style={{ color: T.red }}>
                                  −{delta.toFixed(1)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px]" style={{ color: T.textSubtle }}>—</span>
                            )}
                          </div>

                          {/* Round */}
                          <div className="text-center text-sm font-bold" style={{ color: T.textMuted }}>
                            R{p.projected_round ?? '—'}
                          </div>

                          {/* NFL comp */}
                          <div className="text-xs truncate" style={{ color: T.textMuted }}>
                            {p.nfl_comparison ?? '—'}
                          </div>

                          {/* Medical flag */}
                          <div className="flex justify-center">
                            {hasMedical ? (
                              <span
                                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black"
                                style={{
                                  background: T.redSoft,
                                  color: T.red,
                                  border: `1.5px solid ${T.red}40`,
                                }}
                                title={`${p.medical_severity} · ${p.medical_current_status}`}
                              >
                                !
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Mobile row */}
                        <div className="md:hidden p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center w-10 flex-shrink-0">
                              <span className="text-2xl font-black leading-none" style={{ color: T.text, fontFamily: "'Outfit', sans-serif" }}>
                                {p.overall_rank ?? '—'}
                              </span>
                              <span
                                className="mt-1 px-1.5 py-0.5 text-[9px] font-black rounded"
                                style={{ background: pc, color: '#FFFFFF' }}
                              >
                                {p.position}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-[15px] font-bold truncate" style={{ color: T.text }}>
                                    {p.name}
                                  </div>
                                  <div className="text-xs" style={{ color: T.textMuted }}>
                                    {p.school}
                                  </div>
                                </div>
                                <div
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded flex-shrink-0"
                                  style={{ background: pill.bg }}
                                >
                                  <span className="text-sm font-black" style={{ color: pill.text }}>
                                    {score.toFixed(1)}
                                  </span>
                                  <span className="text-[9px] font-bold" style={{ color: pill.text }}>
                                    {pill.label}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-1.5 text-[10px]" style={{ color: T.textMuted }}>
                                <span>R{p.projected_round ?? '—'}</span>
                                {delta > 0.1 && (
                                  <>
                                    <span>·</span>
                                    <span style={{ color: T.red, fontWeight: 700 }}>−{delta.toFixed(1)} med</span>
                                  </>
                                )}
                                {hasMedical && (
                                  <span className="px-1.5 py-0.5 rounded font-bold" style={{ background: T.redSoft, color: T.red }}>
                                    MEDICAL
                                  </span>
                                )}
                              </div>
                              {p.nfl_comparison && (
                                <div className="text-[10px] mt-1 truncate" style={{ color: T.textSubtle }}>
                                  Comp: {p.nfl_comparison}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div
                              className="mx-0 mt-0 mb-2 p-5 rounded-b-lg"
                              style={{
                                background: T.surfaceAlt,
                                border: `1px solid ${T.border}`,
                                borderLeft: `3px solid ${pc}`,
                                borderTop: 'none',
                              }}
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {p.strengths && (
                                  <div>
                                    <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: T.green }}>
                                      ◢ Strengths
                                    </div>
                                    <p className="text-sm leading-relaxed" style={{ color: T.text }}>{p.strengths}</p>
                                  </div>
                                )}
                                {p.weaknesses && (
                                  <div>
                                    <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: T.red }}>
                                      ◢ Weaknesses
                                    </div>
                                    <p className="text-sm leading-relaxed" style={{ color: T.text }}>{p.weaknesses}</p>
                                  </div>
                                )}
                                {p.scouting_summary && (
                                  <div className="md:col-span-2">
                                    <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: T.navy }}>
                                      ◢ Scouting Summary
                                    </div>
                                    <p className="text-sm leading-relaxed" style={{ color: T.text }}>{p.scouting_summary}</p>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-between mt-5 pt-4 border-t" style={{ borderColor: T.border }}>
                                <div className="text-[10px] font-mono" style={{ color: T.textSubtle }}>
                                  Prospect ID: {p.id}
                                </div>
                                <Link
                                  href={`/players/${nameSlug(p.name)}/forecast`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold tracking-wider uppercase rounded-md transition-all hover:shadow-md"
                                  style={{ background: T.navy, color: '#FFFFFF' }}
                                >
                                  View Forecast
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                  </svg>
                                </Link>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </main>

        <footer className="py-6 text-center text-[10px] font-mono tracking-[0.25em] mt-8" style={{ background: T.navyDeep, color: 'rgba(255,255,255,0.5)' }}>
          PER|FORM BIG BOARD · CANONICAL 40·30·30 · PUBLISHED BY ACHIEVEMOR
        </footer>
      </div>
    </PaywallGate>
  );
}
