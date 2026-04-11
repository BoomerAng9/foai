'use client';

/**
 * WarRoomPanel — Collapsible Dark Card
 * ======================================
 * Reusable panel for War Room sections with loading state and collapse toggle.
 */

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface WarRoomPanelProps {
  title: string;
  icon: string;
  children: ReactNode;
  defaultOpen?: boolean;
  loading?: boolean;
}

export default function WarRoomPanel({
  title,
  icon,
  children,
  defaultOpen = true,
  loading = false,
}: WarRoomPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        background: '#111',
        border: '1px solid #1E3A5F',
        borderLeftColor: open ? '#D4A853' : '#1E3A5F',
        borderLeftWidth: open ? 3 : 1,
      }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-bold tracking-wide uppercase" style={{ color: '#F4F6FA' }}>
            {title}
          </span>
        </div>
        <ChevronDown
          className="w-4 h-4 transition-transform"
          style={{
            color: '#8B94A8',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        />
      </button>

      {/* Body */}
      {open && (
        <div className="px-5 pb-5">
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="rounded animate-pulse"
                  style={{
                    height: 16,
                    width: `${70 + Math.random() * 30}%`,
                    background: '#1E3A5F',
                  }}
                />
              ))}
            </div>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}
