/**
 * perform/lib/tie/engine.ts
 * ==========================
 * SPORTS TIE engine. Normalizes raw measurables + intangibles to pillar
 * scores (0-100), then delegates to the canonical @aims/tie-matrix
 * result builder. All cross-vertical logic (grading bands, labels,
 * vertical routing) lives in the matrix — this file only knows how
 * to turn sports stats into pillar scores.
 */

import type {
  PerformanceInput,
  AttributesInput,
  IntangiblesInput,
  TIEResult,
} from './types';
import { buildTIEResult, versatilityBonusValue, type VersatilityFlex } from '@aims/tie-matrix';

// PRIVATE WEIGHTS are owned by the matrix (buildTIEResult). This file
// only produces pillar inputs. Never reintroduce weights here.

function normalizePerformance(input: PerformanceInput): number {
  const scores: number[] = [];
  if (input.pffGrade != null) scores.push(input.pffGrade);
  if (input.epaPerPlay != null) scores.push(Math.min(100, Math.max(0, 50 + input.epaPerPlay * 200)));
  if (input.successRate != null) scores.push(input.successRate * 100);
  if (input.tdIntRatio != null) scores.push(Math.min(100, input.tdIntRatio * 25));
  if (input.efficiency != null) scores.push(input.efficiency);
  if (input.tackles != null) scores.push(Math.min(100, input.tackles));
  if (input.sacks != null) scores.push(Math.min(100, input.sacks * 10));
  if (input.interceptions != null) scores.push(Math.min(100, input.interceptions * 15));
  if (input.specialTeamsGrade != null) scores.push(input.specialTeamsGrade);
  if (scores.length === 0) return 50;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function normalizeAttributes(input: AttributesInput): number {
  const scores: number[] = [];
  if (input.fortyYard != null) scores.push(Math.max(0, Math.min(100, (5.0 - input.fortyYard) * 75)));
  if (input.threeCone != null) scores.push(Math.max(0, Math.min(100, (7.5 - input.threeCone) * 60)));
  if (input.shuttle != null) scores.push(Math.max(0, Math.min(100, (4.8 - input.shuttle) * 75)));
  if (input.benchPress != null) scores.push(Math.min(100, 50 + (input.benchPress - 15) * 2.67));
  if (input.verticalJump != null) scores.push(Math.min(100, 50 + (input.verticalJump - 28) * 3.75));
  if (input.broadJump != null) scores.push(Math.min(100, 50 + (input.broadJump - 108) * 2.05));
  if (scores.length === 0) return 50;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function normalizeIntangibles(input: IntangiblesInput): number {
  const scores = [
    input.footballIQ ?? 50,
    input.workEthic ?? 50,
    input.competitiveness ?? 50,
    input.leadership ?? 50,
    input.offFieldCharacter ?? 50,
  ];
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export function calculateTIE(
  performance: PerformanceInput,
  attributes: AttributesInput,
  intangibles: IntangiblesInput,
  opts?: { versatility?: VersatilityFlex },
): TIEResult {
  const perf = Math.round(normalizePerformance(performance) * 10) / 10;
  const attr = Math.round(normalizeAttributes(attributes) * 10) / 10;
  const intang = Math.round(normalizeIntangibles(intangibles) * 10) / 10;

  const bonus = opts?.versatility ? versatilityBonusValue(opts.versatility) : 0;

  return buildTIEResult({
    vertical: 'SPORTS',
    performance: perf,
    attributes: attr,
    intangibles: intang,
    bonus,
  });
}
