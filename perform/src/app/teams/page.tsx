'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BackHomeNav } from '@/components/layout/BackHomeNav';
import { heroStagger, heroItem, staggerContainer, staggerItem } from '@/lib/motion';

/* ── 32 NFL Teams ────────────────────────────────────── */
interface TeamInfo {
  name: string;
  abbrev: string;
  city: string;
  division: string;
  conference: 'AFC' | 'NFC';
  primary: string;
  secondary: string;
  picks: number;
  needs: string[];
}

const TEAMS: TeamInfo[] = [
  // AFC East
  { name: 'Bills', abbrev: 'BUF', city: 'Buffalo', division: 'East', conference: 'AFC', primary: '#00338D', secondary: '#C60C30', picks: 7, needs: ['WR', 'OL', 'DL'] },
  { name: 'Dolphins', abbrev: 'MIA', city: 'Miami', division: 'East', conference: 'AFC', primary: '#008E97', secondary: '#FC4C02', picks: 8, needs: ['OL', 'EDGE', 'LB'] },
  { name: 'Patriots', abbrev: 'NE', city: 'New England', division: 'East', conference: 'AFC', primary: '#002244', secondary: '#C60C30', picks: 10, needs: ['QB', 'WR', 'OL'] },
  { name: 'Jets', abbrev: 'NYJ', city: 'New York', division: 'East', conference: 'AFC', primary: '#125740', secondary: '#FFFFFF', picks: 7, needs: ['OL', 'CB', 'EDGE'] },
  // AFC North
  { name: 'Ravens', abbrev: 'BAL', city: 'Baltimore', division: 'North', conference: 'AFC', primary: '#241773', secondary: '#9E7C0C', picks: 8, needs: ['WR', 'CB', 'EDGE'] },
  { name: 'Bengals', abbrev: 'CIN', city: 'Cincinnati', division: 'North', conference: 'AFC', primary: '#FB4F14', secondary: '#000000', picks: 7, needs: ['OL', 'DL', 'LB'] },
  { name: 'Browns', abbrev: 'CLE', city: 'Cleveland', division: 'North', conference: 'AFC', primary: '#311D00', secondary: '#FF3C00', picks: 9, needs: ['QB', 'WR', 'CB'] },
  { name: 'Steelers', abbrev: 'PIT', city: 'Pittsburgh', division: 'North', conference: 'AFC', primary: '#FFB612', secondary: '#101820', picks: 7, needs: ['QB', 'OL', 'CB'] },
  // AFC South
  { name: 'Texans', abbrev: 'HOU', city: 'Houston', division: 'South', conference: 'AFC', primary: '#03202F', secondary: '#A71930', picks: 8, needs: ['EDGE', 'OL', 'S'] },
  { name: 'Colts', abbrev: 'IND', city: 'Indianapolis', division: 'South', conference: 'AFC', primary: '#002C5F', secondary: '#A2AAAD', picks: 9, needs: ['WR', 'CB', 'EDGE'] },
  { name: 'Jaguars', abbrev: 'JAX', city: 'Jacksonville', division: 'South', conference: 'AFC', primary: '#006778', secondary: '#9F792C', picks: 8, needs: ['OL', 'EDGE', 'WR'] },
  { name: 'Titans', abbrev: 'TEN', city: 'Tennessee', division: 'South', conference: 'AFC', primary: '#0C2340', secondary: '#4B92DB', picks: 10, needs: ['QB', 'OL', 'WR'] },
  // AFC West
  { name: 'Broncos', abbrev: 'DEN', city: 'Denver', division: 'West', conference: 'AFC', primary: '#FB4F14', secondary: '#002244', picks: 8, needs: ['WR', 'OL', 'CB'] },
  { name: 'Chiefs', abbrev: 'KC', city: 'Kansas City', division: 'West', conference: 'AFC', primary: '#E31837', secondary: '#FFB81C', picks: 7, needs: ['WR', 'EDGE', 'CB'] },
  { name: 'Raiders', abbrev: 'LV', city: 'Las Vegas', division: 'West', conference: 'AFC', primary: '#000000', secondary: '#A5ACAF', picks: 9, needs: ['QB', 'EDGE', 'CB'] },
  { name: 'Chargers', abbrev: 'LAC', city: 'Los Angeles', division: 'West', conference: 'AFC', primary: '#0080C6', secondary: '#FFC20E', picks: 8, needs: ['OL', 'EDGE', 'LB'] },
  // NFC East
  { name: 'Cowboys', abbrev: 'DAL', city: 'Dallas', division: 'East', conference: 'NFC', primary: '#003594', secondary: '#869397', picks: 7, needs: ['EDGE', 'OL', 'S'] },
  { name: 'Giants', abbrev: 'NYG', city: 'New York', division: 'East', conference: 'NFC', primary: '#0B2265', secondary: '#A71930', picks: 9, needs: ['QB', 'OL', 'EDGE'] },
  { name: 'Eagles', abbrev: 'PHI', city: 'Philadelphia', division: 'East', conference: 'NFC', primary: '#004C54', secondary: '#A5ACAF', picks: 7, needs: ['LB', 'S', 'CB'] },
  { name: 'Commanders', abbrev: 'WAS', city: 'Washington', division: 'East', conference: 'NFC', primary: '#5A1414', secondary: '#FFB612', picks: 8, needs: ['CB', 'DL', 'WR'] },
  // NFC North
  { name: 'Bears', abbrev: 'CHI', city: 'Chicago', division: 'North', conference: 'NFC', primary: '#0B162A', secondary: '#C83803', picks: 9, needs: ['OL', 'CB', 'WR'] },
  { name: 'Lions', abbrev: 'DET', city: 'Detroit', division: 'North', conference: 'NFC', primary: '#0076B6', secondary: '#B0B7BC', picks: 7, needs: ['DL', 'EDGE', 'CB'] },
  { name: 'Packers', abbrev: 'GB', city: 'Green Bay', division: 'North', conference: 'NFC', primary: '#203731', secondary: '#FFB612', picks: 8, needs: ['DL', 'S', 'EDGE'] },
  { name: 'Vikings', abbrev: 'MIN', city: 'Minnesota', division: 'North', conference: 'NFC', primary: '#4F2683', secondary: '#FFC62F', picks: 8, needs: ['OL', 'QB', 'CB'] },
  // NFC South
  { name: 'Falcons', abbrev: 'ATL', city: 'Atlanta', division: 'South', conference: 'NFC', primary: '#A71930', secondary: '#A5ACAF', picks: 8, needs: ['EDGE', 'DL', 'S'] },
  { name: 'Panthers', abbrev: 'CAR', city: 'Carolina', division: 'South', conference: 'NFC', primary: '#0085CA', secondary: '#101820', picks: 9, needs: ['OL', 'WR', 'EDGE'] },
  { name: 'Saints', abbrev: 'NO', city: 'New Orleans', division: 'South', conference: 'NFC', primary: '#D3BC8D', secondary: '#101820', picks: 7, needs: ['QB', 'WR', 'CB'] },
  { name: 'Buccaneers', abbrev: 'TB', city: 'Tampa Bay', division: 'South', conference: 'NFC', primary: '#D50A0A', secondary: '#FF7900', picks: 8, needs: ['DL', 'OL', 'S'] },
  // NFC West
  { name: 'Cardinals', abbrev: 'ARI', city: 'Arizona', division: 'West', conference: 'NFC', primary: '#97233F', secondary: '#FFB612', picks: 9, needs: ['OL', 'EDGE', 'CB'] },
  { name: 'Rams', abbrev: 'LAR', city: 'Los Angeles', division: 'West', conference: 'NFC', primary: '#003594', secondary: '#FFA300', picks: 7, needs: ['EDGE', 'OL', 'CB'] },
  { name: '49ers', abbrev: 'SF', city: 'San Francisco', division: 'West', conference: 'NFC', primary: '#AA0000', secondary: '#B3995D', picks: 8, needs: ['QB', 'OL', 'S'] },
  { name: 'Seahawks', abbrev: 'SEA', city: 'Seattle', division: 'West', conference: 'NFC', primary: '#002244', secondary: '#69BE28', picks: 8, needs: ['DL', 'OL', 'CB'] },
];

const DIVISIONS = ['East', 'North', 'South', 'West'] as const;

export default function TeamsPage() {
  const [search, setSearch] = useState('');
  const [confFilter, setConfFilter] = useState<'ALL' | 'AFC' | 'NFC'>('ALL');

  const filtered = TEAMS.filter((t) => {
    if (confFilter !== 'ALL' && t.conference !== confFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q) ||
        t.abbrev.toLowerCase().includes(q) ||
        t.needs.some(n => n.toLowerCase().includes(q))
      );
    }
    return true;
  });

  function groupByDivision(conf: 'AFC' | 'NFC') {
    return DIVISIONS.map((div) => ({
      division: `${conf} ${div}`,
      teams: filtered.filter((t) => t.conference === conf && t.division === div),
    })).filter((g) => g.teams.length > 0);
  }

  const conferences = confFilter === 'ALL'
    ? [
        ...groupByDivision('AFC'),
        ...groupByDivision('NFC'),
      ]
    : groupByDivision(confFilter);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F', color: '#fff' }}>
      <Header />

      <main className="flex-1 px-4 md:px-8 py-8 max-w-7xl mx-auto w-full">
        {/* Back + Home */}
        <div className="mb-6">
          <BackHomeNav />
        </div>

        {/* Header */}
        <motion.div
          variants={heroStagger}
          initial="hidden"
          animate="visible"
          className="text-center mb-10"
        >
          <motion.div
            variants={heroItem}
            className="inline-block px-4 py-1.5 mb-4 rounded-full"
            style={{ background: 'rgba(212,168,83,0.08)', border: '1px solid rgba(212,168,83,0.2)' }}
          >
            <span className="text-[10px] font-mono tracking-[0.3em]" style={{ color: '#D4A853' }}>
              2026 NFL DRAFT
            </span>
          </motion.div>
          <motion.h1
            variants={heroItem}
            className="font-outfit text-4xl md:text-6xl font-black tracking-tight text-white"
          >
            ALL 32 TEAMS
          </motion.h1>
          <motion.p
            variants={heroItem}
            className="mt-3 text-sm font-mono text-white/35"
          >
            Draft capital, top needs, and team profiles
          </motion.p>
          <motion.div
            variants={heroItem}
            className="mt-5 mx-auto w-48 h-[2px]"
            style={{ background: 'linear-gradient(90deg, transparent, #D4A853, transparent)' }}
          />
        </motion.div>

        {/* Search + Conference Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-8 max-w-xl mx-auto">
          <input
            type="text"
            placeholder="Search teams or positions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 w-full px-4 py-2.5 rounded-lg text-sm font-mono text-white placeholder-white/25 outline-none transition-colors focus:ring-1"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          />
          <div className="flex gap-2">
            {(['ALL', 'AFC', 'NFC'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setConfFilter(c)}
                className="px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all"
                style={{
                  background: confFilter === c ? 'rgba(212,168,83,0.15)' : 'rgba(255,255,255,0.03)',
                  color: confFilter === c ? '#D4A853' : 'rgba(255,255,255,0.4)',
                  border: confFilter === c ? '1px solid rgba(212,168,83,0.3)' : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Division Groups */}
        {conferences.map((group) => (
          <div key={group.division} className="mb-10">
            <h2
              className="text-xs font-mono font-bold tracking-[0.2em] mb-5 pl-1"
              style={{ color: '#D4A853' }}
            >
              {group.division.toUpperCase()}
            </h2>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {group.teams.map((team) => (
                <motion.div key={team.abbrev} variants={staggerItem}>
                  <Link
                    href={`/teams/${team.abbrev}`}
                    className="group block p-5 rounded-xl transition-all hover:scale-[1.02]"
                    style={{
                      background: `linear-gradient(135deg, ${team.primary}18, ${team.primary}08)`,
                      border: `1px solid ${team.primary}30`,
                    }}
                  >
                    {/* Team identity */}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center font-mono font-black text-sm"
                        style={{ background: team.primary, color: team.secondary || '#fff' }}
                      >
                        {team.abbrev}
                      </div>
                      <div>
                        <div className="font-outfit font-bold text-white text-sm group-hover:text-white/90 transition-colors">
                          {team.city} {team.name}
                        </div>
                        <div className="text-[10px] font-mono text-white/30">
                          {team.conference} {team.division}
                        </div>
                      </div>
                    </div>

                    {/* Draft picks */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] font-mono text-white/40 tracking-wider">DRAFT PICKS</span>
                      <span
                        className="text-sm font-mono font-bold px-2 py-0.5 rounded"
                        style={{ background: `${team.primary}25`, color: team.primary === '#000000' ? '#A5ACAF' : team.primary }}
                      >
                        {team.picks}
                      </span>
                    </div>

                    {/* Top needs */}
                    <div className="flex flex-wrap gap-1.5">
                      {team.needs.map((need) => (
                        <span
                          key={need}
                          className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            color: 'rgba(255,255,255,0.5)',
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          {need}
                        </span>
                      ))}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <span className="text-sm font-mono text-white/30">No teams match your search.</span>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
