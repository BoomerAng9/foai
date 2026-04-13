'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { GripVertical, Trophy } from 'lucide-react';
import type { StaffMember } from '@/lib/franchise/types';

interface StaffCardProps {
  staff: StaffMember;
  compact?: boolean;
  isDragOverlay?: boolean;
  onTapSelect?: (staff: StaffMember) => void;
}

export function StaffCard({ staff, compact = false, isDragOverlay, onTapSelect }: StaffCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `staff-${staff.id}`,
    data: { type: 'staff', staff },
  });

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
        borderLeft: '3px solid rgba(212,168,83,0.5)',
        background: isDragOverlay ? 'rgba(26,26,36,0.98)' : 'rgba(255,255,255,0.03)',
        boxShadow: isDragOverlay ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,168,83,0.3)' : 'none',
      }}
      className={`rounded-lg transition-all select-none ${
        compact ? 'px-2 py-1.5' : 'px-3 py-2.5'
      } ${isDragOverlay ? 'z-50' : 'hover:bg-white/[0.05]'}`}
      {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
      onClick={() => onTapSelect?.(staff)}
    >
      {compact ? (
        <div className="flex items-center gap-2 min-w-0">
          <GripVertical className="w-3 h-3 text-white/20 flex-shrink-0 hidden md:block" />
          <span className="text-[11px] font-bold text-white truncate">{staff.name}</span>
          {staff.scheme && (
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/80 flex-shrink-0 hidden sm:inline">
              {staff.scheme}
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-2.5">
          <GripVertical className="w-3.5 h-3.5 text-white/20 flex-shrink-0 mt-0.5 hidden md:block" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-bold text-white truncate">{staff.name}</span>
              {staff.scheme && (
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/80 flex-shrink-0">
                  {staff.scheme}
                </span>
              )}
            </div>
            <div className="text-[10px] text-white/40 mb-1">{staff.title}</div>
            {staff.record && (
              <div className="flex items-center gap-2 text-[10px]">
                <Trophy className="w-3 h-3 text-amber-500/50" />
                <span className="text-white/50">
                  {staff.record.wins}-{staff.record.losses}
                </span>
              </div>
            )}
            {staff.trackRecord && (
              <div className="text-[9px] text-amber-400/60 mt-0.5">{staff.trackRecord}</div>
            )}
            {staff.philosophy && (
              <div className="text-[9px] text-white/30 mt-0.5 italic">{staff.philosophy}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return isDragOverlay ? card : <motion.div whileHover={{ x: 2 }}>{card}</motion.div>;
}
