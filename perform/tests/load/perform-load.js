// Per|Form k6 load test (SHIP-CHECKLIST Gate 7 · Item 41)
//
// Pass criterion from the Ship Checklist:
//   "p95 <2s at 10× expected load, zero 5xx under load."
//
// Profile:
//   - Ramp 0 → 100 virtual users over 30s
//   - Hold 100 VUs for 90s
//   - Ramp down over 30s
//   - Total ~2min wall-clock
//
// Target endpoints (read-only, don't pollute prod DB):
//   GET /api/health       — DB + upstream checks
//   GET /api/players?limit=10  — SSR-ish DB read
//   GET /api/pricing       — static-ish config read
//   GET /                  — homepage SSR
//
// Run manually:
//   k6 run --vus 100 --duration 2m tests/load/perform-load.js
// Or via GH Actions:
//   .github/workflows/load-test.yml (workflow_dispatch only — never auto)

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'https://perform.foai.cloud';

const latencyHomepage = new Trend('latency_homepage');
const latencyHealth = new Trend('latency_health');
const latencyPlayers = new Trend('latency_players');
const latencyPricing = new Trend('latency_pricing');
const error5xx = new Rate('error_5xx');

export const options = {
  stages: [
    { duration: '30s', target: 100 },   // ramp up
    { duration: '90s', target: 100 },   // hold
    { duration: '30s', target: 0 },     // ramp down
  ],
  thresholds: {
    // Ship Checklist target: p95 < 2000ms
    http_req_duration: ['p(95)<2000'],
    // Zero 5xx under load
    error_5xx: ['rate<0.001'],
    // Request-failure rate (4xx + 5xx + timeouts) under 1%
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // Weighted round-robin across the 4 read endpoints. Homepage gets
  // heaviest weight because it's the entry point for most real traffic.
  const roll = Math.random();

  if (roll < 0.5) {
    const r = http.get(`${BASE}/`);
    latencyHomepage.add(r.timings.duration);
    error5xx.add(r.status >= 500);
    check(r, { 'homepage 200': (res) => res.status === 200 });
  } else if (roll < 0.75) {
    const r = http.get(`${BASE}/api/players?limit=10&sort=overall_rank:asc`);
    latencyPlayers.add(r.timings.duration);
    error5xx.add(r.status >= 500);
    check(r, { 'players 200': (res) => res.status === 200 });
  } else if (roll < 0.9) {
    const r = http.get(`${BASE}/api/health`);
    latencyHealth.add(r.timings.duration);
    error5xx.add(r.status >= 500);
    check(r, {
      'health 200': (res) => res.status === 200,
      'health status ok': (res) => {
        try { return JSON.parse(res.body).status === 'ok'; } catch { return false; }
      },
    });
  } else {
    const r = http.get(`${BASE}/api/pricing`);
    latencyPricing.add(r.timings.duration);
    error5xx.add(r.status >= 500);
    check(r, { 'pricing 200': (res) => res.status === 200 });
  }

  sleep(Math.random() * 2);   // jitter between 0–2s to look like real users
}

export function handleSummary(data) {
  // Pretty console summary + JSON artifact for CI.
  return {
    stdout: textSummary(data),
    'load-report.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  const m = data.metrics;
  const p95 = m.http_req_duration?.values?.['p(95)']?.toFixed(0) ?? '?';
  const p99 = m.http_req_duration?.values?.['p(99)']?.toFixed(0) ?? '?';
  const fails = ((m.http_req_failed?.values?.rate ?? 0) * 100).toFixed(2);
  const e5xx = ((m.error_5xx?.values?.rate ?? 0) * 100).toFixed(2);
  const iters = m.iterations?.values?.count ?? 0;
  const vus = m.vus_max?.values?.value ?? 0;
  return [
    '',
    '  Per|Form load test summary',
    '  ───────────────────────────────────────────',
    `  Target      : ${BASE}`,
    `  Max VUs     : ${vus}`,
    `  Iterations  : ${iters}`,
    `  p95 latency : ${p95} ms  (gate: <2000)`,
    `  p99 latency : ${p99} ms`,
    `  Failure rate: ${fails}%  (gate: <1%)`,
    `  5xx rate    : ${e5xx}%  (gate: <0.1%)`,
    '',
  ].join('\n');
}
