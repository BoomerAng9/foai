'use client';

import { useDroppable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { StaffCard } from './StaffCard';
import type { OrgChartNode, StaffMember } from '@/lib/franchise/types';

interface OrgChartProps {
  nodes: OrgChartNode[];
  onTapSelect?: (role: string) => void;
}

function OrgNode({
  node,
  onTapSelect,
}: {
  node: OrgChartNode;
  onTapSelect?: (role: string) => void;
}) {
  const { isOver, setNodeRef, active } = useDroppable({
    id: `org-${node.role}`,
    data: { type: 'org-slot', role: node.role },
  });

  const isDraggingStaff = active?.data?.current?.type === 'staff';
  const isHighlighted = isOver && isDraggingStaff;

  return (
    <motion.div
      ref={setNodeRef}
      onClick={() => onTapSelect?.(node.role)}
      animate={isHighlighted ? { scale: 1.03 } : { scale: 1 }}
      className={`rounded-xl transition-all min-w-[180px] ${
        isHighlighted ? 'ring-2 ring-amber-500/50' : ''
      }`}
      style={{
        background: isHighlighted
          ? 'rgba(212,168,83,0.08)'
          : node.staff
          ? 'rgba(255,255,255,0.03)'
          : 'rgba(255,255,255,0.015)',
        border: `1px solid ${
          isHighlighted
            ? 'rgba(212,168,83,0.4)'
            : node.staff
            ? 'rgba(255,255,255,0.08)'
            : 'rgba(255,255,255,0.04)'
        }`,
        boxShadow: isHighlighted
          ? '0 0 24px rgba(212,168,83,0.1)'
          : 'none',
      }}
    >
      {/* Role label */}
      <div
        className="px-3 py-1.5 rounded-t-xl"
        style={{
          background: 'rgba(255,255,255,0.02)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <span className="text-[9px] font-bold tracking-[0.15em] text-white/30 uppercase">
          {node.label}
        </span>
      </div>

      {/* Content */}
      <div className="p-2">
        {node.staff ? (
          <StaffCard staff={node.staff} compact />
        ) : (
          <div className="flex items-center justify-center py-3">
            <span className="text-[10px] text-white/15 italic">
              Empty — drag to fill
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function OrgChart({ nodes, onTapSelect }: OrgChartProps) {
  // Group by level
  const levels: Record<number, OrgChartNode[]> = {};
  for (const node of nodes) {
    if (!levels[node.level]) levels[node.level] = [];
    levels[node.level].push(node);
  }

  const sortedLevels = Object.keys(levels)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {sortedLevels.map((level) => (
        <div key={level} className="relative">
          {/* Connecting lines */}
          {level > 0 && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-6 -mt-6 bg-white/[0.06]" />
          )}

          <div className="flex flex-wrap justify-center gap-3">
            <AnimatePresence>
              {levels[level].map((node) => (
                <motion.div
                  key={node.role}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: level * 0.1 }}
                >
                  <OrgNode node={node} onTapSelect={onTapSelect} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Horizontal connector line between siblings */}
          {levels[level].length > 1 && (
            <div
              className="mx-auto mt-1"
              style={{
                width: `${Math.min(levels[level].length * 200, 800)}px`,
                height: '1px',
                background: 'rgba(255,255,255,0.04)',
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
