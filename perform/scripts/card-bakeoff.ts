/**
 * Card Aesthetic Bake-Off — test each aesthetic across GPT Image 1.5, Ideogram V3, Recraft V4
 * Run: npx tsx scripts/card-bakeoff.ts
 *
 * Generates cards in parallel across engines, saves to public/generated/bakeoff/
 */

import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
const IDEOGRAM_KEY = process.env.IDEOGRAM_API_KEY || '';
const RECRAFT_KEY = process.env.RECRAFT_API_KEY || '';

const OUT_DIR = path.join(__dirname, '../public/generated/bakeoff');
fs.mkdirSync(OUT_DIR, { recursive: true });

/* ── Test player ── */
const TEST_PLAYER = {
  name: 'Cam Ward',
  position: 'QB',
  school: 'Miami',
  sport: 'football',
  grade: 92,
  teamColors: 'deep green and orange',
};

/* ── The 5 aesthetic prompts — NO BRANDING IN PROMPTS ──
 * Logo is composited AFTER generation using Sharp.
 * TOP-LEFT must be clean/dark for logo overlay zone.
 */
const NO_BRAND = 'IMPORTANT: Do NOT draw any logos, brand marks, lion images, crown images, text watermarks, or any branding anywhere on the image. The top-left corner must be a clean, dark, uncluttered area with no text or graphics. A real logo will be added in post-production.';

const AESTHETICS: Record<string, { prompt: string; negativePrompt?: string; aspectRatio: string }> = {
  blueprint: {
    prompt: `Technical blueprint sports card on dark navy engineering paper with white and cyan grid lines, architectural ruler marks along edges.

CENTER: A football athlete emerging from a technical CAD line drawing — the left half is precise white architectural wireframe sketch (measurements, dimension lines, angle callouts showing athletic metrics), transitioning into a fully rendered photorealistic football athlete wearing a modern sleek helmet with a reflective BLACK MIRROR visor, matte pure gold and deep black helmet shell, jersey in pure gold and deep black on the right half. The transition zone has ink-wash effect where lines become flesh.

ANNOTATIONS: Clean engineering callouts pointing to key body parts with measurement data (arm length, wingspan, height markers in blueprint style).

BOTTOM NAMEPLATE: White technical stencil font "CAM WARD" on dark navy
BELOW: "QB" in cyan blueprint font

${NO_BRAND}

Style: Premium architectural blueprint meets sports card, navy and white and cyan palette, technical drawing precision. All text crisp. NO logos, NO team names on any gear, NO brand marks anywhere.`,
    negativePrompt: 'team logos, mascot logos, conference marks, blurry text, cartoon, amateur, lion logo, crown, brand watermark, text in top-left corner',
    aspectRatio: '3x4',
  },

  animal_archetype: {
    prompt: `Premium sports trading card with dramatic spiritual energy aesthetic.

BACKGROUND: Deep atmospheric dark gradient with ethereal mist and subtle particle effects

FOREGROUND SUBJECT: A football athlete wearing a modern sleek helmet with a reflective BLACK MIRROR visor, deep green and orange jersey, confident hero pose, looking forward

BEHIND THE ATHLETE: A massive towering Eagle silhouette/shadow looming behind them — semi-transparent, ethereal, smoke-like edges, glowing eyes, made of dark energy and gold light particles. The Eagle shadow is 3x larger than the athlete, representing their vision and precision. The animal appears as a spiritual guardian, like a daemon from The Golden Compass.

BOTTOM NAMEPLATE: Bold gold "CAM WARD" on dark matte plate
BELOW: "QB" and small text "EAGLE — vision and precision" in refined gold

${NO_BRAND}

Style: Dark fantasy sports card, ethereal spirit animal, cinematic dramatic lighting, gold and obsidian palette. All text sharp. NO logos on gear, NO brand marks anywhere.`,
    negativePrompt: 'cute cartoon animal, team logos, bright daylight, blurry text, amateur, lion logo, crown, brand watermark, text in top-left corner',
    aspectRatio: '3x4',
  },

  inhuman_emergence: {
    prompt: `Dramatic sci-fi transformation sports card.

CENTER: An athlete breaking free from a massive crystalline cocoon/chrysalis structure. The cocoon is cracking open with deep green and orange energy radiating outward from the fracture lines. Shards of the chrysalis float in mid-air, glowing with internal light. The athlete is mid-emergence — upper body free and powerful, lower body still partially encased in the translucent cocoon shell. Energy wisps and particle effects surround the transformation moment.

The athlete is a football player — QB, muscular athletic build, wearing minimal deep green and orange athletic gear visible through the cocoon fragments. Their posture shows determination and raw power.

BOTTOM NAMEPLATE: Bold metallic "CAM WARD" with energy glow effect
BELOW: "QB" in accent color

${NO_BRAND}

Style: Marvel Agents of SHIELD Terrigenesis inspired, sci-fi meets sports, crystalline structures, energy effects, dramatic backlighting, cinematic transformation moment. NO logos on gear. All text sharp. NO brand marks anywhere.`,
    negativePrompt: 'cartoon, cute, happy, team logos, bright daylight, blurry text, amateur, lion logo, crown, brand watermark, text in top-left corner',
    aspectRatio: '3x4',
  },

  wall_breaker: {
    prompt: `Ultra-dramatic action sports card.

CENTER: A football athlete literally BURSTING THROUGH a thick concrete wall, captured at the exact moment of breakthrough. Massive chunks of concrete and rebar debris flying outward toward the viewer. Dust cloud explosion. The wall has deep green and orange paint on the athlete's side, with raw concrete and steel on the other side.

The athlete (QB) is in a powerful forward-charging pose — maximum intensity, muscles tensed, breaking through with pure force. Wearing deep green and orange athletic gear appropriate for football (NO logos, NO team names on gear).

Dramatic backlighting through the hole in the wall creates a halo/rim light effect around the athlete. Concrete particles suspended in mid-air.

BOTTOM NAMEPLATE: Bold industrial stencil "CAM WARD" — looks stamped into metal
BELOW: "QB" in deep green and orange accent

${NO_BRAND}

Style: Michael Bay-level destruction, hyper-realistic concrete physics, cinematic slow-motion debris, raw power aesthetic. All text sharp. NO logos, NO brand marks anywhere.`,
    negativePrompt: 'cartoon, gentle, peaceful, team logos, clean wall, no debris, blurry text, amateur, lion logo, crown, brand watermark, text in top-left corner',
    aspectRatio: '3x4',
  },

  commitment: {
    prompt: `Premium college commitment announcement graphic.

LAYOUT: Split-composition sports graphic, portrait orientation

TOP SECTION (40%): Dark atmospheric background with deep green and orange gradient smoke/mist. Large bold 3D chrome text "COMMITTED" in an arc or banner — dramatic, extruded, metallic finish with deep green and orange reflections. NOT flat text.

CENTER (40%): The athlete — a football athlete wearing a modern sleek helmet with a reflective BLACK MIRROR visor, deep green and orange jersey, powerful hero pose — slightly off-center left. Behind them, a faint Eagle silhouette in deep green and orange. To the right, the school identity represented ONLY by deep green and orange color blocks and patterns (NO logos, NO mascots).

BOTTOM SECTION (20%): Clean dark panel with:
- "CAM WARD" in large bold deep green and orange metallic text
- "QB | Class of 2027" in white
- "MIAMI" in deep green and orange accent

${NO_BRAND}

Style: Premium sports commitment graphic, broadcast quality, 3D metallic typography, cinematic composition. Darker, more cinematic, spirit-animal-infused. All text sharp. NO school logos, NO mascot images, NO brand marks anywhere.`,
    negativePrompt: 'bright white background, school logos, mascot images, conference marks, cartoon, amateur, lion logo, crown, brand watermark, text in top-left corner',
    aspectRatio: '4x5',
  },
};

/* ── Engine calls ── */

async function callGPTImage(prompt: string, ar: string): Promise<{ url: string | null; ms: number; error?: string }> {
  if (!OPENROUTER_KEY) return { url: null, ms: 0, error: 'No OPENROUTER_API_KEY' };
  const start = Date.now();

  // OpenRouter serves image models via chat completions, not /images/generations
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENROUTER_KEY}` },
      body: JSON.stringify({
        model: 'openai/gpt-image-1',
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return { url: null, ms: Date.now() - start, error: `openrouter ${res.status}: ${err.slice(0, 300)}` };
    }
    const data = await res.json();
    // OpenRouter returns image URL in content or as base64
    const content = data.choices?.[0]?.message?.content || '';
    // Check if content is a URL
    const urlMatch = content.match(/https?:\/\/[^\s"]+\.(png|jpg|jpeg|webp)/i);
    if (urlMatch) return { url: urlMatch[0], ms: Date.now() - start };
    // Check for base64 data URL
    if (content.startsWith('data:image')) {
      const b64 = content.split(',')[1];
      const fname = `gpt_${Date.now()}.png`;
      fs.writeFileSync(path.join(OUT_DIR, fname), Buffer.from(b64, 'base64'));
      return { url: `/generated/bakeoff/${fname}`, ms: Date.now() - start };
    }
    // Check data array format
    const imgUrl = data.data?.[0]?.url || data.data?.[0]?.b64_json;
    if (imgUrl) return { url: imgUrl, ms: Date.now() - start };
    return { url: null, ms: Date.now() - start, error: `No image in response: ${content.slice(0, 200)}` };
  } catch (err) {
    return { url: null, ms: Date.now() - start, error: String(err) };
  }
}

/* ── GPT Image 1.5 via Kie.ai (async task pattern) ── */
const KIE_KEY = process.env.KIE_AI_API_KEY || '';
const KIE_HEADERS = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${KIE_KEY}` });

async function pollKieTask(taskId: string, maxWaitMs: number = 120000): Promise<string | null> {
  const deadline = Date.now() + maxWaitMs;
  const pollInterval = 3000;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, pollInterval));

    // Try the jobs endpoint first, then fall back to 4o endpoint
    for (const url of [
      `https://api.kie.ai/api/v1/jobs/taskInfo?taskId=${taskId}`,
      `https://api.kie.ai/api/v1/gpt4o-image/record-info?taskId=${taskId}`,
    ]) {
      try {
        const res = await fetch(url, { headers: KIE_HEADERS(), signal: AbortSignal.timeout(10000) });
        if (!res.ok) continue;
        const data = await res.json();

        // Check various response shapes Kie uses
        const info = data.data?.info || data.data || {};
        const successFlag = info.successFlag ?? data.data?.successFlag;

        if (successFlag === 2) return null; // failed

        const urls = info.result_urls || info.resultUrls || data.data?.result_urls;
        if (urls?.length > 0) return urls[0];

        // Check output field (jobs API format)
        const output = data.data?.output;
        if (output?.images?.[0]?.url) return output.images[0].url;
        if (typeof output === 'string' && output.startsWith('http')) return output;
      } catch { /* try next URL */ }
    }
  }
  return null;
}

async function callGPTImageViaKie(prompt: string, ar: string): Promise<{ url: string | null; ms: number; error?: string }> {
  if (!KIE_KEY) return { url: null, ms: 0, error: 'No KIE_AI_API_KEY' };
  const aspectRatio = ar === '4x5' ? '2:3' : '2:3'; // portrait
  const start = Date.now();

  try {
    // Step 1: Create task
    const res = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'POST',
      headers: KIE_HEADERS(),
      body: JSON.stringify({
        model: 'gpt-image/1.5-text-to-image',
        input: {
          prompt,
          aspect_ratio: aspectRatio,
          quality: 'high',
        },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return { url: null, ms: Date.now() - start, error: `kie create ${res.status}: ${err.slice(0, 300)}` };
    }

    const data = await res.json();
    const taskId = data.data?.taskId;
    if (!taskId) {
      return { url: null, ms: Date.now() - start, error: `kie no taskId: ${JSON.stringify(data).slice(0, 200)}` };
    }

    console.log(`    [kie] task created: ${taskId}, polling...`);

    // Step 2: Poll for result
    const imageUrl = await pollKieTask(taskId);
    if (!imageUrl) {
      return { url: null, ms: Date.now() - start, error: `kie task ${taskId} timed out or failed` };
    }

    return { url: imageUrl, ms: Date.now() - start };
  } catch (err) {
    return { url: null, ms: Date.now() - start, error: String(err) };
  }
}

async function callIdeogram(prompt: string, ar: string, neg?: string): Promise<{ url: string | null; ms: number; error?: string }> {
  if (!IDEOGRAM_KEY) return { url: null, ms: 0, error: 'No IDEOGRAM_API_KEY' };
  const aspectRatio = ar === '4x5' ? '4x5' : '3x4';
  const start = Date.now();
  try {
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('rendering_speed', 'TURBO');
    formData.append('style_type', 'DESIGN');
    formData.append('aspect_ratio', aspectRatio);
    if (neg) formData.append('negative_prompt', neg);

    const res = await fetch('https://api.ideogram.ai/v1/ideogram-v3/generate', {
      method: 'POST',
      headers: { 'Api-Key': IDEOGRAM_KEY },
      body: formData,
      signal: AbortSignal.timeout(90000),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return { url: null, ms: Date.now() - start, error: `${res.status}: ${err.slice(0, 200)}` };
    }
    const data = await res.json();
    return { url: data.data?.[0]?.url || null, ms: Date.now() - start };
  } catch (err) {
    return { url: null, ms: Date.now() - start, error: String(err) };
  }
}

async function callRecraft(prompt: string, ar: string): Promise<{ url: string | null; ms: number; error?: string }> {
  if (!RECRAFT_KEY) return { url: null, ms: 0, error: 'No RECRAFT_API_KEY' };
  const size = ar === '4x5' ? '896x1152' : '768x1344';
  const start = Date.now();
  try {
    const res = await fetch('https://external.api.recraft.ai/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RECRAFT_KEY}` },
      body: JSON.stringify({ prompt, model: 'recraftv4', n: 1, size }),
      signal: AbortSignal.timeout(90000),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return { url: null, ms: Date.now() - start, error: `${res.status}: ${err.slice(0, 200)}` };
    }
    const data = await res.json();
    return { url: data.data?.[0]?.url || null, ms: Date.now() - start };
  } catch (err) {
    return { url: null, ms: Date.now() - start, error: String(err) };
  }
}

/* ── Download image to local file ── */
async function downloadImage(url: string, filename: string): Promise<string> {
  if (url.startsWith('/')) return url; // already local
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = url.includes('.webp') ? '.webp' : '.png';
  const outPath = path.join(OUT_DIR, `${filename}${ext}`);
  fs.writeFileSync(outPath, buffer);
  return `/generated/bakeoff/${filename}${ext}`;
}

/* ── Main ── */
async function main() {
  console.log('=== Per|Form Card Bake-Off ===');
  console.log(`Player: ${TEST_PLAYER.name} | ${TEST_PLAYER.position} | ${TEST_PLAYER.school}`);
  console.log(`Engines: GPT Image 1.5, Ideogram V3, Recraft V4`);
  console.log(`Aesthetics: ${Object.keys(AESTHETICS).join(', ')}`);
  console.log(`Output: ${OUT_DIR}`);
  console.log('');

  const results: Array<{ aesthetic: string; engine: string; url: string | null; ms: number; localPath?: string; error?: string }> = [];

  // Quick test: just blueprint first, then run all
  const testOnly = process.argv.includes('--test');
  const entries = testOnly
    ? Object.entries(AESTHETICS).slice(0, 1)
    : Object.entries(AESTHETICS);

  for (const [name, spec] of entries) {
    console.log(`\n--- ${name.toUpperCase()} ---`);

    // Recraft only — won the last bake-off
    const [recraft] = await Promise.all([
      callRecraft(spec.prompt, spec.aspectRatio),
    ]);

    // Download successful results
    for (const [engine, result] of [['recraft_v4', recraft]] as const) {
      const entry: typeof results[number] = { aesthetic: name, engine, url: result.url, ms: result.ms, error: result.error };

      if (result.url) {
        try {
          entry.localPath = await downloadImage(result.url, `${name}_${engine}`);
          console.log(`  ✓ ${engine}: ${result.ms}ms → ${entry.localPath}`);
        } catch (dlErr) {
          console.log(`  ✓ ${engine}: ${result.ms}ms → URL: ${result.url} (download failed: ${dlErr})`);
        }
      } else {
        console.log(`  ✗ ${engine}: ${result.ms}ms → ${result.error || 'no image returned'}`);
      }

      results.push(entry);
    }
  }

  // Summary
  console.log('\n\n=== SUMMARY ===');
  console.log(`Total generations: ${results.length}`);
  console.log(`Successful: ${results.filter(r => r.url).length}`);
  console.log(`Failed: ${results.filter(r => !r.url).length}`);

  const byEngine: Record<string, { ok: number; fail: number; avgMs: number }> = {};
  for (const r of results) {
    if (!byEngine[r.engine]) byEngine[r.engine] = { ok: 0, fail: 0, avgMs: 0 };
    if (r.url) byEngine[r.engine].ok++;
    else byEngine[r.engine].fail++;
    byEngine[r.engine].avgMs += r.ms;
  }
  for (const [engine, stats] of Object.entries(byEngine)) {
    const total = stats.ok + stats.fail;
    stats.avgMs = Math.round(stats.avgMs / total);
    console.log(`  ${engine}: ${stats.ok}/${total} success, avg ${stats.avgMs}ms`);
  }

  // Write results JSON
  const jsonPath = path.join(OUT_DIR, 'bakeoff-results.json');
  fs.writeFileSync(jsonPath, JSON.stringify({ player: TEST_PLAYER, results, generatedAt: new Date().toISOString() }, null, 2));
  console.log(`\nResults saved: ${jsonPath}`);
}

main().catch(console.error);
