'use client';

/**
 * Draft Results Page — Shareable Draft Summary
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { DraftGrade } from '@/components/draft/DraftGrade';
import { PickCard } from '@/components/draft/PickCard';
import { ShareCard, MiniShareButton } from '@/components/draft/ShareCard';
import { BackHomeNav } from '@/components/layout/BackHomeNav';
import type { SimulationState, DraftPick } from '@/lib/draft/types';

interface TeamGrade { abbr: string; grade: string; score: number; picks: DraftPick[]; summary: string; bestPick?: string; biggestReach?: string; }

function computeGrades(picks: DraftPick[]): TeamGrade[] {
  const byTeam = new Map<string, DraftPick[]>();
  for (const pick of picks) { const arr = byTeam.get(pick.team_abbr) || []; arr.push(pick); byTeam.set(pick.team_abbr, arr); }
  const grades: TeamGrade[] = [];
  for (const [abbr, teamPicks] of byTeam) {
    let totalScore = 0;
    for (const pick of teamPicks) {
      const base = pick.surprise_score !== undefined ? (100 - pick.surprise_score) : 70;
      totalScore += base * (pick.round <= 2 ? 1.5 : pick.round <= 4 ? 1.2 : 1.0);
    }
    const avg = totalScore / teamPicks.length;
    let grade: string;
    if (avg >= 95) grade = 'A+'; else if (avg >= 85) grade = 'A'; else if (avg >= 78) grade = 'A-';
    else if (avg >= 72) grade = 'B+'; else if (avg >= 65) grade = 'B'; else if (avg >= 58) grade = 'B-';
    else if (avg >= 50) grade = 'C+'; else if (avg >= 40) grade = 'C'; else grade = 'D';
    const valueCount = teamPicks.filter(p => (p.surprise_score || 0) < 30).length;
    const reachCount = teamPicks.filter(p => (p.surprise_score || 0) > 70).length;

    // Best pick = lowest surprise_score (best value)
    const sorted = [...teamPicks].sort((a, b) => (a.surprise_score ?? 50) - (b.surprise_score ?? 50));
    const bestPick = sorted[0]?.player_name;
    // Biggest reach = highest surprise_score
    const reachSorted = [...teamPicks].sort((a, b) => (b.surprise_score ?? 50) - (a.surprise_score ?? 50));
    const biggestReach = (reachSorted[0]?.surprise_score ?? 0) > 60 ? reachSorted[0]?.player_name : undefined;

    grades.push({ abbr, grade, score: Math.round(avg), picks: teamPicks,
      summary: `${teamPicks.length} picks. ${valueCount} value, ${reachCount} reaches.`,
      bestPick, biggestReach });
  }
  return grades.sort((a, b) => b.score - a.score);
}

export default function ResultsPage() {
  const params = useParams();
  const id = params.id as string;
  const [sim, setSim] = useState<SimulationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'grades' | 'board' | 'steals'>('grades');
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/draft/simulate/${id}`)
      .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
      .then(setSim).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, [id]);

  // Set OG meta tags dynamically
  useEffect(() => {
    if (!sim) return;
    const ogUrl = `/api/draft/og?team=NFL&grade=SIM&picks=&sim_id=${id}`;
    let ogTag = document.querySelector('meta[property="og:image"]') as HTMLMetaElement;
    if (!ogTag) {
      ogTag = document.createElement('meta');
      ogTag.setAttribute('property', 'og:image');
      document.head.appendChild(ogTag);
    }
    ogTag.content = `${window.location.origin}${ogUrl}`;

    let titleTag = document.querySelector('meta[property="og:title"]') as HTMLMetaElement;
    if (!titleTag) {
      titleTag = document.createElement('meta');
      titleTag.setAttribute('property', 'og:title');
      document.head.appendChild(titleTag);
    }
    titleTag.content = '2026 NFL Draft Simulation Results | Per|Form';

    let descTag = document.querySelector('meta[property="og:description"]') as HTMLMetaElement;
    if (!descTag) {
      descTag = document.createElement('meta');
      descTag.setAttribute('property', 'og:description');
      document.head.appendChild(descTag);
    }
    descTag.content = `${sim.picks.length} picks, ${sim.trades.length} trades. Simulated with Per|Form Draft AI.`;
  }, [sim, id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
      <div className="inline-block w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#D4A853' }} />
    </div>
  );

  if (error || !sim) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f', color: '#FFFFFF' }}>
      <div className="text-center">
        <h1 className="text-2xl font-black mb-2">Simulation Not Found</h1>
        <p className="text-white/40 text-sm mb-4">{error || 'This simulation may have expired.'}</p>
        <a href="/draft" className="text-sm text-amber-400 hover:underline">Back to Draft</a>
      </div>
    </div>
  );

  const grades = computeGrades(sim.picks);
  const steals = [...sim.picks].filter(p => (p.surprise_score || 0) > 50).sort((a, b) => (b.surprise_score || 0) - (a.surprise_score || 0));
  const bestValue = [...sim.picks].filter(p => (p.surprise_score || 0) < 20).sort((a, b) => (a.surprise_score || 0) - (b.surprise_score || 0));

  // Top graded team for the main share card
  const topTeam = grades[0];

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f', color: '#FFFFFF' }}>
      <div style={{ background: 'linear-gradient(180deg, rgba(15,15,22,1) 0%, rgba(10,10,15,1) 100%)', borderBottom: '1px solid rgba(212,168,83,0.15)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-3 mb-4">
            <BackHomeNav /><div className="h-6 w-px bg-white/10" />
            <span className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">Draft Results</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black">2026 NFL Draft Simulation</h1>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 text-xs text-white/40">
            <span>{sim.picks.length} picks</span><span>|</span><span>{sim.trades.length} trades</span><span>|</span><span>Chaos: {sim.chaos_factor}</span>
          </div>
          <button onClick={() => navigator.clipboard.writeText(window.location.href)}
            className="mt-3 px-4 py-1.5 text-[10px] font-bold tracking-wider uppercase rounded-lg bg-white/5 hover:bg-white/10 transition text-white/40">Copy Share Link</button>
        </div>
      </div>

      <div className="border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
          {([{ key: 'grades', label: 'Team Grades' }, { key: 'board', label: 'Full Board' }, { key: 'steals', label: 'Steals & Reaches' }] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className="px-4 py-3 text-xs font-bold tracking-wider uppercase transition-colors whitespace-nowrap"
              style={{ color: tab === t.key ? '#D4A853' : 'rgba(255,255,255,0.3)', borderBottom: tab === t.key ? '2px solid #D4A853' : '2px solid transparent' }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {tab === 'grades' && (
          <>
            {/* Featured Share Card for top team */}
            {topTeam && (
              <div className="mb-6">
                <div className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase mb-3">Share Your Results</div>
                <ShareCard
                  teamAbbr={topTeam.abbr}
                  teamName={topTeam.abbr}
                  grade={topTeam.grade}
                  picks={topTeam.picks}
                  bestPick={topTeam.bestPick}
                  biggestReach={topTeam.biggestReach}
                  simId={id}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {grades.map((g, idx) => (
                <motion.div key={g.abbr} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                  <div className="relative">
                    <DraftGrade teamAbbr={g.abbr} grade={g.grade} score={g.score} picks={g.picks} summary={g.summary} />
                    {/* Mini share button overlay */}
                    <div className="absolute top-3 right-3">
                      <MiniShareButton teamAbbr={g.abbr} grade={g.grade} simId={id} />
                    </div>
                  </div>
                  {/* Expandable share card per team */}
                  {expandedTeam === g.abbr ? (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2">
                      <ShareCard
                        teamAbbr={g.abbr}
                        teamName={g.abbr}
                        grade={g.grade}
                        picks={g.picks}
                        bestPick={g.bestPick}
                        biggestReach={g.biggestReach}
                        simId={id}
                      />
                      <button onClick={() => setExpandedTeam(null)} className="mt-1 text-[10px] text-white/20 hover:text-white/40">Close</button>
                    </motion.div>
                  ) : (
                    <button
                      onClick={() => setExpandedTeam(g.abbr)}
                      className="mt-1 text-[10px] text-white/20 hover:text-amber-400/60 transition-colors"
                    >
                      Share this team&apos;s grade
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </>
        )}
        {tab === 'board' && (
          <div className="space-y-6">
            {Array.from({ length: 7 }, (_, r) => r + 1).map(round => {
              const roundPicks = sim.picks.filter(p => p.round === round);
              if (roundPicks.length === 0) return null;
              return (
                <div key={round}>
                  <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-3">Round {round}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {roundPicks.map(pick => <PickCard key={pick.pick_number} pick={pick} />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {tab === 'steals' && (
          <div className="space-y-8">
            <div>
              <h3 className="text-[10px] font-bold tracking-[0.2em] text-green-400 uppercase mb-3">Best Value Picks</h3>
              {bestValue.length === 0 ? <p className="text-xs text-white/20">No standout value picks.</p> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{bestValue.slice(0, 10).map(p => <PickCard key={p.pick_number} pick={p} />)}</div>
              )}
            </div>
            <div>
              <h3 className="text-[10px] font-bold tracking-[0.2em] text-red-400 uppercase mb-3">Biggest Surprises</h3>
              {steals.length === 0 ? <p className="text-xs text-white/20">No major surprises.</p> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{steals.slice(0, 10).map(p => <PickCard key={p.pick_number} pick={p} />)}</div>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="py-6 text-center text-[10px] font-mono tracking-[0.25em] mt-8"
        style={{ background: 'rgba(15,15,22,1)', color: 'rgba(255,255,255,0.2)' }}>PER|FORM DRAFT SIMULATION · PUBLISHED BY ACHIEVEMOR</footer>
    </div>
  );
}
