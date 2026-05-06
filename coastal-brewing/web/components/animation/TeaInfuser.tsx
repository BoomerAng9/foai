"use client";
import { motion } from "framer-motion";

interface Props {
  progress: number; // 0–1
  size: string;
  isThinking: boolean;
  isComplete: boolean;
}

// Phase 0–0.15: warming  (cup heats, infuser hovers)
// Phase 0.15–0.35: lowering (infuser descends into water)
// Phase 0.35–1.0: steeping (color blooms outward, leaves visible)
function getPhase(progress: number): "warming" | "lowering" | "steeping" | "served" {
  if (progress >= 1) return "served";
  if (progress >= 0.35) return "steeping";
  if (progress >= 0.15) return "lowering";
  return "warming";
}

export function TeaInfuser({ progress, isThinking, isComplete }: Props) {
  const phase = getPhase(progress);
  const fillPct = Math.max(0, Math.min((progress - 0.10) / 0.90, 1)) * 100;
  // Infuser drops down as progress advances; settles at center bottom of cup.
  const infuserY = phase === "warming" ? -28 : phase === "lowering" ? -8 : 4;
  // Color saturation grows with steeping.
  const teaIntensity = Math.max(0.15, Math.min(progress * 1.15, 1));

  return (
    <div className="flex flex-col items-center gap-3 py-2 w-full">
      <div className="font-mono text-[9px] uppercase tracking-widest text-accent/60 h-3">
        {phase === "warming" && isThinking && "warming the cup…"}
        {phase === "lowering" && isThinking && "lowering the infuser…"}
        {phase === "steeping" && isThinking && "steeping…"}
        {isComplete && "ready ↓"}
      </div>

      <div className="relative flex flex-col items-center">
        {/* Cup */}
        <div className="relative h-28 w-28">
          <svg viewBox="0 0 112 112" className="absolute inset-0 h-full w-full overflow-visible">
            {/* Steam wisps — only while steeping */}
            {(phase === "lowering" || phase === "steeping") && [0, 1, 2].map((i) => (
              <motion.path
                key={i}
                d={`M${48 + i * 8} 16 q ${i % 2 === 0 ? 4 : -4} -6 0 -12`}
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                fill="none"
                className="text-amber-200/60"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0, 0.55, 0],
                  y: [0, -8, -16],
                }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: i * 0.4,
                }}
              />
            ))}

            {/* Cup body — wide-mouth ceramic mug */}
            <path
              d="M22 42 L22 88 Q22 98 32 98 L80 98 Q90 98 90 88 L90 42 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-foreground/30"
            />
            {/* Cup handle */}
            <path
              d="M90 56 Q102 56 102 70 Q102 84 90 84"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-foreground/30"
            />
            {/* Cup rim */}
            <ellipse cx="56" cy="42" rx="34" ry="4" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-foreground/30" />

            {/* Tea fill — clipped to cup */}
            <defs>
              <clipPath id="cup-clip">
                <path d="M22 42 L22 88 Q22 98 32 98 L80 98 Q90 98 90 88 L90 42 Z" />
              </clipPath>
              <radialGradient id="tea-bloom" cx="50%" cy="80%" r="60%">
                <stop offset="0%" stopColor="rgb(146, 64, 14)" stopOpacity={teaIntensity * 0.95} />
                <stop offset="60%" stopColor="rgb(180, 83, 9)" stopOpacity={teaIntensity * 0.7} />
                <stop offset="100%" stopColor="rgb(217, 119, 6)" stopOpacity={teaIntensity * 0.45} />
              </radialGradient>
            </defs>
            <g clipPath="url(#cup-clip)">
              <rect
                x="22"
                y={98 - (fillPct * 0.56)}
                width="68"
                height="60"
                fill="url(#tea-bloom)"
              />
            </g>

            {/* Infuser — mesh ball with chain, descends as progress advances */}
            <motion.g
              animate={{ y: infuserY }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >
              {/* Chain */}
              <line x1="56" y1="6" x2="56" y2="58" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 1.5" className="text-foreground/40" />
              {/* Tag at top */}
              <rect x="50" y="2" width="12" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-foreground/40" />
              {/* Mesh ball */}
              <circle cx="56" cy="64" r="9" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-foreground/55" />
              <circle cx="56" cy="64" r="9" fill="rgba(146,64,14,0.18)" className="text-foreground/0" />
              {/* Mesh grid lines */}
              <line x1="48" y1="60" x2="64" y2="68" stroke="currentColor" strokeWidth="0.5" className="text-foreground/35" />
              <line x1="48" y1="68" x2="64" y2="60" stroke="currentColor" strokeWidth="0.5" className="text-foreground/35" />
              <line x1="56" y1="55" x2="56" y2="73" stroke="currentColor" strokeWidth="0.5" className="text-foreground/35" />
              {/* Tea leaves visible inside */}
              {[0, 1, 2].map((i) => (
                <motion.circle
                  key={i}
                  cx={53 + i * 3}
                  cy={62 + (i % 2) * 4}
                  r="1.2"
                  fill="currentColor"
                  className="text-amber-700/70"
                  animate={phase === "steeping" ? {
                    cx: [53 + i * 3, 53 + i * 3 + (i % 2 === 0 ? 1 : -1), 53 + i * 3],
                  } : {}}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
                />
              ))}
            </motion.g>
          </svg>
        </div>

        {/* Saucer base */}
        <div className="mt-1 h-1 w-32 rounded-full bg-foreground/10" />
      </div>
    </div>
  );
}
