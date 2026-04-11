/**
 * DMAIC/DMADV Quality Gate types for Per|Form deliverable grading.
 * Every deliverable — one-off or monthly — is graded before delivery.
 * Nothing below B ships. Formatting failure = automatic C.
 */

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D';

export interface GradeThreshold {
  grade: Grade;
  minScore: number;
  action: 'ship' | 'ship_with_note' | 'hold_and_improve' | 'escalate';
}

export const GRADE_THRESHOLDS: GradeThreshold[] = [
  { grade: 'S', minScore: 95, action: 'ship' },
  { grade: 'A', minScore: 85, action: 'ship' },
  { grade: 'B', minScore: 70, action: 'ship_with_note' },
  { grade: 'C', minScore: 55, action: 'hold_and_improve' },
  { grade: 'D', minScore: 0,  action: 'escalate' },
];

export type DeliverableType =
  | 'briefing'
  | 'show_notes'
  | 'social_clip'
  | 'episode_package'
  | 'guest_research'
  | 'analytics_digest'
  | 'sponsor_scan';

export interface DeliverableAudit {
  deliverableId: string;
  deliverableType: DeliverableType;
  userId: number;
  tierAtDelivery: string;
  defined: {
    promisedItems: string[];
    qualityMetrics: string[];
  };
  measured: {
    producedItems: string[];
    completenessScore: number;
    formattingPassed: boolean;
    formattingIssues: string[];
  };
  analyzed: {
    gaps: string[];
    accuracyScore: number;
    verifiedClaimCount: number;
    unverifiedClaimCount: number;
  };
  improved: {
    rerunCount: number;
    fixesApplied: string[];
  };
  controlled: {
    finalScore: number;
    grade: Grade;
    action: string;
    gradedAt: string;
  };
}

export interface ChronicleCharter {
  charterId: string;
  userId: number;
  deliveryDate: string;
  tierAtDelivery: string;
  deliverables: Array<{
    type: DeliverableType;
    title: string;
    grade: Grade;
    score: number;
    sourceCount: number;
    verifiedClaims: number;
  }>;
  overallGrade: Grade;
  overallScore: number;
  generatedAt: string;
}

// ── DMADV types (new tier/feature design validation) ──

export type DmadvPhase = 'define' | 'measure' | 'analyze' | 'design' | 'verify';

export interface DmadvDesignSpec {
  specId: string;
  tierOrFeature: string;
  phase: DmadvPhase;
  defined: {
    customerRequirements: string[];
    targetPersonas: string[];
  };
  measured: {
    qualityMetrics: string[];
    costModel: {
      estimatedMonthlyCost: number;
      tierPrice: number;
      projectedMargin: number;
    };
  };
  analyzed: {
    canDeliver: boolean;
    risks: string[];
    costGaps: string[];
  };
  designed: {
    producerWorkflow: string[];
    deliverableSet: string[];
    sqwaadrunMissions: string[];
  };
  verified: {
    syntheticPersonasTested: number;
    passRate: number;
    averageGrade: Grade;
    issues: string[];
    approvedForLaunch: boolean;
  };
}

export function scoreToGrade(score: number): Grade {
  for (const threshold of GRADE_THRESHOLDS) {
    if (score >= threshold.minScore) {
      return threshold.grade;
    }
  }
  return 'D';
}

export function gradeToAction(grade: Grade): string {
  const threshold = GRADE_THRESHOLDS.find(t => t.grade === grade);
  return threshold?.action ?? 'escalate';
}

export function isShippable(grade: Grade): boolean {
  return grade === 'S' || grade === 'A' || grade === 'B';
}
