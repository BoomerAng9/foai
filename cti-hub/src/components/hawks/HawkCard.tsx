'use client';

/**
 * HawkCard — Sqwaadrun roster card
 * ===================================
 * Uses the Sqwaadrun brand palette (NOT Deploy Platform's #E8A020).
 * Renders the character art slot, callsign, role, gear, and live stats.
 * Click to flip and see the dossier back face.
 *
 * Brand: navy port + gold #F5A623 + cyan #22D3EE + orange #F97316
 */

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import type { CharacterProfile } from '@/lib/hawks/characters';

export interface HawkCardData {
  profile: CharacterProfile;
  role: string;            // short tagline shown on the front
  capabilities: string[];  // 3-5 bullets shown on the back
  sampleMission: string;
  status?: 'active' | 'standby';
  tasksCompleted?: number;
  tasksFailed?: number;
}

interface Props {
  data: HawkCardData;
  size?: 'sm' | 'md' | 'lg';
}

const TIER_LABEL: Record<CharacterProfile['rank'], string> = {
  commander: 'COMMANDER',
  supervisor: 'SUPERVISOR',
  dispatcher: 'DISPATCHER',
  core: 'CORE',
  expansion: 'EXPANSION',
  specialist: 'SPECIALIST',
};

export function HawkCard({ data, size = 'md' }: Props) {
  const [flipped, setFlipped] = useState(false);
  const { profile, role, capabilities, sampleMission, status, tasksCompleted, tasksFailed } = data;

  const dimensions = {
    sm: { w: 220, h: 310 },
    md: { w: 280, h: 400 },
    lg: { w: 340, h: 480 },
  }[size];

  const sigColor = profile.signatureColor;

  return (
    <div
      className="relative cursor-pointer select-none"
      style={{
        width: dimensions.w,
        height: dimensions.h,
        perspective: '1400px',
      }}
      onClick={() => setFlipped((f) => !f)}
      onKeyDown={(e) => e.key === 'Enter' && setFlipped((f) => !f)}
      role="button"
      tabIndex={0}
      aria-label={`${profile.callsign} — tap to flip dossier`}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.7, ease: [0.3, 0.8, 0.3, 1] }}
      >
        {/* ═══ FRONT FACE ═══ */}
        <div
          className="absolute inset-0 overflow-hidden border-2"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            background: `linear-gradient(180deg, #050810 0%, #0B1220 60%, #050810 100%)`,
            borderColor: `${sigColor}55`,
            borderRadius: '4px',
            boxShadow: `0 14px 40px rgba(0,0,0,0.7), 0 0 28px ${sigColor}30, inset 0 1px 0 ${sigColor}40`,
          }}
        >
          {/* A.I.M.S. container slat texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              background: `repeating-linear-gradient(90deg, transparent 0px, transparent 18px, rgba(34,211,238,0.06) 18px, rgba(34,211,238,0.06) 19px)`,
            }}
          />

          {/* Top bar with tier + status */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-2 border-b"
            style={{ borderColor: `${sigColor}33`, background: 'rgba(5,8,16,0.7)' }}
          >
            <div className="text-[8px] font-mono tracking-[0.25em] font-bold"
              style={{ color: sigColor }}
            >
              {TIER_LABEL[profile.rank]}
            </div>
            {status && (
              <div className="flex items-center gap-1.5">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: status === 'active' ? '#22D3EE' : '#475569',
                    boxShadow: status === 'active' ? '0 0 6px #22D3EE' : 'none',
                  }}
                />
                <span className="text-[8px] font-mono tracking-wider uppercase"
                  style={{ color: status === 'active' ? '#22D3EE' : '#64748B' }}
                >
                  {status}
                </span>
              </div>
            )}
          </div>

          {/* Character image slot — port background placeholder */}
          <div className="absolute inset-x-0 top-9 bottom-[120px] flex items-center justify-center">
            {profile.imageReady ? (
              <Image
                src={profile.imagePath}
                alt={profile.callsign}
                fill
                className="object-cover object-center"
                sizes="(max-width: 768px) 280px, 340px"
              />
            ) : (
              <CharacterPlaceholder color={sigColor} />
            )}

            {/* Gold glow vignette */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at center, transparent 35%, rgba(5,8,16,0.85) 90%)`,
              }}
            />
          </div>

          {/* Callsign + role plate */}
          <div className="absolute bottom-0 left-0 right-0 p-4 pt-6"
            style={{
              background: `linear-gradient(180deg, transparent 0%, rgba(5,8,16,0.92) 30%, #050810 100%)`,
            }}
          >
            <div className="text-[8px] font-mono tracking-[0.25em] uppercase opacity-60">
              CALLSIGN
            </div>
            <div className="text-lg font-black leading-tight"
              style={{ color: '#F1F5F9', letterSpacing: '-0.01em' }}
            >
              {profile.callsign.replace(/_/g, ' ')}
            </div>
            <div className="text-[10px] font-mono mt-1.5 leading-snug"
              style={{ color: sigColor }}
            >
              {role}
            </div>
          </div>

          {/* Color stripe top edge */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{
              background: `linear-gradient(90deg, transparent, ${sigColor}, transparent)`,
              boxShadow: `0 0 8px ${sigColor}`,
            }}
          />

          {/* Stenciled corner mark */}
          <div className="absolute bottom-2 right-3 text-[7px] font-mono opacity-30 tracking-wider"
            style={{ color: '#22D3EE' }}
          >
            A.I.M.S. · TAP ↻
          </div>
        </div>

        {/* ═══ BACK FACE — DOSSIER ═══ */}
        <div
          className="absolute inset-0 overflow-hidden border-2 p-4"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: `linear-gradient(165deg, #0B1220 0%, #050810 100%)`,
            borderColor: `${sigColor}80`,
            borderRadius: '4px',
            boxShadow: `0 14px 40px rgba(0,0,0,0.8), 0 0 36px ${sigColor}30`,
          }}
        >
          {/* Diagonal stencil header */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b"
            style={{ borderColor: `${sigColor}40` }}
          >
            <div className="text-[8px] font-mono tracking-[0.25em] font-bold opacity-70"
              style={{ color: sigColor }}
            >
              CLASSIFIED · DOSSIER
            </div>
            <div className="w-7 h-7 flex items-center justify-center text-xs font-black"
              style={{
                background: `${sigColor}25`,
                border: `1px solid ${sigColor}80`,
                color: sigColor,
                borderRadius: '2px',
              }}
            >
              {profile.callsign.split('_').slice(-2, -1)[0]?.[0] || 'X'}
            </div>
          </div>

          <div className="text-base font-black leading-tight mb-1"
            style={{ color: '#F1F5F9' }}
          >
            {profile.callsign.replace(/_/g, ' ')}
          </div>
          <div className="text-[10px] font-mono opacity-70 mb-3" style={{ color: sigColor }}>
            {role}
          </div>

          {/* Capabilities */}
          <div className="text-[8px] font-mono tracking-[0.2em] opacity-50 mb-1.5">
            CAPABILITIES
          </div>
          <ul className="space-y-1 text-[10px] mb-3" style={{ color: '#CBD5E1' }}>
            {capabilities.map((cap, i) => (
              <li key={i} className="flex gap-1.5 leading-snug">
                <span style={{ color: sigColor }}>▸</span>
                <span>{cap}</span>
              </li>
            ))}
          </ul>

          {/* Gear list */}
          {profile.gear.length > 0 && (
            <>
              <div className="text-[8px] font-mono tracking-[0.2em] opacity-50 mb-1.5">
                STANDARD GEAR
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {profile.gear.slice(0, 4).map((g) => (
                  <span
                    key={g}
                    className="text-[8px] font-mono px-1.5 py-0.5"
                    style={{
                      color: '#22D3EE',
                      background: 'rgba(34,211,238,0.08)',
                      border: '1px solid rgba(34,211,238,0.25)',
                      borderRadius: '2px',
                    }}
                  >
                    {g}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* Catchphrase */}
          <div
            className="text-[10px] italic leading-snug p-2 mt-auto mb-2"
            style={{
              borderLeft: `2px solid ${sigColor}`,
              background: `${sigColor}08`,
              color: '#E2E8F0',
            }}
          >
            &ldquo;{profile.catchphrase}&rdquo;
          </div>

          {/* Sample mission + stats */}
          <div className="text-[8px] font-mono tracking-[0.2em] opacity-50 mb-1">
            SAMPLE MISSION
          </div>
          <div className="text-[9px] opacity-70 italic leading-snug mb-2" style={{ color: '#94A3B8' }}>
            &ldquo;{sampleMission}&rdquo;
          </div>

          <div className="flex justify-between items-center text-[9px] font-mono pt-2 border-t"
            style={{ borderColor: `${sigColor}25` }}
          >
            <div>
              <span className="opacity-60">DONE </span>
              <span className="font-bold" style={{ color: '#22D3EE' }}>
                {tasksCompleted ?? 0}
              </span>
            </div>
            <div>
              <span className="opacity-60">FAIL </span>
              <span
                className="font-bold"
                style={{ color: (tasksFailed ?? 0) > 0 ? '#EF4444' : '#94A3B8' }}
              >
                {tasksFailed ?? 0}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Placeholder when character art isn't rendered yet ── */
function CharacterPlaceholder({ color }: { color: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* Backdrop port silhouette */}
      <div
        className="absolute inset-x-4 bottom-4 h-12 opacity-20"
        style={{
          background: `linear-gradient(180deg, transparent, ${color}40)`,
          clipPath: 'polygon(0 100%, 8% 60%, 20% 70%, 32% 40%, 48% 50%, 60% 30%, 75% 55%, 88% 45%, 100% 70%, 100% 100%)',
        }}
      />

      {/* Hawk silhouette */}
      <svg
        width="72%"
        height="72%"
        viewBox="0 0 100 100"
        fill="none"
        style={{ filter: `drop-shadow(0 0 18px ${color}40)` }}
      >
        <path
          d="M50 18 L42 30 L26 26 L32 42 L20 52 L34 56 L36 72 L50 64 L64 72 L66 56 L80 52 L68 42 L74 26 L58 30 Z"
          fill={color}
          fillOpacity="0.32"
          stroke={color}
          strokeWidth="1.4"
        />
        <circle cx="44" cy="46" r="2.2" fill={color} />
        <circle cx="56" cy="46" r="2.2" fill={color} />
        <path d="M48 52 L50 56 L52 52" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>

      {/* Crosshair */}
      <div className="absolute top-2 left-2 text-[7px] font-mono opacity-50" style={{ color }}>
        ◯ AWAITING IMAGE
      </div>
    </div>
  );
}
