/**
 * DMAIC Quality Gate Grader.
 * Grades a deliverable through all 5 DMAIC phases.
 * Input: deliverable + tier definition. Output: grade + audit trail.
 * Formatting failure = automatic cap at C. Nothing below B ships.
 */

import { scanFormatting } from './formatting-checks';
import {
  type Grade,
  type DeliverableAudit,
  type DeliverableType,
  scoreToGrade,
  gradeToAction,
  isShippable as checkShippable,
} from './types';

export interface GraderInput {
  deliverableType: DeliverableType;
  content: string;
  promisedItems: string[];
  producedItems: string[];
  verifiedClaimCount: number;
  unverifiedClaimCount: number;
  totalSourcesUsed: number;
}

export interface GraderResult {
  score: number;
  grade: Grade;
  isShippable: boolean;
  action: string;
  formattingPassed: boolean;
  formattingIssues: string[];
  audit: DeliverableAudit;
}

export function gradeDeliverable(input: GraderInput): GraderResult {
  const now = new Date().toISOString();

  // ── DEFINE ──
  const defined = {
    promisedItems: input.promisedItems,
    qualityMetrics: ['formatting_clean', 'claims_verified', 'content_complete'],
  };

  // ── MEASURE ──
  const formatting = scanFormatting(input.content);
  const completenessScore = input.promisedItems.length === 0
    ? 0
    : Math.round((input.producedItems.length / input.promisedItems.length) * 100);

  const measured = {
    producedItems: input.producedItems,
    completenessScore,
    formattingPassed: formatting.passed,
    formattingIssues: formatting.issues,
  };

  // ── ANALYZE ──
  const missingItems = input.promisedItems.filter(
    item => !input.producedItems.includes(item)
  );
  const totalClaims = input.verifiedClaimCount + input.unverifiedClaimCount;
  const accuracyScore = totalClaims === 0
    ? 100
    : Math.round((input.verifiedClaimCount / totalClaims) * 100);

  const gaps: string[] = [];
  if (missingItems.length > 0) {
    gaps.push(`Missing items: ${missingItems.join(', ')}`);
  }
  if (input.unverifiedClaimCount > 0) {
    gaps.push(`${input.unverifiedClaimCount} unverified claims`);
  }
  if (!input.content || input.content.trim().length === 0) {
    gaps.push('Content is empty');
  }

  const analyzed = {
    gaps,
    accuracyScore,
    verifiedClaimCount: input.verifiedClaimCount,
    unverifiedClaimCount: input.unverifiedClaimCount,
  };

  // ── IMPROVE (tracked — actual re-run happens outside the grader) ──
  const improved = {
    rerunCount: 0,
    fixesApplied: [] as string[],
  };

  // ── CONTROL ──
  let score = 0;

  if (!input.content || input.content.trim().length === 0) {
    score = 0;
  } else {
    const completenessWeight = 0.35;
    const accuracyWeight = 0.35;
    const sourceWeight = 0.15;
    const contentLengthWeight = 0.15;

    const sourceScore = Math.min(input.totalSourcesUsed * 20, 100);
    const contentScore = Math.min(input.content.length / 5, 100);

    score = Math.round(
      completenessScore * completenessWeight +
      accuracyScore * accuracyWeight +
      sourceScore * sourceWeight +
      contentScore * contentLengthWeight
    );
  }

  // Formatting failure = automatic cap at C (55)
  if (!formatting.passed) {
    score = Math.min(score, 55);
  }

  const grade = scoreToGrade(score);
  const action = gradeToAction(grade);

  const audit: DeliverableAudit = {
    deliverableId: `DEL-${Date.now().toString(36)}`,
    deliverableType: input.deliverableType,
    userId: 0,
    tierAtDelivery: '',
    defined,
    measured,
    analyzed,
    improved,
    controlled: {
      finalScore: score,
      grade,
      action,
      gradedAt: now,
    },
  };

  return {
    score,
    grade,
    isShippable: checkShippable(grade),
    action,
    formattingPassed: formatting.passed,
    formattingIssues: formatting.issues,
    audit,
  };
}
