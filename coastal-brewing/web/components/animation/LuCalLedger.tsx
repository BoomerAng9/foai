"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface Props {
  progress: number;
  size: string;
  isThinking: boolean;
  isComplete: boolean;
}

const COUPON_CODES = ["WELCOME10", "BREW20", "FREESHIP", "TRY-ME"];

export function LuCalLedger({ progress, size, isThinking, isComplete }: Props) {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [couponRevealed, setCouponRevealed] = useState(false);

  const calcLines = [
    "Lu-Cal v3.1 :: initializing...",
    "Loading catalog prices...",
    "Computing effective rate...",
    "Bundle math: checking...",
    "Floor check: PASS",
    "Auth: T2-FINANCE verified",
  ];

  useEffect(() => {
    if (!isThinking) return;
    const idx = Math.floor(progress * calcLines.length);
    setVisibleLines(calcLines.slice(0, Math.max(1, idx)));
  }, [progress, isThinking]);

  useEffect(() => {
    if (isComplete) setCouponRevealed(true);
  }, [isComplete]);

  return (
    <div className="flex flex-col gap-2 py-3 w-full">
      {/* Calculator screen */}
      <div className="rounded border border-accent/20 bg-black/40 p-2 font-mono text-[9px] min-h-[80px]">
        {/* Header */}
        <div className="mb-1 flex items-center justify-between text-accent/60">
          <span>LU-CAL</span>
          <motion.span
            animate={{ opacity: isThinking ? [1, 0.3, 1] : 1 }}
            transition={{ duration: 0.8, repeat: isThinking ? Infinity : 0 }}
          >
            ●
          </motion.span>
        </div>

        {/* Calculation lines */}
        <div className="space-y-0.5">
          {visibleLines.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-foreground/60"
            >
              {line}
            </motion.div>
          ))}
          {isThinking && (
            <motion.span
              className="inline-block h-2.5 w-1 bg-accent/60"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
          )}
        </div>

        {/* Coupon reveal on complete */}
        <AnimatePresence>
          {couponRevealed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-2 border border-accent/40 rounded px-2 py-1 text-accent text-[10px] text-center"
            >
              {COUPON_CODES[Math.floor(Math.random() * COUPON_CODES.length)]} :: READY
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 w-full overflow-hidden rounded-full bg-accent/10">
        <motion.div
          className="h-full bg-accent/50"
          animate={{ width: `${progress * 100}%` }}
          transition={{ ease: "linear", duration: 0.2 }}
        />
      </div>

      <p className="font-mono text-center text-[9px] uppercase tracking-widest text-muted-foreground">
        LUC_Ang · T2-Finance
      </p>
    </div>
  );
}
