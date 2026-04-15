/**
 * Run the regrade engine — grade all 2396 Beast players through TIE v3.0
 * Run: npx tsx scripts/run-regrade.ts
 */
import { regradeAndSave } from '../src/lib/draft/regrade-engine';

console.log('=== Per|Form TIE Regrade v3.0 ===');
console.log('Calibrating against Beast 2026 + real combine data...\n');

const result = regradeAndSave();

console.log(`Total players graded: ${result.total}`);
console.log(`Output: ${result.outputPath}`);

// Quick peek at top 20
const data = require(result.outputPath);
console.log(`\nGrade Distribution:`);
for (const [tier, count] of Object.entries(data.gradeDistribution)) {
  console.log(`  ${tier}: ${count}`);
}

console.log(`\nCombine Data Coverage:`);
console.log(`  Real combine data: ${data.combineDataCoverage.withRealData}`);
console.log(`  Rank-based fallback: ${data.combineDataCoverage.withFallback}`);

console.log(`\n=== Top 25 Per|Form Regraded Board ===`);
for (const p of data.prospects.slice(0, 25)) {
  const beastNote = p.beastRank ? ` (Beast #${p.beastRank})` : '';
  console.log(`  #${(p as any).performRank || '-'} ${p.tieLabel.padEnd(16)} ${p.tieGrade.toFixed(1).padStart(5)} | ${p.name.padEnd(25)} ${p.position.padEnd(5)} ${p.school}${beastNote}`);
}
