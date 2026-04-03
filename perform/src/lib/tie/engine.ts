import type { PerformanceInput, AttributesInput, IntangiblesInput, TIEResult } from './types';
import { getGradeForScore } from './grades';

// PRIVATE WEIGHTS — NEVER EXPOSE TO FRONTEND
const W_PERFORMANCE = 0.4;
const W_ATTRIBUTES = 0.3;
const W_INTANGIBLES = 0.3;

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
): TIEResult {
  const perfScore = normalizePerformance(performance);
  const attrScore = normalizeAttributes(attributes);
  const intScore = normalizeIntangibles(intangibles);

  const raw = (perfScore * W_PERFORMANCE) + (attrScore * W_ATTRIBUTES) + (intScore * W_INTANGIBLES);
  const score = Math.round(raw * 10) / 10;

  const gradeInfo = getGradeForScore(score);

  return {
    score,
    grade: gradeInfo.grade,
    tier: gradeInfo.tier,
    label: gradeInfo.label,
    draftContext: gradeInfo.draftContext,
    badgeColor: gradeInfo.badgeColor,
    components: {
      performance: Math.round(perfScore * 10) / 10,
      attributes: Math.round(attrScore * 10) / 10,
      intangibles: Math.round(intScore * 10) / 10,
    },
  };
}
