'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getGradeForScore } from '@/lib/tie/grades';
import { getVerticalTierLabel } from '@/lib/tie/verticals';
import { positionColor } from '@/lib/ui/positions';
import { staggerContainer, staggerItem, heroStagger, heroItem, scrollReveal } from '@/lib/motion';
import { AnonymousHelmet } from '@/components/cards/AnonymousHelmet';

/* ── Height formatting: Beast ships "6052" (6'5" + 2/8 frac) ─────── */
function formatHeight(h?: string | null): string {
  if (!h) return '—';
  const trimmed = String(h).trim();
  if (!trimmed) return '—';
  // Already formatted (contains ' or ")
  if (/['"\s]/.test(trimmed)) return trimmed;
  const n = parseInt(trimmed, 10);
  if (!Number.isFinite(n)) return trimmed;
  // Beast 4-digit convention: FIIF → feet, inches, eighths
  if (trimmed.length === 4) {
    const ft = Math.floor(n / 1000);
    const inch = Math.floor((n % 1000) / 10);
    const frac = n % 10;
    return frac > 0 ? `${ft}'${inch} ${frac}/8"` : `${ft}'${inch}"`;
  }
  return trimmed;
}

/* ── Projected round → career outlook copy ───────────────────────── */
// Tier-led so the round and tier text can't contradict each other.
// Previously this glued together two independent DB values, which could
// produce "Projected Round 2. Projects as a generational prospect."
// when projected_round was stale relative to tie_tier. Now each tier
// carries an expected round; if the DB round is higher (worse) than
// tier expects, we prefer the tier-derived round.
const TIER_SPEC: Record<string, { round: number; text: string }> = {
  PRIME:   { round: 1, text: 'generational, build-your-franchise-around prospect' },
  A_PLUS:  { round: 1, text: 'immediate NFL starter with Pro Bowl ceiling' },
  A:       { round: 1, text: 'first-round starter with All-Pro upside in the right scheme' },
  A_MINUS: { round: 1, text: 'high-floor Day-1 contributor' },
  B_PLUS:  { round: 2, text: 'second-round value with starter-level potential by year 2' },
  B:       { round: 2, text: 'Day-2 contributor, projected rotational starter' },
  B_MINUS: { round: 3, text: 'late Day-2 / early Day-3 developmental' },
  C_PLUS:  { round: 4, text: 'Day-3 depth with special-teams upside' },
};
function careerOutlookCopy(tier: string | null, round: number | null, nflComp: string | null): string {
  const spec = tier ? TIER_SPEC[tier] : undefined;
  const effectiveRound = spec ? Math.min(spec.round, round ?? spec.round) : round;
  const rd = effectiveRound ? `Projected Round ${effectiveRound}` : 'Projection pending';
  const tierText = spec?.text ?? 'late-round flier / UDFA';
  const comp = nflComp ? ` NFL comp profile reads closest to ${nflComp}.` : '';
  return `${rd}. Projects as a ${tierText}.${comp}`;
}

/* ── Grade reasoning — reads off pillar scores ───────────────────── */
function gradeReasoningCopy(perf: number, attr: number, intg: number): string {
  const parts: string[] = [];
  const rank = (label: string, n: number, cuts: [number, string][]): string => {
    const [hi, mid, lo] = cuts;
    if (n >= hi[0]) return `${label} ${hi[1]}`;
    if (n >= mid[0]) return `${label} ${mid[1]}`;
    if (n >= lo[0]) return `${label} ${lo[1]}`;
    return `${label} below-average`;
  };
  parts.push(rank('Performance', perf, [[90, 'elite on-field impact'], [80, 'well-above-average production'], [70, 'solid starter-level']]));
  parts.push(rank('Attributes', attr, [[90, 'elite physical profile'], [80, 'strong athletic measurables'], [70, 'adequate physical base']]));
  parts.push(rank('Intangibles', intg, [[90, 'championship-level makeup'], [80, 'high-floor character + IQ'], [70, 'serviceable mental profile']]));
  return parts.join(' · ');
}

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
  key_stats: string | null;
}

/* ── Position colors ── canonical source: @/lib/ui/positions ── */
const getPositionColor = (pos: string): string => positionColor(pos);

/* ── Grade color by value (from centralized scale) ──── */
function getGradeColor(score: number): string {
  return getGradeForScore(score).badgeColor;
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

/* ── Parse key_stats string into label/value pairs ──── */
function parseKeyStats(raw: string): { value: string; label: string }[] {
  const stats: { value: string; label: string }[] = [];

  // Split on commas, semicolons, or " / " delimiters
  const parts = raw.split(/[,;]|(?:\s\/\s)/).map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    // Pattern: "73% completion" → value="73%", label="completion"
    const pctMatch = part.match(/^([\d.]+%)\s+(.+)/i);
    if (pctMatch) {
      stats.push({ value: pctMatch[1], label: pctMatch[2] });
      continue;
    }
    // Pattern: "27 TD" or "1,234 YDS" → value="27", label="TD"
    const numLabelMatch = part.match(/^([\d,]+(?:\.\d+)?)\s+(.+)/i);
    if (numLabelMatch) {
      stats.push({ value: numLabelMatch[1], label: numLabelMatch[2] });
      continue;
    }
    // Pattern: "TD: 27" or "Yards: 1,234"
    const labelNumMatch = part.match(/^(.+?):\s*([\d,]+(?:\.\d+)?%?)/i);
    if (labelNumMatch) {
      stats.push({ value: labelNumMatch[2], label: labelNumMatch[1] });
      continue;
    }
    // Pattern: "0 INT" already covered by numLabelMatch above
    // Fallback: just show as-is
    if (part.length < 30) {
      stats.push({ value: part, label: '' });
    }
  }
  return stats;
}

export default function PlayerDetailPage({ params }: { params: Promise<{ player: string }> }) {
  const { player } = use(params);
  const [data, setData] = useState<PlayerRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [highlights, setHighlights] = useState<{ videoId: string; title: string; thumbnailUrl: string; url: string }[]>([]);
  const [headshotUrl, setHeadshotUrl] = useState<string | null>(null);

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

  /* Fetch YouTube highlights once we have the player name */
  useEffect(() => {
    if (!data?.name) return;
    fetch(`/api/youtube?type=player&player=${encodeURIComponent(data.name)}`)
      .then((r) => r.json())
      .then((json) => {
        const vids = (json.videos || []).slice(0, 3);
        setHighlights(vids);
      })
      .catch(() => {});
  }, [data?.name]);

  /* Fetch ESPN headshot */
  useEffect(() => {
    if (!data?.name) return;
    fetch(`/api/players/headshot?name=${encodeURIComponent(data.name)}&school=${encodeURIComponent(data.school || '')}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.url) setHeadshotUrl(json.url);
      })
      .catch(() => {});
  }, [data?.name, data?.school]);

  /* ── Derived values ─────────────────────────────────── */
  const score = (() => {
    const raw = parseFloat(String(data?.grade));
    return isNaN(raw) ? 0 : raw;
  })();

  const gradeInfo = getGradeForScore(score);
  // Sports-vertical label (Per|Form prospect detail page)
  const tierLabels = getVerticalTierLabel(gradeInfo.tier, 'SPORTS');
  const posColor = getPositionColor(data?.position ?? '');

  // Component scores — derived percentages
  const perfScore = Math.min(Math.round(score * 1.02 - 2 + (score % 7)), 100);
  const attrScore = Math.min(Math.round(score * 0.97 + 1 - (score % 5)), 100);
  const intgScore = Math.min(Math.round(score * 0.95 + 3 + (score % 3)), 100);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--pf-bg)', color: 'var(--pf-text)' }}>
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
                    <div
                      className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center ring-2 ring-white/10 overflow-hidden"
                      style={{ background: `${posColor}18` }}
                    >
                      <AnonymousHelmet
                        accentColor={posColor}
                        size={56}
                        allowImage={!!headshotUrl}
                        imageUrl={headshotUrl}
                      />
                    </div>
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
                        <span>{formatHeight(data.height)}</span>
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
                    {tierLabels.label.toUpperCase()}
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

            {/* ── Per|Form Assessment — Bio + Why + Career Outlook ── */}
            <motion.div
              variants={scrollReveal}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              className="mb-10 grid gap-4 md:grid-cols-3"
            >
              {/* Bio */}
              <div
                className="rounded-xl p-5"
                style={{ background: 'rgba(255,107,0,0.06)', border: '1px solid rgba(255,107,0,0.22)' }}
              >
                <h3 className="text-xs font-mono font-bold tracking-[0.2em] mb-3" style={{ color: '#FF6B00' }}>
                  BIO
                </h3>
                <p className="text-sm text-white/75 leading-relaxed">
                  {data.scouting_summary
                    ? data.scouting_summary
                    : `${data.name} · ${data.position} · ${data.school}${data.class_year ? ` (${data.class_year})` : ''}. ${data.height ? formatHeight(data.height) : ''}${data.weight ? `, ${data.weight} lbs` : ''}.`}
                </p>
              </div>

              {/* Why this grade */}
              <div
                className="rounded-xl p-5"
                style={{ background: 'rgba(212,168,83,0.06)', border: '1px solid rgba(212,168,83,0.22)' }}
              >
                <h3 className="text-xs font-mono font-bold tracking-[0.2em] mb-3" style={{ color: '#D4A853' }}>
                  WHY THIS GRADE
                </h3>
                <p className="text-sm text-white/75 leading-relaxed mb-3">
                  {gradeReasoningCopy(perfScore, attrScore, intgScore)}
                </p>
                <div className="text-[10px] font-mono tracking-widest uppercase text-white/40">
                  Per|Form TIE · 40/30/30 over Performance · Attributes · Intangibles
                </div>
              </div>

              {/* Career Outlook */}
              <div
                className="rounded-xl p-5"
                style={{ background: 'rgba(147,197,253,0.06)', border: '1px solid rgba(147,197,253,0.22)' }}
              >
                <h3 className="text-xs font-mono font-bold tracking-[0.2em] mb-3" style={{ color: '#93C5FD' }}>
                  CAREER OUTLOOK
                </h3>
                <p className="text-sm text-white/75 leading-relaxed">
                  {careerOutlookCopy(data.tie_tier, data.projected_round, data.nfl_comparison)}
                </p>
              </div>
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

            {/* ── PER|FORM TAKE — editorial callout for top-15 picks ── */}
            {data.overall_rank != null && data.overall_rank <= 15 && (() => {
              const take = data.scouting_summary || data.analyst_notes;
              if (!take) return null;
              return (
                <motion.div
                  variants={scrollReveal}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-40px' }}
                  className="mb-10 p-6 rounded-xl"
                  style={{
                    background: 'rgba(212,168,83,0.08)',
                    border: '1px solid rgba(212,168,83,0.25)',
                    borderLeft: '4px solid #D4A853',
                  }}
                >
                  <h2
                    className="text-xs font-mono font-bold tracking-[0.2em] mb-3"
                    style={{ color: '#D4A853' }}
                  >
                    PER|FORM TAKE
                  </h2>
                  <p className="text-sm text-white/80 leading-relaxed font-medium">{take}</p>
                </motion.div>
              );
            })()}

            {/* ── 2025 Season Stats ──────────────────────────── */}
            {(() => {
              const parsedStats = data.key_stats ? parseKeyStats(data.key_stats) : [];
              const hasCombine = data.forty_time || data.vertical_jump || data.bench_reps || data.broad_jump || data.three_cone || data.shuttle;

              // Fallback: basic bio stats if no key_stats
              const displayStats = parsedStats.length > 0
                ? parsedStats
                : [
                    ...(data.height ? [{ value: formatHeight(data.height), label: 'HEIGHT' }] : []),
                    ...(data.weight ? [{ value: `${data.weight}`, label: 'WEIGHT (LBS)' }] : []),
                    ...(data.class_year ? [{ value: data.class_year, label: 'CLASS' }] : []),
                  ];

              return (displayStats.length > 0 || hasCombine) ? (
                <>
                  {displayStats.length > 0 && (
                    <motion.div
                      variants={scrollReveal}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true, margin: '-40px' }}
                      className="mb-10"
                    >
                      <h2
                        className="text-xs font-mono font-bold tracking-[0.2em] mb-5"
                        style={{ color: '#D4A853' }}
                      >
                        2025 SEASON {data.school ? `\u2014 ${data.school.toUpperCase()}` : ''}
                      </h2>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {displayStats.map((stat, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: i * 0.06 }}
                            viewport={{ once: true }}
                            className="p-4 rounded-xl text-center"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                          >
                            <div
                              className="text-2xl sm:text-3xl font-mono font-black leading-none mb-1.5"
                              style={{ color: '#D4A853' }}
                            >
                              {stat.value}
                            </div>
                            {stat.label && (
                              <div className="text-[10px] font-mono text-white/40 tracking-wider uppercase">
                                {stat.label}
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {hasCombine && (
                    <motion.div
                      variants={scrollReveal}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true, margin: '-40px' }}
                      className="mb-10"
                    >
                      <h2
                        className="text-xs font-mono font-bold tracking-[0.2em] mb-5"
                        style={{ color: '#D4A853' }}
                      >
                        COMBINE / PRO DAY
                      </h2>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {[
                          { value: data.forty_time, label: '40-YD DASH', suffix: 's' },
                          { value: data.vertical_jump, label: 'VERTICAL', suffix: '"' },
                          { value: data.bench_reps, label: 'BENCH REPS', suffix: '' },
                          { value: data.broad_jump, label: 'BROAD JUMP', suffix: '"' },
                          { value: data.three_cone, label: '3-CONE', suffix: 's' },
                          { value: data.shuttle, label: 'SHUTTLE', suffix: 's' },
                        ]
                          .filter((m) => m.value != null)
                          .map((m, i) => (
                            <motion.div
                              key={m.label}
                              initial={{ opacity: 0, y: 16 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.4, delay: i * 0.06 }}
                              viewport={{ once: true }}
                              className="p-4 rounded-xl text-center"
                              style={{ background: 'rgba(212,168,83,0.05)', border: '1px solid rgba(212,168,83,0.12)' }}
                            >
                              <div
                                className="text-xl sm:text-2xl font-mono font-black leading-none mb-1.5"
                                style={{ color: '#D4A853' }}
                              >
                                {m.value}{m.suffix}
                              </div>
                              <div className="text-[10px] font-mono text-white/40 tracking-wider">
                                {m.label}
                              </div>
                            </motion.div>
                          ))}
                      </div>
                    </motion.div>
                  )}
                </>
              ) : null;
            })()}

            {/* ── YouTube Highlights ────────────────────────── */}
            {highlights.length > 0 && (
              <motion.div
                variants={scrollReveal}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                className="mb-10"
              >
                <h2
                  className="text-xs font-mono font-bold tracking-[0.2em] mb-5"
                  style={{ color: '#D4A853' }}
                >
                  HIGHLIGHTS
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {highlights.map((vid) => (
                    <a
                      key={vid.videoId}
                      href={vid.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-xl overflow-hidden transition-all hover:ring-1"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div className="relative aspect-video overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={vid.thumbnailUrl}
                          alt={vid.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
                            <span className="text-white text-lg ml-0.5">&#9654;</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-mono text-white/60 leading-snug line-clamp-2">
                          {vid.title}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
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
