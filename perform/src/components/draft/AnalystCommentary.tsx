'use client';

/**
 * AnalystCommentary — Real-time analyst reactions during draft simulation.
 * Shows rotating commentary from The Colonel, Bun-E, and Void-Caster.
 * Typewriter animation for drama. Special styling for trades.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DraftPick } from '@/lib/draft/types';
import {
  generatePickCommentary,
  getAnalystForPick,
  getAnalystDisplayInfo,
  type AnalystId,
} from '@/lib/draft/commentary';

interface AnalystCommentaryProps {
  picks: DraftPick[];
  /** When true, skip typewriter and show full text instantly */
  instant?: boolean;
}

interface CommentaryEntry {
  analyst: AnalystId;
  text: string;
  pick: DraftPick;
  isTrade: boolean;
}

export function AnalystCommentary({ picks, instant = false }: AnalystCommentaryProps) {
  const [entries, setEntries] = useState<CommentaryEntry[]>([]);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const lastPickCount = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Generate commentary when new picks arrive
  useEffect(() => {
    if (picks.length <= lastPickCount.current) return;

    const newPicks = picks.slice(lastPickCount.current);
    lastPickCount.current = picks.length;

    const newEntries: CommentaryEntry[] = newPicks.map((pick, i) => {
      const pickIdx = picks.length - newPicks.length + i;
      const analyst = getAnalystForPick(pickIdx);
      const recentPicks = picks.slice(Math.max(0, pickIdx - 2), pickIdx);
      const text = generatePickCommentary(pick, analyst, recentPicks);
      return { analyst, text, pick, isTrade: pick.is_trade };
    });

    setEntries(prev => [...prev.slice(-20), ...newEntries]); // Keep last 20
  }, [picks]);

  // Typewriter effect for latest entry
  const latestEntry = entries[entries.length - 1];
  useEffect(() => {
    if (!latestEntry || instant) {
      if (latestEntry) setDisplayedText(latestEntry.text);
      return;
    }

    setIsTyping(true);
    setDisplayedText('');
    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      setDisplayedText(latestEntry.text.slice(0, idx));
      if (idx >= latestEntry.text.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 18);

    return () => clearInterval(interval);
  }, [latestEntry, instant]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, displayedText]);

  if (entries.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="text-[10px] font-bold tracking-[0.2em] text-white/20 uppercase">
          Analyst Commentary
        </div>
        <div className="text-[10px] text-white/10 mt-1">
          Waiting for picks...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">Analyst Commentary</span>
        {isTyping && (
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#D4A853' }} />
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3" style={{ maxHeight: '300px' }}>
        {/* Past entries (collapsed) */}
        {entries.slice(0, -1).map((entry, i) => {
          const info = getAnalystDisplayInfo(entry.analyst);
          return (
            <div key={i} className="text-[10px] text-white/20 leading-relaxed">
              <span className="font-bold" style={{ color: `${info.color}60` }}>{info.name}:</span>{' '}
              {entry.text.slice(0, 80)}{entry.text.length > 80 ? '...' : ''}
            </div>
          );
        })}

        {/* Latest entry (full with typewriter) */}
        <AnimatePresence mode="wait">
          {latestEntry && (
            <motion.div
              key={entries.length}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-lg p-3"
              style={{
                background: latestEntry.isTrade
                  ? 'rgba(239,68,68,0.08)'
                  : 'rgba(255,255,255,0.03)',
                border: latestEntry.isTrade
                  ? '1px solid rgba(239,68,68,0.2)'
                  : '1px solid rgba(255,255,255,0.05)',
              }}
            >
              {/* Trade badge */}
              {latestEntry.isTrade && (
                <div className="mb-2">
                  <span
                    className="text-[9px] font-black tracking-[0.2em] uppercase px-2 py-0.5 rounded"
                    style={{ background: 'rgba(239,68,68,0.2)', color: '#EF4444' }}
                  >
                    Trade Reaction
                  </span>
                </div>
              )}

              {/* Analyst header */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                  style={{
                    background: `${getAnalystDisplayInfo(latestEntry.analyst).color}20`,
                    color: getAnalystDisplayInfo(latestEntry.analyst).color,
                  }}
                >
                  {getAnalystDisplayInfo(latestEntry.analyst).icon}
                </div>
                <span className="text-[11px] font-bold" style={{ color: getAnalystDisplayInfo(latestEntry.analyst).color }}>
                  {getAnalystDisplayInfo(latestEntry.analyst).name}
                </span>
                <span className="text-[9px] text-white/20 font-mono">
                  #{latestEntry.pick.pick_number} {latestEntry.pick.player_name}
                </span>
              </div>

              {/* Commentary text */}
              <div className="text-xs text-white/70 leading-relaxed">
                {instant ? latestEntry.text : displayedText}
                {isTyping && <span className="inline-block w-0.5 h-3 ml-0.5 animate-pulse" style={{ background: '#D4A853' }} />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
