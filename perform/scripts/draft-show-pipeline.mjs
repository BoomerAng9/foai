#!/usr/bin/env node

/**
 * Draft Show Pipeline — Headless
 * ================================
 * Generates 32 first-round prospect breakdown scripts + TTS audio.
 * Each analyst covers specific prospects. Mel Kiper First Draft style.
 *
 * Phase 1: Script generation (LLM writes analyst breakdown per prospect)
 * Phase 2: TTS audio (ElevenLabs with approved voices)
 * Phase 3: Assembly (scripts + audio saved to DB + GCS)
 *
 * Usage: GEMINI_API_KEY=... ELEVENLABS_API_KEY=... DATABASE_URL=... node scripts/draft-show-pipeline.mjs
 */

import postgres from 'postgres';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = resolve(__dirname, '..', 'public', 'generated', 'audio', 'draft-show');

if (!existsSync(AUDIO_DIR)) mkdirSync(AUDIO_DIR, { recursive: true });

const DATABASE_URL = process.env.DATABASE_URL;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }
if (!GEMINI_API_KEY) { console.error('GEMINI_API_KEY required'); process.exit(1); }

const sql = postgres(DATABASE_URL, { ssl: 'require', max: 3 });

// Approved voice IDs
const VOICE_MAP = {
  'void-caster':   'CGwQbqtvs7tmGnCcGS8C',
  'astra-novatos': 'Hrh6p8s8pMkK1MsFVcJV',
  'bun-e':         'l8GG2jgNX1cxmHhWY9xd',
  'the-colonel':   'JCkiVgQNSEVZj5oIolmM',
  'the-haze':      'mVnUIJrt7ADr33byr6uw',
};

const ANALYST_NAMES = {
  'void-caster': 'The Void-Caster',
  'astra-novatos': 'Astra Novatos',
  'bun-e': 'Bun-E',
  'the-colonel': 'The Colonel',
  'the-haze': 'Haze',
};

// Assignment: Top 5 → one analyst each, remaining 27 → split evenly (~5-6 each)
const ANALYSTS = ['void-caster', 'astra-novatos', 'bun-e', 'the-colonel', 'the-haze'];

function assignAnalysts(prospects) {
  const assignments = [];
  for (let i = 0; i < prospects.length; i++) {
    const analystIdx = i % ANALYSTS.length;
    assignments.push({
      ...prospects[i],
      analyst_id: ANALYSTS[analystIdx],
      analyst_name: ANALYST_NAMES[ANALYSTS[analystIdx]],
    });
  }
  return assignments;
}

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';

async function generateScript(prospect, analystId) {
  const systemPrompts = {
    'void-caster': 'You are The Void-Caster, lead broadcast analyst. Belter Creole accent influence — deep baritone, cinematic delivery. Every take ends with a signature line that hits. You speak with the weight of someone from another realm.',
    'astra-novatos': 'You are Astra Novatos, luxury brand analyst. Smooth refined tenor, unhurried, continental polish. You read football tape like cashmere — through the details. Fashion metaphors surface naturally.',
    'bun-e': 'You are Bun-E, scholar and host of Phone Home With Bun-E. Smooth resonant alto, scholarly cadence. You cite Black\'s Law Dictionary naturally. Occasional words rhyme when wisdom drops.',
    'the-colonel': 'You are The Colonel, broadcasting from Marlisecio\'s Pizza in North Jersey. Thick Jersey accent, gravelly, animated. Reference Union High 1987. Call for Gino occasionally. You actually know ball.',
    'the-haze': 'You are Haze from AIR P.O.D. Cali cadence, Nipsey Hussle marathon mindset. Talk mailbox money, NIL ventures, ownership. Laid-back but sharp.',
  };

  const userPrompt = `Write a 60-90 second draft night breakdown for this prospect. Mel Kiper-style — direct, opinionated, specific. NOT generic.

Player: ${prospect.name}
Position: ${prospect.position}
School: ${prospect.school}
Grade: ${prospect.grade}
Projected Round: ${prospect.projected_round}
Strengths: ${prospect.strengths || 'N/A'}
Weaknesses: ${prospect.weaknesses || 'N/A'}
NFL Comparison: ${prospect.nfl_comparison || 'N/A'}

Rules:
- 150-250 words MAX
- Start with the pick context ("With the ${prospect.pick_number || '?'} pick...")
- Reference specific tape observations
- Give your honest grade assessment
- End with your signature take
- Stay in character — personality comes through naturally, never announced
- NO: "projects as", "showcases", "comprehensive", "demonstrates"`;

  // Try Gemini first, fall back to OpenRouter (Claude Haiku)
  let text = null;

  // Gemini attempt
  if (GEMINI_API_KEY) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompts[analystId] + '\n\n' + userPrompt }] }],
            generationConfig: { maxOutputTokens: 500, temperature: 0.85 },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      }
    } catch {}
  }

  // OpenRouter fallback (Claude Haiku)
  if (!text && OPENROUTER_KEY) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://perform.foai.cloud',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4-5',
        messages: [
          { role: 'system', content: systemPrompts[analystId] },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 500,
        temperature: 0.85,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      text = data.choices?.[0]?.message?.content?.trim();
    }
  }

  if (!text) throw new Error('Both Gemini and OpenRouter failed');
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

async function generateTTS(text, voiceId) {
  if (!ELEVENLABS_API_KEY) return null;

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text: text.slice(0, 4500),
      model_id: 'eleven_v3',
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3 },
    }),
  });

  if (!res.ok) {
    console.error(`    TTS FAIL [${res.status}]`);
    return null;
  }

  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const mode = process.argv[2] || 'scripts'; // 'scripts' or 'full' (scripts + audio)

  console.log('=== Draft Show Pipeline ===');
  console.log(`Mode: ${mode}`);
  console.log('');

  // Get top 32 prospects by grade
  const prospects = await sql`
    SELECT name, position, school, grade, projected_round, strengths, weaknesses, nfl_comparison, scouting_summary
    FROM perform_players
    ORDER BY grade DESC
    LIMIT 32
  `;

  console.log(`${prospects.length} prospects loaded\n`);

  // Assign analysts
  const assignments = assignAnalysts(prospects);

  // Add pick numbers
  assignments.forEach((a, i) => { a.pick_number = i + 1; });

  let scriptSuccess = 0;
  let audioSuccess = 0;

  for (const prospect of assignments) {
    console.log(`[${prospect.pick_number}] ${prospect.name} (${prospect.position}, ${prospect.school})`);
    console.log(`  Analyst: ${prospect.analyst_name}`);

    try {
      // Phase 1: Generate script
      const script = await generateScript(prospect, prospect.analyst_id);
      console.log(`  Script: ${script.length} chars`);
      scriptSuccess++;

      // Save script to DB as podcast episode
      const title = `Draft Night: ${prospect.name} — ${prospect.analyst_name}`;
      await sql`
        INSERT INTO podcast_episodes (analyst_id, title, transcript, type, audio_url)
        VALUES (${prospect.analyst_id}, ${title}, ${script}, 'draft-breakdown', NULL)
        ON CONFLICT DO NOTHING
      `;

      // Phase 2: Generate audio (if full mode)
      if (mode === 'full' && ELEVENLABS_API_KEY) {
        const voiceId = VOICE_MAP[prospect.analyst_id];
        const audio = await generateTTS(script, voiceId);
        if (audio) {
          const filename = `draft-${prospect.pick_number}-${prospect.name.toLowerCase().replace(/\s+/g, '-')}.mp3`;
          const filepath = resolve(AUDIO_DIR, filename);
          writeFileSync(filepath, audio);
          const audioUrl = `/generated/audio/draft-show/${filename}`;
          await sql`
            UPDATE podcast_episodes SET audio_url = ${audioUrl}
            WHERE title = ${title} AND analyst_id = ${prospect.analyst_id}
          `;
          console.log(`  Audio: ${(audio.length / 1024).toFixed(0)} KB`);
          audioSuccess++;
        }
        await new Promise(r => setTimeout(r, 1500)); // Rate limit
      }
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 500)); // Gemini rate limit
  }

  console.log(`\n=== Done ===`);
  console.log(`Scripts: ${scriptSuccess}/32`);
  if (mode === 'full') console.log(`Audio: ${audioSuccess}/32`);

  await sql.end();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
