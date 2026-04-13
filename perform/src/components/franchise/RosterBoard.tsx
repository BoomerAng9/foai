'use client';

import { useDroppable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerCard } from './PlayerCard';
import { FitScoreBadge } from './FitScoreBadge';
import type { RosterSlot, Player, SimulationResult } from '@/lib/franchise/types';
import { GROUP_LABELS } from '@/lib/franchise/positions';

interface RosterBoardProps {
  slots: RosterSlot[];
  teamColor?: string;
  result?: SimulationResult | null;
  onTapSelect?: (slotPosition: string) => void;
}

function DropSlot({
  slot,
  teamColor,
  onTapSelect,
}: {
  slot: RosterSlot;
  teamColor?: string;
  onTapSelect?: (pos: string) => void;
}) {
  const { isOver, setNodeRef, active } = useDroppable({
    id: `slot-${slot.position}`,
    data: { type: 'roster-slot', position: slot.position, group: slot.group },
  });

  const isDraggingPlayer = active?.data?.current?.type === 'player';
  const isHighlighted = isOver && isDraggingPlayer;

  return (
    <div
      ref={setNodeRef}
      onClick={() => onTapSelect?.(slot.position)}
      className={`rounded-lg transition-all min-h-[48px] ${
        isHighlighted ? 'ring-2 ring-amber-500/50 scale-[1.02]' : ''
      }`}
      style={{
        background: isHighlighted
          ? 'rgba(212,168,83,0.08)'
          : slot.player
          ? 'rgba(255,255,255,0.02)'
          : 'rgba(255,255,255,0.01)',
        border: `1px dashed ${
          isHighlighted
            ? 'rgba(212,168,83,0.5)'
            : slot.player
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(255,255,255,0.04)'
        }`,
      }}
    >
      {slot.player ? (
        <PlayerCard player={slot.player} compact teamColor={teamColor} />
      ) : (
        <div className="flex items-center justify-center h-full min-h-[48px] px-3">
          <div className="text-center">
            <div className="text-[10px] font-bold text-white/15 uppercase tracking-wider">
              {slot.position}
            </div>
            <div className="text-[8px] text-white/10">{slot.label}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function RosterBoard({ slots, teamColor, result, onTapSelect }: RosterBoardProps) {
  // Group slots
  const groups: Record<string, RosterSlot[]> = {};
  for (const slot of slots) {
    if (!groups[slot.group]) groups[slot.group] = [];
    groups[slot.group].push(slot);
  }

  return (
    <div className="space-y-6">
      {/* Impact badges */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-wrap gap-2"
          >
            <FitScoreBadge
              score={result.fitScore}
              label="Fit Score"
              size="md"
            />
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1"
              style={{
                background:
                  result.capImpact > 0
                    ? 'rgba(239,68,68,0.12)'
                    : 'rgba(34,197,94,0.12)',
                border: `1px solid ${
                  result.capImpact > 0
                    ? 'rgba(239,68,68,0.3)'
                    : 'rgba(34,197,94,0.3)'
                }`,
              }}
            >
              <span
                className="text-xs font-mono font-bold"
                style={{
                  color: result.capImpact > 0 ? '#EF4444' : '#22C55E',
                }}
              >
                Cap: {result.capImpact > 0 ? '+' : ''}${Math.abs(result.capImpact)}M
              </span>
            </div>
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1"
              style={{
                background:
                  result.winImpact >= 0
                    ? 'rgba(34,197,94,0.12)'
                    : 'rgba(239,68,68,0.12)',
                border: `1px solid ${
                  result.winImpact >= 0
                    ? 'rgba(34,197,94,0.3)'
                    : 'rgba(239,68,68,0.3)'
                }`,
              }}
            >
              <span
                className="text-xs font-mono font-bold"
                style={{
                  color: result.winImpact >= 0 ? '#22C55E' : '#EF4444',
                }}
              >
                Win Impact: {result.winImpact > 0 ? '+' : ''}
                {result.winImpact.toFixed(1)} wins
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Position groups */}
      {Object.entries(groups).map(([group, groupSlots]) => (
        <div key={group}>
          <h4 className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase mb-2">
            {GROUP_LABELS[group] || group}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {groupSlots.map((slot) => (
              <DropSlot
                key={slot.position}
                slot={slot}
                teamColor={teamColor}
                onTapSelect={onTapSelect}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
