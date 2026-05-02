"use client";
import { motion } from "framer-motion";

interface Props {
  progress: number;        // 0–1, driven by thinking token arrival
  size: string;            // espresso_1_shot | americano_2 | etc.
  isThinking: boolean;
  isComplete: boolean;
}

const SHOT_LABELS: Record<string, { shots: number; caffeine: number; label: string }> = {
  espresso_1_shot:  { shots: 1, caffeine: 64,  label: "1 shot" },
  espresso_2_shots: { shots: 2, caffeine: 128, label: "2 shots" },
  americano_2:      { shots: 2, caffeine: 128, label: "Americano" },
  americano_4:      { shots: 4, caffeine: 256, label: "Double Americano" },
  long_format_6:    { shots: 6, caffeine: 384, label: "Long Pour" },
};

export function EspressoCup({ progress, size, isThinking, isComplete }: Props) {
  const info = SHOT_LABELS[size] || SHOT_LABELS.americano_2;
  const fillHeight = `${Math.min(progress * 100, 100)}%`;

  return (
    <div className="flex flex-col items-center gap-2 py-3">
      {/* Cup */}
      <div className="relative h-16 w-14">
        {/* Cup outline */}
        <svg viewBox="0 0 56 64" className="absolute inset-0 h-full w-full">
          <path
            d="M8 8 L4 56 L52 56 L48 8 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-foreground/30"
          />
          {/* Saucer */}
          <ellipse cx="28" cy="58" rx="22" ry="3" className="text-foreground/20" fill="currentColor" />
          {/* Handle */}
          <path d="M48 20 Q60 24 60 36 Q60 48 48 44" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground/30" />
        </svg>

        {/* Liquid fill — animates up as thinking tokens arrive */}
        <div className="absolute left-[15%] right-[15%] bottom-[12%] overflow-hidden rounded-sm" style={{ height: "72%" }}>
          <motion.div
            className="absolute bottom-0 left-0 right-0 rounded-sm bg-amber-800/70"
            initial={{ height: "0%" }}
            animate={{ height: fillHeight }}
            transition={{ ease: "easeOut", duration: 0.3 }}
          />
          {/* Surface shimmer */}
          {isThinking && progress > 0.05 && (
            <motion.div
              className="absolute left-0 right-0 h-[2px] bg-amber-500/40"
              style={{ bottom: fillHeight }}
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>

        {/* Steam when complete */}
        {isComplete && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-4 w-0.5 rounded-full bg-foreground/20"
                animate={{ y: [-4, -12], opacity: [0.4, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3, ease: "easeOut" }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Label */}
      <div className="text-center">
        <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          {info.label}
        </p>
        <p className="font-mono text-[9px] text-muted-foreground/60">
          {info.caffeine}mg caffeine
        </p>
      </div>
    </div>
  );
}
