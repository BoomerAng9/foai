'use client';

import { motion } from 'framer-motion';
import type { DraftPick } from '@/lib/draft/types';
import { getTeam } from '@/lib/draft/teams';

interface PickCardProps {
  pick: DraftPick;
  compact?: boolean;
  onClick?: () => void;
  animate?: boolean;
}

export function PickCard({ pick, compact, onClick, animate = true }: PickCardProps) {
  const team = getTeam(pick.team_abbr);
  const Wrapper = animate ? motion.div : 'div';
  const animProps = animate ? {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.3 },
  } : {};

  if (compact) {
    return (
      <Wrapper
        {...(animProps as Record<string, unknown>)}
        className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:brightness-110 transition-all"
        style={{ background: `${team.primaryColor}20`, borderLeft: `3px solid ${team.primaryColor}` }}
        onClick={onClick}
      >
        <span className="text-[10px] font-mono font-bold text-white/50 w-6 text-right">{pick.pick_number}</span>
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black flex-shrink-0"
          style={{ background: team.primaryColor, color: team.textColor }}>{pick.team_abbr}</div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-white truncate">{pick.player_name}</div>
          <div className="text-[10px] text-white/40">{pick.position} · {pick.school}</div>
        </div>
        {pick.is_trade && (
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">TRADE</span>
        )}
      </Wrapper>
    );
  }

  return (
    <Wrapper
      {...(animProps as Record<string, unknown>)}
      className="group relative rounded-lg overflow-hidden cursor-pointer hover:ring-1 hover:ring-white/20 transition-all"
      style={{ background: `${team.primaryColor}15`, border: `1px solid ${team.primaryColor}30` }}
      onClick={onClick}
    >
      <div className="h-1" style={{ background: team.primaryColor }} />
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-black"
              style={{ background: team.primaryColor, color: team.textColor }}>{pick.team_abbr}</div>
            <div>
              <div className="text-[10px] font-mono text-white/40">R{pick.round} · P{pick.pick_in_round}</div>
              <div className="text-[10px] text-white/60">{pick.team}</div>
            </div>
          </div>
          <span className="text-lg font-black font-mono text-white/30">#{pick.pick_number}</span>
        </div>
        <div className="text-sm font-bold text-white">{pick.player_name}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded"
            style={{ background: `${team.primaryColor}40`, color: team.primaryColor }}>{pick.position}</span>
          <span className="text-[10px] text-white/40">{pick.school}</span>
        </div>
        {pick.analysis && <p className="text-[10px] text-white/30 mt-2 line-clamp-2">{pick.analysis}</p>}
        {pick.is_trade && (
          <div className="mt-2 px-2 py-1 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">TRADED PICK</div>
        )}
        {pick.surprise_score !== undefined && pick.surprise_score > 60 && (
          <div className="mt-1 text-[10px] font-bold text-red-400">SURPRISE PICK ({pick.surprise_score})</div>
        )}
      </div>
    </Wrapper>
  );
}
