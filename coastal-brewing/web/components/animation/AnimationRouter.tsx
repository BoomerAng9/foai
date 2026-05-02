"use client";
import { EspressoCup } from "./EspressoCup";
import { LuCalLedger } from "./LuCalLedger";
import { SettBrief } from "./SettBrief";
import { AuthoritySeal } from "./AuthoritySeal";

interface Props {
  employee: string;
  animationType: string;
  animationSize: string;
  progress: number;        // 0–1
  isThinking: boolean;
  isComplete: boolean;
}

export function AnimationRouter({ employee, animationType, animationSize, progress, isThinking, isComplete }: Props) {
  const shared = { progress, size: animationSize, isThinking, isComplete };

  switch (animationType) {
    case "espresso_cup":   return <EspressoCup {...shared} />;
    case "lu_cal_ledger":  return <LuCalLedger {...shared} />;
    case "sett_brief":     return <SettBrief {...shared} />;
    case "authority_seal": return <AuthoritySeal {...shared} />;
    default:               return <EspressoCup {...shared} />;
  }
}
