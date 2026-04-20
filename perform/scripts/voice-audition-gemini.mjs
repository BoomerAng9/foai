#!/usr/bin/env node

/**
 * voice-audition-gemini.mjs
 * ==========================
 * Owner-approval audition for the Per|Form analyst voice picks.
 * Generates short samples per analyst with:
 *   1. Character voice handoff spec sample line (from personas.ts canon)
 *   2. Dialect-shifted via dialect-guides.ts (Belter / Cali / Houston / NJ / Continental)
 *   3. Gemini 3.1 Flash TTS — solos via prebuiltVoiceConfig, duos via multiSpeakerVoiceConfig
 *   4. Saved to perform/public/auditions/<analyst>.wav for browser playback
 *
 * Idempotent — overwrites prior audition files.
 *
 * Run:  GEMINI_API_KEY=$(grep GEMINI_API_KEY ../cti-hub/.env.local | cut -d= -f2) \
 *       node scripts/voice-audition-gemini.mjs
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(PROJECT_ROOT, 'public', 'auditions');
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// Auto-load .env.local if present
const envPath = resolve(PROJECT_ROOT, '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
  }
}

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error('GEMINI_API_KEY required'); process.exit(1); }

const MODEL = 'gemini-3.1-flash-tts-preview';
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;

// ── Inline dialect transforms (small subset — full library at lib/analysts/dialect-guides.ts) ─
// These mirror the canonical guide so the audition stays self-contained for JS execution.
const DIALECT = {
  'void-caster': {
    swaps: { 'the': 'da', 'that': 'dat', 'this': 'dis', 'them': 'dem', 'they': 'dey',
             'these': 'dese', 'those': 'dose', 'thing': 'ting', 'think': 'tink',
             'nothing': 'nutting', 'something': 'someting', 'brother': 'beratna',
             'friend': 'kopeng', 'understand': 'sabe' },
    phonetic: { 'feel': 'fee-oo', 'real': 'ree-oo', 'will': 'wi-oo' },
  },
  'bun-e': {
    swaps: { 'the': 'da', 'that': 'dat', 'this': 'dis', 'them': 'dem', 'they': 'dey',
             'thing': 'ting', 'think': 'tink', 'understand': 'sabe', 'friend': 'kopeng' },
    phonetic: { 'feel': 'fee-oo', 'real': 'ree-oo' },
  },
  'the-haze': {
    swaps: { 'very': 'hella', 'really': 'hella', 'for sure': 'fasho', 'man': 'bro',
             'cool': 'fire', 'money': 'bread', 'understand': 'feel me' },
    phonetic: { 'going to': 'gonna', 'about': 'bout', 'because': 'cuz' },
  },
  'smoke': {
    swaps: { 'about to': 'fixin to', 'you all': 'yall', 'you guys': 'yall',
             'isn\'t that right': 'aint that right', 'very': 'real', 'money': 'paper' },
    phonetic: { 'going': 'goin', 'doing': 'doin', 'nothing': 'nothin' },
  },
  'the-colonel': {
    swaps: { 'forget about it': 'fuhgeddaboudit', 'you all': 'youse', 'you guys': 'youse',
             'come here': 'come \'ere', 'mozzarella': 'mutzadell', 'capicola': 'gabagool' },
    phonetic: { 'going': 'goin', 'talking': 'talkin', 'watching': 'watchin', 'butter': 'buttah',
                'better': 'bettah', 'over': 'ovah', 'never': 'nevah' },
  },
  'astra-novatos': {
    swaps: { 'don\'t': 'do not', 'won\'t': 'will not', 'can\'t': 'cannot',
             'it\'s': 'it is', 'that\'s': 'that is', 'I\'m': 'I am' },
    phonetic: {},
  },
};

function applyDialect(text, analystId) {
  const guide = DIALECT[analystId];
  if (!guide) return text;
  let r = text;
  for (const [k, v] of Object.entries({ ...guide.swaps, ...guide.phonetic })) {
    const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'gi');
    r = r.replace(re, (m) => (m[0] === m[0].toUpperCase() ? v.charAt(0).toUpperCase() + v.slice(1) : v));
  }
  return r;
}

// ── PCM → WAV wrapper ────────────────────────────────────────────────
function pcmToWav(pcmBase64, sampleRate = 24000) {
  const pcm = Buffer.from(pcmBase64, 'base64');
  const len = pcm.length;
  const wav = Buffer.alloc(44 + len);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + len, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);  // PCM
  wav.writeUInt16LE(1, 22);  // mono
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(len, 40);
  pcm.copy(wav, 44);
  return wav;
}

// ── Audition definitions — short canonical sample line per character ──
const AUDITIONS = [
  {
    id: 'void-caster',
    voice: 'Charon',
    text: 'Welcome to the Per|Form Platform. The clock hits zero, and the future just walked through the door. You can have all the measurables in this realm, but a grade like that is legacy on paper. This pick right here, this is the one they will be talking about in ten years.',
  },
  {
    id: 'astra-novatos',
    voice: 'Orus',
    text: 'Before the injury took my game from me, I thought greatness lived on the field. Then I saw the ateliers of Paris and realized greatness lives in the details. There is a version of fly that ages gracefully. That is the only version I teach.',
  },
  {
    id: 'bun-e',
    voice: 'Kore',
    text: 'Good evening. This is Phone Home With Bun-E. They keep asking me where I learned the law. I tell them Black\'s Dictionary knows me better than my own reflection. The tape says one thing, the intangibles column says another. Between them lives the player.',
  },
  {
    id: 'the-haze',
    voice: 'Algieba',
    text: 'Real talk, the running back at number one is fire. Tape is fire, bro. Hella fast, hella decisive. The NIL play here is what I am watching. That is mailbox money if you set it up right, feel me. You gotta own your master.',
  },
  {
    id: 'smoke',
    voice: 'Sadaltager',
    text: 'Look man, this kid is fixin to be something special. The tape do not lie, and I am tellin you, that boy cold. The playbook says you start at AAU. His people been doing this right from day one. Real solid prep.',
  },
];

// Multi-speaker auditions (duos)
const DUO_AUDITIONS = [
  {
    id: 'haze-duo',
    speakerVoices: { HAZE: 'Algieba', SMOKE: 'Sadaltager' },
    script: `HAZE: Nah but listen, this running back at number one. Tape is hella crazy bro. The NIL play is mailbox money.\n\nSMOKE: Look man, the playbook says you start at AAU. His people been doing this right. That is real solid prep.\n\nHAZE: Fasho. You gotta own your master.`,
  },
  {
    id: 'colonel-duo',
    speakerVoices: { COLONEL: 'Algenib', GINO: 'Rasalgethi' },
    script: `COLONEL: Lemme tell ya somethin — this kids tape, fuhgeddaboudit. Back at Union in eighty-seven I had a teammate exactly like this.\n\nGINO: And the rent, Colonel? When you payin the rent?\n\nCOLONEL: Gino come 'ere — tell em this kids the real deal. Thats football, baby.`,
  },
];

async function generateSolo(text, voiceName) {
  const body = {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
    },
  };
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini TTS [${res.status}]: ${err.slice(0, 300)}`);
  }
  const data = await res.json();
  const inline = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!inline?.data) throw new Error(`No audio in response: ${JSON.stringify(data).slice(0, 200)}`);
  return pcmToWav(inline.data);
}

async function generateDuo(script, speakerVoices) {
  const speakerVoiceConfigs = Object.entries(speakerVoices).map(([speaker, voiceName]) => ({
    speaker,
    voiceConfig: { prebuiltVoiceConfig: { voiceName } },
  }));
  const body = {
    contents: [{ parts: [{ text: script }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { multiSpeakerVoiceConfig: { speakerVoiceConfigs } },
    },
  };
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini multi-speaker [${res.status}]: ${err.slice(0, 300)}`);
  }
  const data = await res.json();
  const inline = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!inline?.data) throw new Error(`No audio in response: ${JSON.stringify(data).slice(0, 200)}`);
  return pcmToWav(inline.data);
}

(async () => {
  const start = Date.now();
  console.log(`[audition] model=${MODEL}`);
  console.log(`[audition] output=${OUT_DIR}`);
  let success = 0;
  let fail = 0;

  for (const a of AUDITIONS) {
    const dialected = applyDialect(a.text, a.id);
    const out = resolve(OUT_DIR, `${a.id}.wav`);
    process.stdout.write(`[audition] ${a.id.padEnd(15)} voice=${a.voice.padEnd(12)} chars=${dialected.length} ... `);
    try {
      const wav = await generateSolo(dialected, a.voice);
      writeFileSync(out, wav);
      console.log(`OK (${(wav.length / 1024).toFixed(1)}KB)`);
      console.log(`  script: "${dialected.slice(0, 110)}..."`);
      success++;
    } catch (err) {
      console.log(`FAIL: ${err.message.slice(0, 200)}`);
      fail++;
    }
  }

  for (const d of DUO_AUDITIONS) {
    const out = resolve(OUT_DIR, `${d.id}.wav`);
    const speakers = Object.entries(d.speakerVoices).map(([s, v]) => `${s}=${v}`).join(', ');
    process.stdout.write(`[audition] ${d.id.padEnd(15)} multi-speaker ${speakers} ... `);
    try {
      const wav = await generateDuo(d.script, d.speakerVoices);
      writeFileSync(out, wav);
      console.log(`OK (${(wav.length / 1024).toFixed(1)}KB)`);
      success++;
    } catch (err) {
      console.log(`FAIL: ${err.message.slice(0, 200)}`);
      fail++;
    }
  }

  console.log(`\n[audition] success=${success} fail=${fail} elapsed=${((Date.now() - start) / 1000).toFixed(1)}s`);
  console.log(`[audition] playback: open perform/public/auditions/<id>.wav OR run \`npm run dev\` and open http://localhost:3000/auditions/<id>.wav`);
})();
