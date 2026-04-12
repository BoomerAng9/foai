'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { DraftPick } from '@/lib/draft/types';
import { PickCard } from './PickCard';

interface PickHistoryProps {
  picks: DraftPick[];
  onPickClick?: (pick: DraftPick) => void;
}

export function PickHistory({ picks, onPickClick }: PickHistoryProps) {
  const reversed = [...picks].reverse();
  return (
    <div className="flex flex-col h-full">
      <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-2">Pick History ({picks.length})</h3>
      <div className="flex-1 overflow-y-auto scrollbar-none space-y-1">
        <AnimatePresence>
          {reversed.map(pick => (
            <motion.div key={pick.pick_number} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <PickCard pick={pick} compact onClick={() => onPickClick?.(pick)} />
            </motion.div>
          ))}
        </AnimatePresence>
        {picks.length === 0 && <div className="text-center py-8 text-[10px] text-white/20 italic">Draft not started</div>}
      </div>
    </div>
  );
}
