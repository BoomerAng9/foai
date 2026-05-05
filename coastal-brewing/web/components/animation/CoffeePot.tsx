"use client";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  progress: number;
  size: string;
  isThinking: boolean;
  isComplete: boolean;
}

const SIZE_META: Record<string, { units: number; label: string; note?: string }> = {
  carafe_4u:  { units: 4,  label: "Carafe · 4 units" },
  carafe_12u: { units: 12, label: "Carafe · 12 units" },
  carafe_50u: { units: 50, label: "Carafe · 50 units", note: "bulk pour" },
};

function getPhase(progress: number): "warming" | "dripping" | "pouring" | "full" {
  if (progress >= 1) return "full";
  if (progress >= 0.35) return "pouring";
  if (progress >= 0.15) return "dripping";
  return "warming";
}

export function CoffeePot({ progress, size, isThinking, isComplete }: Props) {
  const meta = SIZE_META[size] || SIZE_META.carafe_12u;
  const phase = getPhase(progress);
  const fillPct = Math.max(0, Math.min((progress - 0.15) / 0.85, 1)) * 100;

  return (
    <div className="flex flex-col items-center gap-3 py-2 w-full">
      <div className="font-mono text-[9px] uppercase tracking-widest text-accent/60 h-3">
        {phase === "warming" && isThinking && "warming the pot…"}
        {phase === "dripping" && isThinking && "first drip…"}
        {phase === "pouring" && isThinking && "filling the pot…"}
        {isComplete && "ready to serve ↓"}
      </div>

      <div className="relative flex flex-col items-center">
        {/* Brewer head — bulk drip basin */}
        <div className="relative h-12 w-24 flex items-end justify-center">
          <svg viewBox="0 0 96 48" className="absolute inset-0 h-full w-full">
            <rect x="6" y="4" width="84" height="32" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-foreground/25" />
            <rect x="36" y="32" width="24" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-foreground/25" />
            <line x1="14" y1="14" x2="28" y2="14" stroke="currentColor" strokeWidth="1" className="text-foreground/20" />
            <line x1="14" y1="20" x2="22" y2="20" stroke="currentColor" strokeWidth="1" className="text-foreground/20" />
            <circle cx="78" cy="18" r="6" fill="none" stroke="currentColor" strokeWidth="1" className="text-foreground/20" />
            {phase === "warming" && (
              <>
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.circle
                    key={i}
                    cx={40 + (i * 4)}
                    cy={20}
                    r="1.4"
                    fill="currentColor"
                    className="text-amber-700/60"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                  />
                ))}
              </>
            )}
          </svg>
        </div>

        <AnimatePresence>
          {(phase === "dripping" || phase === "pouring") && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 10, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="w-0.5 overflow-hidden"
            >
              <motion.div
                className="w-full bg-amber-800/60"
                style={{ height: "100%" }}
                animate={{ scaleY: phase === "pouring" ? 1 : 0.5 }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Coffee pot — carafe with handle and spout, ~1.6× the espresso cup */}
        <div className="relative h-20 w-20">
          <svg viewBox="0 0 80 80" className="absolute inset-0 h-full w-full">
            {/* Spout (left) */}
            <path
              d="M14 22 Q6 26 8 38 L14 38"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-foreground/30"
            />
            {/* Pot body */}
            <path
              d="M14 18 L14 64 Q14 72 22 72 L54 72 Q62 72 62 64 L62 18 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-foreground/30"
            />
            {/* Lid */}
            <rect x="18" y="12" width="40" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-foreground/30" />
            <circle cx="38" cy="9" r="2" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-foreground/25" />
            {/* Handle (right) */}
            <path
              d="M62 28 Q74 32 74 48 Q74 60 62 60"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-foreground/25"
            />
            {/* Saucer */}
            <ellipse cx="38" cy="74" rx="30" ry="3" fill="currentColor" className="text-foreground/15" />
          </svg>

          {/* Liquid fill — wider than the cup variant */}
          <div
            className="absolute overflow-hidden rounded-sm"
            style={{ left: "20%", right: "26%", bottom: "12%", height: "62%" }}
          >
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-amber-800/65"
              animate={{ height: `${fillPct}%` }}
              transition={{ ease: "easeOut", duration: 0.25 }}
            />
            {isThinking && fillPct > 5 && (
              <motion.div
                className="absolute left-0 right-0 h-px bg-amber-400/30"
                style={{ bottom: `${fillPct}%` }}
                animate={{ opacity: [0.2, 0.7, 0.2] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>

          {/* Steam plumes on complete — three taller streams to read as carafe */}
          {isComplete && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-5 w-0.5 rounded-full bg-foreground/15"
                  animate={{ y: [-2, -12], opacity: [0.4, 0] }}
                  transition={{ duration: 1.7, repeat: Infinity, delay: i * 0.45, ease: "easeOut" }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="text-center space-y-0.5">
        <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{meta.label}</p>
        <p className="font-mono text-[8px] text-muted-foreground/50">{meta.units}u</p>
        {meta.note && (
          <p className="font-mono text-[8px] text-accent/60">{meta.note}</p>
        )}
      </div>
    </div>
  );
}
