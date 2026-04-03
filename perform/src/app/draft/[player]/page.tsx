'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { TIEBadge } from '@/components/tie/TIEBadge';
import { getGradeForScore } from '@/lib/tie/grades';

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

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const gradeInfo = getGradeForScore(value);
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-mono text-white/50 w-28 shrink-0 uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: gradeInfo.badgeColor }} />
      </div>
      <span className="text-xs font-mono font-bold w-8 text-right" style={{ color: gradeInfo.badgeColor }}>
        {value.toFixed(0)}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2
        className="text-[10px] font-mono font-bold tracking-[0.2em] mb-3 pb-2"
        style={{ color: '#D4A853', borderBottom: '1px solid rgba(212,168,83,0.2)' }}
      >
        {title}
      </h2>
      {children}
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
        const res = await fetch(`/api/players?search=${encodeURIComponent(decodeURIComponent(player))}&limit=1`);
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

  const score = data?.grade ?? 0;
  const gradeInfo = getGradeForScore(score);

  // Derive component scores from the overall grade for the breakdown bars.
  // When the API provides real component data, swap these out.
  const perfScore = Math.min(Math.round(score * 0.42), 100);
  const attrScore = Math.min(Math.round(score * 0.33), 100);
  const intgScore = Math.min(Math.round(score * 0.25), 100);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F', color: '#fff' }}>
      <Header />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Back button */}
        <Link
          href="/draft"
          className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-wider mb-6 transition-colors"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          <span style={{ fontSize: 14 }}>&larr;</span> BACK TO DRAFT BOARD
        </Link>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <span className="text-xs font-mono text-white/30 animate-pulse">Loading player...</span>
          </div>
        ) : notFound || !data ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <p className="text-sm font-mono text-white/40">Player not found.</p>
            <Link
              href="/draft"
              className="text-xs font-mono px-4 py-2 transition-colors"
              style={{ color: '#D4A853', border: '1px solid rgba(212,168,83,0.3)' }}
            >
              RETURN TO DRAFT BOARD
            </Link>
          </div>
        ) : (
          <>
            {/* Hero */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-8">
              <TIEBadge score={score} grade={data.tie_grade ?? gradeInfo.grade} badgeColor={gradeInfo.badgeColor} size="lg" />
              <div>
                <h1 className="font-outfit text-2xl sm:text-3xl font-extrabold tracking-wide text-white">
                  {data.name}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-mono font-bold" style={{ color: gradeInfo.badgeColor }}>
                    {data.position}
                  </span>
                  <span className="text-sm text-white/40">&middot;</span>
                  <span className="text-sm text-white/50">{data.school}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  {data.projected_round && (
                    <span
                      className="text-[10px] font-mono font-bold tracking-wider px-2.5 py-1 rounded"
                      style={{ background: 'rgba(212,168,83,0.15)', color: '#D4A853', border: '1px solid rgba(212,168,83,0.25)' }}
                    >
                      PROJECTED: ROUND {data.projected_round}
                    </span>
                  )}
                  {data.overall_rank && (
                    <span className="text-[10px] font-mono text-white/30">
                      OVERALL #{data.overall_rank}
                    </span>
                  )}
                  {data.position_rank && (
                    <span className="text-[10px] font-mono text-white/30">
                      {data.position} #{data.position_rank}
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-mono mt-2" style={{ color: gradeInfo.badgeColor }}>
                  {gradeInfo.label} &mdash; {gradeInfo.draftContext}
                </p>
              </div>
            </div>

            {/* TIE Breakdown */}
            <Section title="TIE BREAKDOWN">
              <div className="flex flex-col gap-3">
                <ScoreBar label="Performance" value={perfScore} max={100} />
                <ScoreBar label="Attributes" value={attrScore} max={100} />
                <ScoreBar label="Intangibles" value={intgScore} max={100} />
              </div>
            </Section>

            {/* Scouting Summary */}
            {data.scouting_summary && (
              <Section title="SCOUTING SUMMARY">
                <p className="text-sm text-white/60 leading-relaxed">{data.scouting_summary}</p>
              </Section>
            )}

            {/* Strengths */}
            {data.strengths && (
              <Section title="STRENGTHS">
                <p className="text-sm text-white/60 leading-relaxed">{data.strengths}</p>
              </Section>
            )}

            {/* Weaknesses */}
            {data.weaknesses && (
              <Section title="WEAKNESSES">
                <p className="text-sm text-white/60 leading-relaxed">{data.weaknesses}</p>
              </Section>
            )}

            {/* NFL Comparison */}
            {data.nfl_comparison && (
              <Section title="NFL COMPARISON">
                <p className="text-sm font-mono font-bold" style={{ color: '#D4A853' }}>
                  {data.nfl_comparison}
                </p>
              </Section>
            )}

            {/* Analyst Notes */}
            {data.analyst_notes && (
              <Section title="ANALYST NOTES">
                <p className="text-sm text-white/60 leading-relaxed italic">{data.analyst_notes}</p>
              </Section>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
