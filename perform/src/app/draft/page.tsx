'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PositionFilter } from '@/components/draft/PositionFilter';
import { GradeCard } from '@/components/tie/GradeCard';
import { getGradeForScore } from '@/lib/tie/grades';

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

export default function DraftBoardPage() {
  const [prospects, setProspects] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<SortBy>('rank');
  const [dataSource, setDataSource] = useState<'LIVE' | 'SEED' | null>(null);

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
    if (sortBy === 'grade') return (b.grade ?? 0) - (a.grade ?? 0);
    return a.name.localeCompare(b.name);
  });

  const SORT_OPTIONS: { key: SortBy; label: string }[] = [
    { key: 'rank', label: 'RANK' },
    { key: 'grade', label: 'GRADE' },
    { key: 'name', label: 'NAME' },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F', color: '#fff' }}>
      <Header />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h1 className="font-outfit text-2xl sm:text-3xl font-extrabold tracking-wide" style={{ color: '#D4A853' }}>
            2026 NFL DRAFT BOARD
          </h1>
          {dataSource && (
            <span
              className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest px-3 py-1 rounded-full self-start"
              style={{
                background: dataSource === 'LIVE' ? 'rgba(34,197,94,0.15)' : 'rgba(212,168,83,0.15)',
                color: dataSource === 'LIVE' ? '#22C55E' : '#D4A853',
                border: `1px solid ${dataSource === 'LIVE' ? 'rgba(34,197,94,0.3)' : 'rgba(212,168,83,0.3)'}`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: dataSource === 'LIVE' ? '#22C55E' : '#D4A853' }}
              />
              {dataSource === 'LIVE' ? 'LIVE DATA' : 'NO DATA'}
            </span>
          )}
        </div>

        {/* Filters + Sort */}
        <div className="flex flex-col gap-4 mb-6">
          <PositionFilter active={positionFilter} onFilter={setPositionFilter} />

          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-white/30 mr-1">SORT BY</span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className="px-3 py-1 text-[10px] font-mono font-bold tracking-wider transition-all"
                style={{
                  background: sortBy === opt.key ? '#D4A853' : 'transparent',
                  color: sortBy === opt.key ? '#0A0A0F' : 'rgba(255,255,255,0.4)',
                  border: `1px solid ${sortBy === opt.key ? '#D4A853' : 'rgba(255,255,255,0.1)'}`,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <span className="text-xs font-mono text-white/30 animate-pulse">Loading prospects...</span>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <p className="text-sm font-mono text-white/40">No prospects found.</p>
            <p className="text-xs font-mono text-white/20">
              Seed the database via <span style={{ color: '#D4A853' }}>POST /api/players</span> to populate the draft board.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {sorted.map((p) => {
              const score = p.grade ?? 0;
              const gradeInfo = getGradeForScore(score);
              return (
                <Link
                  key={p.id}
                  href={`/draft/${encodeURIComponent(p.name)}`}
                  className="block transition-all hover:scale-[1.01]"
                  style={{ textDecoration: 'none' }}
                >
                  <GradeCard
                    name={p.name}
                    position={p.position}
                    school={p.school}
                    tieScore={score}
                    tieGrade={p.tie_grade ?? gradeInfo.grade}
                    badgeColor={gradeInfo.badgeColor}
                    trend={p.trend ?? undefined}
                    projectedRound={p.projected_round ?? undefined}
                    label={gradeInfo.label}
                  />
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
