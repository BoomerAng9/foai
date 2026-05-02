"use client";
import { motion } from "framer-motion";

export interface CupRecord {
  employee: string;
  animationType: string;
  animationSize: string;
  thinkingTokens: number;
  responseTokens: number;
  costUsd: number;
  turnIndex: number;
}

const SIZE_CAFFEINE: Record<string, number> = {
  espresso_1_shot:  64,
  espresso_2_shots: 128,
  americano_2:      128,
  americano_4:      256,
  long_format_6:    384,
};

const ANIM_ICON: Record<string, string> = {
  espresso_cup:  "☕",
  lu_cal_ledger: "🔢",
  sett_brief:    "📋",
  authority_seal:"🔏",
};

const EMPLOYEE_LABEL: Record<string, string> = {
  sal_ang:       "Sal_Ang",
  luc_ang:       "LUC_Ang",
  melli_capensi: "Melli",
  acheevy:       "ACHEEVY",
};

interface Props {
  cups: CupRecord[];
}

export function CupHistory({ cups }: Props) {
  if (cups.length === 0) return null;

  const totalCaffeine = cups.reduce((acc, c) => acc + (SIZE_CAFFEINE[c.animationSize] || 0), 0);
  const totalCost = cups.reduce((acc, c) => acc + c.costUsd, 0);

  return (
    <div className="border-t border-border/40 pt-3 mt-2">
      {/* Counter row */}
      <div className="flex items-end gap-2 overflow-x-auto pb-2 px-1">
        {cups.map((cup, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center gap-0.5 shrink-0"
            title={`Turn ${cup.turnIndex + 1} · ${EMPLOYEE_LABEL[cup.employee] || cup.employee}`}
          >
            <span className="text-lg">{ANIM_ICON[cup.animationType] || "☕"}</span>
            <span className="font-mono text-[7px] text-muted-foreground/50">
              {cup.thinkingTokens}t
            </span>
          </motion.div>
        ))}
      </div>

      {/* Totals */}
      <div className="flex items-center justify-between font-mono text-[8px] text-muted-foreground/40 px-1 pt-1 border-t border-border/20">
        <span>{cups.length} {cups.length === 1 ? "cup" : "cups"}</span>
        {totalCaffeine > 0 && <span>{totalCaffeine}mg caffeine</span>}
        <span>${totalCost.toFixed(4)}</span>
      </div>
    </div>
  );
}
