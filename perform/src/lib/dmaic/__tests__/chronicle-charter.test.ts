import { describe, it, expect } from 'vitest';
import { generateCharter } from '../chronicle-charter';
import type { GraderResult } from '../grader';

describe('generateCharter', () => {
  const mockResult: GraderResult = {
    score: 92,
    grade: 'A',
    isShippable: true,
    action: 'ship',
    formattingPassed: true,
    formattingIssues: [],
    audit: {
      deliverableId: 'DEL-test123',
      deliverableType: 'briefing',
      userId: 42,
      tierAtDelivery: 'premium',
      defined: { promisedItems: ['team news', 'stats'], qualityMetrics: [] },
      measured: { producedItems: ['team news', 'stats'], completenessScore: 100, formattingPassed: true, formattingIssues: [] },
      analyzed: { gaps: [], accuracyScore: 95, verifiedClaimCount: 8, unverifiedClaimCount: 0 },
      improved: { rerunCount: 0, fixesApplied: [] },
      controlled: { finalScore: 92, grade: 'A', action: 'ship', gradedAt: '2026-04-11T05:00:00Z' },
    },
  };

  it('generates a charter with correct structure', () => {
    const charter = generateCharter(42, 'premium', [mockResult]);
    expect(charter.userId).toBe(42);
    expect(charter.tierAtDelivery).toBe('premium');
    expect(charter.deliverables).toHaveLength(1);
    expect(charter.overallGrade).toBe('A');
    expect(charter.charterId).toMatch(/^CHR-/);
  });

  it('computes overall grade from multiple deliverables', () => {
    const secondResult: GraderResult = {
      ...mockResult,
      score: 75,
      grade: 'B',
      audit: {
        ...mockResult.audit,
        deliverableId: 'DEL-test456',
        controlled: { ...mockResult.audit.controlled, finalScore: 75, grade: 'B' },
      },
    };
    const charter = generateCharter(42, 'premium', [mockResult, secondResult]);
    expect(charter.overallScore).toBe(84);
    expect(charter.overallGrade).toBe('B');
  });

  it('renders to markdown string', () => {
    const charter = generateCharter(42, 'premium', [mockResult]);
    const md = charter.toMarkdown();
    expect(md).toContain('Chronicle Charter');
    expect(md).toContain('premium');
    expect(md).toContain('briefing');
    expect(md).toContain('Grade: A');
  });
});
