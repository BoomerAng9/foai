'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2 } from 'lucide-react';
import { PlayerCard } from './PlayerCard';
import { StaffCard } from './StaffCard';
import type { Player, StaffMember } from '@/lib/franchise/types';

type PoolTab = 'free_agents' | 'trade_block' | 'all';

interface PersonnelPoolProps {
  mode: 'players' | 'staff';
  players?: Player[];
  staff?: StaffMember[];
  positionFilters?: string[];
  loading?: boolean;
  /** Mobile tap-to-select handler (used on small screens instead of drag) */
  onTapSelect?: (item: Player | StaffMember) => void;
}

export function PersonnelPool({
  mode,
  players = [],
  staff = [],
  positionFilters = [],
  loading = false,
  onTapSelect,
}: PersonnelPoolProps) {
  const [tab, setTab] = useState<PoolTab>('free_agents');
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('ALL');

  const tabs: { key: PoolTab; label: string }[] = [
    { key: 'free_agents', label: 'Free Agents' },
    { key: 'trade_block', label: 'Trade Block' },
    { key: 'all', label: 'All Personnel' },
  ];

  const filteredPlayers = useMemo(() => {
    let list = players.filter((p) => {
      if (tab === 'free_agents') return p.available;
      if (tab === 'trade_block') return !p.available;
      return true;
    });
    if (posFilter !== 'ALL') {
      list = list.filter((p) => {
        const base = p.position.replace(/[0-9]/g, '').toUpperCase();
        return base === posFilter || p.position.toUpperCase() === posFilter;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.school && p.school.toLowerCase().includes(q)) ||
          (p.team && p.team.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => b.overallRating - a.overallRating);
  }, [players, tab, posFilter, search]);

  const filteredStaff = useMemo(() => {
    let list = staff.filter((s) => {
      if (tab === 'free_agents') return s.available;
      if (tab === 'trade_block') return !s.available;
      return true;
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.title.toLowerCase().includes(q) ||
          (s.scheme && s.scheme.toLowerCase().includes(q))
      );
    }
    return list;
  }, [staff, tab, search]);

  const count = mode === 'players' ? filteredPlayers.length : filteredStaff.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">
          Personnel Pool
        </h3>
        <span className="text-[10px] font-mono text-white/20">{count} available</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase rounded-md transition-all"
            style={{
              background: tab === t.key ? 'rgba(212,168,83,0.15)' : 'transparent',
              color: tab === t.key ? '#D4A853' : 'rgba(255,255,255,0.3)',
              border: `1px solid ${
                tab === t.key ? 'rgba(212,168,83,0.3)' : 'rgba(255,255,255,0.06)'
              }`,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
        <input
          type="text"
          placeholder={`Search ${mode === 'players' ? 'players' : 'staff'}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#FFFFFF',
          }}
        />
      </div>

      {/* Position filters (players only) */}
      {mode === 'players' && positionFilters.length > 0 && (
        <div className="flex gap-1 overflow-x-auto scrollbar-none mb-2 pb-1">
          {positionFilters.map((pos) => {
            const isActive = posFilter === pos;
            return (
              <button
                key={pos}
                onClick={() => setPosFilter(pos)}
                className="px-2 py-0.5 text-[9px] font-bold rounded whitespace-nowrap transition-all"
                style={{
                  background: isActive ? 'rgba(212,168,83,0.2)' : 'transparent',
                  color: isActive ? '#D4A853' : 'rgba(255,255,255,0.3)',
                  border: `1px solid ${
                    isActive ? 'rgba(212,168,83,0.3)' : 'rgba(255,255,255,0.06)'
                  }`,
                }}
              >
                {pos}
              </button>
            );
          })}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-none space-y-0.5">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {mode === 'players'
              ? filteredPlayers.map((p) => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <PlayerCard
                      player={p}
                      onTapSelect={onTapSelect as ((p: Player) => void) | undefined}
                    />
                  </motion.div>
                ))
              : filteredStaff.map((s) => (
                  <motion.div
                    key={s.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <StaffCard
                      staff={s}
                      onTapSelect={onTapSelect as ((s: StaffMember) => void) | undefined}
                    />
                  </motion.div>
                ))}
          </AnimatePresence>
        )}
        {!loading && count === 0 && (
          <div className="text-center py-8 text-[10px] text-white/20">
            No {mode === 'players' ? 'players' : 'staff'} match
          </div>
        )}
      </div>
    </div>
  );
}
