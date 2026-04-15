/**
 * Workforce TIE Engine
 * =====================
 * Same TIE engine as Per|Form sports — same Talent / Innovation /
 * Execution pillars, same private weights, same TIEResult shape.
 * The only difference is the vertical it scores for.
 *
 * Sports TIE scores Prospects from the prospect database.
 * Workforce TIE scores Learners — and the seed data for the
 * workforce vertical comes from the Workforce Training Matrix
 * (`workforce-matrix.ts`) the same way sports seed data comes from
 * `draft/seed-data.ts`. The matrix is DATA, not the engine.
 *
 * Routing rule (enforced by verticals.ts):
 *   - Sports rankings NEVER appear in workforce surfaces
 *   - Workforce rankings NEVER appear in sports surfaces
 *   - Every result is stamped with `vertical: 'WORKFORCE'`
 */

import type { TIEResult } from './types';
import { buildTIEResult } from '@aims/tie-matrix';
import {
  getSoftSkills,
  getCertifications,
  findSoftSkill,
  type SkillLevel,
  type WorkforceSoftSkill,
} from './workforce-matrix';

// Pillar weights (40/30/30) are owned by @aims/tie-matrix::buildTIEResult.
// Never reintroduce weights in this file.

export interface WorkforceTalentInput {
  yearsExperience?: number;
  currentLevel?: SkillLevel;
  certificationsHeld?: string[];
  educationTier?: 'highschool' | 'associate' | 'bachelor' | 'master' | 'phd';
}

export interface WorkforceInnovationInput {
  softSkillsHeld?: string[];
  technicalSkillCount?: number;
  learningVelocity?: number;
  hasShippedProject?: boolean;
}

export interface WorkforceExecutionInput {
  completionRate?: number;
  onTimeDelivery?: number;
  endorsements?: number;
  currentlyEmployedInTarget?: boolean;
}

export interface WorkforceContext {
  sectorId?: string;
  targetRole?: string;
  targetLevel?: SkillLevel;
}

export interface WorkforceTIEResult extends TIEResult {
  /** Recommended courses pulled from the workforce seed data */
  recommendedCourses?: string[];
  /** Salary forecast for the target level (workforce-vertical analog
   *  of the sports engine's draft/contract forecast) */
  salaryForecast?: {
    monthlyKsaSar: string;
    sourceSkill: string;
  };
  /** Top relevant certifications for the target role */
  topCertifications?: Array<{ name: string; salarySar: string }>;
}

const LEVEL_SCORE: Record<SkillLevel, number> = {
  entry: 35,
  mid: 55,
  senior: 78,
  executive: 92,
};

const EDU_SCORE: Record<NonNullable<WorkforceTalentInput['educationTier']>, number> = {
  highschool: 40,
  associate: 55,
  bachelor: 70,
  master: 85,
  phd: 95,
};

function scoreTalent(input: WorkforceTalentInput): number {
  const scores: number[] = [];
  if (input.yearsExperience != null) scores.push(Math.min(100, 40 + input.yearsExperience * 5));
  if (input.currentLevel) scores.push(LEVEL_SCORE[input.currentLevel]);
  if (input.educationTier) scores.push(EDU_SCORE[input.educationTier]);
  if (input.certificationsHeld?.length) {
    scores.push(Math.min(100, 50 + input.certificationsHeld.length * 8));
  }
  if (scores.length === 0) return 50;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function scoreInnovation(input: WorkforceInnovationInput): number {
  const scores: number[] = [];

  // Soft-skill demand signals from the workforce seed data
  if (input.softSkillsHeld?.length) {
    let demandSum = 0;
    let count = 0;
    for (const name of input.softSkillsHeld) {
      const skill = findSoftSkill(name);
      if (skill) {
        const importanceScore = { Essential: 100, High: 85, Medium: 65, Low: 40 }[skill.importance] ?? 60;
        const demandScore = { High: 100, Moderate: 70, Medium: 65, Low: 40 }[skill.demand] ?? 60;
        demandSum += (importanceScore + demandScore) / 2;
        count++;
      }
    }
    if (count > 0) {
      const breadthBonus = Math.min(15, count * 3);
      scores.push(Math.min(100, demandSum / count + breadthBonus));
    }
  }
  if (input.technicalSkillCount != null) scores.push(Math.min(100, 40 + input.technicalSkillCount * 6));
  if (input.learningVelocity != null) scores.push(input.learningVelocity);
  if (input.hasShippedProject) scores.push(85);
  if (scores.length === 0) return 50;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function scoreExecution(input: WorkforceExecutionInput): number {
  const scores: number[] = [];
  if (input.completionRate != null) scores.push(input.completionRate * 100);
  if (input.onTimeDelivery != null) scores.push(input.onTimeDelivery * 100);
  if (input.endorsements != null) scores.push(Math.min(100, 40 + input.endorsements * 8));
  if (input.currentlyEmployedInTarget) scores.push(90);
  if (scores.length === 0) return 50;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function pickTopCertifications(targetRole: string | undefined): Array<{ name: string; salarySar: string }> {
  if (!targetRole) return [];
  const q = targetRole.toLowerCase();
  return getCertifications()
    .filter(c => c.topJobs.some(j => j.toLowerCase().includes(q)))
    .slice(0, 3)
    .map(c => ({ name: c.name, salarySar: c.salaryByCurrency.SAR ?? 'unlisted' }));
}

function pickSalaryForecast(level: SkillLevel | undefined, anchorSkill: string | undefined): WorkforceTIEResult['salaryForecast'] {
  if (!level) return undefined;
  const skills: WorkforceSoftSkill[] = anchorSkill
    ? [findSoftSkill(anchorSkill)].filter(Boolean) as WorkforceSoftSkill[]
    : getSoftSkills().slice(0, 1);
  if (!skills.length) return undefined;
  const s = skills[0];
  const range =
    level === 'entry'
      ? s.salary.entryMonthlyKsaSar
      : level === 'executive'
      ? s.salary.executiveMonthlyKsaSar
      : s.salary.managerMonthlyKsaSar;
  return { monthlyKsaSar: range, sourceSkill: s.name };
}

export function calculateWorkforceTIE(
  talent: WorkforceTalentInput,
  innovation: WorkforceInnovationInput,
  execution: WorkforceExecutionInput,
  context: WorkforceContext = {},
): WorkforceTIEResult {
  const t = Math.round(scoreTalent(talent) * 10) / 10;
  const i = Math.round(scoreInnovation(innovation) * 10) / 10;
  const e = Math.round(scoreExecution(execution) * 10) / 10;

  const base = buildTIEResult({
    vertical: 'WORKFORCE',
    performance: t, // Talent pillar
    attributes: i,  // Innovation pillar
    intangibles: e, // Execution pillar
  });

  return {
    ...base,
    salaryForecast: pickSalaryForecast(
      context.targetLevel ?? talent.currentLevel,
      innovation.softSkillsHeld?.[0],
    ),
    topCertifications: pickTopCertifications(context.targetRole),
  };
}
