"use client";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  progress: number;        // 0–1
  size: string;
  isThinking: boolean;
  isComplete: boolean;
}

const SIZE_META: Record<string, { shots: number; caffeine: number; label: string; note?: string }> = {
  espresso_1_shot:  { shots: 1, caffeine: 64,  label: "Espresso · 1 shot" },
  espresso_2_shots: { shots: 2, caffeine: 128, label: "Espresso · 2 shots" },
  americano_2:      { shots: 2, caffeine: 128, label: "Americano" },
  americano_4:      { shots: 4, caffeine: 256, label: "Double Americano" },
  long_format_6:    { shots: 6, caffeine: 384, label: "Long Pour · 6 shots" },
  // Mushroom blend overrides
  mushroom_reishi:  { shots: 0, caffeine: 0,   label: "Reishi Blend", note: "250mg Lion's Mane" },
  mushroom_cordyceps:{ shots: 0, caffeine: 20,  label: "Cordyceps Blend", note: "500mg Cordyceps" },
};

// Phase 0–0.15: grinding (beans spinning)
// Phase 0.15–0.35: first drops appear
// Phase 0.35–1.0: steady pour fills cup
function getPhase(progress: number): "grinding" | "dripping" | "pouring" | "full" {
  if (progress >= 1) return "full";
  if (progress >= 0.35) return "pouring";
  if (progress >= 0.15) return "dripping";
  return "grinding";
}

export function EspressoCup({ progress, size, isThinking, isComplete }: Props) {
  const meta = SIZE_META[size] || SIZE_META.americano_2;
  const phase = getPhase(progress);
  const fillPct = Math.max(0, Math.min((progress - 0.15) / 0.85, 1)) * 100;

  return (
    <div className="flex flex-col items-center gap-3 py-2 w-full">
      {/* Phase label */}
      <div className="font-mono text-[9px] uppercase tracking-widest text-accent/60 h-3">
        {phase === "grinding" && isThinking && "grinding beans…"}
        {phase === "dripping" && isThinking && "extraction starting…"}
        {phase === "pouring" && isThinking && "pouring…"}
        {isComplete && "served ↓"}
      </div>

      {/* Machine + Cup */}
      <div className="relative flex flex-col items-center">
        {/* Espresso machine silhouette */}
        <div className="relative h-12 w-20 flex items-end justify-center">
          <svg viewBox="0 0 80 48" className="absolute inset-0 h-full w-full">
            {/* Machine body */}
            <rect x="8" y="4" width="64" height="36" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-foreground/25" />
            {/* Group head */}
            <rect x="28" y="36" width="24" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-foreground/25" />
            {/* Portafilter */}
            <path d="M32 42 L32 46 M48 42 L48 46" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-foreground/20" />
            {/* Steam wand */}
            <line x1="68" y1="10" x2="68" y2="32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-foreground/20" />
            {/* Pressure gauge */}
            <circle cx="20" cy="18" r="6" fill="none" stroke="currentColor" strokeWidth="1" className="text-foreground/20" />

            {/* Grinding beans — spinning dots when in grinding phase */}
            {phase === "grinding" && (
              <>
                {[0, 1, 2, 3].map((i) => (
                  <motion.circle
                    key={i}
                    cx={36 + Math.cos((i / 4) * Math.PI * 2 + Date.now() / 500) * 6}
                    cy={22 + Math.sin((i / 4) * Math.PI * 2 + Date.now() / 500) * 4}
                    r="1.5"
                    fill="currentColor"
                    className="text-amber-700/60"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }}
                  />
                ))}
              </>
            )}
          </svg>
        </div>

        {/* Drip line */}
        <AnimatePresence>
          {(phase === "dripping" || phase === "pouring") && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 12, opacity: 1 }}
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

        {/* Cup */}
        <div className="relative h-12 w-12">
          <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full">
            {/* Cup outline */}
            <path d="M6 8 L4 44 L44 44 L42 8 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-foreground/30" />
            {/* Saucer */}
            <ellipse cx="24" cy="46" rx="18" ry="2.5" fill="currentColor" className="text-foreground/15" />
            {/* Handle */}
            <path d="M42 14 Q52 18 52 28 Q52 38 42 36" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-foreground/25" />
          </svg>

          {/* Liquid fill */}
          <div
            className="absolute overflow-hidden rounded-sm"
            style={{ left: "14%", right: "14%", bottom: "10%", height: "76%" }}
          >
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-amber-800/65"
              animate={{ height: `${fillPct}%` }}
              transition={{ ease: "easeOut", duration: 0.25 }}
            />
            {/* Surface shimmer */}
            {isThinking && fillPct > 5 && (
              <motion.div
                className="absolute left-0 right-0 h-px bg-amber-400/30"
                style={{ bottom: `${fillPct}%` }}
                animate={{ opacity: [0.2, 0.7, 0.2] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>

          {/* Steam on complete */}
          {isComplete && (
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-4 w-0.5 rounded-full bg-foreground/15"
                  animate={{ y: [-2, -10], opacity: [0.4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4, ease: "easeOut" }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="text-center space-y-0.5">
        <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{meta.label}</p>
        {meta.caffeine > 0 && (
          <p className="font-mono text-[8px] text-muted-foreground/50">{meta.caffeine}mg caffeine</p>
        )}
        {meta.note && (
          <p className="font-mono text-[8px] text-accent/60">{meta.note}</p>
        )}
      </div>
    </div>
  );
}
