'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import { positionColor } from '@/lib/design/tokens';
import type { Player } from '@/lib/franchise/types';

interface PlayerCardProps {
  player: Player;
  compact?: boolean;
  teamColor?: string;
  isDragOverlay?: boolean;
  onTapSelect?: (player: Player) => void;
}

export function PlayerCard({ player, compact = false, teamColor, isDragOverlay, onTapSelect }: PlayerCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `player-${player.id}`,
    data: { type: 'player', player },
  });

  const pc = positionColor(player.position.replace(/[0-9]/g, ''));
  const style = isDragOverlay
    ? {}
    : {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.3 : 1,
      };

  const card = (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={{
        ...style,
        borderLeft: `3px solid ${teamColor || pc.primary}`,
        background: isDragOverlay ? 'rgba(26,26,36,0.98)' : 'rgba(255,255,255,0.03)',
        boxShadow: isDragOverlay ? `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${pc.primary}40` : 'none',
      }}
      className={`rounded-lg transition-all select-none ${
        compact ? 'px-2 py-1.5' : 'px-3 py-2'
      } ${isDragOverlay ? 'z-50' : 'hover:bg-white/[0.05]'}`}
      {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
      onClick={() => onTapSelect?.(player)}
    >
      {compact ? (
        /* Compact mode — inside a roster slot */
        <div className="flex items-center gap-2 min-w-0">
          <GripVertical className="w-3 h-3 text-white/20 flex-shrink-0 hidden md:block" />
          <span
            className="text-[9px] font-black px-1 py-0.5 rounded flex-shrink-0"
            style={{ background: `${pc.primary}25`, color: pc.primary }}
          >
            {player.position}
          </span>
          <span className="text-[11px] font-bold text-white truncate">{player.name}</span>
          <span className="text-[10px] font-mono text-white/30 flex-shrink-0 ml-auto">
            {player.overallRating}
          </span>
        </div>
      ) : (
        /* Expanded mode — inside the personnel pool */
        <div className="flex items-start gap-2.5">
          <GripVertical className="w-3.5 h-3.5 text-white/20 flex-shrink-0 mt-0.5 hidden md:block" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="text-[9px] font-black px-1.5 py-0.5 rounded"
                style={{ background: `${pc.primary}25`, color: pc.primary }}
              >
                {player.position}
              </span>
              <span className="text-xs font-bold text-white truncate">{player.name}</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-white/40">
              {player.school && <span>{player.school}</span>}
              {player.team && <span>{player.team}</span>}
              <span>Age {player.age}</span>
            </div>
            {player.contract && player.contract.perYear > 0 && (
              <div className="text-[9px] text-white/30 mt-0.5">
                {player.contract.years}yr / ${player.contract.perYear}M per
              </div>
            )}
          </div>
          <div className="flex flex-col items-end flex-shrink-0">
            <span className="text-sm font-black text-white/80">{player.overallRating}</span>
            <span className="text-[8px] text-white/30 uppercase tracking-wider">OVR</span>
          </div>
        </div>
      )}
    </div>
  );

  return isDragOverlay ? card : <motion.div whileHover={{ x: 2 }}>{card}</motion.div>;
}
