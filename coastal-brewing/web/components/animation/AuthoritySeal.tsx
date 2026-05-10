"use client";
import { motion } from "framer-motion";

interface Props {
  progress: number;
  size: string;
  isThinking: boolean;
  isComplete: boolean;
}

export function AuthoritySeal({ progress, size, isThinking, isComplete }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 py-3">
      {/* Circular seal */}
      <div className="relative h-16 w-16">
        {/* Outer ring — fills as thinking progresses */}
        <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground/10" />
          <motion.circle
            cx="32" cy="32" r="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={`${2 * Math.PI * 28}`}
            strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress)}`}
            className="text-accent"
            strokeLinecap="round"
            transition={{ ease: "linear", duration: 0.2 }}
          />
        </svg>

        {/* Center — T1 badge */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={isThinking ? { opacity: [0.6, 1, 0.6] } : { opacity: 1 }}
            transition={{ duration: 1.2, repeat: isThinking ? Infinity : 0 }}
            className="font-mono text-[10px] font-bold text-accent"
          >
            T1
          </motion.div>
        </div>

        {/* Seal stamp on complete */}
        {isComplete && (
          <motion.div
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="h-10 w-10 rounded-full border-2 border-accent bg-accent/10 flex items-center justify-center">
              <span className="font-mono text-[8px] font-bold text-accent">AUTH</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Reasoning bullets (shown during thinking) */}
      {isThinking && progress > 0.3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-0.5 text-center"
        >
          {["Reviewing context", "Checking floor", "T1 deciding"].slice(0, Math.ceil(progress * 3)).map((line, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              className="font-mono text-[8px] text-muted-foreground"
            >
              › {line}
            </motion.p>
          ))}
        </motion.div>
      )}

      <p className="font-mono text-center text-[9px] uppercase tracking-widest text-muted-foreground">
        Final approval in progress
      </p>
    </div>
  );
}
