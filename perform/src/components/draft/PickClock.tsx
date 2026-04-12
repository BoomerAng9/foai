'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getTeam } from '@/lib/draft/teams';
import { DRAFT_2026 } from '@/lib/draft/draft-rules-2026';

interface PickClockProps {
  teamAbbr: string;
  pickNumber: number;
  round: number;
  isActive: boolean;
  onTimeExpired?: () => void;
}

export function PickClock({ teamAbbr, pickNumber, round, isActive, onTimeExpired }: PickClockProps) {
  const team = getTeam(teamAbbr);
  const totalSeconds = (DRAFT_2026.pickTimers[round] || 5) * 60;
  const [seconds, setSeconds] = useState(totalSeconds);

  useEffect(() => { setSeconds(totalSeconds); }, [totalSeconds, pickNumber]);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) { onTimeExpired?.(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, onTimeExpired]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const pct = seconds / totalSeconds;
  const isUrgent = pct < 0.25;

  return (
    <div className="flex items-center gap-4 px-5 py-3 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
        style={{ background: team.primaryColor, color: team.textColor }}>{teamAbbr}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">ON THE CLOCK</span>
          <span className="text-[10px] font-mono text-white/30">Round {round} · Pick {pickNumber}</span>
        </div>
        <div className="text-sm font-bold text-white truncate">{team.name}</div>
        <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <motion.div className="h-full rounded-full"
            style={{ background: isUrgent ? '#EF4444' : team.primaryColor, width: `${pct * 100}%` }}
            animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.5 }} />
        </div>
      </div>
      <div className={`text-3xl font-black font-mono tabular-nums flex-shrink-0 ${isUrgent ? 'text-red-400 heartbeat' : 'text-white'}`}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>
    </div>
  );
}
