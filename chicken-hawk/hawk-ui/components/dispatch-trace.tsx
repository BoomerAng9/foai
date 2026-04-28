'use client';

// Dispatch-thinking trace — the "agent pondering on the job" UI.
//
// When a Sqwaadrun hawk is deployed (URL deeplink or in-chat trigger),
// or any chat turn is in-flight, this trace cycles through ordered
// lifecycle beats — each one a real step that mirrors what the agent
// would actually be doing if the dispatch were live.
//
// For Sqwaadrun hawks, beats come from the roster (per hawk specialty).
// For generic Chicken Hawk turns, falls back to DEFAULT_BEATS.

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { HawkAvatar } from '@/components/hawk-avatar';
import {
  DEFAULT_BEATS,
  type SqwaadrunHawk,
} from '@/lib/sqwaadrun-roster';

interface Props {
  hawk?: SqwaadrunHawk | null;
  beatIntervalMs?: number;
}

export function DispatchTrace({ hawk, beatIntervalMs = 850 }: Props) {
  const beats = hawk?.beats ?? DEFAULT_BEATS;
  const [i, setI] = useState(0);

  useEffect(() => {
    setI(0);
    const t = setInterval(() => setI((n) => (n + 1) % beats.length), beatIntervalMs);
    return () => clearInterval(t);
  }, [hawk?.id, beats.length, beatIntervalMs]);

  return (
    <div className="rounded-2xl border border-foai-border bg-foai-surface-2/60 p-3 sm:p-4">
      <div className="flex items-start gap-3">
        {hawk ? (
          <div className="relative size-12 sm:size-14 rounded-xl overflow-hidden border border-foai-border bg-foai-surface shrink-0">
            <Image
              src={`/hawks/${hawk.id.toLowerCase()}.png`}
              alt={hawk.id}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <HawkAvatar size={48} className="shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-foai-gold">
              {hawk ? hawk.id : 'Chicken Hawk'}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-foai-muted">thinking</span>
            <span className="ml-auto flex gap-1">
              <span className="size-1.5 rounded-full bg-foai-gold animate-pulse" />
              <span className="size-1.5 rounded-full bg-foai-gold animate-pulse [animation-delay:120ms]" />
              <span className="size-1.5 rounded-full bg-foai-gold animate-pulse [animation-delay:240ms]" />
            </span>
          </div>

          {hawk?.title && (
            <div className="text-xs text-foai-muted italic mb-2">{hawk.title}</div>
          )}

          <ol className="space-y-1">
            {beats.map((b, idx) => {
              const done = idx < i;
              const active = idx === i;
              return (
                <li key={`${hawk?.id ?? 'default'}-${idx}`} className="flex items-center gap-2 text-[13px]">
                  <span
                    className={
                      done
                        ? 'size-3.5 rounded-full bg-foai-gold flex items-center justify-center text-[9px] text-white font-bold'
                        : active
                        ? 'size-3.5 rounded-full border-2 border-foai-gold animate-pulse'
                        : 'size-3.5 rounded-full border border-foai-border'
                    }
                  >
                    {done ? '✓' : ''}
                  </span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={`${idx}-${active ? 'a' : done ? 'd' : 'q'}`}
                      initial={{ opacity: 0, x: -3 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.18 }}
                      className={
                        done
                          ? 'text-foai-muted line-through decoration-foai-border'
                          : active
                          ? 'text-foai-text font-medium'
                          : 'text-foai-muted'
                      }
                    >
                      {b}
                    </motion.span>
                  </AnimatePresence>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
