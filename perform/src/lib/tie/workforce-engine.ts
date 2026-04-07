/**
 * Workforce TIE Engine — HIDT-powered scoring for non-sports verticals
 * =====================================================================
 * Mirrors src/lib/tie/engine.ts (sports) but for learners, contractors,
 * founders, and students. Uses the HIDT Training Matrix as the source
 * of truth for sectors, courses, soft skills, certifications, and
 * salary signals.
 *
 * Three pillars (same Talent / Innovation / Execution framing as
 * sports TIE — weights remain PRIVATE):
 *   - Talent      (sports: Performance)   — credentials, experience, certs held
 *   - Innovation  (sports: Attributes)    — skill breadth, technical depth, soft-skill demand
 *   - Execution   (sports: Intangibles)   — track record, completion rate, market fit
 *
 * Output is the same TIE shape (score / grade / tier / components) so
 * the existing grade bands and downstream UI work unchanged across
 * sports and workforce verticals.
 */

import { getGradeForScore } from './grades';
import type { TIEResult } from './types';
import {
  getSoftSkills,
  getCertifications,
  findSoftSkill,
  type SkillLevel,
  type HidtSoftSkill,
  type HidtCertification,
} from './hidt-matrix';

// PRIVATE WEIGHTS — NEVER EXPOSE
const W_TALENT = 0.4;
const W_INNOVATION = 0.3;
const W_EXECUTION = 0.3;

export interface WorkforceTalentInput {
  /** Years of professional experience */
  yearsExperience?: number;
  /** Highest skill level the learner currently sits at */
  currentLevel?: SkillLevel;
  /** Names of certifications the learner already holds */
  certificationsHeld?: string[];
  /** Formal education tier (highschool / associate / bachelor / master / phd) */
  educationTier?: 'highschool' | 'associate' | 'bachelor' | 'master' | 'phd';
}

export interface WorkforceInnovationInput {
  /** Names of soft skills the learner has documented */
  softSkillsHeld?: string[];
  /** Technical skills demonstrated (count or named) */
  technicalSkillCount?: number;
  /** Self-rated curiosity / learning velocity 0-100 */
  learningVelocity?: number;
  /** Has the learner shipped a real project? */
  hasShippedProject?: boolean;
}

export interface WorkforceExecutionInput {
  /** Course completion rate 0-1 across attempted programs */
  completionRate?: number;
  /** On-time delivery rate 0-1 */
  onTimeDelivery?: number;
  /** Number of testimonials / employer endorsements */
  endorsements?: number;
  /** Currently employed in target role? */
  currentlyEmployedInTarget?: boolean;
}

export interface WorkforceContext {
  sectorId?: string;
  targetRole?: string;
  targetLevel?: SkillLevel;
}

export interface WorkforceTIEResult extends TIEResult {
  /** Recommended courses pulled from the HIDT matrix */
  recommendedCourses?: string[];
  /** Salary forecast pulled from the matrix for this level */
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
  if (input.yearsExperience != null) {
    scores.push(Math.min(100, 40 + input.yearsExperience * 5));
  }
  if (input.currentLevel) {
    scores.push(LEVEL_SCORE[input.currentLevel]);
  }
  if (input.educationTier) {
    scores.push(EDU_SCORE[input.educationTier]);
  }
  if (input.certificationsHeld?.length) {
    scores.push(Math.min(100, 50 + input.certificationsHeld.length * 8));
  }
  if (scores.length === 0) return 50;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function scoreInnovation(input: WorkforceInnovationInput): number {
  const scores: number[] = [];

  // Pull demand signals from the HIDT matrix for each soft skill held
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
      // Bonus for breadth
      const breadthBonus = Math.min(15, count * 3);
      scores.push(Math.min(100, demandSum / count + breadthBonus));
    }
  }
  if (input.technicalSkillCount != null) {
    scores.push(Math.min(100, 40 + input.technicalSkillCount * 6));
  }
  if (input.learningVelocity != null) {
    scores.push(input.learningVelocity);
  }
  if (input.hasShippedProject) {
    scores.push(85);
  }
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
  const skills: HidtSoftSkill[] = anchorSkill
    ? [findSoftSkill(anchorSkill)].filter(Boolean) as HidtSoftSkill[]
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
  const t = scoreTalent(talent);
  const i = scoreInnovation(innovation);
  const e = scoreExecution(execution);

  const raw = t * W_TALENT + i * W_INNOVATION + e * W_EXECUTION;
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
      performance: Math.round(t * 10) / 10,   // Talent
      attributes: Math.round(i * 10) / 10,    // Innovation
      intangibles: Math.round(e * 10) / 10,   // Execution
    },
    salaryForecast: pickSalaryForecast(
      context.targetLevel ?? talent.currentLevel,
      innovation.softSkillsHeld?.[0],
    ),
    topCertifications: pickTopCertifications(context.targetRole),
  };
}
