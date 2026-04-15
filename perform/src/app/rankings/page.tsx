'use client';

/**
 * /rankings — Per|Form 2026 Big Board
 * ================================================================
 * Top 5 as large hero cards (one per row on mobile, featured grid on desktop).
 * Ranks 6-32 as a clean, dense, scannable list — ESPN draft board style.
 * Position group browse at the bottom.
 */

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BackHomeNav } from '@/components/layout/BackHomeNav';

interface Player {
  id: number;
  name: string;
  school: string;
  position: string;
  overall_rank: number | null;
  position_rank: number | null;
  grade: string | number | null;
  grade_letter?: string | null;
  tie_grade?: string | null;
  tie_tier?: string | null;
  projected_round?: number | null;
  scouting_summary?: string | null;
  strengths?: string | null;
  weaknesses?: string | null;
  nfl_comparison?: string | null;
}

const T = {
  bg:           'var(--pf-bg)',
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
  gold:         '#D4A853',
};

const POSITION_GROUPS = [
  { key: 'QB',   label: 'Quarterbacks',      color: '#D40028' },
  { key: 'RB',   label: 'Running Backs',     color: '#00874C' },
  { key: 'WR',   label: 'Wide Receivers',    color: '#7C3AED' },
  { key: 'TE',   label: 'Tight Ends',        color: '#DC6B19' },
  { key: 'OL',   label: 'Offensive Line',    color: '#0A66E8' },
  { key: 'EDGE', label: 'Edge Rushers',      color: '#8B1A00' },
  { key: 'DT',   label: 'Defensive Tackles', color: '#DC2626' },
  { key: 'LB',   label: 'Linebackers',       color: '#0891B2' },
  { key: 'CB',   label: 'Cornerbacks',       color: '#F59E0B' },
  { key: 'S',    label: 'Safeties',          color: '#84CC16' },
] as const;

const POSITION_MAP: Record<string, string> = {
  QB: 'QB', RB: 'RB', WR: 'WR', TE: 'TE',
  OL: 'OL', OT: 'OL', OG: 'OL', C: 'OL', IOL: 'OL',
  EDGE: 'EDGE', DE: 'EDGE',
  DT: 'DT', NT: 'DT', IDL: 'DT', DL: 'DT',
  LB: 'LB', ILB: 'LB', OLB: 'LB',
  CB: 'CB',
  S: 'S', FS: 'S', SS: 'S',
};

function normalizePosition(pos: string | null | undefined): string {
  if (!pos) return 'OTHER';
  return POSITION_MAP[pos.toUpperCase()] || pos.toUpperCase();
}

function positionColor(pos: string | null | undefined): string {
  const norm = normalizePosition(pos);
  const group = POSITION_GROUPS.find(g => g.key === norm);
  return group?.color ?? T.navy;
}

function blurbFor(p: Player, maxLen = 180): string {
  const s = (p.scouting_summary ?? '').trim();
  if (!s) return 'Analysis pending -- consensus scouting report in progress.';
  if (s.length <= maxLen) return s;
  const slice = s.slice(0, maxLen);
  const lastDot = slice.lastIndexOf('. ');
  return (lastDot > maxLen * 0.5 ? slice.slice(0, lastDot + 1) : slice + '...').trim();
}

export default function RankingsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/players?limit=600&sort=overall_rank:asc')
      .then(r => r.json())
      .then(data => {
        setPlayers(data.players || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const ranked = useMemo(
    () => players.filter(p => typeof p.overall_rank === 'number').sort((a, b) => (a.overall_rank ?? 999) - (b.overall_rank ?? 999)),
    [players],
  );

  const top5 = ranked.slice(0, 5);
  const rest = ranked.slice(5, 32);

  const grouped = useMemo(() => {
    const map: Record<string, Player[]> = {};
    ranked.forEach(p => {
      const g = normalizePosition(p.position);
      if (!map[g]) map[g] = [];
      map[g].push(p);
    });
    return map;
  }, [ranked]);

  return (
    <div className="min-h-screen" style={{ background: T.bg, color: T.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Nav ribbon */}
      <nav style={{ background: T.navyDeep, color: '#FFFFFF' }}>
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center">
            <BackHomeNav />
            <span className="opacity-70">Per|Form Rankings -- 2026 NFL Draft Class</span>
          </div>
          <Link href="/draft" className="opacity-70 hover:opacity-100 transition">Big Board</Link>
        </div>
      </nav>

      {/* ═══ TOP 5 HERO SECTION ═══ */}
      <header style={{ background: T.navyDeep, color: '#FFFFFF' }}>
        <div className="max-w-6xl mx-auto px-6 pt-12 pb-14">
          <div className="mb-8">
            <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: T.red }}>The Top 5</span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mt-4">Per|Form 2026</h1>
            <p className="text-sm mt-2 opacity-70 max-w-xl">
              The five prospects the industry agrees on. Graded by the Talent &amp; Innovation Engine on a 40/30/30 split.
            </p>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <div className="inline-block w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: T.gold }} />
            </div>
          ) : top5.length === 0 ? (
            <div className="py-12 text-center text-sm opacity-50">No ranked players available.</div>
          ) : (
            <div className="space-y-4">
              {top5.map((p, i) => {
                const accent = positionColor(p.position);
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                  >
                    <Link
                      href={`/draft/${encodeURIComponent(p.name)}`}
                      className="group block rounded-xl overflow-hidden transition-all hover:ring-1 hover:ring-white/20"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      <div className="grid items-center gap-6 p-5 md:p-6" style={{ gridTemplateColumns: '64px 1fr auto' }}>
                        {/* Rank */}
                        <div className="text-center">
                          <span
                            className="text-5xl font-black tabular-nums leading-none"
                            style={{ color: T.gold, fontFamily: "'Outfit', sans-serif" }}
                          >
                            {p.overall_rank}
                          </span>
                        </div>

                        {/* Identity */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-xl md:text-2xl font-black tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                              {p.name}
                            </span>
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded"
                              style={{ background: accent, color: '#FFFFFF' }}
                            >
                              {normalizePosition(p.position)}
                            </span>
                          </div>
                          <div className="text-sm opacity-60">{p.school}</div>
                          <p className="text-sm leading-relaxed opacity-70 mt-2 max-w-2xl hidden md:block">
                            {blurbFor(p, 220)}
                          </p>
                          {p.nfl_comparison && (
                            <div className="text-xs opacity-50 mt-2 hidden md:block">
                              NFL Comp: {p.nfl_comparison}
                            </div>
                          )}
                        </div>

                        {/* Grade + TIE badge */}
                        <div className="text-right flex flex-col items-end gap-1">
                          <span
                            className="text-3xl md:text-4xl font-black tabular-nums leading-none"
                            style={{ color: T.gold, fontFamily: "'Outfit', sans-serif" }}
                          >
                            {Number(p.grade ?? 0).toFixed(1)}
                          </span>
                          {p.tie_tier && (
                            <span className="text-xs font-semibold opacity-50">{p.tie_tier}</span>
                          )}
                          <span
                            className="text-[9px] font-bold mt-1 px-2 py-0.5 rounded"
                            style={{ background: 'rgba(212,168,83,0.15)', color: T.gold }}
                          >
                            TIE
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* ═══ RANKS 6-32 — DENSE LIST ═══ */}
      {!loading && rest.length > 0 && (
        <section style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
          <div className="max-w-6xl mx-auto px-6 py-10">
            <div className="flex items-baseline justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Ranks 6 -- 32
                </h2>
                <p className="text-sm mt-1" style={{ color: T.textMuted }}>
                  First-round consensus board
                </p>
              </div>
              <Link
                href="/draft"
                className="hidden md:inline-block text-xs font-semibold px-3 py-1.5 rounded border"
                style={{ color: T.navy, borderColor: T.border }}
              >
                Full Board
              </Link>
            </div>

            {/* Table header */}
            <div
              className="hidden md:grid items-center gap-4 px-4 py-2 text-xs font-semibold rounded-t-lg"
              style={{ gridTemplateColumns: '48px 1fr 80px 120px 80px 60px', background: T.surfaceAlt, color: T.textMuted, borderBottom: `1px solid ${T.border}` }}
            >
              <span>Rank</span>
              <span>Player</span>
              <span>Position</span>
              <span>School</span>
              <span className="text-right">Grade</span>
              <span className="text-right">Round</span>
            </div>

            {/* Rows */}
            <div className="divide-y" style={{ borderColor: T.border }}>
              {rest.map((p, i) => {
                const accent = positionColor(p.position);
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.2, delay: Math.min(i * 0.015, 0.3) }}
                  >
                    <Link
                      href={`/draft/${encodeURIComponent(p.name)}`}
                      className="group grid items-center gap-4 px-4 py-3 transition-colors hover:bg-gray-50"
                      style={{ gridTemplateColumns: '48px 1fr 80px 120px 80px 60px' }}
                    >
                      {/* Rank */}
                      <span className="text-lg font-black tabular-nums" style={{ color: T.text, fontFamily: "'Outfit', sans-serif" }}>
                        {p.overall_rank}
                      </span>

                      {/* Name */}
                      <span className="font-bold truncate group-hover:underline" style={{ color: T.text }}>
                        {p.name}
                      </span>

                      {/* Position chip */}
                      <span>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded"
                          style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}30` }}
                        >
                          {normalizePosition(p.position)}
                        </span>
                      </span>

                      {/* School */}
                      <span className="text-sm truncate" style={{ color: T.textMuted }}>
                        {p.school}
                      </span>

                      {/* Grade */}
                      <span className="text-right text-lg font-black tabular-nums" style={{ color: T.navy, fontFamily: "'Outfit', sans-serif" }}>
                        {Number(p.grade ?? 0).toFixed(1)}
                      </span>

                      {/* Round */}
                      <span className="text-right text-sm" style={{ color: T.textSubtle }}>
                        {p.projected_round ? `R${p.projected_round}` : '--'}
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Browse by position */}
      {!loading && (
        <section style={{ background: T.bg }}>
          <div className="max-w-6xl mx-auto px-6 py-10">
            <h3 className="text-lg font-bold mb-4">Browse by Position</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {POSITION_GROUPS.map(({ key, label, color }) => {
                const groupPlayers = grouped[key] || [];
                const topPlayer = groupPlayers[0];
                return (
                  <Link
                    key={key}
                    href={`/rankings/${key}`}
                    className="group block rounded-lg p-3 transition-all hover:-translate-y-0.5"
                    style={{ background: T.surface, border: `1px solid ${T.border}`, borderLeft: `3px solid ${color}` }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg font-black" style={{ color, fontFamily: "'Outfit', sans-serif" }}>{key}</span>
                      <span className="text-xs" style={{ color: T.textSubtle }}>{groupPlayers.length}</span>
                    </div>
                    <div className="text-xs font-semibold" style={{ color: T.textMuted }}>{label}</div>
                    {topPlayer && (
                      <div className="text-xs font-semibold mt-2 truncate" style={{ color: T.text }}>
                        #{topPlayer.overall_rank} {topPlayer.name}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <footer className="py-5 text-center text-xs" style={{ background: T.navyDeep, color: 'rgba(255,255,255,0.4)' }}>
        Per|Form Rankings -- Stamped by the Talent &amp; Innovation Engine
      </footer>
    </div>
  );
}
