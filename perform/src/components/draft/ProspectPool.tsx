'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Prospect } from '@/lib/draft/types';
import { positionColor } from '@/lib/design/tokens';

const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'OT', 'IOL', 'EDGE', 'DT', 'LB', 'CB', 'S'];

interface ProspectPoolProps {
  prospects: Prospect[];
  onSelect?: (prospect: Prospect) => void;
  selectable?: boolean;
}

export function ProspectPool({ prospects, onSelect, selectable }: ProspectPoolProps) {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = prospects;
    if (filter !== 'ALL') list = list.filter(p => p.position.toUpperCase() === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.school.toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.overall_rank - b.overall_rank);
  }, [prospects, filter, search]);

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-2">Prospect Pool ({prospects.length})</h3>
      <input type="text" placeholder="Search prospects..." value={search} onChange={e => setSearch(e.target.value)}
        className="w-full px-3 py-1.5 text-xs rounded-md mb-2 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#FFFFFF' }} />
      <div className="flex gap-1 overflow-x-auto scrollbar-none mb-2 pb-1">
        {POSITIONS.map(pos => {
          const isActive = filter === pos;
          const pc = positionColor(pos);
          return (
            <button key={pos} onClick={() => setFilter(pos)}
              className="px-2 py-0.5 text-[9px] font-bold rounded whitespace-nowrap transition-all"
              style={{ background: isActive ? pc.primary : 'transparent', color: isActive ? '#FFFFFF' : `${pc.primary}80`,
                border: `1px solid ${isActive ? pc.primary : 'rgba(255,255,255,0.06)'}` }}>{pos}</button>
          );
        })}
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-none space-y-0.5">
        {filtered.map(p => {
          const pc = positionColor(p.position);
          return (
            <motion.div key={p.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded transition-all ${selectable ? 'cursor-pointer hover:bg-white/5' : ''}`}
              style={{ borderLeft: `2px solid ${pc.primary}30` }}
              onClick={() => selectable && onSelect?.(p)} whileHover={selectable ? { x: 2 } : undefined}>
              <span className="text-[10px] font-mono text-white/30 w-6 text-right flex-shrink-0">{p.overall_rank}</span>
              <span className="text-[9px] font-black px-1 py-0.5 rounded flex-shrink-0" style={{ background: `${pc.primary}30`, color: pc.primary }}>{p.position}</span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">{p.name}</div>
                <div className="text-[10px] text-white/30 truncate">{p.school}</div>
              </div>
              <span className="text-[10px] font-mono text-white/20 flex-shrink-0">{p.tie_grade}</span>
            </motion.div>
          );
        })}
        {filtered.length === 0 && <div className="text-center py-8 text-[10px] text-white/20">No prospects match</div>}
      </div>
    </div>
  );
}
