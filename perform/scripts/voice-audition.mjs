#!/usr/bin/env node

/**
 * voice-audition.mjs
 *
 * Generates voice design previews for each Per|Form analyst using
 * ElevenLabs Voice Design API. Saves audio samples for review.
 * NO full episode generation — audition only.
 *
 * Usage: ELEVENLABS_API_KEY=sk_... node scripts/voice-audition.mjs
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, '..', 'auditions');

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) { console.error('ELEVENLABS_API_KEY required'); process.exit(1); }

const DESIGN_URL = 'https://api.elevenlabs.io/v1/text-to-voice/design';

// Each analyst: voice description matched to their image + bio + character
const AUDITIONS = [
  {
    id: 'void-caster',
    name: 'The Void-Caster',
    description: 'A Black male in his late 30s with a rich, deep baritone voice. Polished American broadcast anchor delivery with slight East Coast warmth. Velvet resonance — every word lands with weight. Measured, cinematic, deeply assured. Not robotic or stiff — warm and human behind the gravitas. Think a late-night sports anchor who makes every pick sound like history being made.',
    sampleText: 'Ladies and gentlemen, the clock is at zero, and the future just walked through the door. You can have all the measurables in the world, but a grade like that — that is legacy on paper. This pick right here, this is the one they will be talking about in ten years.',
  },
  {
    id: 'astra-novatos',
    name: 'Astra Novatos',
    description: 'A Black male in his early 30s with a smooth, refined tenor voice. Unhurried delivery with a subtle continental polish picked up from years living overseas in Paris. Warm but private, with a slight smokiness. Sounds like aged bourbon — polished, confident, elegant. Never raises his voice. Lets silence do the work between thoughts. Natural pauses, not metronomic.',
    sampleText: 'Before the injury took my game from me, I thought greatness lived on the field. Then I saw the ateliers of Paris and realized greatness lives in the details. There is a version of fly that ages gracefully. That is the only version I teach.',
  },
  {
    id: 'bun-e',
    name: 'Bun-E',
    description: 'A Black female in her late 20s with a smooth, resonant alto voice. Scholarly cadence — commanding but warm. A faint melodic undertone that does not place anywhere specific. Measured and precise, occasional lyrical lift when making a point. Never slang, never loud. Carries authority without raising volume. Sounds like a young professor who memorized the law dictionary for fun.',
    sampleText: 'They keep asking me where I learned the law. I tell them Black\'s Dictionary knows me better than my own reflection. When wisdom meets the system, and the system meets the helm, the ones who built the rules sometimes forget whose rules they serve.',
  },
  {
    id: 'the-colonel',
    name: 'The Colonel',
    description: 'A white male in his late 50s with a thick North Jersey Italian-American accent. Gravelly mid-range voice, nasal vowels, slightly hoarse from decades of yelling at the television. Drops his g\'s, says youse and gonna and fuhgeddaboudit. Sounds like he is broadcasting from the back corner of a pizza shop while still wearing his 1987 varsity letterman jacket. Loud, animated, opinionated, cuts people off.',
    sampleText: 'Lemme tell ya somethin — this kid\'s tape? Forget about it. The athletic profile is there, the intangibles column is screaming. Back at Union in eighty-seven I had a teammate exactly like this. Gino! Gino come here — tell em this kid\'s the real deal.',
  },
  {
    id: 'haze',
    name: 'Haze (AIR P.O.D.)',
    description: 'A Black male in his late 20s with a New York golden-era hip-hop cadence. Mid-range punch with a slight rasp. Quick, rhythmic delivery that builds like a verse. Confident, streetwise, magnetic. Jadakiss and Styles P energy — real New York, not cartoonish. Gets animated when talking investments and money.',
    sampleText: 'Yo, let\'s run it back to the Big Board. Jeremiyah Love at running back one with a ninety-one point eight — the tape is crazy, but what I\'m really watchin is the NIL play. This kid could be the face of a shoe line next spring. Nipsey said it best — you gotta own your master.',
  },
  {
    id: 'smoke',
    name: 'Smoke (AIR P.O.D.)',
    description: 'A Black male in his late 20s with a Houston southern smooth cadence. Deep chesty warmth with grain in the voice. Deliberate, weighty, patient delivery. Professor energy with dry wit. T.I. meets Big Boi meets Pimp C DNA — southern authority without rushing a single word. Gets passionate, never angry, when teaching about financial literacy.',
    sampleText: 'Facts, Haze. But before we talk shoe lines, we talk readiness. The Mastering the NIL playbook starts at AAU — Jeremiyah\'s people been prepping him since high school. That\'s why the brand money lands right. You don\'t build a house from the roof down.',
  },
];

async function designVoice(audition) {
  console.log(`\n━━━ ${audition.name} ━━━`);
  console.log(`  Description: ${audition.description.slice(0, 80)}...`);

  const res = await fetch(DESIGN_URL, {
    method: 'POST',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      voice_description: audition.description,
      text: audition.sampleText,
      model_id: 'eleven_ttv_v3',
      should_enhance: true,
      loudness: 0.5,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`  ✗ FAILED [${res.status}]: ${err}`);
    return null;
  }

  const data = await res.json();
  const previews = data.previews || [];
  console.log(`  ✓ Got ${previews.length} preview(s)`);

  const results = [];
  for (let i = 0; i < previews.length; i++) {
    const p = previews[i];
    const filename = `${audition.id}-preview-${i + 1}.mp3`;
    const filepath = resolve(OUTPUT_DIR, filename);
    const buffer = Buffer.from(p.audio_base_64, 'base64');
    writeFileSync(filepath, buffer);
    console.log(`  Preview ${i + 1}: ${filename} (${(buffer.length / 1024).toFixed(0)} KB) — voice_id: ${p.generated_voice_id}`);
    results.push({
      file: filename,
      generated_voice_id: p.generated_voice_id,
      duration: p.duration_secs,
    });
  }

  return { id: audition.id, name: audition.name, previews: results };
}

async function main() {
  console.log('═══ Per|Form Voice Audition ═══');
  console.log(`Generating ${AUDITIONS.length} voice designs via ElevenLabs Voice Design v3\n`);

  const allResults = [];

  for (const audition of AUDITIONS) {
    const result = await designVoice(audition);
    if (result) allResults.push(result);
    // Rate limit pause
    await new Promise(r => setTimeout(r, 2000));
  }

  // Write manifest
  const manifest = resolve(OUTPUT_DIR, 'audition-manifest.json');
  writeFileSync(manifest, JSON.stringify(allResults, null, 2));
  console.log(`\n═══ Done ═══`);
  console.log(`${allResults.length} voices designed. Previews saved to: ${OUTPUT_DIR}`);
  console.log(`Manifest: ${manifest}`);
  console.log('\nListen to each preview, then tell me which voice_id to use per analyst.');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
