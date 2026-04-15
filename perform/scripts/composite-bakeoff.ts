/**
 * Composite real Per|Form logos onto the existing bake-off images
 * Run: npx tsx scripts/composite-bakeoff.ts
 */

import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

const PUBLIC = path.join(__dirname, '../public');
const BAKEOFF = path.join(PUBLIC, 'generated', 'bakeoff');
const OUT = path.join(PUBLIC, 'generated', 'bakeoff-branded');
fs.mkdirSync(OUT, { recursive: true });

// ONLY the transparent logo — per user directive
const LOGO = path.join(PUBLIC, 'brand', 'perform-transparent.png');

interface Job {
  source: string;
  output: string;
}

async function compositeOne(job: Job) {
  const cardBuffer = fs.readFileSync(job.source);
  const cardMeta = await sharp(cardBuffer).metadata();
  const cardW = cardMeta.width || 1024;
  const cardH = cardMeta.height || 1536;

  // Logo at 25% of card width
  const logoTargetWidth = Math.round(cardW * 0.25);
  const logoResized = await sharp(LOGO)
    .resize(logoTargetWidth, null, { fit: 'inside' })
    .toBuffer();

  const logoMeta = await sharp(logoResized).metadata();
  const logoH = logoMeta.height || logoTargetWidth;

  // Commitment cards: logo goes bottom-right to avoid "COMMITTED" text overlap
  const isCommitment = job.output.includes('commitment');
  const left = isCommitment ? cardW - logoTargetWidth - 24 : 24;
  const top = isCommitment ? cardH - logoH - 24 : 24;

  const result = await sharp(cardBuffer)
    .composite([{
      input: logoResized,
      left: Math.max(0, left),
      top: Math.max(0, top),
    }])
    .png()
    .toBuffer();

  const outPath = path.join(OUT, job.output);
  fs.writeFileSync(outPath, result);
  console.log(`  ✓ ${job.output}`);
}

async function main() {
  console.log('=== Compositing Real Per|Form Logos ===\n');

  // All existing bake-off images — composite lion_dark (standard grade 92 player)
  const aesthetics = ['blueprint', 'animal_archetype', 'inhuman_emergence', 'wall_breaker', 'commitment'];
  const engines = ['ideogram_v3', 'recraft_v4'];

  const jobs: Job[] = [];

  for (const aesthetic of aesthetics) {
    for (const engine of engines) {
      const srcFile = path.join(BAKEOFF, `${aesthetic}_${engine}.png`);
      if (!fs.existsSync(srcFile)) {
        console.log(`  ✗ ${aesthetic}_${engine}.png not found, skipping`);
        continue;
      }
      jobs.push({
        source: srcFile,
        output: `${aesthetic}_${engine}_branded.png`,
      });
    }
  }

  console.log(`Processing ${jobs.length} cards...\n`);

  for (const job of jobs) {
    await compositeOne(job);
  }

  console.log(`\nDone! Output: ${OUT}`);
}

main().catch(console.error);
