/**
 * Chronicle Charter — the client's transparent delivery receipt.
 * Shows what was promised, what was delivered, and how it scored.
 * The refund killer: evidence of quality, not promises of quality.
 */

import type { GraderResult } from './grader';
import { scoreToGrade, type Grade, type ChronicleCharter } from './types';

interface CharterWithMarkdown extends ChronicleCharter {
  toMarkdown(): string;
}

export function generateCharter(
  userId: number,
  tier: string,
  results: GraderResult[],
): CharterWithMarkdown {
  const now = new Date().toISOString();
  const charterId = `CHR-${Date.now().toString(36)}`;

  const deliverables = results.map(r => ({
    type: r.audit.deliverableType,
    title: r.audit.deliverableId,
    grade: r.grade,
    score: r.score,
    sourceCount: r.audit.analyzed.verifiedClaimCount + r.audit.analyzed.unverifiedClaimCount,
    verifiedClaims: r.audit.analyzed.verifiedClaimCount,
  }));

  const overallScore = results.length === 0
    ? 0
    : Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
  const overallGrade = scoreToGrade(overallScore);

  return {
    charterId,
    userId,
    deliveryDate: now,
    tierAtDelivery: tier,
    deliverables,
    overallGrade,
    overallScore,
    generatedAt: now,
    toMarkdown() {
      const lines: string[] = [
        `# Chronicle Charter`,
        ``,
        `**Charter ID:** ${this.charterId}`,
        `**Delivery Date:** ${this.deliveryDate}`,
        `**Plan:** ${this.tierAtDelivery}`,
        `**Overall Grade:** ${this.overallGrade} (${this.overallScore}/100)`,
        ``,
        `## Deliverables`,
        ``,
        `| Item | Type | Grade | Score | Sources | Verified |`,
        `|------|------|-------|-------|---------|----------|`,
      ];

      for (const d of this.deliverables) {
        lines.push(
          `| ${d.title} | ${d.type} | ${d.grade} | ${d.score} | ${d.sourceCount} | ${d.verifiedClaims} |`
        );
      }

      lines.push('', `---`, `*Generated: ${this.generatedAt}*`);
      return lines.join('\n');
    },
  };
}
