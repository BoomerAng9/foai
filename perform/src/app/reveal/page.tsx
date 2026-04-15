'use client';

/**
 * TIE Reveal Demo Page
 * =====================
 * Shows the TIE Engine reveal cards for the top 5 prospects.
 * Each card starts LOCKED, clicks to trigger ANALYZING, then REVEALED.
 */

import { useEffect, useState } from 'react';
import { TIERevealCard } from '@/components/cards/TIERevealCard';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

interface Player {
  id: number;
  name: string;
  position: string;
  school: string;
  grade: number;
  tie_grade: string;
  overall_rank: number;
  lockedUrl?: string;
  revealedUrl?: string;
}

export default function RevealDemoPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch top 5 players
    fetch('/api/players?limit=5')
      .then(r => r.json())
      .then(d => {
        const arr = Array.isArray(d) ? d : d.players || [];
        const mapped: Player[] = arr.slice(0, 5).map((p: Record<string, unknown>) => ({
          id: Number(p.id),
          name: String(p.name),
          position: String(p.position),
          school: String(p.school),
          grade: Number(p.grade),
          tie_grade: String(p.tie_grade || 'Ungraded'),
          overall_rank: Number(p.overall_rank),
          // Map to generated card files if they exist (will 404 gracefully otherwise)
          lockedUrl: `/generated/card/${String(p.name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-mythic-gold-locked.png`,
          revealedUrl: `/generated/card/${String(p.name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-mythic-gold-reveal.png`,
        }));
        setPlayers(mapped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--pf-bg)' }}>
      <Header />
      <main className="px-6 py-16 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-[10px] font-mono tracking-[0.3em] mb-3" style={{ color: '#D4A853' }}>
            PROSPECT INTELLIGENCE
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-4">
            TIE Engine Reveal
          </h1>
          <p className="text-white/50 max-w-2xl mx-auto">
            Every prospect starts as a classified file. Run the TIE analysis to unlock the grade,
            rank, and reveal the player. Three components — Talent, Intangibles, Execution — combine
            into the Per|Form score.
          </p>
        </div>

        {loading ? (
          <div className="text-white/40 text-center py-20">Loading top prospects…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
            {players.map((p, i) => (
              <div key={p.id} className="flex flex-col items-center">
                <div className="text-[9px] font-mono text-white/30 tracking-[0.2em] mb-3">
                  FILE #{(i + 1).toString().padStart(3, '0')}
                </div>
                <TIERevealCard
                  player={{
                    name: p.name,
                    position: p.position,
                    school: p.school,
                    grade: p.grade,
                    tieGrade: p.tie_grade,
                    rank: p.overall_rank || i + 1,
                  }}
                  lockedImageUrl={p.lockedUrl || '/brand/perform-logo-dark.png'}
                  revealedImageUrl={p.revealedUrl || '/brand/perform-logo-dark.png'}
                />
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-16 text-[10px] font-mono text-white/30 tracking-[0.2em]">
          TALENT · INTANGIBLES · EXECUTION · PER|FORM
        </div>
      </main>
      <Footer />
    </div>
  );
}
