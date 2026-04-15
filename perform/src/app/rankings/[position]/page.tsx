'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { staggerContainer, staggerItem, heroStagger, heroItem, fadeUp } from '@/lib/motion';

/* ── Types ─────────────────────────────────────────── */
interface Player {
  id: number;
  name: string;
  school: string;
  position: string;
  overall_rank: number;
  position_rank: number;
  grade: string;
  projected_round: number;
  nfl_comparison: string;
  strengths: string;
  weaknesses: string;
}

/* ── Position labels ───────────────────────────────── */
const POSITION_LABELS: Record<string, string> = {
  QB: 'QUARTERBACK',
  RB: 'RUNNING BACK',
  WR: 'WIDE RECEIVER',
  TE: 'TIGHT END',
  OL: 'OFFENSIVE LINE',
  EDGE: 'EDGE RUSHER',
  DT: 'DEFENSIVE TACKLE',
  LB: 'LINEBACKER',
  CB: 'CORNERBACK',
  S: 'SAFETY',
};

/* ── Position mapping (DB positions to group) ──────── */
const POSITION_SEARCH_MAP: Record<string, string[]> = {
  QB: ['QB'],
  RB: ['RB'],
  WR: ['WR'],
  TE: ['TE'],
  OL: ['OL', 'OT', 'OG', 'C', 'IOL'],
  EDGE: ['EDGE', 'DE'],
  DT: ['DT', 'NT', 'IDL', 'DL'],
  LB: ['LB', 'ILB', 'OLB'],
  CB: ['CB'],
  S: ['S', 'FS', 'SS'],
};

/* ── Accent colors ─────────────────────────────────── */
const GROUP_COLORS: Record<string, string> = {
  QB: '#E74C3C',
  RB: '#2ECC71',
  WR: '#3498DB',
  TE: '#E67E22',
  OL: '#9B59B6',
  EDGE: '#E74C3C',
  DT: '#E91E63',
  LB: '#00BCD4',
  CB: '#FF9800',
  S: '#8BC34A',
};

/* ── Ranking bar animation variants ────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const barContainer: any = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.4 } },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const barItem: any = {
  hidden: { opacity: 0, x: -60, scaleX: 0.7 },
  visible: {
    opacity: 1,
    x: 0,
    scaleX: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function PositionRankingPage() {
  const params = useParams();
  const positionKey = (params.position as string)?.toUpperCase() || 'QB';
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [headshotUrl, setHeadshotUrl] = useState<string | null>(null);

  const label = POSITION_LABELS[positionKey] || positionKey;
  const accentColor = GROUP_COLORS[positionKey] || '#00BCD4';
  const searchPositions = POSITION_SEARCH_MAP[positionKey] || [positionKey];

  useEffect(() => {
    async function loadPlayers() {
      try {
        // Fetch for each sub-position in the group
        const fetches = searchPositions.map(pos =>
          fetch(`/api/players?position=${pos}&limit=100&sort=position_rank:asc`)
            .then(r => r.json())
            .then(d => d.players || [])
        );
        const results = await Promise.all(fetches);
        const all: Player[] = results.flat();

        // Sort by position_rank, then overall_rank
        all.sort((a, b) => {
          const ar = a.position_rank || a.overall_rank || 999;
          const br = b.position_rank || b.overall_rank || 999;
          return ar - br;
        });

        setPlayers(all);

        // Fetch headshot for #1 player
        if (all.length > 0) {
          const top = all[0];
          fetch(`/api/players/headshot?name=${encodeURIComponent(top.name)}&school=${encodeURIComponent(top.school)}`)
            .then(r => r.json())
            .then(d => {
              if (d.url) setHeadshotUrl(d.url);
            })
            .catch(() => {});
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    loadPlayers();
  }, [positionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const top5 = players.slice(0, 5);
  const rest = players.slice(5);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--pf-bg)' }}>
      <Header />

      {/* Back nav */}
      <div className="max-w-6xl mx-auto w-full px-6 pt-6">
        <Link
          href="/rankings"
          className="inline-flex items-center gap-2 text-xs font-mono text-white/40 hover:text-white/70 transition-colors"
        >
          <span>&larr;</span> ALL POSITIONS
        </Link>
      </div>

      {/* ── BUCKY BROOKS STYLE TOP 5 CARD ─────────── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: '#D4A853', borderTopColor: 'transparent' }}
            />
          </div>
        ) : (
          <>
            {/* Main broadcast card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #0D4F4F 0%, #0A3A3A 40%, #082828 100%)',
                border: '1px solid rgba(0,188,212,0.15)',
              }}
            >
              {/* Diagonal stripe overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, transparent, transparent 30px, rgba(255,255,255,0.03) 30px, rgba(255,255,255,0.03) 32px)',
                }}
              />

              {/* Secondary diagonal accent */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(-45deg, transparent, transparent 60px, rgba(0,188,212,0.02) 60px, rgba(0,188,212,0.02) 62px)',
                }}
              />

              <div className="relative z-10 flex flex-col lg:flex-row">
                {/* Left content */}
                <div className="flex-1 p-6 md:p-10">
                  {/* Header */}
                  <motion.div variants={heroStagger} initial="hidden" animate="visible">
                    <motion.div variants={heroItem} className="flex items-center gap-3 mb-1">
                      <span
                        className="text-xl md:text-2xl font-extrabold tracking-tight"
                        style={{ color: '#D4A853', fontStyle: 'italic' }}
                      >
                        PER<span className="text-white/30">|</span>FORM
                      </span>
                      <span
                        className="text-[10px] font-bold font-mono px-2 py-0.5 rounded"
                        style={{ background: '#FFD700', color: '#0A0A0F' }}
                      >
                        V2.0
                      </span>
                    </motion.div>

                    <motion.h1
                      variants={heroItem}
                      className="text-6xl md:text-8xl font-extrabold leading-none mb-4"
                      style={{ color: '#FFD700', fontStyle: 'italic', letterSpacing: '-0.02em' }}
                    >
                      TOP 5
                    </motion.h1>

                    <motion.div
                      variants={heroItem}
                      className="text-lg md:text-xl font-extrabold tracking-[0.2em] mb-8"
                      style={{ color: 'white', fontFamily: 'system-ui' }}
                    >
                      {label} PROSPECTS
                    </motion.div>
                  </motion.div>

                  {/* Ranking bars */}
                  <motion.div
                    variants={barContainer}
                    initial="hidden"
                    animate="visible"
                    className="flex flex-col gap-2"
                  >
                    {top5.length > 0 ? (
                      top5.map((player, i) => (
                        <motion.div
                          key={player.id}
                          variants={barItem}
                          className="flex items-stretch rounded overflow-hidden"
                          style={{
                            transformOrigin: 'left center',
                          }}
                        >
                          {/* Rank number square */}
                          <div
                            className="w-14 md:w-16 flex items-center justify-center shrink-0"
                            style={{
                              background: i === 0 ? '#FFD700' : accentColor,
                            }}
                          >
                            <span
                              className="text-2xl md:text-3xl font-extrabold"
                              style={{
                                color: '#0A0A0F',
                                fontStyle: 'italic',
                              }}
                            >
                              {i + 1}
                            </span>
                          </div>

                          {/* Player info bar */}
                          <div
                            className="flex-1 px-4 py-3 flex flex-col justify-center"
                            style={{
                              background: `linear-gradient(90deg, ${i === 0 ? 'rgba(255,215,0,0.2)' : 'rgba(0,188,212,0.18)'} 0%, rgba(0,188,212,0.06) 100%)`,
                            }}
                          >
                            <div
                              className="text-base md:text-lg font-extrabold tracking-wide text-white"
                              style={{ fontFamily: 'system-ui', letterSpacing: '0.05em' }}
                            >
                              {player.name.toUpperCase()}
                            </div>
                            <div className="text-[11px] md:text-xs text-white/45 font-mono tracking-wider">
                              {player.school.toUpperCase()}
                              {player.projected_round ? ` \u2022 RD ${player.projected_round}` : ''}
                            </div>
                          </div>

                          {/* Grade badge (far right) */}
                          {player.grade && (
                            <div
                              className="w-14 md:w-16 flex items-center justify-center shrink-0"
                              style={{ background: 'rgba(0,0,0,0.3)' }}
                            >
                              <span className="text-sm font-extrabold font-mono" style={{ color: '#FFD700' }}>
                                {parseFloat(player.grade).toFixed(1)}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-white/30 font-mono text-sm py-8">
                        No {label.toLowerCase()} prospects ranked yet.
                      </div>
                    )}
                  </motion.div>

                  {/* Per|Form logo watermark in bottom-left */}
                  <div className="mt-8 flex items-center gap-2 opacity-40">
                    <img
                      src="/brand/perform-logo-dark.png"
                      alt="Per|Form"
                      className="w-5 h-5 object-contain"
                    />
                    <span className="text-[10px] font-mono text-white/50 tracking-[0.3em]">
                      PERFORM DRAFT INTELLIGENCE
                    </span>
                  </div>
                </div>

                {/* Right side: #1 player headshot */}
                <div className="hidden lg:flex relative w-80 items-end justify-center overflow-hidden">
                  {/* Gradient fade from left */}
                  <div
                    className="absolute inset-0 z-10 pointer-events-none"
                    style={{
                      background: 'linear-gradient(90deg, #0D4F4F 0%, transparent 40%)',
                    }}
                  />

                  {/* Subtle radial glow behind headshot */}
                  <div
                    className="absolute bottom-0 right-10 w-64 h-64 rounded-full z-0"
                    style={{
                      background: `radial-gradient(circle, ${accentColor}15 0%, transparent 70%)`,
                    }}
                  />

                  {headshotUrl ? (
                    <motion.img
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      src={headshotUrl}
                      alt={top5[0]?.name || 'Top prospect'}
                      className="relative z-20 w-56 h-auto object-contain drop-shadow-2xl"
                      style={{
                        filter: 'drop-shadow(0 0 30px rgba(0,188,212,0.2))',
                      }}
                    />
                  ) : top5.length > 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="relative z-20 w-44 h-56 rounded-lg flex items-center justify-center mb-4"
                      style={{ background: 'rgba(0,188,212,0.08)', border: '1px solid rgba(0,188,212,0.15)' }}
                    >
                      <div className="text-center">
                        <div className="text-5xl font-extrabold" style={{ color: accentColor, fontStyle: 'italic' }}>
                          #1
                        </div>
                        <div className="text-xs font-bold text-white/40 mt-2 tracking-wider">
                          {top5[0].name.split(' ').pop()?.toUpperCase()}
                        </div>
                      </div>
                    </motion.div>
                  ) : null}

                  {/* Bottom-right logo badge */}
                  <div className="absolute bottom-4 right-4 z-30 flex items-center gap-2">
                    <img
                      src="/brand/perform-logo-dark.png"
                      alt="Per|Form"
                      className="w-8 h-8 object-contain opacity-50"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── REST OF RANKINGS (below Top 5) ──── */}
            {rest.length > 0 && (
              <motion.section
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                className="mt-12"
              >
                <motion.h2
                  variants={fadeUp}
                  className="text-sm font-bold font-mono tracking-[0.3em] text-white/40 mb-6"
                >
                  REMAINING {label} PROSPECTS
                </motion.h2>

                <div className="grid gap-2">
                  {rest.map((player, i) => (
                    <motion.div
                      key={player.id}
                      variants={staggerItem}
                      className="flex items-center gap-4 rounded-lg px-5 py-3 transition-colors hover:bg-white/[0.03]"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      <span
                        className="w-8 h-8 flex items-center justify-center rounded text-xs font-extrabold shrink-0"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
                      >
                        {i + 6}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white/80 tracking-wide truncate">
                          {player.name.toUpperCase()}
                        </div>
                        <div className="text-[10px] text-white/30 font-mono truncate">
                          {player.school}
                          {player.projected_round ? ` \u2022 RD ${player.projected_round}` : ''}
                        </div>
                      </div>
                      {player.grade && (
                        <span className="text-xs font-mono font-bold text-white/30">
                          {parseFloat(player.grade).toFixed(1)}
                        </span>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
