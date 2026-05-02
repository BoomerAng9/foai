"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Props {
  progress: number;
  size: string;
  isThinking: boolean;
  isComplete: boolean;
}

const SETT_STAGES = [
  "Surface",
  "Entrance",
  "Tunnel",
  "Sett-Chamber",
  "Exit",
  "Home Chamber",
  "Clan",
];

export function SettBrief({ progress, size, isThinking, isComplete }: Props) {
  const activeStages = Math.max(1, Math.ceil(progress * SETT_STAGES.length));

  return (
    <div className="flex flex-col gap-2 py-3 w-full">
      {/* Sett funnel */}
      <div className="space-y-1">
        {SETT_STAGES.map((stage, i) => {
          const isActive = i < activeStages;
          const isCurrent = i === activeStages - 1 && isThinking;
          return (
            <motion.div
              key={stage}
              initial={{ opacity: 0 }}
              animate={{ opacity: isActive ? 1 : 0.2 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className={`flex items-center gap-2 text-[9px] font-mono ${isActive ? "text-foreground/80" : "text-foreground/20"}`}
            >
              <motion.div
                className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-accent" : "bg-foreground/10"}`}
                animate={isCurrent ? { scale: [1, 1.5, 1] } : {}}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              <span style={{ paddingLeft: `${i * 6}px` }}>{stage}</span>
              {isCurrent && (
                <motion.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="text-accent"
                >
                  ▸
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Brief stamp on complete */}
      {isComplete && (
        <motion.div
          initial={{ opacity: 0, rotate: -15, scale: 0.7 }}
          animate={{ opacity: 1, rotate: -8, scale: 1 }}
          className="self-end border-2 border-accent/60 rounded px-2 py-0.5 font-mono text-[9px] text-accent uppercase tracking-widest"
        >
          Sett Brief Ready
        </motion.div>
      )}

      <p className="font-mono text-center text-[9px] uppercase tracking-widest text-muted-foreground">
        Melli Capensi · The Sett · T2-Bulk
      </p>
    </div>
  );
}
