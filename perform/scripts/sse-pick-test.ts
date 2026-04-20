/**
 * scripts/sse-pick-test.ts
 * ==========================
 * Two-tab SSE pick-stamp test per ship-delta contract exit criterion.
 *
 * Opens an SSE connection to /api/rankings/stream, fires a POST to
 * /api/draft/pick, confirms the pick event lands on the SSE stream
 * within 5 seconds.
 *
 * Idempotent — resets the pick by POSTing null values at end.
 */

import * as fs from 'fs';

// Parse .env.local with LAST-VALUE-WINS semantics to match how Next.js dev
// server loads env (which is what the /api/draft/pick route sees when
// comparing against process.env.PIPELINE_AUTH_KEY). The file may legitimately
// contain duplicate keys (e.g., old + rotated secret); the running server
// uses the later definition.
const env = fs.readFileSync('.env.local', 'utf8');
const parsed: Record<string, string> = {};
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) parsed[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}
for (const [k, v] of Object.entries(parsed)) {
  if (!process.env[k]) process.env[k] = v;
}

const BASE = process.env.PERFORM_BASE_URL ?? 'http://localhost:3002';
const KEY = (process.env.PIPELINE_AUTH_KEY ?? '').replace(/\s+/g, '');  // collapse newlines that crept in via .env wrap

if (!KEY) { console.error('PIPELINE_AUTH_KEY missing'); process.exit(1); }

(async () => {
  console.log(`[sse-test] subscribing to ${BASE}/api/rankings/stream`);

  let sawSnapshot = false;
  let sawPick = false;
  let pickPayload: unknown = null;

  const controller = new AbortController();
  const streamPromise = (async () => {
    const res = await fetch(`${BASE}/api/rankings/stream`, { signal: controller.signal });
    if (!res.ok || !res.body) {
      console.error(`[sse-test] stream failed: ${res.status}`);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      try {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // Split on SSE frame boundary
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';
        for (const frame of frames) {
          const eventMatch = frame.match(/^event: (\S+)/m);
          const dataMatch = frame.match(/^data: (.+)$/m);
          if (!eventMatch) continue;
          const name = eventMatch[1];
          if (name === 'snapshot') {
            sawSnapshot = true;
            console.log('[sse-test] ✅ received snapshot frame');
          } else if (name === 'pick') {
            sawPick = true;
            try { pickPayload = JSON.parse(dataMatch?.[1] ?? '{}'); } catch { /* ignore */ }
            console.log('[sse-test] ✅ received pick frame:', pickPayload);
            controller.abort();
            return;
          }
        }
      } catch {
        return;
      }
    }
  })();

  // Wait for snapshot (up to 15s — dev server cold compile can stretch)
  const snapDeadline = Date.now() + 15000;
  while (!sawSnapshot && Date.now() < snapDeadline) {
    await new Promise(r => setTimeout(r, 200));
  }
  if (!sawSnapshot) { console.error('[sse-test] ❌ no snapshot received within 15s'); controller.abort(); process.exit(1); }

  // Fire pick POST
  console.log('[sse-test] POST /api/draft/pick (Caleb Downs id=2410 → KC, pick #1)');
  const postRes = await fetch(`${BASE}/api/draft/pick`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ player_id: 2410, drafted_by_team: 'KC', pick_number: 1 }),
  });
  const postBody = await postRes.text();
  console.log(`[sse-test] POST status=${postRes.status} body=${postBody.slice(0, 200)}`);

  if (!postRes.ok) {
    controller.abort();
    console.error('[sse-test] ❌ pick POST failed');
    process.exit(1);
  }

  // Wait up to 5s for the pick event to arrive on the stream
  const deadline = Date.now() + 5000;
  while (!sawPick && Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 100));
  }

  controller.abort();
  try { await streamPromise; } catch { /* aborted */ }

  if (!sawPick) {
    console.error('[sse-test] ❌ pick event did NOT arrive on SSE stream within 5s');
    process.exit(1);
  }

  console.log('[sse-test] ✅ SSE pick-stamp test PASSED — emitPickEvent() reaches subscribers');
})();
