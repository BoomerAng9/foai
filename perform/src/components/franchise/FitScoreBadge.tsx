'use client';

import { motion } from 'framer-motion';

interface FitScoreBadgeProps {
  score: number;
  label?: string;
  size?: 'sm' | 'md';
}

export function FitScoreBadge({ score, label, size = 'sm' }: FitScoreBadgeProps) {
  const color = score >= 80 ? '#22C55E' : score >= 50 ? '#F59E0B' : '#EF4444';
  const bg = score >= 80 ? 'rgba(34,197,94,0.12)' : score >= 50 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)';

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center gap-1 rounded-full ${
        size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1'
      }`}
      style={{ background: bg, border: `1px solid ${color}30` }}
      title={label}
    >
      <div
        className={`rounded-full ${size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'}`}
        style={{ background: color }}
      />
      <span
        className={`font-mono font-bold ${
          size === 'sm' ? 'text-[10px]' : 'text-xs'
        }`}
        style={{ color }}
      >
        {score}
      </span>
      {label && (
        <span className="text-[9px] text-white/40 ml-0.5">{label}</span>
      )}
    </motion.div>
  );
}
