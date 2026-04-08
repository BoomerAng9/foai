'use client';

/**
 * /rankings — Per|Form 2026 Big Board
 * ================================================================
 * Rewritten 2026-04-08 to hero the actual overall Top 5 and stagger
 * ranks 6-32 below with industry-sourced scouting commentary. Broad-
 * cast theme preserved. Position group browse moved to a footer-
 * adjacent discovery strip so the page leads with the marquee
 * prospects instead of a grid of ten position tiles.
 *
 * Narrative fields (scouting_summary, strengths, weaknesses,
 * nfl_comparison) are populated by POST /api/grade/recalculate
 * which feeds Brave Search results through OpenRouter consensus
 * grading. Rows with NULL narrative fall back to "Analysis pending"
 * so the page ships even while the backfill is still running.
 */

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';

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
  QB: 'QB',
  RB: 'RB',
  WR: 'WR',
  TE: 'TE',
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

function nameSlug(name: string): string {
  return encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'));
}

/* ── Commentary helpers ──────────────────────────────────
 * The scouting_summary column is populated by the Brave +
 * OpenRouter consensus grader. If NULL, show a neutral
 * placeholder instead of hiding the blurb entirely.
 */
function blurbFor(p: Player, maxLen = 180): string {
  const s = (p.scouting_summary ?? '').trim();
  if (!s) return 'Analysis pending — consensus scouting report in progress.';
  if (s.length <= maxLen) return s;
  // Prefer sentence-boundary truncation
  const slice = s.slice(0, maxLen);
  const lastDot = slice.lastIndexOf('. ');
  return (lastDot > maxLen * 0.5 ? slice.slice(0, lastDot + 1) : slice + '…').trim();
}

function strengthChips(p: Player, max = 3): string[] {
  const raw = (p.strengths ?? '').trim();
  if (!raw) return [];
  // Accept comma-, semicolon-, or sentence-separated strengths
  const parts = raw
    .split(/[,;]|\. /)
    .map(s => s.trim())
    .filter(s => s.length > 2 && s.length < 60);
  return parts.slice(0, max);
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
  const next27 = ranked.slice(5, 32); // ranks 6-32

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
      {/* ═══ TOP RIBBON ═══ */}
      <div style={{ background: T.navyDeep, color: '#FFFFFF', borderBottom: `2px solid ${T.red}` }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between text-[11px] font-bold tracking-[0.18em] uppercase">
          <div className="flex items-center gap-3">
            <span style={{ color: T.red }}>● LIVE</span>
            <span className="opacity-50">|</span>
            <span>Per|Form Rankings</span>
            <span className="opacity-50">|</span>
            <span className="opacity-70">2026 NFL Draft Class</span>
          </div>
          <Link href="/draft" className="opacity-80 hover:opacity-100 transition">Big Board →</Link>
        </div>
      </div>

      {/* ═══ HERO — The Top 5 ═══ */}
      <header className="relative overflow-hidden" style={{ background: T.navyDeep, color: '#FFFFFF' }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/brand/scenes/rankings-board-wall.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, rgba(6,18,42,0.94) 0%, rgba(6,18,42,0.78) 50%, rgba(6,18,42,0.94) 100%)',
          }}
        />
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 80px, #FFFFFF 80px, #FFFFFF 81px)',
        }} />

        <div className="relative max-w-7xl mx-auto px-6 pt-14 pb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="px-2 py-0.5 text-[10px] font-bold tracking-[0.2em] rounded" style={{ background: T.red }}>
              THE TOP 5
            </span>
            <span className="text-[11px] font-semibold tracking-[0.15em] uppercase opacity-70">
              Consensus Elite
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black leading-[0.92] tracking-tight uppercase">
            Per|Form 2026
          </h1>
          <p className="text-base md:text-lg mt-4 opacity-80 max-w-2xl">
            The five prospects the industry agrees on. Graded by the Talent &amp; Innovation Engine on a 40/30/30 split of game performance, athleticism, and intangibles.
          </p>

          {/* Top 5 cards */}
          {loading ? (
            <div className="mt-10 py-8 text-center">
              <div className="inline-block w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: T.gold }} />
              <div className="text-xs font-mono mt-3 opacity-60">Loading top 5…</div>
            </div>
          ) : top5.length === 0 ? (
            <div className="mt-10 py-8 text-center text-sm font-mono opacity-50">No ranked players available.</div>
          ) : (
            <div className="mt-10 grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-4">
              {top5.map((p, i) => {
                const accent = positionColor(p.position);
                const isLead = i === 0;
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
                    className={isLead ? 'md:col-span-2 md:row-span-2' : ''}
                  >
                    <Link
                      href={`/draft/${encodeURIComponent(p.name)}`}
                      className="group block h-full rounded-xl overflow-hidden transition-all hover:-translate-y-0.5"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderTop: `3px solid ${accent}`,
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      <div className={`p-5 ${isLead ? 'md:p-7' : ''}`}>
                        <div className="flex items-start justify-between mb-3">
                          <span
                            className={`font-black tabular-nums leading-none ${isLead ? 'text-6xl md:text-7xl' : 'text-4xl'}`}
                            style={{ color: T.gold, fontFamily: "'Outfit', sans-serif" }}
                          >
                            {p.overall_rank}
                          </span>
                          <span
                            className="text-[9px] font-black tracking-[0.15em] uppercase px-2 py-0.5 rounded"
                            style={{ background: accent, color: '#FFFFFF' }}
                          >
                            {normalizePosition(p.position)}
                          </span>
                        </div>
                        <div className={`font-black leading-tight uppercase tracking-tight ${isLead ? 'text-2xl md:text-3xl' : 'text-base'}`}>
                          {p.name}
                        </div>
                        <div className={`opacity-70 font-semibold mt-0.5 ${isLead ? 'text-sm' : 'text-[11px]'}`}>
                          {p.school}
                        </div>
                        <div className="flex items-baseline gap-2 mt-3">
                          <span className={`font-black tabular-nums ${isLead ? 'text-3xl' : 'text-xl'}`} style={{ color: T.gold, fontFamily: "'Outfit', sans-serif" }}>
                            {Number(p.grade ?? 0).toFixed(1)}
                          </span>
                          {p.tie_tier && (
                            <span className="text-[9px] font-bold tracking-[0.15em] uppercase opacity-60">
                              {p.tie_tier}
                            </span>
                          )}
                        </div>
                        {isLead && (
                          <>
                            <p className="text-sm leading-relaxed opacity-80 mt-4">
                              {blurbFor(p, 260)}
                            </p>
                            {p.nfl_comparison && (
                              <div className="mt-4 pt-4 border-t text-[11px] font-mono" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                <span className="opacity-50 uppercase tracking-[0.15em]">NFL Comp · </span>
                                <span className="opacity-90">{p.nfl_comparison}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* ═══ RANKS 6-32 — STAGGERED WITH COMMENTARY ═══ */}
      {!loading && next27.length > 0 && (
        <section style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
          <div className="max-w-6xl mx-auto px-6 py-14">
            <div className="flex items-baseline justify-between mb-8">
              <div>
                <div className="text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: T.red }}>
                  Ranks 6 – 32
                </div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight mt-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Round One Locks &amp; Risers
                </h2>
                <p className="text-sm mt-2 max-w-2xl" style={{ color: T.textMuted }}>
                  The rest of the first-round consensus, staggered with industry-sourced commentary. Click any prospect for the full scouting report.
                </p>
              </div>
              <Link
                href="/draft"
                className="hidden md:inline-block text-[10px] font-bold tracking-[0.18em] uppercase px-3 py-1.5 rounded border"
                style={{ color: T.navy, borderColor: T.border }}
              >
                Full Board →
              </Link>
            </div>

            <div className="space-y-3">
              {next27.map((p, i) => {
                const accent = positionColor(p.position);
                const stagger = i % 2 === 0;
                const chips = strengthChips(p);
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: stagger ? -12 : 12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.35, delay: Math.min(i * 0.025, 0.4) }}
                  >
                    <Link
                      href={`/draft/${encodeURIComponent(p.name)}`}
                      className="group block rounded-lg overflow-hidden transition-all hover:shadow-md"
                      style={{
                        background: T.surface,
                        border: `1px solid ${T.border}`,
                        borderLeft: `4px solid ${accent}`,
                        marginLeft: stagger ? 0 : 24,
                        marginRight: stagger ? 24 : 0,
                      }}
                    >
                      <div className="grid gap-4 p-4 md:p-5 items-start" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
                        {/* Rank + position badge */}
                        <div className="flex flex-col items-center gap-1.5 min-w-[60px]">
                          <span className="text-4xl font-black tabular-nums leading-none" style={{ color: T.text, fontFamily: "'Outfit', sans-serif" }}>
                            {p.overall_rank}
                          </span>
                          <span
                            className="text-[9px] font-black tracking-[0.12em] uppercase px-1.5 py-0.5 rounded"
                            style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}40` }}
                          >
                            {normalizePosition(p.position)}
                          </span>
                        </div>

                        {/* Name + school + commentary blurb */}
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                            <span className="text-lg md:text-xl font-black tracking-tight truncate" style={{ fontFamily: "'Outfit', sans-serif" }}>
                              {p.name}
                            </span>
                            <span className="text-[11px] font-semibold tracking-[0.05em]" style={{ color: T.textMuted }}>
                              {p.school}
                            </span>
                          </div>
                          <p className="text-[13px] leading-relaxed" style={{ color: T.textMuted }}>
                            {blurbFor(p, 200)}
                          </p>
                          {chips.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                              {chips.map((chip, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full"
                                  style={{ background: `${accent}10`, color: accent, border: `1px solid ${accent}25` }}
                                >
                                  {chip}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2.5 text-[10px] font-mono" style={{ color: T.textSubtle }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline-block">
                              <circle cx="12" cy="12" r="10" />
                              <path d="M12 6v6l4 2" />
                            </svg>
                            <span className="tracking-[0.1em] uppercase">
                              Source: Brave Search industry consensus
                            </span>
                            {p.nfl_comparison && (
                              <>
                                <span className="opacity-30">·</span>
                                <span className="opacity-90">NFL comp: {p.nfl_comparison}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Grade */}
                        <div className="text-right flex flex-col items-end gap-1 min-w-[70px]">
                          <span className="text-3xl font-black tabular-nums leading-none" style={{ color: T.navy, fontFamily: "'Outfit', sans-serif" }}>
                            {Number(p.grade ?? 0).toFixed(1)}
                          </span>
                          {p.tie_tier && (
                            <span className="text-[9px] font-bold tracking-[0.12em] uppercase" style={{ color: T.textMuted }}>
                              {p.tie_tier}
                            </span>
                          )}
                          {p.projected_round && (
                            <span className="text-[9px] font-mono" style={{ color: T.textSubtle }}>
                              RD {p.projected_round}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══ BROWSE BY POSITION — demoted from hero ═══ */}
      {!loading && (
        <section style={{ background: T.bg }}>
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="mb-6">
              <div className="text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: T.textMuted }}>
                Browse by Position
              </div>
              <h3 className="text-xl font-black tracking-tight mt-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Deep Dives
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {POSITION_GROUPS.map(({ key, label, color }) => {
                const groupPlayers = grouped[key] || [];
                const topPlayer = groupPlayers[0];
                return (
                  <Link
                    key={key}
                    href={`/rankings/${key}`}
                    className="group block rounded-lg p-3 transition-all hover:-translate-y-0.5"
                    style={{
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                      borderLeft: `3px solid ${color}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg font-black tracking-tight" style={{ color, fontFamily: "'Outfit', sans-serif" }}>
                        {key}
                      </span>
                      <span className="text-[9px] font-mono" style={{ color: T.textSubtle }}>
                        {groupPlayers.length}
                      </span>
                    </div>
                    <div className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: T.textMuted }}>
                      {label}
                    </div>
                    {topPlayer && (
                      <div className="text-[11px] font-semibold mt-2 truncate" style={{ color: T.text }}>
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

      <footer className="py-6 text-center text-[10px] font-mono tracking-[0.25em]" style={{ background: T.navyDeep, color: 'rgba(255,255,255,0.5)' }}>
        PER|FORM RANKINGS · STAMPED BY THE TALENT &amp; INNOVATION ENGINE
      </footer>
    </div>
  );
}
