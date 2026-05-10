"use client";
import { motion } from "framer-motion";

interface Props {
  progress: number; // 0–1
  size: string;
  isThinking: boolean;
  isComplete: boolean;
}

// Phase 0–0.15: spore  (substrate, faint pinpricks)
// Phase 0.15–0.4: pinning  (caps emerging)
// Phase 0.4–1.0: growing  (mushrooms scale up)
// Phase 1.0: harvest  (mature, slight glow)
function getPhase(progress: number): "spore" | "pinning" | "growing" | "harvest" {
  if (progress >= 1) return "harvest";
  if (progress >= 0.4) return "growing";
  if (progress >= 0.15) return "pinning";
  return "spore";
}

const MUSHROOMS = [
  { x: 28, baseScale: 0.9, delay: 0.0, capColor: "rgb(120,53,15)", lining: "rgb(254,243,199)" },
  { x: 56, baseScale: 1.15, delay: 0.18, capColor: "rgb(146,64,14)", lining: "rgb(254,243,199)" },
  { x: 84, baseScale: 0.78, delay: 0.36, capColor: "rgb(159,79,30)", lining: "rgb(253,224,71)" },
];

export function MushroomGrowth({ progress, isThinking, isComplete }: Props) {
  const phase = getPhase(progress);
  const harvestGlow = phase === "harvest" ? 1 : 0;

  return (
    <div className="flex flex-col items-center gap-3 py-2 w-full">
      <div className="font-mono text-[9px] uppercase tracking-widest text-accent/60 h-3">
        {phase === "spore" && isThinking && "spores activating…"}
        {phase === "pinning" && isThinking && "pinning…"}
        {phase === "growing" && isThinking && "fruiting bodies forming…"}
        {isComplete && "harvested ↓"}
      </div>

      <div className="relative h-28 w-32">
        <svg viewBox="0 0 112 112" className="absolute inset-0 h-full w-full overflow-visible">
          {/* Substrate / log silhouette */}
          <path
            d="M6 96 L106 96 L102 108 L10 108 Z"
            fill="currentColor"
            className="text-foreground/15"
          />
          {/* Log grain */}
          <line x1="14" y1="100" x2="98" y2="100" stroke="currentColor" strokeWidth="0.5" className="text-foreground/20" />
          <line x1="20" y1="104" x2="92" y2="104" stroke="currentColor" strokeWidth="0.5" className="text-foreground/15" />

          {/* Spore dots — only at the very start */}
          {phase === "spore" && [0, 1, 2, 3, 4].map((i) => (
            <motion.circle
              key={`spore-${i}`}
              cx={20 + i * 18}
              cy="92"
              r="0.7"
              fill="currentColor"
              className="text-amber-200/70"
              animate={{ opacity: [0.2, 0.9, 0.2] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}

          {/* The mushrooms — scale + emerge in stagger */}
          {MUSHROOMS.map((m, i) => {
            const localProgress = Math.max(0, Math.min((progress - m.delay) / (1 - m.delay), 1));
            const scale = phase === "spore" ? 0 : m.baseScale * localProgress;
            const stemY = 96;
            const stemHeight = 18 * localProgress;
            const capRy = 6 * localProgress;
            const capRx = 10 * localProgress;
            return (
              <motion.g
                key={i}
                style={{ transformOrigin: `${m.x}px ${stemY}px`, transform: `scale(${scale})` }}
              >
                {/* Stem */}
                <rect
                  x={m.x - 2.5}
                  y={stemY - stemHeight}
                  width="5"
                  height={stemHeight}
                  rx="1"
                  fill="rgb(254,243,199)"
                />
                {/* Cap underside (gills) */}
                <ellipse
                  cx={m.x}
                  cy={stemY - stemHeight}
                  rx={capRx * 0.8}
                  ry={capRy * 0.4}
                  fill={m.lining}
                />
                {/* Cap top */}
                <path
                  d={`M ${m.x - capRx} ${stemY - stemHeight} Q ${m.x} ${stemY - stemHeight - capRy * 1.6} ${m.x + capRx} ${stemY - stemHeight} Z`}
                  fill={m.capColor}
                />
                {/* Cap highlight */}
                <ellipse
                  cx={m.x - capRx * 0.3}
                  cy={stemY - stemHeight - capRy * 0.6}
                  rx={capRx * 0.25}
                  ry={capRy * 0.35}
                  fill="rgba(255,255,255,0.3)"
                />
              </motion.g>
            );
          })}

          {/* Harvest glow — radial bloom */}
          {harvestGlow > 0 && (
            <motion.circle
              cx="56"
              cy="86"
              r="44"
              fill="url(#harvest-glow)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ duration: 0.8 }}
            />
          )}
          <defs>
            <radialGradient id="harvest-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgb(245,158,11)" stopOpacity="0.5" />
              <stop offset="60%" stopColor="rgb(245,158,11)" stopOpacity="0.1" />
              <stop offset="100%" stopColor="rgb(245,158,11)" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
