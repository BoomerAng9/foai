import { describe, it, expect } from 'vitest';
import { gradeDeliverable, type GraderInput } from '../grader';

const baseInput: GraderInput = {
  deliverableType: 'briefing',
  content: 'Daniel Jones cleared for minicamp. Verified by 3 sources. The Giants are projected to pick at #6 in the 2026 NFL Draft with three scenarios modeled.',
  promisedItems: ['team news summary', 'verified stats'],
  producedItems: ['team news summary', 'verified stats'],
  verifiedClaimCount: 5,
  unverifiedClaimCount: 0,
  totalSourcesUsed: 3,
};

describe('gradeDeliverable', () => {
  it('grades a complete deliverable as S or A', () => {
    const result = gradeDeliverable(baseInput);
    expect(['S', 'A']).toContain(result.grade);
    expect(result.isShippable).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(85);
  });

  it('reduces grade when formatting fails', () => {
    const result = gradeDeliverable({
      ...baseInput,
      content: 'Hello {{name}}, your team {{team}} played well.',
    });
    expect(result.isShippable).toBe(false);
    expect(result.formattingPassed).toBe(false);
    expect(result.grade).toBe('C');
  });

  it('reduces grade when items are missing', () => {
    const result = gradeDeliverable({
      ...baseInput,
      producedItems: ['team news summary'],
    });
    expect(result.score).toBeLessThan(95);
  });

  it('reduces grade when unverified claims exist', () => {
    const result = gradeDeliverable({
      ...baseInput,
      verifiedClaimCount: 2,
      unverifiedClaimCount: 5,
    });
    expect(result.score).toBeLessThan(85);
  });

  it('returns D for empty content', () => {
    const result = gradeDeliverable({
      ...baseInput,
      content: '',
      producedItems: [],
    });
    expect(result.grade).toBe('D');
    expect(result.isShippable).toBe(false);
  });

  it('includes all DMAIC phase data in audit', () => {
    const result = gradeDeliverable(baseInput);
    expect(result.audit.defined.promisedItems).toEqual(baseInput.promisedItems);
    expect(result.audit.measured.completenessScore).toBeGreaterThan(0);
    expect(result.audit.analyzed.gaps).toBeDefined();
    expect(result.audit.controlled.grade).toBeDefined();
    expect(result.audit.controlled.gradedAt).toBeTruthy();
  });
});
