'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Loader2 } from 'lucide-react';

interface SimulationButtonProps {
  label: string;
  onClick: () => Promise<void>;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function SimulationButton({ label, onClick, variant = 'primary', disabled }: SimulationButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading || disabled) return;
    setLoading(true);
    try {
      await onClick();
    } finally {
      setLoading(false);
    }
  };

  const isPrimary = variant === 'primary';

  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={handleClick}
      disabled={loading || disabled}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all ${
        disabled
          ? 'opacity-30 cursor-not-allowed'
          : isPrimary
          ? 'hover:shadow-lg hover:shadow-amber-500/10'
          : 'hover:bg-white/[0.06]'
      }`}
      style={{
        background: isPrimary
          ? 'linear-gradient(135deg, rgba(212,168,83,0.2), rgba(212,168,83,0.08))'
          : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isPrimary ? 'rgba(212,168,83,0.3)' : 'rgba(255,255,255,0.08)'}`,
        color: isPrimary ? '#D4A853' : 'rgba(255,255,255,0.6)',
      }}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Zap className="w-3.5 h-3.5" />
      )}
      {loading ? 'Simulating...' : label}
    </motion.button>
  );
}
