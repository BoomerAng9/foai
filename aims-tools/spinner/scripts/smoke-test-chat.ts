/**
 * Spinner chat smoke test
 * =======================
 * Run with:
 *   OPENROUTER_API_KEY=sk-or-... node --experimental-strip-types scripts/smoke-test-chat.ts
 *
 * Or pull the key from openclaw and run:
 *   ssh myclaw-vps "docker exec openclaw-sop5-openclaw-1 printenv Openrouter_API_Key" \
 *     | xargs -I{} env Openrouter_API_Key={} node --experimental-strip-types scripts/smoke-test-chat.ts
 *
 * This is the verification step Rish requested 2026-04-08:
 *   "We have to make sure the defaulted language model is going to work.
 *    I've had numerous issues with the Gemma model from OpenRouter
 *    working, and I had money on the OpenRouter account."
 *
 * The script tests each engine in the default chain and reports
 * which ones actually answer. Output is human-readable + machine-greppable.
 */

import { chat, DEFAULT_ENGINE_CONFIG, type ChatEngineId } from '../src/chat-engine.js';

const engines: ChatEngineId[] = [
  DEFAULT_ENGINE_CONFIG.primary,
];
if (DEFAULT_ENGINE_CONFIG.multimodalUpgrade) engines.push(DEFAULT_ENGINE_CONFIG.multimodalUpgrade);
if (DEFAULT_ENGINE_CONFIG.fallback) engines.push(DEFAULT_ENGINE_CONFIG.fallback);

const TEST_PROMPT = 'Reply with exactly the four words: Spinner smoke test ok';

interface Result {
  engineId: ChatEngineId;
  ok: boolean;
  latencyMs?: number;
  content?: string;
  costUsd?: number;
  totalTokens?: number;
  error?: string;
}

async function runOne(engineId: ChatEngineId): Promise<Result> {
  const t0 = Date.now();
  try {
    const response = await chat({
      engineId,
      messages: [{ role: 'user', content: TEST_PROMPT }],
      maxTokens: 32,
      temperature: 0,
    });
    return {
      engineId,
      ok: true,
      latencyMs: Date.now() - t0,
      content: response.content.trim(),
      costUsd: response.costUsd,
      totalTokens: response.usage.totalTokens,
    };
  } catch (e) {
    return {
      engineId,
      ok: false,
      latencyMs: Date.now() - t0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function main(): Promise<void> {
  console.log('━'.repeat(72));
  console.log('Spinner chat smoke test');
  console.log('━'.repeat(72));
  console.log(`Default engine config: ${JSON.stringify(DEFAULT_ENGINE_CONFIG, null, 2)}`);
  console.log(`Test prompt: "${TEST_PROMPT}"`);
  console.log('━'.repeat(72));
  console.log('');

  const results: Result[] = [];
  for (const engineId of engines) {
    console.log(`Testing ${engineId}...`);
    const result = await runOne(engineId);
    results.push(result);
    if (result.ok) {
      console.log(`  ✓ OK in ${result.latencyMs}ms — ${result.totalTokens} tokens — $${result.costUsd}`);
      console.log(`  Response: ${result.content}`);
    } else {
      console.log(`  ✗ FAILED in ${result.latencyMs}ms`);
      console.log(`  Error: ${result.error?.slice(0, 200)}`);
    }
    console.log('');
  }

  console.log('━'.repeat(72));
  console.log('Summary');
  console.log('━'.repeat(72));
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`Passed: ${passed}/${results.length}`);
  console.log(`Failed: ${failed}/${results.length}`);
  console.log('');
  for (const r of results) {
    const icon = r.ok ? '✓' : '✗';
    console.log(`  ${icon} ${r.engineId}`);
  }
  console.log('━'.repeat(72));

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(2);
});
