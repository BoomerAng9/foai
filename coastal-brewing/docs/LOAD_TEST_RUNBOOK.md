# Load Test Runbook — Coastal Brewing + Wave 1 Infrastructure

**Code_Ang Ship Checklist Item 41 — Load Testing.**

Wave 1 ships with operator-only traffic so load testing is not a launch
blocker, but the runbook lives here so it can be exercised before any
public traffic event (TCR webinar, AOF first paying customer, demo days).

---

## When to run

- Before any owner-facing traffic event (webinar, demo, press launch)
- Before the first AOF Tier 1 paying customer goes live
- After any change to `chicken-hawk/gateway/router.py` dispatch path
- Quarterly minimum

## Targets + thresholds

| Target | Endpoint | Spec threshold (per Item 41) |
|---|---|---|
| Coastal API | `https://brewing.foai.cloud/api/products` | p95 < 2s @ 10× expected concurrent users, 0 5xx errors |
| Chicken Hawk gateway | `https://hawk.foai.cloud/health` | p95 < 500ms @ 100 RPS |
| Chicken Hawk `/run` | `https://hawk.foai.cloud/run` (bearer auth) | p95 < 3s @ 20 RPS, NemoClaw verdicts ≤ 1s |
| Hermes Agent | inbound Telegram traffic only — no synthetic load |
| LiteLLM gateway (post Step D deploy) | `https://litellm.foai.cloud/v1/chat/completions` | p95 < 5s @ 10 RPS, fallback chains exercise on provider 5xx |

"Expected concurrent users" baseline: 1 (owner-only Wave 1).
10× = 10 concurrent users for the public-facing endpoints (Coastal API).

## Tooling — k6

Install on operator workstation:
```bash
# macOS
brew install k6
# Debian/Ubuntu
sudo apt-get install -y k6
```

## Test scripts

### Coastal — public-facing read traffic

`scripts/load-tests/coastal-read.k6.js`:
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 5 },   // ramp to 5 concurrent
    { duration: '1m',  target: 10 },  // hold 10 (10× expected)
    { duration: '30s', target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed:   ['rate<0.01'],
  },
};

export default function () {
  const r = http.get('https://brewing.foai.cloud/api/products');
  check(r, { '200 ok': (res) => res.status === 200 });
  sleep(1);
}
```

Run: `k6 run scripts/load-tests/coastal-read.k6.js`

### Chicken Hawk gateway — bearer-authed dispatch

`scripts/load-tests/chicken-hawk-run.k6.js`:
```javascript
import http from 'k6/http';
import { check } from 'k6';

const BEARER = __ENV.NEMOCLAW_API_KEY;

export const options = {
  stages: [
    { duration: '30s', target: 5  },
    { duration: '1m',  target: 20 },
    { duration: '30s', target: 0  },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed:   ['rate<0.05'],
  },
};

export default function () {
  const r = http.post(
    'https://hawk.foai.cloud/run',
    JSON.stringify({ action: 'summarize', payload: { text: 'load test ping' } }),
    { headers: { 'Authorization': `Bearer ${BEARER}`, 'content-type': 'application/json' } }
  );
  check(r, { 'allow/escalate/deny': (res) => [200, 202, 403].includes(res.status) });
}
```

Run: `NEMOCLAW_API_KEY=$BEARER k6 run scripts/load-tests/chicken-hawk-run.k6.js`

## Pass criteria (Item 41 evidence requirement)

For each target above, the k6 report must show:
1. `http_req_duration p(95)` under the threshold
2. `http_req_failed rate` < 1% for read endpoints, < 5% for write endpoints
3. No container restart during the run (`docker logs` clean)
4. No autoscaling needed (Wave 1 is single-VPS), but resource utilization
   under 80% CPU and under 80% memory on the host throughout the test

## Capture for the audit trail

```bash
k6 run --out json=loadtest-$(date -u +%Y%m%dT%H%M%SZ).json \
  scripts/load-tests/coastal-read.k6.js \
  | tee loadtest-$(date -u +%Y%m%dT%H%M%SZ).log

# Archive in iCloud Claude Code folder per the doc-output rule:
mv loadtest-*.{json,log} \
   "$HOME/iCloudDrive/ACHIEVEMOR_/Projects_/The Deploy Platform_/Claude Code/load-tests/"
```

## When the test fails

- **5xx errors > 1%**: Check container logs for OOM kills, exhausted DB
  connections, or upstream API rate limits.
- **p95 > threshold**: Profile chicken-hawk gateway under load using
  `py-spy top --pid <pid>` inside the container; common cause is
  synchronous I/O in middleware.
- **Container restart mid-test**: Increase `mem_limit` in compose, or
  identify a memory leak via `docker stats` over a longer baseline run.

## Wave 1.5 follow-up

When Step D (LiteLLM) goes live, add a load test that exercises the
fallback chain:
- Hit `/v1/chat/completions` with `model=claude-opus-4-7`
- Concurrently revoke ANTHROPIC_API_KEY (test mode)
- Verify the request lands on `claude-sonnet-4-6` then `openrouter-omnibus`
  per the per-tier fallback config — no 5xx returned to client.
