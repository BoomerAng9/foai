'use client';

import { useState } from 'react';
import { Edit3, Sparkles, Shield } from 'lucide-react';

export interface NurdCardData {
  name: string;
  class: string;
  level: number;
  coreTrait: string;
  vibeAbility: string;
  description: string;
  avatarUrl: string;
  style: 'illustrated' | 'tech';
  syncStatus: 'synced' | 'pending' | 'offline';
}

const DEFAULT_CARD: NurdCardData = {
  name: 'New NURD',
  class: 'Explorer',
  level: 1,
  coreTrait: 'Curiosity',
  vibeAbility: 'Quick Learner',
  description: 'Ready to deploy. Ready to build. Ready to change the game.',
  avatarUrl: '/acheevy-helmet.png',
  style: 'tech',
  syncStatus: 'pending',
};

// ── Tech Card Style ──────────────────────────────────────

function TechCard({ data, onEdit }: { data: NurdCardData; onEdit?: () => void }) {
  return (
    <div className="relative w-full max-w-sm mx-auto overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0A0A0A 0%, #111 50%, #0A0A0A 100%)',
        border: '1px solid #E8A020',
        boxShadow: '0 0 30px rgba(232,160,32,0.15), inset 0 0 30px rgba(232,160,32,0.05)',
      }}
    >
      {/* Glow border effect */}
      <div className="absolute inset-0 opacity-20" style={{
        background: 'linear-gradient(135deg, transparent 0%, rgba(232,160,32,0.1) 50%, transparent 100%)',
      }} />

      <div className="relative p-6">
        {/* Avatar */}
        <div className="flex justify-center mb-4">
          <div className="w-24 h-24 rounded-full border-2 border-accent overflow-hidden bg-bg-elevated"
            style={{ boxShadow: '0 0 20px rgba(232,160,32,0.3)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.avatarUrl} alt={data.name} className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Name + Class */}
        <div className="text-center mb-4">
          <h3 className="text-lg font-black tracking-tight text-white">{data.name}</h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">{data.class}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-bg-elevated/50 border border-border p-2">
            <p className="font-mono text-[8px] text-fg-ghost uppercase">Level</p>
            <p className="font-mono text-sm font-bold text-accent">{data.level}</p>
          </div>
          <div className="bg-bg-elevated/50 border border-border p-2">
            <p className="font-mono text-[8px] text-fg-ghost uppercase">NURD Sync</p>
            <p className="font-mono text-sm font-bold" style={{
              color: data.syncStatus === 'synced' ? '#22C55E' : data.syncStatus === 'pending' ? '#F59E0B' : '#6B7280'
            }}>
              {data.syncStatus.toUpperCase()}
            </p>
          </div>
          <div className="bg-bg-elevated/50 border border-border p-2">
            <p className="font-mono text-[8px] text-fg-ghost uppercase">Core Trait</p>
            <p className="text-xs font-medium text-fg-secondary truncate">{data.coreTrait}</p>
          </div>
          <div className="bg-bg-elevated/50 border border-border p-2">
            <p className="font-mono text-[8px] text-fg-ghost uppercase">Vibe Ability</p>
            <p className="text-xs font-medium text-fg-secondary truncate">{data.vibeAbility}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-[11px] text-fg-tertiary leading-relaxed text-center mb-4 italic">
          &ldquo;{data.description}&rdquo;
        </p>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button className="flex-1 h-9 bg-accent text-bg text-[10px] font-mono font-bold tracking-wider flex items-center justify-center gap-1.5">
            <Sparkles className="w-3 h-3" /> TAP TO CONNECT
          </button>
          {onEdit && (
            <button onClick={onEdit} className="w-9 h-9 border border-border flex items-center justify-center hover:bg-bg-elevated">
              <Edit3 className="w-3.5 h-3.5 text-fg-tertiary" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Illustrated Card Style ───────────────────────────────

function IllustratedCard({ data, onEdit }: { data: NurdCardData; onEdit?: () => void }) {
  return (
    <div className="relative w-full max-w-sm mx-auto overflow-hidden bg-gradient-to-br from-sky-50 to-amber-50"
      style={{ border: '3px solid #E8A020' }}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-black text-gray-900">{data.name}</h3>
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">{data.class} · LVL {data.level}</p>
          </div>
          <div className="w-16 h-16 rounded-xl border-2 border-amber-400 overflow-hidden bg-white shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.avatarUrl} alt={data.name} className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Values Wall */}
        <div className="bg-white/60 border border-amber-200 rounded-lg p-3 mb-4">
          <div className="flex flex-wrap gap-1.5">
            {['FOSTER', 'DEVELOP', 'HONE', 'S.M.A.R.T.', 'P.A.C.T.', 'S.T.E.A.M.'].map(v => (
              <span key={v} className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded">
                {v}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-amber-600 font-bold mt-1.5 italic">Be Cool Like That!</p>
        </div>

        {/* Stats */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500 font-medium">Core Trait</span>
            <span className="font-bold text-gray-800">{data.coreTrait}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500 font-medium">Vibe Ability</span>
            <span className="font-bold text-gray-800">{data.vibeAbility}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-[11px] text-gray-600 leading-relaxed mb-4">
          {data.description}
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <button className="flex-1 h-9 bg-amber-500 text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-md">
            <Sparkles className="w-3 h-3" /> CONNECT
          </button>
          {onEdit && (
            <button onClick={onEdit} className="w-9 h-9 border border-amber-300 rounded-lg flex items-center justify-center hover:bg-amber-50">
              <Edit3 className="w-3.5 h-3.5 text-amber-600" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Exported Component ───────────────────────────────────

export function NurdCard({
  data = DEFAULT_CARD,
  editable = false,
  onEdit,
}: {
  data?: NurdCardData;
  editable?: boolean;
  onEdit?: () => void;
}) {
  if (data.style === 'illustrated') {
    return <IllustratedCard data={data} onEdit={editable ? onEdit : undefined} />;
  }
  return <TechCard data={data} onEdit={editable ? onEdit : undefined} />;
}

export { DEFAULT_CARD };
export type { NurdCardData as NurdCardType };
