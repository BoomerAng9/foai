'use client';

/**
 * IntentionComposer — port of prototype's Panels.jsx:6.
 *
 * Three position modes (per tweak):
 *   - 'floating'      — draggable top-left glass panel (default)
 *   - 'left-rail'     — anchored full-height left edge, non-draggable
 *   - 'bottom-sheet'  — horizontal row anchored to bottom edge
 *
 * Grammar-style intention chips with inline weight fill. Each click
 * cycles weight via a clamped increment; × removes the chip.
 */

import { useState, type RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Intention } from '@/lib/validation';

export type ComposerPosition = 'floating' | 'left-rail' | 'bottom-sheet';

export interface IntentionComposerProps {
  intentions: Intention[];
  onChange: (next: Intention[]) => void;
  dragConstraints?: RefObject<HTMLElement | null>;
  initialPos?: { x: number; y: number };
  position?: ComposerPosition;
}

export function IntentionComposer({
  intentions,
  onChange,
  dragConstraints,
  initialPos = { x: 24, y: 24 },
  position = 'floating',
}: IntentionComposerProps) {
  const [draft, setDraft] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const addIntention = () => {
    const v = draft.trim();
    if (!v) return;
    const next: Intention = {
      intentionId: crypto.randomUUID(),
      phrase: v,
      weight: 0.7,
      displayOrder: intentions.length,
    };
    onChange([...intentions, next]);
    setDraft('');
  };

  const removeIntention = (id: string) => {
    onChange(intentions.filter((i) => i.intentionId !== id));
  };

  const cycleWeight = (id: string) => {
    setActiveId((cur) => (cur === id ? null : id));
    onChange(
      intentions.map((i) =>
        i.intentionId === id
          ? { ...i, weight: i.weight + 0.15 > 1 ? 0.5 : Math.min(1, i.weight + 0.15) }
          : i,
      ),
    );
  };

  const isFloating = position === 'floating';
  const isLeftRail = position === 'left-rail';
  const isBottomSheet = position === 'bottom-sheet';

  const weightAvgPct =
    intentions.length === 0
      ? 0
      : Math.round(
          (intentions.reduce((s, i) => s + i.weight, 0) / intentions.length) * 100,
        );

  const header = (
    <div
      className="flex items-center justify-between px-4 pt-3 pb-2 border-b"
      style={{ borderColor: 'var(--divider)' }}
    >
      <div className="flex items-center gap-2">
        {isFloating && (
          <div className="flex gap-1">
            <div className="w-1 h-1 rounded-full bg-white/30" />
            <div className="w-1 h-1 rounded-full bg-white/30" />
            <div className="w-1 h-1 rounded-full bg-white/30" />
          </div>
        )}
        <div
          className="text-zinc-400"
          style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 9, letterSpacing: '0.18em' }}
        >
          INTENTION COMPOSER
        </div>
      </div>
      <div
        className="flex items-center gap-1"
        style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 9, letterSpacing: '0.14em' }}
      >
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-[#FF6B00]"
          style={{ boxShadow: '0 0 6px #FF6B00' }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
        <span className="text-zinc-500">ACTIVE</span>
      </div>
    </div>
  );

  const chipCluster = (
    <div
      className={`flex flex-wrap gap-1.5 items-start ${
        isBottomSheet ? 'flex-nowrap overflow-x-auto pb-1' : ''
      }`}
    >
      <AnimatePresence mode="popLayout">
        {intentions.map((intent) => (
          <motion.div
            key={intent.intentionId}
            layout
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{
              opacity: 1,
              scale: activeId === intent.intentionId ? 1.04 : 1,
            }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => cycleWeight(intent.intentionId!)}
            className="group cursor-pointer relative flex-shrink-0"
          >
            <IntentionChip
              intent={intent}
              active={activeId === intent.intentionId}
              onRemove={(e) => {
                e.stopPropagation();
                removeIntention(intent.intentionId!);
              }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  const addRow = (
    <div
      className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2"
      style={{
        background: 'rgba(255,255,255,0.03)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div className="text-[#FF6B00]" style={{ filter: 'drop-shadow(0 0 4px rgba(255,107,0,0.5))' }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') addIntention();
        }}
        placeholder="e.g. near live music, under 30min commute…"
        className="flex-1 bg-transparent text-white text-xs outline-none placeholder:text-zinc-600"
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Add intention"
      />
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={addIntention}
        className="px-2 py-1 rounded-md border border-white/10 text-zinc-400 hover:text-white"
        style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 9, letterSpacing: '0.12em' }}
      >
        ADD ↵
      </motion.button>
    </div>
  );

  const readout = (
    <div
      className="flex items-center justify-between pt-1"
      style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 9, letterSpacing: '0.14em' }}
    >
      <span className="text-zinc-500">MATCHING {intentions.length} SIGNALS</span>
      <span className="text-[#FF8A3D]">{weightAvgPct}% WEIGHT AVG</span>
    </div>
  );

  const hero = (
    <div>
      <div className="text-white font-bold tracking-tighter leading-tight text-[22px]">
        Describe where
        <br />
        you want to live.
      </div>
      <div className="text-zinc-500 text-xs mt-1">
        Stack natural-language intentions. Click to tune weight.
      </div>
    </div>
  );

  const panelChrome = (
    <div
      className="rounded-2xl backdrop-blur-2xl overflow-hidden"
      style={{
        border: '1px solid var(--border)',
        background: 'var(--panel-bg)',
        boxShadow: 'var(--panel-shadow)',
      }}
    >
      {header}
      <div className="p-4 space-y-3">
        {hero}
        {chipCluster}
        {addRow}
        {readout}
      </div>
    </div>
  );

  if (isBottomSheet) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 40, mass: 1.2 }}
        className="absolute z-30 will-change-transform"
        style={{ left: 24, right: 24, bottom: 24 }}
      >
        <div
          className="rounded-2xl backdrop-blur-2xl overflow-hidden"
          style={{
            border: '1px solid var(--border)',
            background: 'var(--panel-bg)',
            boxShadow: 'var(--panel-shadow)',
          }}
        >
          {header}
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="text-zinc-400 text-xs flex-shrink-0">Intentions</div>
            <div className="flex-1 min-w-0">{chipCluster}</div>
            <div className="w-[320px] flex-shrink-0">{addRow}</div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (isLeftRail) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 40, mass: 1.2 }}
        className="absolute z-30 will-change-transform"
        style={{ left: 24, top: 80, bottom: 24, width: 320 }}
      >
        <div
          className="h-full rounded-2xl backdrop-blur-2xl overflow-hidden flex flex-col"
          style={{
            border: '1px solid var(--border)',
            background: 'var(--panel-bg)',
            boxShadow: 'var(--panel-shadow)',
          }}
        >
          {header}
          <div className="p-4 space-y-3 overflow-y-auto">
            {hero}
            {chipCluster}
            {addRow}
            {readout}
          </div>
        </div>
      </motion.div>
    );
  }

  // Default: floating draggable
  return (
    <motion.div
      drag
      dragMomentum={false}
      dragConstraints={dragConstraints}
      dragElastic={0}
      whileDrag={{ scale: 1.02, zIndex: 100 }}
      initial={{ opacity: 0, y: -20, x: initialPos.x }}
      animate={{ opacity: 1, x: initialPos.x, y: initialPos.y }}
      transition={{ type: 'spring', stiffness: 200, damping: 40, mass: 1.2 }}
      className="absolute top-0 left-0 z-30 w-[340px] will-change-transform cursor-grab active:cursor-grabbing"
      style={{ touchAction: 'none' }}
    >
      {panelChrome}
    </motion.div>
  );
}

function IntentionChip({
  intent,
  active,
  onRemove,
}: {
  intent: Intention;
  active: boolean;
  onRemove: (e: React.MouseEvent) => void;
}) {
  const weightPct = Math.round(intent.weight * 100);
  return (
    <div
      className="relative flex items-center gap-2 rounded-full border backdrop-blur-md pl-3 pr-1 py-1 overflow-hidden"
      style={{
        background: active ? 'rgba(255,107,0,0.12)' : 'rgba(255,255,255,0.04)',
        borderColor: active ? 'rgba(255,107,0,0.55)' : 'rgba(255,255,255,0.12)',
        boxShadow: active
          ? 'inset 0 1px 0 rgba(255,255,255,0.08), 0 0 18px rgba(255,107,0,0.28)'
          : 'inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      <div
        className="absolute inset-y-0 left-0 pointer-events-none"
        style={{
          width: `${weightPct}%`,
          background: active
            ? 'linear-gradient(90deg, rgba(255,107,0,0.25), rgba(255,107,0,0.02))'
            : 'linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0))',
        }}
      />
      <span className="relative text-white text-xs font-semibold">{intent.phrase}</span>
      <span
        className="relative text-zinc-400"
        style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 9, letterSpacing: '0.1em' }}
      >
        {weightPct}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="relative w-5 h-5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
        aria-label={`Remove intention: ${intent.phrase}`}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
          <path d="M2 2L6 6M6 2L2 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
