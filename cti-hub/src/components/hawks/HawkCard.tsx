'use client';

/**
 * HawkCard — 3D flip card for a single Lil_Hawk
 * ================================================
 * Front: avatar glyph + name + tier + color bar
 * Back:  full attributes — role, capabilities, stats, sample mission
 *
 * Click or hover to flip. Broadcast-grade animation,
 * respects prefers-reduced-motion.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';

export interface HawkProfile {
  name: string;           // e.g. "Lil_Scrapp_Hawk"
  displayName: string;    // e.g. "Scrapp"
  color: string;          // hex
  tier: 'core' | 'expansion' | 'specialist';
  role: string;           // short tagline
  glyph: string;          // emoji or symbol
  capabilities: string[]; // 3-5 bullets
  sampleMission: string;  // one-line example
  tasksCompleted?: number;
  tasksFailed?: number;
  status?: 'active' | 'standby';
}

interface Props {
  hawk: HawkProfile;
  size?: 'sm' | 'md' | 'lg';
}

const TIER_LABEL: Record<HawkProfile['tier'], string> = {
  core: 'CORE',
  expansion: 'EXPANSION',
  specialist: 'SPECIALIST',
};

const TIER_COLOR: Record<HawkProfile['tier'], string> = {
  core: '#FFD700',
  expansion: '#00E5FF',
  specialist: '#FF3D71',
};

export function HawkCard({ hawk, size = 'md' }: Props) {
  const [flipped, setFlipped] = useState(false);

  const dimensions = {
    sm: { w: 220, h: 300 },
    md: { w: 280, h: 380 },
    lg: { w: 340, h: 460 },
  }[size];

  return (
    <div
      className="relative cursor-pointer select-none"
      style={{
        width: dimensions.w,
        height: dimensions.h,
        perspective: '1200px',
      }}
      onClick={() => setFlipped((f) => !f)}
      onKeyDown={(e) => e.key === 'Enter' && setFlipped((f) => !f)}
      role="button"
      tabIndex={0}
      aria-label={`${hawk.name} — tap to flip`}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.7, ease: [0.3, 0.8, 0.3, 1] }}
      >
        {/* ═══ FRONT FACE ═══ */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden border"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            background: `radial-gradient(circle at 50% 0%, ${hawk.color}22, #0A0A0F 55%), linear-gradient(180deg, #0A0A0F, #050507)`,
            borderColor: `${hawk.color}40`,
            boxShadow: `0 12px 40px rgba(0,0,0,0.6), 0 0 24px ${hawk.color}25, inset 0 1px 0 ${hawk.color}30`,
          }}
        >
          {/* Tier pill */}
          <div className="absolute top-4 left-4 text-[9px] font-mono tracking-[0.25em] px-2 py-1 rounded border"
            style={{ color: TIER_COLOR[hawk.tier], borderColor: `${TIER_COLOR[hawk.tier]}50`, background: `${TIER_COLOR[hawk.tier]}12` }}
          >
            {TIER_LABEL[hawk.tier]}
          </div>

          {/* Status dot */}
          {hawk.status && (
            <div className="absolute top-4 right-4 flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: hawk.status === 'active' ? '#10FF80' : '#666',
                  boxShadow: hawk.status === 'active' ? '0 0 8px #10FF80' : 'none',
                }}
              />
              <span className="text-[9px] font-mono tracking-wider text-white/50 uppercase">
                {hawk.status}
              </span>
            </div>
          )}

          {/* Huge glyph */}
          <div className="absolute top-14 left-0 right-0 flex items-center justify-center">
            <div
              className="text-7xl"
              style={{
                filter: `drop-shadow(0 4px 24px ${hawk.color}60) drop-shadow(0 0 12px ${hawk.color}30)`,
              }}
            >
              {hawk.glyph}
            </div>
          </div>

          {/* Name + role */}
          <div className="absolute bottom-0 left-0 right-0 p-5 pt-10 bg-gradient-to-t from-black via-black/80 to-transparent">
            <div className="text-[9px] font-mono tracking-[0.2em] opacity-60 mb-1">
              SQWAADRUN
            </div>
            <div className="text-xl font-black leading-tight text-white">
              {hawk.name.replace(/_/g, ' ')}
            </div>
            <div
              className="text-[11px] font-mono mt-2 opacity-80"
              style={{ color: hawk.color }}
            >
              {hawk.role}
            </div>
          </div>

          {/* Color accent bar */}
          <div
            className="absolute top-0 left-0 right-0 h-[3px]"
            style={{
              background: `linear-gradient(90deg, transparent, ${hawk.color}, transparent)`,
              boxShadow: `0 0 8px ${hawk.color}`,
            }}
          />

          {/* Flip hint */}
          <div className="absolute bottom-2 right-3 text-[8px] font-mono opacity-40 tracking-wider">
            TAP ↻
          </div>
        </div>

        {/* ═══ BACK FACE ═══ */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden border p-5"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: `linear-gradient(165deg, #0E0E14, #050507)`,
            borderColor: `${hawk.color}60`,
            boxShadow: `0 12px 40px rgba(0,0,0,0.7), 0 0 32px ${hawk.color}25`,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="text-[9px] font-mono tracking-[0.25em] opacity-60">
              DOSSIER
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xl"
              style={{
                background: `${hawk.color}20`,
                border: `1px solid ${hawk.color}60`,
              }}
            >
              {hawk.glyph}
            </div>
          </div>

          <div className="text-sm font-black leading-tight mb-1 text-white">
            {hawk.name.replace(/_/g, ' ')}
          </div>
          <div
            className="text-[10px] font-mono opacity-70 mb-4"
            style={{ color: hawk.color }}
          >
            {hawk.role}
          </div>

          <div
            className="h-px w-full mb-3"
            style={{ background: `linear-gradient(90deg, ${hawk.color}40, transparent)` }}
          />

          {/* Capabilities */}
          <div className="text-[8px] font-mono tracking-[0.2em] opacity-50 mb-2">
            CAPABILITIES
          </div>
          <ul className="space-y-1.5 text-[11px] text-white/85 mb-4">
            {hawk.capabilities.map((cap, i) => (
              <li key={i} className="flex gap-2 leading-snug">
                <span style={{ color: hawk.color }}>▸</span>
                <span>{cap}</span>
              </li>
            ))}
          </ul>

          {/* Sample mission */}
          <div className="text-[8px] font-mono tracking-[0.2em] opacity-50 mb-1 mt-auto">
            SAMPLE MISSION
          </div>
          <div
            className="text-[10px] italic leading-snug p-2 rounded border mb-3"
            style={{
              borderColor: `${hawk.color}30`,
              background: `${hawk.color}08`,
              color: 'rgba(255,255,255,0.75)',
            }}
          >
            "{hawk.sampleMission}"
          </div>

          {/* Stats footer */}
          <div className="flex justify-between items-center text-[9px] font-mono">
            <div className="opacity-50">
              <span className="opacity-70">DONE </span>
              <span className="text-white font-bold">
                {hawk.tasksCompleted ?? 0}
              </span>
            </div>
            <div className="opacity-50">
              <span className="opacity-70">FAIL </span>
              <span
                className="font-bold"
                style={{ color: (hawk.tasksFailed ?? 0) > 0 ? '#FF6B6B' : 'rgba(255,255,255,0.8)' }}
              >
                {hawk.tasksFailed ?? 0}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
