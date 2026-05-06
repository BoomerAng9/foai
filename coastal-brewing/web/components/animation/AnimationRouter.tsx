"use client";
import { EspressoCup } from "./EspressoCup";
import { LuCalLedger } from "./LuCalLedger";
import { CoffeePot } from "./CoffeePot";
import { AuthoritySeal } from "./AuthoritySeal";
import { TeaInfuser } from "./TeaInfuser";
import { MushroomGrowth } from "./MushroomGrowth";

interface Props {
  employee: string;
  animationType: string;
  animationSize: string;
  progress: number;        // 0–1
  isThinking: boolean;
  isComplete: boolean;
  // Optional topic override — when the chat-panel's topic detector
  // identifies tea / mushroom in recent conversation, the animation
  // switches independently of which employee is responding. Owner
  // directive 2026-05-06.
  topicAnimationType?: string;
}

export function AnimationRouter({ employee, animationType, animationSize, progress, isThinking, isComplete, topicAnimationType }: Props) {
  const shared = { progress, size: animationSize, isThinking, isComplete };
  const effectiveType = topicAnimationType || animationType;

  switch (effectiveType) {
    case "espresso_cup":     return <EspressoCup {...shared} />;
    case "lu_cal_ledger":    return <LuCalLedger {...shared} />;
    case "coffee_pot":       return <CoffeePot {...shared} />;
    case "authority_seal":   return <AuthoritySeal {...shared} />;
    case "tea_infuser":      return <TeaInfuser {...shared} />;
    case "mushroom_growth":  return <MushroomGrowth {...shared} />;
    default:                 return <EspressoCup {...shared} />;
  }
}
