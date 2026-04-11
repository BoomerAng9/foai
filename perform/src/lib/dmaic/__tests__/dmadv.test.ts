import { describe, it, expect } from 'vitest';
import { runDmadvDefineAndAnalyze, verifyWithSyntheticPersonas } from '../dmadv';
import type { GraderInput } from '../grader';

describe('DMADV', () => {
  const validInput = {
    tierOrFeature: 'premium',
    customerRequirements: ['daily briefing', 'show notes', '3 clips per episode'],
    targetPersonas: ['daily_grinder', 'semi_pro'],
    qualityMetrics: ['formatting_clean', 'claims_verified', 'on_time_delivery'],
    costModel: {
      estimatedMonthlyCost: 37,
      tierPrice: 47,
    },
    producerWorkflow: ['scrape_news', 'compile_briefing', 'generate_notes', 'cut_clips'],
    deliverableSet: ['briefing', 'show_notes', 'social_clips'],
    sqwaadrunMissions: ['daily_team_scrape', 'weekly_analytics'],
  };

  describe('runDmadvDefineAndAnalyze', () => {
    it('approves a feasible tier design', () => {
      const result = runDmadvDefineAndAnalyze(validInput);
      expect(result.canDeliver).toBe(true);
      expect(result.projectedMargin).toBeGreaterThan(0);
      expect(result.risks.length).toBeLessThanOrEqual(1);
      expect(result.costGaps).toHaveLength(0);
      expect(result.spec.phase).toBe('design');
    });

    it('flags negative margin', () => {
      const result = runDmadvDefineAndAnalyze({
        ...validInput,
        costModel: { estimatedMonthlyCost: 100, tierPrice: 47 },
      });
      expect(result.canDeliver).toBe(false);
      expect(result.costGaps.some(g => g.includes('Negative margin'))).toBe(true);
    });

    it('flags missing deliverables', () => {
      const result = runDmadvDefineAndAnalyze({
        ...validInput,
        deliverableSet: [],
      });
      expect(result.canDeliver).toBe(false);
      expect(result.risks.some(r => r.includes('No deliverables'))).toBe(true);
    });

    it('flags missing workflow', () => {
      const result = runDmadvDefineAndAnalyze({
        ...validInput,
        producerWorkflow: [],
      });
      expect(result.canDeliver).toBe(false);
      expect(result.risks.some(r => r.includes('No producer workflow'))).toBe(true);
    });

    it('flags thin margin as risk', () => {
      const result = runDmadvDefineAndAnalyze({
        ...validInput,
        costModel: { estimatedMonthlyCost: 42, tierPrice: 47 },
      });
      expect(result.canDeliver).toBe(true);
      expect(result.risks.some(r => r.includes('Thin margin'))).toBe(true);
    });
  });

  describe('verifyWithSyntheticPersonas', () => {
    const goodDeliverable: GraderInput = {
      deliverableType: 'briefing',
      content: 'Daniel Jones cleared for minicamp. The Giants are projected to pick at #6. Verified across ESPN, NJ.com, and NFL Network.',
      promisedItems: ['team news', 'draft projection'],
      producedItems: ['team news', 'draft projection'],
      verifiedClaimCount: 4,
      unverifiedClaimCount: 0,
      totalSourcesUsed: 3,
    };

    const badDeliverable: GraderInput = {
      deliverableType: 'show_notes',
      content: 'Hello {{name}}, your team (team) played TBD.',
      promisedItems: ['recap', 'stats'],
      producedItems: ['recap'],
      verifiedClaimCount: 0,
      unverifiedClaimCount: 2,
      totalSourcesUsed: 0,
    };

    it('approves when all synthetic deliverables pass', () => {
      const initialResult = runDmadvDefineAndAnalyze(validInput);
      const verified = verifyWithSyntheticPersonas(
        initialResult.spec,
        [goodDeliverable, goodDeliverable, goodDeliverable],
      );
      expect(verified.verified.passRate).toBe(100);
      expect(verified.verified.approvedForLaunch).toBe(true);
      expect(verified.phase).toBe('verify');
    });

    it('rejects when too many synthetic deliverables fail', () => {
      const initialResult = runDmadvDefineAndAnalyze(validInput);
      const verified = verifyWithSyntheticPersonas(
        initialResult.spec,
        [badDeliverable, badDeliverable, goodDeliverable],
      );
      expect(verified.verified.passRate).toBeLessThan(80);
      expect(verified.verified.approvedForLaunch).toBe(false);
      expect(verified.verified.issues.length).toBeGreaterThan(0);
    });

    it('reports formatting issues from synthetic tests', () => {
      const initialResult = runDmadvDefineAndAnalyze(validInput);
      const verified = verifyWithSyntheticPersonas(
        initialResult.spec,
        [badDeliverable],
      );
      expect(verified.verified.issues.some(i => i.includes('formatting'))).toBe(true);
    });
  });
});
