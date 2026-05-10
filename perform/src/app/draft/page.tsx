'use client';

/**
 * /draft — Live NFL Draft Hub (2026)
 * =====================================
 * Kills the simulation modes that previously lived here (user directive
 * 2026-04-23, "kill this simulation all together"). This page is now the
 * live draft landing: countdown, real Neon-backed top 5, links to the
 * real product surfaces.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { positionColor } from '@/lib/ui/positions';

interface PlayerPreview {
  id: number;
  name: string;
  school: string;
  position: string;
  overall_rank: number | null;
  grade: string | number | null;
  tie_tier: string | null;
  projected_round: number | null;
  nfl_comparison: string | null;
  image_url?: string | null;
}

// Draft night target — keep in sync with landing
const DRAFT_AT = new Date('2026-04-23T20:00:00-04:00').getTime();

function useCountdown() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, DRAFT_AT - Date.now() + tick * 0);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s, live: diff === 0 };
}

export default function DraftPage() {
  const [top, setTop] = useState<PlayerPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const cd = useCountdown();

  useEffect(() => {
    fetch('/api/players?limit=5&sort=overall_rank:asc')
      .then((r) => r.json())
      .then((j) => {
        setTop((j.players || []).slice(0, 5));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--pf-bg)', color: 'var(--pf-ink)', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden" style={{ borderBottom: '1px solid var(--pf-line)' }}>
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 60% 40%, rgba(43,127,255,0.18) 0%, transparent 60%), linear-gradient(180deg, var(--pf-bg) 0%, var(--pf-panel) 100%)',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-6 py-14">
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 items-start">
            {/* Left: title */}
            <div>
              <div
                className="flex items-center gap-2 mb-3"
                style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: 10, letterSpacing: '0.2em' }}
              >
                <span className="w-2 h-2 rounded-full live-pulse" style={{ background: 'var(--pf-red)' }} />
                <span style={{ color: 'var(--pf-accent-ink)' }}>2026 NFL DRAFT · PITTSBURGH</span>
              </div>
              <h1
                style={{
                  fontFamily: 'var(--font-barlow), "Barlow Condensed", sans-serif',
                  fontWeight: 900,
                  fontSize: 'clamp(56px, 10vw, 120px)',
                  lineHeight: 0.88,
                  letterSpacing: '-0.02em',
                  textTransform: 'uppercase',
                }}
              >
                Draft
                <br />
                <span style={{ color: 'var(--pf-accent)' }}>Night</span>
              </h1>
              <p className="text-base mt-5 max-w-xl leading-relaxed" style={{ color: 'var(--pf-ink-dim)' }}>
                The 2026 class, graded through the Per|Form TIE engine across Performance · Attributes · Intangibles. No simulations — just the real board.
              </p>
              <div className="flex gap-2 mt-6">
                <Link
                  href="/rankings"
                  className="inline-flex items-center px-4 py-2.5 rounded-sm transition-colors"
                  style={{
                    fontFamily: 'var(--font-jetbrains), monospace',
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    background: 'var(--pf-accent)',
                    color: '#fff',
                  }}
                >
                  View Big Board
                </Link>
                <Link
                  href="/draft/center"
                  className="inline-flex items-center px-4 py-2.5 rounded-sm transition-colors"
                  style={{
                    fontFamily: 'var(--font-jetbrains), monospace',
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    border: '1px solid var(--pf-line)',
                    color: 'var(--pf-ink)',
                  }}
                >
                  Live Pick Tracker
                </Link>
              </div>
            </div>

            {/* Right: countdown */}
            <div
              className="rounded-sm p-5 backdrop-blur"
              style={{ background: 'rgba(14,21,36,0.85)', border: '1px solid var(--pf-line)' }}
            >
              <div
                className="text-center mb-3"
                style={{
                  fontFamily: 'var(--font-jetbrains), monospace',
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  color: 'var(--pf-ink-dim)',
                }}
              >
                {cd.live ? 'ON THE CLOCK' : 'TIME TO FIRST PICK'}
              </div>
              <div className="grid grid-cols-4 gap-3 text-center">
                {[
                  { n: cd.d, l: 'DAYS' },
                  { n: cd.h, l: 'HRS' },
                  { n: cd.m, l: 'MIN' },
                  { n: cd.s, l: 'SEC' },
                ].map((b) => (
                  <div key={b.l}>
                    <div
                      style={{
                        fontFamily: 'var(--font-barlow), "Barlow Condensed", sans-serif',
                        fontWeight: 800,
                        fontSize: 44,
                        lineHeight: 1,
                        color: 'var(--pf-ink)',
                      }}
                    >
                      {pad(b.n)}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-jetbrains), monospace',
                        fontSize: 9,
                        letterSpacing: '0.18em',
                        color: 'var(--pf-ink-dim)',
                        marginTop: 4,
                      }}
                    >
                      {b.l}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TOP 5 REAL 2026 PROSPECTS */}
      <section className="max-w-6xl mx-auto w-full px-6 py-10">
        <div className="flex items-center gap-3 mb-5">
          <div style={{ width: 4, height: 18, background: 'var(--pf-accent)' }} />
          <h2
            style={{
              fontFamily: 'var(--font-barlow), "Barlow Condensed", sans-serif',
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--pf-ink)',
            }}
          >
            Per|Form Top 5
          </h2>
          <span
            style={{
              fontFamily: 'var(--font-jetbrains), monospace',
              fontSize: 10,
              letterSpacing: '0.2em',
              color: 'var(--pf-ink-dim)',
              marginLeft: 'auto',
              textTransform: 'uppercase',
            }}
          >
            2026 Class · TIE Graded
          </span>
        </div>

        <div
          className="rounded-sm overflow-hidden"
          style={{ background: 'var(--pf-panel)', border: '1px solid var(--pf-line)' }}
        >
          {loading ? (
            <div
              className="text-center py-12"
              style={{
                fontFamily: 'var(--font-jetbrains), monospace',
                fontSize: 11,
                color: 'var(--pf-ink-faint)',
                letterSpacing: '0.14em',
              }}
            >
              LOADING BOARD…
            </div>
          ) : (
            top.map((p, i) => {
              const accent = positionColor(p.position);
              const grade = typeof p.grade === 'number' ? p.grade.toFixed(1) : parseFloat(String(p.grade || '0')).toFixed(1);
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                >
                  <Link
                    href={`/draft/${encodeURIComponent(p.name)}`}
                    className="grid items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.02]"
                    style={{
                      gridTemplateColumns: '36px 44px 1fr 80px 70px 90px',
                      borderBottom: i < top.length - 1 ? '1px solid var(--pf-line-soft)' : 'none',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-jetbrains), monospace',
                        fontWeight: 700,
                        fontSize: 12,
                        color: 'var(--pf-ink-dim)',
                      }}
                    >
                      #{p.overall_rank}
                    </span>
                    <div
                      className="rounded-full overflow-hidden"
                      style={{
                        width: 36,
                        height: 36,
                        background: 'var(--pf-panel-3)',
                        border: '1px solid var(--pf-line)',
                      }}
                    >
                      {p.image_url && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={p.image_url}
                          alt={p.name}
                          style={{ width: 36, height: 36, objectFit: 'cover', objectPosition: 'center 18%' }}
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          color: 'var(--pf-ink)',
                        }}
                      >
                        {p.name}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-jetbrains), monospace',
                          fontSize: 10,
                          letterSpacing: '0.08em',
                          color: 'var(--pf-ink-faint)',
                          marginTop: 2,
                        }}
                      >
                        {p.school}
                      </div>
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--font-jetbrains), monospace',
                        fontSize: 10,
                        letterSpacing: '0.14em',
                        color: accent,
                      }}
                    >
                      {p.position}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-barlow), "Barlow Condensed", sans-serif',
                        fontWeight: 800,
                        fontSize: 18,
                        color: 'var(--pf-ink)',
                        textAlign: 'right',
                      }}
                    >
                      {grade}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-jetbrains), monospace',
                        fontSize: 10,
                        letterSpacing: '0.14em',
                        color: 'var(--pf-ink-dim)',
                        textAlign: 'right',
                      }}
                    >
                      {p.tie_tier?.replace('_PLUS', '+').replace('_MINUS', '-') || '—'}
                    </span>
                  </Link>
                </motion.div>
              );
            })
          )}
        </div>

        <div className="mt-5 text-center">
          <Link
            href="/rankings"
            className="inline-block"
            style={{
              fontFamily: 'var(--font-jetbrains), monospace',
              fontSize: 11,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--pf-accent-ink)',
              textDecoration: 'none',
              borderBottom: '1px solid var(--pf-accent-ink)',
              paddingBottom: 2,
            }}
          >
            View All 2026 Prospects →
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
