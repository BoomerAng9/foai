import postgres from 'postgres';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
if (!OPENROUTER_API_KEY) { console.error('OPENROUTER_API_KEY required'); process.exit(1); }
const MODEL = 'anthropic/claude-haiku-4-5';

const sql = postgres(process.env.DATABASE_URL || '');
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

// AI slop patterns — case insensitive
const SLOP_PATTERNS = [
  /projects?\s+as/i,
  /profiles?\s+as/i,
  /\bshowcases?\b/i,
  /\bcomprehensive\b/i,
  /\bdemonstrates?\b/i,
  /\bprowess\b/i,
  /\bin\s+conclusion\b/i,
  /\bversatile\b/i,
];

// "elite" is slop UNLESS it's part of a grade tier name like "Elite Prospect"
function hasEliteSlop(text) {
  if (!text) return false;
  const eliteMatches = text.match(/\belite\b/gi);
  if (!eliteMatches) return false;
  // Allow "Elite Prospect" as a tier name
  const cleaned = text.replace(/elite\s+prospect/gi, '');
  return /\belite\b/i.test(cleaned);
}

function containsSlop(text) {
  if (!text) return true; // null/empty = needs rewrite
  if (hasEliteSlop(text)) return true;
  return SLOP_PATTERNS.some(p => p.test(text));
}

function needsRewrite(player) {
  const summary = player.scouting_summary || '';
  // Short summaries always need rewrite
  if (summary.length < 80) return true;
  // If longer than 150 and NO slop, skip (likely hand-written)
  if (summary.length > 150 && !containsSlop(summary)) return false;
  // Otherwise check for slop
  return containsSlop(summary);
}

const SYSTEM_PROMPT = `You are a Per|Form Platform scout writing a scouting report. Write like a real NFL scout talking to another scout — direct, specific, honest. 2-3 sentences max. Reference the player's position, school, specific strengths and weaknesses. Give ONE honest NFL comparison. Never use: 'projects as', 'profiles as', 'elite' (unless in grade tier name), 'showcases', 'comprehensive', 'demonstrates', 'prowess', 'in conclusion', 'versatile'. Never start with the player's name. Start with what makes them interesting or what their tape shows.`;

async function generateSummary(player) {
  const userPrompt = `Write a 2-3 sentence scout report for ${player.name}, ${player.position} from ${player.school}. Grade: ${player.grade || 'N/A'}. Projected round: ${player.projected_round || 'N/A'}. Strengths: ${player.strengths || 'N/A'}. Weaknesses: ${player.weaknesses || 'N/A'}. NFL comparison: ${player.nfl_comparison || 'N/A'}.`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://perform.foai.cloud',
      'X-Title': 'Per|Form Scouting Batch',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 250,
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Empty response from model');

  // Strip any thinking tags the model might produce
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  if (!cleaned) throw new Error('Response was only thinking tags');

  return cleaned;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Fetching all players from perform_players...\n');

  const allPlayers = await sql`
    SELECT id, name, position, school, grade, projected_round,
           strengths, weaknesses, nfl_comparison, scouting_summary
    FROM perform_players
    ORDER BY id
  `;

  console.log(`Total players in DB: ${allPlayers.length}`);

  // Filter to those needing rewrite
  const toRewrite = allPlayers.filter(needsRewrite);
  console.log(`Players needing rewrite: ${toRewrite.length}\n`);

  if (toRewrite.length === 0) {
    console.log('Nothing to do.');
    await sql.end();
    return;
  }

  let updated = 0;
  let errors = 0;

  for (let i = 0; i < toRewrite.length; i++) {
    const player = toRewrite[i];
    const label = `[${i + 1}/${toRewrite.length}]`;

    try {
      const newSummary = await generateSummary(player);

      await sql`
        UPDATE perform_players
        SET scouting_summary = ${newSummary},
            updated_at = NOW()
        WHERE id = ${player.id}
      `;

      console.log(`${label} Rewrote: ${player.name} (${player.position}, ${player.school})`);
      updated++;
    } catch (err) {
      console.error(`${label} ERROR on ${player.name}: ${err.message}`);
      errors++;

      // If rate limited, wait longer and retry once
      if (err.message.includes('429') || err.message.includes('rate')) {
        console.log('  Rate limited — waiting 5s and retrying...');
        await sleep(5000);
        try {
          const newSummary = await generateSummary(player);
          await sql`
            UPDATE perform_players
            SET scouting_summary = ${newSummary},
                updated_at = NOW()
            WHERE id = ${player.id}
          `;
          console.log(`${label} RETRY OK: ${player.name}`);
          updated++;
          errors--; // undo the error count
        } catch (retryErr) {
          console.error(`${label} RETRY FAILED: ${retryErr.message}`);
        }
      }
    }

    // Rate limit: 1 request per second
    if (i < toRewrite.length - 1) {
      await sleep(1000);
    }
  }

  console.log(`\nDone. Updated: ${updated}, Errors: ${errors}, Total: ${toRewrite.length}`);
  await sql.end();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
