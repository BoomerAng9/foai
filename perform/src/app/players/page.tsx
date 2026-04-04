'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

interface Player {
  id: number;
  name: string;
  school: string;
  position: string;
  overall_rank: number;
  tie_grade: string;
  grade: string;
  projected_round: number;
  nfl_comparison: string;
}

const POSITION_GROUPS = ['QB', 'RB', 'WR', 'TE', 'OL', 'EDGE', 'DL', 'LB', 'CB', 'S'] as const;

const POSITION_MAP: Record<string, string> = {
  QB: 'QB',
  RB: 'RB',
  WR: 'WR',
  TE: 'TE',
  OL: 'OL', OT: 'OL', OG: 'OL', C: 'OL', IOL: 'OL',
  EDGE: 'EDGE', DE: 'EDGE',
  DL: 'DL', DT: 'DL', NT: 'DL', IDL: 'DL',
  LB: 'LB', ILB: 'LB', OLB: 'LB',
  CB: 'CB',
  S: 'S', FS: 'S', SS: 'S',
};

function normalizePosition(pos: string): string {
  return POSITION_MAP[pos?.toUpperCase()] || pos?.toUpperCase() || 'OTHER';
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function PlayerIndexPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    fetch('/api/players?limit=500&sort=overall_rank:asc')
      .then(r => r.json())
      .then(d => {
        setPlayers(d.players || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return players;
    const q = search.toLowerCase();
    return players.filter(p => p.name.toLowerCase().includes(q));
  }, [players, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, Player[]> = {};
    for (const g of POSITION_GROUPS) groups[g] = [];
    for (const p of filtered) {
      const norm = normalizePosition(p.position);
      if (groups[norm]) {
        groups[norm].push(p);
      } else {
        if (!groups['OTHER']) groups['OTHER'] = [];
        groups['OTHER'].push(p);
      }
    }
    return groups;
  }, [filtered]);

  function scrollToLetter(letter: string) {
    const target = filtered.find(p => p.name.toUpperCase().startsWith(letter));
    if (!target) return;
    const norm = normalizePosition(target.position);
    const el = groupRefs.current[norm];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
      <Header />

      <div className="flex-1 flex">
        {/* Main content */}
        <main className="flex-1 px-4 md:px-8 py-8 max-w-6xl mx-auto w-full">
          <h1 className="font-outfit text-3xl md:text-4xl font-extrabold tracking-wide mb-6" style={{ color: '#D4A853' }}>
            PLAYER INDEX
          </h1>

          {/* Search */}
          <div className="mb-8">
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full max-w-md px-4 py-2.5 rounded text-sm font-mono focus:outline-none focus:ring-1"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(212,168,83,0.25)',
                color: '#FFFFFF',
                caretColor: '#D4A853',
              }}
            />
          </div>

          {loading && (
            <p className="text-sm font-mono text-white/30 animate-pulse">Loading players...</p>
          )}

          {/* Position Groups */}
          {POSITION_GROUPS.map(group => {
            const list = grouped[group];
            if (!list || list.length === 0) return null;
            return (
              <div
                key={group}
                ref={el => { groupRefs.current[group] = el; }}
                className="mb-8"
              >
                {/* Group header */}
                <div
                  className="flex items-center justify-between px-4 py-2.5 rounded-t mb-px"
                  style={{ background: 'rgba(212,168,83,0.1)', borderLeft: '3px solid #D4A853' }}
                >
                  <span className="font-outfit text-sm font-extrabold tracking-wider" style={{ color: '#D4A853' }}>
                    {group}
                  </span>
                  <span className="text-xs font-mono text-white/30">{list.length} PLAYERS</span>
                </div>

                {/* Table header */}
                <div
                  className="grid gap-2 px-4 py-2 text-[10px] font-mono tracking-wider"
                  style={{
                    gridTemplateColumns: '40px 1fr 1fr 70px 70px 1fr',
                    color: 'rgba(255,255,255,0.25)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <span>RK</span>
                  <span>NAME</span>
                  <span>SCHOOL</span>
                  <span>TIE</span>
                  <span>RD</span>
                  <span>NFL COMP</span>
                </div>

                {/* Player rows */}
                {list.map(player => (
                  <div
                    key={player.id}
                    className="grid gap-2 px-4 py-2.5 items-center transition-colors hover:bg-white/[0.03]"
                    style={{
                      gridTemplateColumns: '40px 1fr 1fr 70px 70px 1fr',
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                    }}
                  >
                    <span className="font-mono text-xs text-white/25">{player.overall_rank || '-'}</span>
                    <Link
                      href={`/draft/${encodeURIComponent(player.name)}`}
                      className="font-outfit text-sm font-bold text-white hover:underline truncate"
                      style={{ textDecorationColor: '#D4A853' }}
                    >
                      {player.name}
                    </Link>
                    <span className="font-mono text-xs text-white/40 truncate">{player.school}</span>
                    <span className="font-mono text-xs font-bold" style={{ color: '#D4A853' }}>
                      {player.tie_grade || player.grade || '-'}
                    </span>
                    <span className="font-mono text-xs text-white/40">RD {player.projected_round || '?'}</span>
                    <span className="font-mono text-[11px] text-white/30 truncate">{player.nfl_comparison || '-'}</span>
                  </div>
                ))}
              </div>
            );
          })}

          {!loading && filtered.length === 0 && (
            <p className="text-sm font-mono text-white/30 mt-8">No players found.</p>
          )}
        </main>

        {/* Alphabet sidebar */}
        <aside className="hidden md:flex flex-col items-center justify-center gap-0.5 px-2 py-4 sticky top-0 h-screen">
          {ALPHABET.map(letter => (
            <button
              key={letter}
              onClick={() => scrollToLetter(letter)}
              className="text-[10px] font-mono w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-white/10"
              style={{ color: 'rgba(212,168,83,0.5)' }}
            >
              {letter}
            </button>
          ))}
        </aside>
      </div>

      <Footer />
    </div>
  );
}
