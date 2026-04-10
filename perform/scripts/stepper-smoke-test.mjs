#!/usr/bin/env node
/**
 * Stepper / Webhook Smoke Test
 * ==============================
 * Tests the full webhook pipeline: ping, grade, lookup, generate-post, stats.
 *
 * Usage:
 *   node scripts/stepper-smoke-test.mjs --url https://perform.foai.cloud
 *   node scripts/stepper-smoke-test.mjs --url http://localhost:3000
 */

const BASE = process.argv.find(a => a.startsWith('--url='))?.split('=')[1]
  || process.argv[process.argv.indexOf('--url') + 1]
  || 'https://perform.foai.cloud';

const WEBHOOK = `${BASE}/api/webhooks/stepper`;

let passed = 0;
let failed = 0;

async function test(name, fn) {
  const start = Date.now();
  try {
    await fn();
    const ms = Date.now() - start;
    console.log(`  PASS  ${name} (${ms}ms)`);
    passed++;
  } catch (err) {
    const ms = Date.now() - start;
    console.log(`  FAIL  ${name} (${ms}ms) — ${err.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

async function post(body) {
  const res = await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

console.log(`\nStepper Smoke Test — ${BASE}\n${'='.repeat(50)}\n`);

// Test 1: Ping
await test('1. Ping', async () => {
  const { status, data } = await post({ action: 'ping', source: 'smoke-test' });
  assert(status === 200, `Expected 200, got ${status}`);
  assert(data.ok === true, 'Expected ok: true');
  assert(data.result?.pong === true, 'Expected pong: true');
});

// Test 2: Grade lookup
await test('2. Grade lookup (David Bailey)', async () => {
  const { status, data } = await post({ action: 'grade', source: 'smoke-test', payload: { name: 'Bailey' } });
  assert(status === 200, `Expected 200, got ${status}`);
  assert(data.ok === true, 'Expected ok: true');
  assert(data.result?.count > 0, 'Expected at least 1 player');
});

// Test 3: CFB lookup
await test('3. CFB lookup (Simpson)', async () => {
  const { status, data } = await post({ action: 'lookup', source: 'smoke-test', payload: { search: 'Simpson' } });
  assert(status === 200, `Expected 200, got ${status}`);
  assert(data.ok === true, 'Expected ok: true');
  assert(data.result?.count > 0, 'Expected at least 1 CFB player');
});

// Test 4: Generate Huddle post
await test('4. Generate Huddle post (void-caster, Bailey)', async () => {
  const { status, data } = await post({
    action: 'generate-post',
    source: 'smoke-test',
    payload: { analyst_id: 'void-caster', post_type: 'take', player: 'Bailey' },
  });
  assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data).slice(0, 200)}`);
  assert(data.ok === true, `Expected ok: true, got: ${JSON.stringify(data).slice(0, 200)}`);
  assert(data.result?.generated === true, 'Expected generated: true');
});

// Test 5: Reliability stats
await test('5. Reliability stats (GET)', async () => {
  const res = await fetch(WEBHOOK);
  const data = await res.json();
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  assert(data.total_calls > 0, 'Expected total_calls > 0');
  assert(data.success_rate, 'Expected success_rate');
});

// Test 6: Huddle posts feed
await test('6. Huddle posts feed', async () => {
  const res = await fetch(`${BASE}/api/huddle/posts?limit=5`);
  const data = await res.json();
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  assert(Array.isArray(data.posts), 'Expected posts array');
});

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed}/${passed + failed} passed`);
if (failed > 0) {
  console.log(`${failed} FAILED`);
  process.exit(1);
} else {
  console.log('ALL PASSED');
}
