# Meeting Mode (C|Brew Conversation Mode) Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Phase 1 of Meeting Mode — the PWA `/meeting-mode` route with Translation Mode (OpenAI Realtime via OpenRouter) + Concierge Mode (Gemini-generated voices stored in Inworld, served at runtime), backed by token-disciplined runner endpoints, with parallel React Native + Expo scaffold and Playwright e2e against live brewing.foai.cloud.

**Architecture:** Browser/RN client → Next.js `/forms/meeting-mode/*` proxy (injects gateway token) → coastal-runner endpoints → upstream APIs (OpenRouter for OpenAI Realtime; Inworld direct for voice delivery; Gemini direct for voice generation pre-launch). Sacred Separation enforced: no provider names in customer-facing copy. Trial Mode 10-min cap enforced server-side; $6.54 service-initiation hooks into existing Stripe Custee Card flow.

**Tech Stack:** Python (FastAPI runner, scripts/api_server.py) · TypeScript + Next.js 15 App Router (coastal-web) · React Native + Expo (mobile) · Playwright e2e · OpenAI Realtime API (WebRTC) · OpenRouter (relay/billing) · Inworld TTS + Realtime API · Google Gemini 3.1 Flash Lite (voice gen)

---

## File structure

**Runner (Python):**
- `coastal-brewing/scripts/api_server.py` — modify; add 3 endpoints
- `coastal-brewing/scripts/meeting_mode.py` — NEW; pure-logic helpers (token-budget math, member-discount, intent-id)
- `coastal-brewing/scripts/generate_meeting_mode_voices.py` — NEW; CLI: Gemini gen → Inworld upload → write voiceId to config
- `coastal-brewing/configs/meeting-mode-voices.json` — NEW; pinned voiceIds per persona
- `coastal-brewing/configs/meeting-mode-voice-scripts.json` — NEW; per-persona 60-90s read script
- `coastal-brewing/tests/test_meeting_mode.py` — NEW; pytest for the pure-logic helpers

**Next.js (TypeScript) — coastal-brewing/web:**
- `app/meeting-mode/page.tsx` — NEW; PWA route
- `app/forms/meeting-mode/openai-session/route.ts` — NEW; proxy
- `app/forms/meeting-mode/inworld-session/route.ts` — NEW; proxy
- `app/forms/meeting-mode/session-end/route.ts` — NEW; proxy for end-of-session ledger write
- `components/meeting-mode/mode-toggle.tsx` — NEW; Translation ⇄ Concierge
- `components/meeting-mode/translation-tile.tsx` — NEW; two-tile UI
- `components/meeting-mode/concierge-chat.tsx` — NEW; chat-style UI
- `components/meeting-mode/session-card.tsx` — NEW; end-of-session card
- `lib/meeting-mode/openai-realtime.ts` — NEW; WebRTC handshake helper
- `lib/meeting-mode/inworld-client.ts` — NEW; WebSocket handshake helper
- `public/manifest.webmanifest` — NEW; PWA installable manifest
- `tests/e2e/meeting-mode.spec.ts` — NEW; Playwright

**React Native + Expo — coastal-brewing/mobile/ (new package):**
- `mobile/package.json` — NEW
- `mobile/app.json` — NEW; Expo config
- `mobile/App.tsx` — NEW; entry
- `mobile/src/screens/MeetingMode.tsx` — NEW
- `mobile/src/components/translation-tile.tsx` — NEW; mirrors PWA shape
- `mobile/src/components/concierge-chat.tsx` — NEW; mirrors PWA shape
- `mobile/src/lib/coastal-api.ts` — NEW; client to /forms/* proxies
- `mobile/eas.json` — NEW; EAS Build config
- `mobile/README.md` — NEW; setup + store-submit guide

**Env (operator action — not in this plan but a prerequisite):**
- aims-vps `/docker/coastal-brewing/.env` gains: `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `INWORLD_API_KEY` (uppercase per compose passthrough canon)
- docker-compose.yml — modify; add env passthrough lines for the 3 new keys

---

## Pre-Phase-1 prerequisites (operator-side, not in this plan)

These must land before the runtime tasks (Task 9 onward) can verify live:

1. `Openrouter_API_Key` already in openclaw (73 chars verified). Pipe to aims-vps as `OPENROUTER_API_KEY`.
2. `GEMINI_API_KEY` already in openclaw (53 chars verified). Pipe to aims-vps as `GEMINI_API_KEY` (already uppercase, no rename).
3. `Inworld_API_Key` already in openclaw + aims-vps (per Coastal voice canon, voice-library wiring).
4. Add 3 env-passthrough lines to `coastal-brewing/docker-compose.yml` under `coastal-runner.environment`.
5. Recreate coastal-runner.

The voice-generation task (Task 8) runs locally against the openclaw-piped keys; it does NOT need aims-vps to be wired first.

---

## Task 1: Pure-logic helper module (`meeting_mode.py`)

**Files:**
- Create: `coastal-brewing/scripts/meeting_mode.py`
- Test: `coastal-brewing/tests/test_meeting_mode.py`

- [ ] **Step 1.1: Write failing tests for the pure-logic helpers**

```python
# tests/test_meeting_mode.py
from __future__ import annotations
import pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))


def test_member_discount_25pct_on_concierge():
    import meeting_mode
    assert meeting_mode.apply_member_discount(cost_cents=1000, is_member=True) == 750


def test_no_discount_for_non_member():
    import meeting_mode
    assert meeting_mode.apply_member_discount(cost_cents=1000, is_member=False) == 1000


def test_trial_minutes_cap_default_10():
    import meeting_mode
    assert meeting_mode.trial_minutes_cap() == 10


def test_intent_id_deterministic_per_email_day_mode():
    import meeting_mode
    a = meeting_mode.make_session_intent_id(
        email="x@y.io", mode="translation", day_iso="2026-05-11",
    )
    b = meeting_mode.make_session_intent_id(
        email="x@y.io", mode="translation", day_iso="2026-05-11",
    )
    assert a == b
    assert a.startswith("mm_")


def test_intent_id_changes_per_mode():
    import meeting_mode
    a = meeting_mode.make_session_intent_id(email="x@y.io", mode="translation", day_iso="2026-05-11")
    b = meeting_mode.make_session_intent_id(email="x@y.io", mode="concierge",   day_iso="2026-05-11")
    assert a != b


def test_voice_id_lookup_returns_pinned_id():
    import meeting_mode
    cfg = {"acheevy": "inworld_voice_abc123"}
    assert meeting_mode.voice_id_for_persona("acheevy", config=cfg) == "inworld_voice_abc123"


def test_voice_id_lookup_raises_on_unknown_persona():
    import meeting_mode
    import pytest
    with pytest.raises(KeyError):
        meeting_mode.voice_id_for_persona("unknown_persona", config={})
```

- [ ] **Step 1.2: Run tests to verify they fail**

Run: `cd coastal-brewing && python -m pytest tests/test_meeting_mode.py -v`
Expected: 7 FAIL with `ModuleNotFoundError: No module named 'meeting_mode'`

- [ ] **Step 1.3: Implement `meeting_mode.py`**

```python
# scripts/meeting_mode.py
"""Meeting Mode (C|Brew Conversation Mode) — pure-logic helpers.

Per cbrew-369-pricing-canon + meeting-mode-prd-rev2-2026-05-11.md.
No HTTP, no API calls — math + lookups only. The runner endpoints wrap
this for cadence-aware billing + voice-id resolution + intent-id
derivation.
"""
from __future__ import annotations

import hashlib

MEMBER_DISCOUNT_PCT = 25
TRIAL_MINUTES_CAP_DEFAULT = 10
SERVICE_INITIATION_CENTS = 654  # one-time first-purchase fee (Coastal canon)


def apply_member_discount(*, cost_cents: int, is_member: bool) -> int:
    """Apply 25% off to Concierge cost for members; no discount otherwise."""
    if not is_member:
        return cost_cents
    discounted = cost_cents * (100 - MEMBER_DISCOUNT_PCT) // 100
    return discounted


def trial_minutes_cap() -> int:
    """Trial Mode hard cap per session for anon users post-$6.54 init."""
    return TRIAL_MINUTES_CAP_DEFAULT


def make_session_intent_id(*, email: str, mode: str, day_iso: str) -> str:
    """Deterministic intent id per (email, mode, day) for double-click idempotency."""
    digest = hashlib.sha256(
        f"{email.lower()}|{mode}|{day_iso}".encode("utf-8"),
    ).hexdigest()[:16]
    return f"mm_{digest}"


def voice_id_for_persona(persona: str, *, config: dict) -> str:
    """Resolve a pinned Inworld voiceId for a persona.

    Raises KeyError if the persona is not configured — caller should
    handle gracefully (e.g., fall back to ACHEEVY default).
    """
    key = persona.lower()
    if key not in config:
        raise KeyError(f"voice not configured for persona: {persona!r}")
    return config[key]
```

- [ ] **Step 1.4: Run tests to verify they pass**

Run: `python -m pytest tests/test_meeting_mode.py -v`
Expected: 7 PASS

- [ ] **Step 1.5: Commit**

```bash
cd coastal-brewing
git add scripts/meeting_mode.py tests/test_meeting_mode.py
git commit -m "feat(meeting-mode): pure-logic helpers — member discount + trial cap + intent-id + voice lookup"
```

---

## Task 2: Runner endpoint — `GET /api/meeting-mode/pricing` (public)

**Files:**
- Modify: `coastal-brewing/scripts/api_server.py` (append)
- Test: `coastal-brewing/tests/test_meeting_mode_pricing.py`

- [ ] **Step 2.1: Write failing test for the pricing endpoint shape**

```python
# tests/test_meeting_mode_pricing.py
import pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))


def test_pricing_shape():
    """The public pricing endpoint returns a stable shape the frontend
    + RN can consume."""
    # Pure-logic check on the response builder
    import api_server  # noqa
    # The endpoint is wrapped in a FastAPI handler — we test the builder
    # function it calls.
    payload = api_server._meeting_mode_pricing_payload()
    assert payload["ok"] is True
    assert payload["trial_minutes_cap"] == 10
    assert payload["service_initiation_cents"] == 654
    assert payload["member_discount_pct"] == 25
    assert "translation" in payload["modes"]
    assert "concierge" in payload["modes"]
```

- [ ] **Step 2.2: Run test (fails — function doesn't exist)**

Run: `python -m pytest tests/test_meeting_mode_pricing.py -v`
Expected: FAIL with `AttributeError: module 'api_server' has no attribute '_meeting_mode_pricing_payload'`

- [ ] **Step 2.3: Add the endpoint + builder to api_server.py**

Locate the existing `# ────────────────────────── Coastal Custee Card …` section and add BEFORE it:

```python
# ────────────────────────── Meeting Mode (C|Brew Conversation Mode) ──────────────────────────
# Owner-ratified 2026-05-11 PRD: docs/meeting-mode-prd-rev2-2026-05-11.md
import meeting_mode as _meeting_mode  # noqa: E402


def _meeting_mode_pricing_payload() -> dict:
    """Pure builder for the public pricing endpoint. Separated from the
    FastAPI handler so it's unit-testable without an HTTP roundtrip."""
    return {
        "ok": True,
        "trial_minutes_cap": _meeting_mode.trial_minutes_cap(),
        "service_initiation_cents": _meeting_mode.SERVICE_INITIATION_CENTS,
        "member_discount_pct": _meeting_mode.MEMBER_DISCOUNT_PCT,
        "modes": {
            "translation": {
                "label": "Translation",
                "tagline": "Real-time conversation translation, your interpreter at the table.",
            },
            "concierge": {
                "label": "Concierge",
                "tagline": "Recipes, cost estimating, multi-location planning. Members 25% off.",
            },
        },
    }


@app.get("/api/meeting-mode/pricing")
def meeting_mode_pricing() -> dict:
    """Public — trial cap + service-initiation fee + member-discount math
    + mode catalog. No token gate (this powers the unauthenticated landing
    state of /meeting-mode)."""
    return _meeting_mode_pricing_payload()
```

- [ ] **Step 2.4: Run test (passes)**

Run: `python -m pytest tests/test_meeting_mode_pricing.py -v`
Expected: 1 PASS

- [ ] **Step 2.5: Commit**

```bash
git add scripts/api_server.py tests/test_meeting_mode_pricing.py
git commit -m "feat(meeting-mode): public GET /api/meeting-mode/pricing endpoint"
```

---

## Task 3: Runner endpoint — `POST /api/meeting-mode/openai-session` (stub)

**Files:**
- Modify: `coastal-brewing/scripts/api_server.py`
- Test: `coastal-brewing/tests/test_meeting_mode_openai_session.py`

**Why stub first:** Wire the validation + auth + intent-id + Telegram surface before introducing OpenRouter network calls. Real OpenRouter wire-up happens in Task 11 once the route + test surface is proven.

- [ ] **Step 3.1: Write failing test for input validation**

```python
# tests/test_meeting_mode_openai_session.py
from fastapi.testclient import TestClient
import os, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
os.environ.setdefault("COASTAL_GATEWAY_TOKEN", "test-gateway-token")


def _client():
    import importlib
    if "api_server" in sys.modules:
        importlib.reload(sys.modules["api_server"])
    import api_server
    return TestClient(api_server.app)


def test_openai_session_rejects_missing_email():
    c = _client()
    r = c.post(
        "/api/meeting-mode/openai-session",
        headers={"X-Coastal-Token": "test-gateway-token"},
        json={"email": ""},
    )
    assert r.status_code == 400


def test_openai_session_rejects_missing_token():
    c = _client()
    r = c.post(
        "/api/meeting-mode/openai-session",
        json={"email": "buyer@example.com"},
    )
    assert r.status_code == 401


def test_openai_session_stub_returns_intent_id_when_unconfigured():
    c = _client()
    r = c.post(
        "/api/meeting-mode/openai-session",
        headers={"X-Coastal-Token": "test-gateway-token"},
        json={"email": "buyer@example.com", "is_member": False},
    )
    # Unconfigured-OpenRouter response is 503 with the intent_id still
    # echoed so client can surface a friendly error tied to a session.
    assert r.status_code == 503
    body = r.json()
    assert "intent_id" in body.get("detail", {}) or "intent_id" in body
```

- [ ] **Step 3.2: Run tests — expect AttributeError-style failures**

Run: `python -m pytest tests/test_meeting_mode_openai_session.py -v`
Expected: 3 FAIL (route 404 or missing)

- [ ] **Step 3.3: Add the endpoint stub to api_server.py**

Append after the `meeting_mode_pricing` handler:

```python
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")


class MeetingModeOpenAISessionRequest(BaseModel):
    email: str
    is_member: bool = False


@app.post("/api/meeting-mode/openai-session")
def meeting_mode_openai_session(
    body: MeetingModeOpenAISessionRequest,
    x_coastal_token: str = Header(""),
) -> dict:
    """Mint a short-lived client secret for OpenAI Realtime Translate via
    OpenRouter. STUB in Phase 1.0 — returns 503 unless OPENROUTER_API_KEY
    is set. Wired live in Task 11."""
    _auth(x_coastal_token)
    email = (body.email or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="email required")

    day_iso = _time.strftime("%Y-%m-%d", _time.gmtime())
    intent_id = _meeting_mode.make_session_intent_id(
        email=email, mode="translation", day_iso=day_iso,
    )

    if not OPENROUTER_API_KEY:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Translation runtime not configured on this runner",
                "intent_id": intent_id,
            },
        )

    # Wired in Task 11 — for now, surface the not-yet-implemented state
    # without exposing the upstream provider name to a customer.
    raise HTTPException(
        status_code=503,
        detail={"error": "Translation runtime coming online", "intent_id": intent_id},
    )
```

- [ ] **Step 3.4: Run tests (pass)**

Run: `python -m pytest tests/test_meeting_mode_openai_session.py -v`
Expected: 3 PASS

- [ ] **Step 3.5: Commit**

```bash
git add scripts/api_server.py tests/test_meeting_mode_openai_session.py
git commit -m "feat(meeting-mode): POST /api/meeting-mode/openai-session — stub w/ validation + intent-id"
```

---

## Task 4: Runner endpoint — `POST /api/meeting-mode/inworld-session` (stub)

**Files:**
- Modify: `coastal-brewing/scripts/api_server.py`
- Test: `coastal-brewing/tests/test_meeting_mode_inworld_session.py`

- [ ] **Step 4.1: Write failing test**

```python
# tests/test_meeting_mode_inworld_session.py
from fastapi.testclient import TestClient
import os, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
os.environ.setdefault("COASTAL_GATEWAY_TOKEN", "test-gateway-token")


def _client():
    import importlib
    if "api_server" in sys.modules:
        importlib.reload(sys.modules["api_server"])
    import api_server
    return TestClient(api_server.app)


def test_inworld_session_rejects_unknown_persona():
    c = _client()
    r = c.post(
        "/api/meeting-mode/inworld-session",
        headers={"X-Coastal-Token": "test-gateway-token"},
        json={"email": "buyer@example.com", "persona": "fake_persona"},
    )
    assert r.status_code == 400


def test_inworld_session_defaults_persona_acheevy():
    c = _client()
    r = c.post(
        "/api/meeting-mode/inworld-session",
        headers={"X-Coastal-Token": "test-gateway-token"},
        json={"email": "buyer@example.com"},
    )
    # 503 expected because Inworld voice config not yet pinned
    assert r.status_code in (503,)
    assert "intent_id" in (r.json().get("detail") or {})
```

- [ ] **Step 4.2: Run tests — expect 404 / route missing**

Run: `python -m pytest tests/test_meeting_mode_inworld_session.py -v`

- [ ] **Step 4.3: Add the endpoint stub**

Append to api_server.py:

```python
INWORLD_API_KEY = os.environ.get("INWORLD_API_KEY", "")
KNOWN_PERSONAS = {"acheevy", "sal_ang", "luc", "melli_capensi", "iller_ang"}


class MeetingModeInworldSessionRequest(BaseModel):
    email: str
    persona: str = "acheevy"
    is_member: bool = False


@app.post("/api/meeting-mode/inworld-session")
def meeting_mode_inworld_session(
    body: MeetingModeInworldSessionRequest,
    x_coastal_token: str = Header(""),
) -> dict:
    """Mint an Inworld session for Concierge Mode with the pinned voiceId
    for the requested persona. STUB in Phase 1.0 — returns 503 until
    Task 12 lands the voice config + live wire."""
    _auth(x_coastal_token)
    email = (body.email or "").strip().lower()
    persona = (body.persona or "acheevy").strip().lower()

    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="email required")
    if persona not in KNOWN_PERSONAS:
        raise HTTPException(
            status_code=400,
            detail=f"unknown persona: {persona!r}; allowed: {sorted(KNOWN_PERSONAS)}",
        )

    day_iso = _time.strftime("%Y-%m-%d", _time.gmtime())
    intent_id = _meeting_mode.make_session_intent_id(
        email=email, mode="concierge", day_iso=day_iso,
    )

    raise HTTPException(
        status_code=503,
        detail={"error": "Concierge runtime coming online", "intent_id": intent_id, "persona": persona},
    )
```

- [ ] **Step 4.4: Run tests (pass)**

Run: `python -m pytest tests/test_meeting_mode_inworld_session.py -v`

- [ ] **Step 4.5: Commit**

```bash
git add scripts/api_server.py tests/test_meeting_mode_inworld_session.py
git commit -m "feat(meeting-mode): POST /api/meeting-mode/inworld-session — stub w/ persona validation"
```

---

## Task 5: Next.js proxy routes for all 3 endpoints

**Files:**
- Create: `coastal-brewing/web/app/forms/meeting-mode/openai-session/route.ts`
- Create: `coastal-brewing/web/app/forms/meeting-mode/inworld-session/route.ts`
- Create: `coastal-brewing/web/app/forms/meeting-mode/pricing/route.ts`

Pattern mirrors `app/forms/membership/custee-card/checkout/route.ts` (PR #409). The `pricing` proxy is needed because the runner endpoint is public BUT the canonical client path lives under `/forms/*` for nginx-routing consistency with the rest of Meeting Mode.

- [ ] **Step 5.1: Create `openai-session` proxy**

`coastal-brewing/web/app/forms/meeting-mode/openai-session/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";

const RUNNER_BASE = process.env.COASTAL_RUNNER_INTERNAL || "http://coastal-runner:8080";
const TOKEN = process.env.COASTAL_GATEWAY_TOKEN || "";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Body { email: string; is_member?: boolean }

export async function POST(req: NextRequest) {
  if (!TOKEN) {
    return NextResponse.json({ error: "Not configured. Owner: set COASTAL_GATEWAY_TOKEN." }, { status: 503 });
  }
  let body: Partial<Body>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const email = String(body.email ?? "").trim().toLowerCase();
  const is_member = Boolean(body.is_member);
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }
  let runnerRes: Response;
  try {
    runnerRes = await fetch(`${RUNNER_BASE}/api/meeting-mode/openai-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Coastal-Token": TOKEN },
      body: JSON.stringify({ email, is_member }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Coastal runner unreachable" }, { status: 502 });
  }
  const j = await runnerRes.json().catch(() => ({}));
  return NextResponse.json(j, { status: runnerRes.status });
}
```

- [ ] **Step 5.2: Create `inworld-session` proxy**

`coastal-brewing/web/app/forms/meeting-mode/inworld-session/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";

const RUNNER_BASE = process.env.COASTAL_RUNNER_INTERNAL || "http://coastal-runner:8080";
const TOKEN = process.env.COASTAL_GATEWAY_TOKEN || "";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_PERSONAS = new Set(["acheevy", "sal_ang", "luc", "melli_capensi", "iller_ang"]);

interface Body { email: string; persona?: string; is_member?: boolean }

export async function POST(req: NextRequest) {
  if (!TOKEN) {
    return NextResponse.json({ error: "Not configured. Owner: set COASTAL_GATEWAY_TOKEN." }, { status: 503 });
  }
  let body: Partial<Body>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const email = String(body.email ?? "").trim().toLowerCase();
  const persona = String(body.persona ?? "acheevy").trim().toLowerCase();
  const is_member = Boolean(body.is_member);
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }
  if (!VALID_PERSONAS.has(persona)) {
    return NextResponse.json({ error: "Invalid persona" }, { status: 400 });
  }
  let runnerRes: Response;
  try {
    runnerRes = await fetch(`${RUNNER_BASE}/api/meeting-mode/inworld-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Coastal-Token": TOKEN },
      body: JSON.stringify({ email, persona, is_member }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Coastal runner unreachable" }, { status: 502 });
  }
  const j = await runnerRes.json().catch(() => ({}));
  return NextResponse.json(j, { status: runnerRes.status });
}
```

- [ ] **Step 5.3: Create `pricing` proxy (GET, public)**

`coastal-brewing/web/app/forms/meeting-mode/pricing/route.ts`:

```ts
import { NextResponse } from "next/server";

const RUNNER_BASE = process.env.COASTAL_RUNNER_INTERNAL || "http://coastal-runner:8080";

export async function GET() {
  try {
    const r = await fetch(`${RUNNER_BASE}/api/meeting-mode/pricing`, {
      method: "GET", cache: "no-store",
    });
    const j = await r.json().catch(() => ({}));
    return NextResponse.json(j, { status: r.status });
  } catch {
    return NextResponse.json({ error: "Coastal runner unreachable" }, { status: 502 });
  }
}
```

- [ ] **Step 5.4: Commit**

```bash
git add coastal-brewing/web/app/forms/meeting-mode/
git commit -m "feat(meeting-mode/web): Next.js proxy routes for openai/inworld/pricing"
```

---

## Task 6: PWA — `mode-toggle.tsx` client component

**Files:**
- Create: `coastal-brewing/web/components/meeting-mode/mode-toggle.tsx`

- [ ] **Step 6.1: Write the component**

```tsx
"use client";

import { cn } from "@/lib/utils";

export type MeetingMode = "translation" | "concierge";

interface Props {
  value: MeetingMode;
  onChange: (m: MeetingMode) => void;
  disabled?: boolean;
}

export function ModeToggle({ value, onChange, disabled }: Props) {
  return (
    <div
      className="inline-flex gap-1 rounded-md border border-border bg-card/40 p-1"
      data-mode-toggle={value}
    >
      {(["translation", "concierge"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          disabled={disabled}
          className={cn(
            "rounded px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest transition-colors",
            value === m
              ? "bg-accent text-accent-foreground"
              : "text-foreground/70 hover:text-foreground",
            disabled && "opacity-50 cursor-not-allowed",
          )}
          data-mode-option={m}
          data-mode-selected={value === m ? "true" : "false"}
        >
          {m === "translation" ? "Translation" : "Concierge"}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 6.2: Commit**

```bash
git add coastal-brewing/web/components/meeting-mode/mode-toggle.tsx
git commit -m "feat(meeting-mode/web): ModeToggle component"
```

---

## Task 7: PWA — `translation-tile.tsx` two-tile UI

**Files:**
- Create: `coastal-brewing/web/components/meeting-mode/translation-tile.tsx`

- [ ] **Step 7.1: Write the component (UI shell — WebRTC wires in Task 11)**

```tsx
"use client";

import { useState } from "react";

interface Props {
  /** Their (incoming) language label */
  theirLanguage: string;
  /** Your (outgoing) language label */
  yourLanguage: string;
  /** Live transcript text (their words) */
  theirTranscript?: string;
  /** Live translation text (their words → your language) */
  theirTranslation?: string;
  /** Live transcript text (your words) */
  yourTranscript?: string;
  /** Live translation text (your words → their language) */
  yourTranslation?: string;
  /** Push-to-talk handler — true = pressed, false = released */
  onTalk?: (side: "theirs" | "yours", pressed: boolean) => void;
  disabled?: boolean;
}

export function TranslationTile({
  theirLanguage,
  yourLanguage,
  theirTranscript = "",
  theirTranslation = "",
  yourTranscript = "",
  yourTranslation = "",
  onTalk,
  disabled,
}: Props) {
  const [activeSide, setActiveSide] = useState<"theirs" | "yours" | null>(null);

  function pressHandler(side: "theirs" | "yours", down: boolean) {
    if (disabled) return;
    setActiveSide(down ? side : null);
    onTalk?.(side, down);
  }

  return (
    <div
      className="flex flex-col gap-2"
      data-meeting-mode-tile="translation"
    >
      {/* Their tile */}
      <div
        className="rounded-lg border border-border bg-card/30 p-4 min-h-[160px]"
        data-tile-side="theirs"
      >
        <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
          {theirLanguage}
        </p>
        <p className="mt-2 font-display text-base leading-snug text-foreground" data-tile-transcript>
          {theirTranscript || <span className="text-foreground/40">listening…</span>}
        </p>
        {theirTranslation && (
          <p className="mt-2 text-sm leading-snug text-foreground/80" data-tile-translation>
            {theirTranslation}
          </p>
        )}
        <button
          type="button"
          onMouseDown={() => pressHandler("theirs", true)}
          onMouseUp={() => pressHandler("theirs", false)}
          onTouchStart={() => pressHandler("theirs", true)}
          onTouchEnd={() => pressHandler("theirs", false)}
          disabled={disabled}
          className={`mt-3 rounded-md px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest border ${
            activeSide === "theirs" ? "bg-accent text-accent-foreground border-accent" : "border-border text-foreground/70"
          } disabled:opacity-50`}
        >
          🎤 Hold to speak
        </button>
      </div>

      {/* Your tile */}
      <div
        className="rounded-lg border border-border bg-card/30 p-4 min-h-[160px]"
        data-tile-side="yours"
      >
        <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
          {yourLanguage}
        </p>
        <p className="mt-2 font-display text-base leading-snug text-foreground" data-tile-transcript>
          {yourTranscript || <span className="text-foreground/40">tap below to speak…</span>}
        </p>
        {yourTranslation && (
          <p className="mt-2 text-sm leading-snug text-foreground/80" data-tile-translation>
            {yourTranslation}
          </p>
        )}
        <button
          type="button"
          onMouseDown={() => pressHandler("yours", true)}
          onMouseUp={() => pressHandler("yours", false)}
          onTouchStart={() => pressHandler("yours", true)}
          onTouchEnd={() => pressHandler("yours", false)}
          disabled={disabled}
          className={`mt-3 rounded-md px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest border ${
            activeSide === "yours" ? "bg-accent text-accent-foreground border-accent" : "border-border text-foreground/70"
          } disabled:opacity-50`}
        >
          🎤 Hold to speak
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 7.2: Commit**

```bash
git add coastal-brewing/web/components/meeting-mode/translation-tile.tsx
git commit -m "feat(meeting-mode/web): TranslationTile two-tile UI (shell; WebRTC wires in Task 11)"
```

---

## Task 8: PWA — `concierge-chat.tsx`

**Files:**
- Create: `coastal-brewing/web/components/meeting-mode/concierge-chat.tsx`

- [ ] **Step 8.1: Write the component**

```tsx
"use client";

import { useState } from "react";

export type ConciergeMessage = {
  id: string;
  role: "user" | "concierge";
  text: string;
  ts: number;
};

interface Props {
  messages: ConciergeMessage[];
  onSend?: (text: string) => void;
  onTalk?: (pressed: boolean) => void;
  persona?: string;
  isMember?: boolean;
  disabled?: boolean;
}

export function ConciergeChat({
  messages,
  onSend,
  onTalk,
  persona = "acheevy",
  isMember = false,
  disabled,
}: Props) {
  const [draft, setDraft] = useState("");
  const [pressed, setPressed] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || disabled) return;
    onSend?.(draft.trim());
    setDraft("");
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-border bg-card/30 p-4 min-h-[400px]"
      data-meeting-mode-tile="concierge"
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-accent" data-persona={persona}>
          Concierge · {persona.replace("_", " ")}
        </p>
        {isMember && (
          <span className="rounded-full bg-accent/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-accent">
            Member · 25% off tokens
          </span>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto" data-chat-log>
        {messages.length === 0 ? (
          <p className="text-sm text-foreground/40">Ask for a recipe, a cost estimate, or a stocking plan…</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-md p-2 text-sm leading-snug ${
                m.role === "user"
                  ? "bg-secondary/30 text-foreground"
                  : "bg-accent/10 text-foreground"
              }`}
              data-chat-role={m.role}
            >
              {m.text}
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <button
          type="button"
          onMouseDown={() => { setPressed(true); onTalk?.(true); }}
          onMouseUp={() => { setPressed(false); onTalk?.(false); }}
          onTouchStart={() => { setPressed(true); onTalk?.(true); }}
          onTouchEnd={() => { setPressed(false); onTalk?.(false); }}
          disabled={disabled}
          className={`rounded-md border px-3 py-2 font-mono text-[10px] uppercase tracking-widest ${
            pressed ? "bg-accent text-accent-foreground border-accent" : "border-border text-foreground/70"
          } disabled:opacity-50`}
        >
          🎤
        </button>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="or type a question…"
          disabled={disabled}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!draft.trim() || disabled}
          className="rounded-md bg-accent px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-accent-foreground disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 8.2: Commit**

```bash
git add coastal-brewing/web/components/meeting-mode/concierge-chat.tsx
git commit -m "feat(meeting-mode/web): ConciergeChat component (shell; WS wire in Task 12)"
```

---

## Task 9: PWA — `/meeting-mode/page.tsx` integration

**Files:**
- Create: `coastal-brewing/web/app/meeting-mode/page.tsx`

- [ ] **Step 9.1: Write the page**

```tsx
"use client";

import { useState } from "react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ModeToggle, type MeetingMode } from "@/components/meeting-mode/mode-toggle";
import { TranslationTile } from "@/components/meeting-mode/translation-tile";
import { ConciergeChat, type ConciergeMessage } from "@/components/meeting-mode/concierge-chat";

export default function MeetingModePage() {
  const [mode, setMode] = useState<MeetingMode>("translation");
  const [conciergeMessages, setConciergeMessages] = useState<ConciergeMessage[]>([]);

  function handleConciergeSend(text: string) {
    setConciergeMessages((prev) => [
      ...prev,
      { id: `u_${Date.now()}`, role: "user", text, ts: Date.now() },
    ]);
    // WS wire in Task 12 will push concierge replies into this list.
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="container py-8 md:py-12" data-meeting-mode-page>
        <header className="mb-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
            C|Brew Conversation Mode
          </p>
          <h1 className="mt-2 font-display text-[clamp(28px,4vw,40px)] font-semibold tracking-[-0.02em] leading-[1.05]">
            Meeting Mode<br />
            <span className="text-foreground/60">Your interpreter at the table.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Two people, two languages, one conversation. Switch to Concierge for recipes,
            cost estimates, and multi-location planning. Members get 25% off concierge tokens.
          </p>
          <div className="mt-4">
            <ModeToggle value={mode} onChange={setMode} />
          </div>
        </header>

        {mode === "translation" ? (
          <TranslationTile
            theirLanguage="Their language"
            yourLanguage="Your language"
          />
        ) : (
          <ConciergeChat
            messages={conciergeMessages}
            onSend={handleConciergeSend}
            persona="acheevy"
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 9.2: Commit**

```bash
git add coastal-brewing/web/app/meeting-mode/page.tsx
git commit -m "feat(meeting-mode/web): /meeting-mode page wires mode toggle + tile + chat"
```

---

## Task 10: PWA manifest + Add-to-Home-Screen

**Files:**
- Create: `coastal-brewing/web/public/manifest.webmanifest`
- Modify: `coastal-brewing/web/app/layout.tsx` — link manifest

- [ ] **Step 10.1: Create manifest**

```json
{
  "name": "C|Brew Conversation Mode",
  "short_name": "C|Brew",
  "description": "Real-time translation + concierge for Coastal Brewing Co.",
  "start_url": "/meeting-mode",
  "display": "standalone",
  "theme_color": "#1c1814",
  "background_color": "#f5efe2",
  "icons": [
    { "src": "/brand/cards/coastal-custee-card.png", "sizes": "1024x1024", "type": "image/png" }
  ]
}
```

(Production app icon ships in Phase 1.5 via Higgsfield render queue; until then the Custee Card render serves as the install icon.)

- [ ] **Step 10.2: Link manifest from `app/layout.tsx`**

Find the existing `<head>` / `metadata` block and add:

```tsx
export const metadata = {
  // …existing fields…
  manifest: "/manifest.webmanifest",
};
```

- [ ] **Step 10.3: Commit**

```bash
git add coastal-brewing/web/public/manifest.webmanifest coastal-brewing/web/app/layout.tsx
git commit -m "feat(meeting-mode/web): PWA manifest + Add-to-Home-Screen wired"
```

---

## Task 11: Wire OpenAI Realtime Translate via OpenRouter (real)

**Files:**
- Modify: `coastal-brewing/scripts/api_server.py` (replace the Task 3 stub with the live mint)
- Modify: `coastal-brewing/docker-compose.yml` (env passthrough for `OPENROUTER_API_KEY`)
- Test: `coastal-brewing/tests/test_meeting_mode_openai_session.py` (extend)

- [ ] **Step 11.1: Add env passthrough to docker-compose.yml**

In `coastal-brewing/docker-compose.yml` under `coastal-runner.environment`:

```yaml
      OPENROUTER_API_KEY: "${OPENROUTER_API_KEY:-}"
      GEMINI_API_KEY: "${GEMINI_API_KEY:-}"
      INWORLD_API_KEY: "${INWORLD_API_KEY:-}"
```

- [ ] **Step 11.2: Replace the stub in `meeting_mode_openai_session` with the live OpenRouter mint**

Replace the entire `if not OPENROUTER_API_KEY: …` block + the final 503 raise with:

```python
    # Mint a short-lived OpenAI Realtime client secret via OpenRouter.
    # OpenRouter handles billing + provider failover; the WebRTC transport
    # connects browser → OpenAI direct (OpenRouter does not proxy the
    # Realtime media plane today; revisit when GA).
    try:
        import urllib.request, urllib.error  # noqa: PLC0415
        req = urllib.request.Request(
            "https://openrouter.ai/api/v1/realtime/client_secrets",
            method="POST",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": AUTH_PUBLIC_URL,
                "X-Title": "Coastal Meeting Mode",
            },
            data=json.dumps({
                "session": {
                    "type": "realtime",
                    "model": "openai/gpt-realtime-translate-preview",
                    "modalities": ["audio", "text"],
                },
            }).encode("utf-8"),
        )
        with urllib.request.urlopen(req, timeout=15) as resp:  # noqa: S310
            upstream = json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        body_excerpt = exc.read().decode("utf-8", errors="replace")[:200]
        log = __import__("logging").getLogger("coastal.meeting_mode")
        log.warning("openrouter mint failed: %s — %s", exc.code, body_excerpt)
        raise HTTPException(status_code=502, detail={
            "error": "Translation runtime upstream error", "intent_id": intent_id,
        }) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail={
            "error": "Translation runtime unreachable", "intent_id": intent_id,
        }) from exc

    _send_telegram_message(
        f"Meeting Mode · Translation session minted\n"
        f"intent: {intent_id}\ncustee: {email}\nmember: {body.is_member}"
    )

    return {
        "ok": True,
        "intent_id": intent_id,
        "client_secret": upstream.get("client_secret") or upstream.get("value"),
        "expires_at": upstream.get("expires_at"),
        "mode": "translation",
    }
```

(The exact OpenRouter Realtime endpoint shape may evolve — verify against `https://openrouter.ai/docs` at build time. Adjust the URL + payload if their docs say otherwise. The 502 fallbacks keep the customer surface honest while we iterate.)

- [ ] **Step 11.3: Update tests — the 503 case now requires explicitly unsetting `OPENROUTER_API_KEY`**

In `tests/test_meeting_mode_openai_session.py`, add `monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)` to the existing 503 test and add a new "successful mint" test using `monkeypatch.setattr` to fake the urllib call.

- [ ] **Step 11.4: Local smoke (no upstream call; needs aims-vps for live)**

Run: `python -m pytest tests/test_meeting_mode_openai_session.py -v`
Expected: PASS

- [ ] **Step 11.5: Deploy + live smoke on aims-vps**

```bash
scp coastal-brewing/scripts/api_server.py aims-vps:/docker/coastal-brewing/scripts/
scp coastal-brewing/docker-compose.yml aims-vps:/docker/coastal-brewing/
ssh aims-vps "cd /docker/coastal-brewing && docker compose up -d --force-recreate coastal-runner"
# Wait for healthy then:
ssh aims-vps "GATEWAY=\$(grep '^COASTAL_GATEWAY_TOKEN=' /docker/coastal-brewing/.env | cut -d= -f2-); \
  curl -s -X POST http://localhost:8080/api/meeting-mode/openai-session \
  -H 'Content-Type: application/json' -H \"X-Coastal-Token: \$GATEWAY\" \
  -d '{\"email\":\"smoke@x.io\",\"is_member\":false}' | head -c 400"
```
Expected: JSON with `ok: true, client_secret: <string>, intent_id: mm_…`

- [ ] **Step 11.6: Commit**

```bash
git add coastal-brewing/scripts/api_server.py coastal-brewing/docker-compose.yml coastal-brewing/tests/test_meeting_mode_openai_session.py
git commit -m "feat(meeting-mode): wire OpenAI Realtime Translate via OpenRouter — live mint"
```

---

## Task 12: Voice generation pipeline (Gemini → Inworld upload → config persistence)

**Files:**
- Create: `coastal-brewing/configs/meeting-mode-voice-scripts.json` (per-persona scripts)
- Create: `coastal-brewing/scripts/generate_meeting_mode_voices.py`
- Create: `coastal-brewing/configs/meeting-mode-voices.json` (populated by running the script)
- Test: `coastal-brewing/tests/test_generate_meeting_mode_voices.py`

This task runs LOCALLY (not on aims-vps) because it consumes Gemini + Inworld credentials and writes the resulting voiceIds back into the repo.

- [ ] **Step 12.1: Author the voice scripts**

`coastal-brewing/configs/meeting-mode-voice-scripts.json`:

```json
{
  "acheevy": "I'm ACHEEVY — your orchestrator and Concierge. I help coordinate the team at Coastal Brewing Company. Recipes, cost estimates, stocking plans, scheduling — whatever you need, I'll route it to the right specialist or handle it myself. Today's brew is a Brazilian medium roast with cocoa notes. Let me know how I can help.",
  "sal_ang": "Sal here, behind the bar. Welcome to Coastal. Brewing coffee is a craft and a conversation — tell me how you take yours and I'll find the bean that matches. We just got Ethiopian Yirgacheffe and a Costa Rican honey-process. Tasting notes on the bag tell you the story.",
  "luc": "LUC here. I work the curation desk. If you're picking out a subscription, I help you find the right cadence — monthly, three-month, six-month, or our nine-month plan that delivers twelve months of coffee. The math works out. Tell me about your household and I'll dial it in.",
  "melli_capensi": "Melli Capensi, wholesale and B2B. I work with cafes, offices, hotels — anywhere coffee or tea matters at scale. Multi-location stocking, recurring case orders, white-label partnerships. If you're planning for ten employees or a thousand, I'll match you to the right bean and the right rotation.",
  "iller_ang": "Iller Ang — visuals and creative direction. I shape what you see on the brand site — the cards, the videos, the storefront imagery. If you need a brief turned into a render, a card minted, or a campaign visualized, I'm the one who briefs the generators."
}
```

- [ ] **Step 12.2: Write the generation script test (TDD — pure-function unit only)**

```python
# tests/test_generate_meeting_mode_voices.py
import pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))


def test_persona_list_matches_phase_1_batch():
    import generate_meeting_mode_voices as g
    expected = {"acheevy", "sal_ang", "luc", "melli_capensi", "iller_ang"}
    assert set(g.PHASE_1_PERSONAS) == expected


def test_load_scripts_returns_dict(tmp_path):
    import generate_meeting_mode_voices as g
    p = tmp_path / "scripts.json"
    p.write_text('{"acheevy": "test script"}', encoding="utf-8")
    out = g.load_voice_scripts(p)
    assert out == {"acheevy": "test script"}
```

- [ ] **Step 12.3: Run tests — expect import failure**

Run: `python -m pytest tests/test_generate_meeting_mode_voices.py -v`
Expected: FAIL

- [ ] **Step 12.4: Implement the script**

```python
# scripts/generate_meeting_mode_voices.py
"""Meeting Mode voice generation pipeline (one-time per voice).

Pipeline:
  1. Read per-persona script from configs/meeting-mode-voice-scripts.json
  2. Generate audio via Gemini 3.1 Flash Lite voice synthesis
  3. Upload WAV to the Inworld account as an IVC source
  4. Inworld returns a voiceId; pin it in configs/meeting-mode-voices.json

Run from coastal-brewing/ root:
  python scripts/generate_meeting_mode_voices.py [--persona ACHEEVY] [--all]

Reads GEMINI_API_KEY + INWORLD_API_KEY (or Inworld_API_Key) from env.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from pathlib import Path
from typing import Optional

logger = logging.getLogger("generate_meeting_mode_voices")

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_FILE = ROOT / "configs" / "meeting-mode-voice-scripts.json"
VOICES_FILE = ROOT / "configs" / "meeting-mode-voices.json"

PHASE_1_PERSONAS = ["acheevy", "sal_ang", "luc", "melli_capensi", "iller_ang"]


def load_voice_scripts(path: Path = SCRIPTS_FILE) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def gemini_synthesize(text: str, *, api_key: str, out_path: Path) -> Path:
    """Call Gemini 3.1 Flash Lite voice synthesis and write WAV to out_path.

    Owner directive: Gemini 3.1 Flash Lite voice gen. The exact Gemini
    voice-synthesis API surface evolves — when running this script the
    operator should verify against `https://ai.google.dev/gemini-api/docs`
    and adjust the request shape below if needed.
    """
    import urllib.request  # noqa: PLC0415
    body = {
        "model": "gemini-3.1-flash-lite",
        "contents": [{"parts": [{"text": text}]}],
        "generationConfig": {"responseModalities": ["AUDIO"]},
    }
    req = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
        method="POST",
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
        data=json.dumps(body).encode("utf-8"),
    )
    with urllib.request.urlopen(req, timeout=120) as resp:  # noqa: S310
        data = json.loads(resp.read())
    # Gemini returns base64-encoded audio in the response — decode + write.
    import base64  # noqa: PLC0415
    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    for p in parts:
        if "inlineData" in p:
            wav_b64 = p["inlineData"]["data"]
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_bytes(base64.b64decode(wav_b64))
            return out_path
    raise RuntimeError("Gemini response contained no inline audio data")


def inworld_upload_ivc(wav_path: Path, *, api_key: str, persona_label: str) -> str:
    """Upload a WAV to Inworld as an IVC source. Returns the new voiceId.

    Inworld's IVC upload endpoint accepts multipart/form-data. Verify the
    exact endpoint against `https://docs.inworld.ai` at run time.
    """
    import urllib.request  # noqa: PLC0415
    boundary = "----coastalmm" + str(os.urandom(8).hex())
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="name"\r\n\r\n'
        f"coastal-meeting-mode-{persona_label}\r\n"
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="audio"; filename="{persona_label}.wav"\r\n'
        f"Content-Type: audio/wav\r\n\r\n"
    ).encode("utf-8")
    body += wav_path.read_bytes()
    body += f"\r\n--{boundary}--\r\n".encode("utf-8")
    req = urllib.request.Request(
        "https://api.inworld.ai/v1/voices/ivc",
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
        data=body,
    )
    with urllib.request.urlopen(req, timeout=120) as resp:  # noqa: S310
        data = json.loads(resp.read())
    return data.get("voiceId") or data.get("id") or data["voice"]["id"]


def write_voice_config(voices: dict, path: Path = VOICES_FILE) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(voices, indent=2, sort_keys=True), encoding="utf-8")


def _resolve_inworld_key() -> Optional[str]:
    for name in ("INWORLD_API_KEY", "Inworld_API_Key"):
        if os.environ.get(name):
            return os.environ[name]
    return None


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--persona", help="generate just one persona", default=None)
    parser.add_argument("--all", action="store_true", help="generate full Phase 1 batch")
    parser.add_argument("--out-dir", default=str(ROOT / "build" / "voices"))
    args = parser.parse_args(argv)

    gemini_key = os.environ.get("GEMINI_API_KEY")
    inworld_key = _resolve_inworld_key()
    if not gemini_key:
        print("GEMINI_API_KEY not set", file=sys.stderr)
        return 2
    if not inworld_key:
        print("INWORLD_API_KEY / Inworld_API_Key not set", file=sys.stderr)
        return 2

    scripts = load_voice_scripts()
    targets = [args.persona] if args.persona else (PHASE_1_PERSONAS if args.all else PHASE_1_PERSONAS)

    out_dir = Path(args.out_dir)
    existing = {}
    if VOICES_FILE.exists():
        existing = json.loads(VOICES_FILE.read_text(encoding="utf-8"))

    for persona in targets:
        text = scripts.get(persona)
        if not text:
            print(f"no script for persona {persona!r}; skipping", file=sys.stderr)
            continue
        wav_path = out_dir / f"{persona}.wav"
        print(f"[{persona}] generating audio via Gemini …")
        gemini_synthesize(text, api_key=gemini_key, out_path=wav_path)
        print(f"[{persona}] uploading to Inworld …")
        voice_id = inworld_upload_ivc(wav_path, api_key=inworld_key, persona_label=persona)
        print(f"[{persona}] voiceId = {voice_id}")
        existing[persona] = voice_id
        write_voice_config(existing)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 12.5: Run tests (pass)**

Run: `python -m pytest tests/test_generate_meeting_mode_voices.py -v`
Expected: 2 PASS

- [ ] **Step 12.6: Run the live batch (operator action, requires keys)**

```bash
cd coastal-brewing
GEMINI_API_KEY="<from openclaw>" INWORLD_API_KEY="<from openclaw>" \
  python scripts/generate_meeting_mode_voices.py --all
```

After it completes, `configs/meeting-mode-voices.json` exists with the 5 voiceIds pinned.

- [ ] **Step 12.7: Commit**

```bash
git add coastal-brewing/configs/meeting-mode-voice-scripts.json \
        coastal-brewing/scripts/generate_meeting_mode_voices.py \
        coastal-brewing/configs/meeting-mode-voices.json \
        coastal-brewing/tests/test_generate_meeting_mode_voices.py
git commit -m "feat(meeting-mode): voice generation pipeline — Gemini synth → Inworld upload → pinned voiceIds"
```

---

## Task 13: Wire Inworld session mint with pinned voiceIds (real)

**Files:**
- Modify: `coastal-brewing/scripts/api_server.py` — replace Task 4 stub with live Inworld session mint

- [ ] **Step 13.1: Replace the stub's final raise with the live Inworld call**

Replace the `raise HTTPException(status_code=503, detail={"error": "Concierge runtime coming online" …})` block with:

```python
    if not INWORLD_API_KEY:
        raise HTTPException(status_code=503, detail={
            "error": "Concierge runtime not configured on this runner", "intent_id": intent_id,
        })

    # Load pinned voiceIds (written by scripts/generate_meeting_mode_voices.py)
    voices_path = pathlib.Path(__file__).resolve().parents[1] / "configs" / "meeting-mode-voices.json"
    if not voices_path.exists():
        raise HTTPException(status_code=503, detail={
            "error": "Concierge voice config not yet pinned", "intent_id": intent_id,
        })
    voices_config = json.loads(voices_path.read_text(encoding="utf-8"))
    try:
        voice_id = _meeting_mode.voice_id_for_persona(persona, config=voices_config)
    except KeyError:
        raise HTTPException(status_code=503, detail={
            "error": f"Concierge voice not yet pinned for persona {persona}", "intent_id": intent_id,
        })

    try:
        import urllib.request, urllib.error  # noqa: PLC0415
        req = urllib.request.Request(
            "https://api.inworld.ai/v1/realtime/sessions",
            method="POST",
            headers={"Authorization": f"Bearer {INWORLD_API_KEY}", "Content-Type": "application/json"},
            data=json.dumps({
                "voiceId": voice_id,
                "persona": persona,
                "ttlSeconds": 60,
            }).encode("utf-8"),
        )
        with urllib.request.urlopen(req, timeout=15) as resp:  # noqa: S310
            upstream = json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        body_excerpt = exc.read().decode("utf-8", errors="replace")[:200]
        log = __import__("logging").getLogger("coastal.meeting_mode")
        log.warning("inworld session mint failed: %s — %s", exc.code, body_excerpt)
        raise HTTPException(status_code=502, detail={
            "error": "Concierge runtime upstream error", "intent_id": intent_id,
        }) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail={
            "error": "Concierge runtime unreachable", "intent_id": intent_id,
        }) from exc

    _send_telegram_message(
        f"Meeting Mode · Concierge session minted\n"
        f"intent: {intent_id}\ncustee: {email}\npersona: {persona}\nmember: {body.is_member}"
    )

    return {
        "ok": True,
        "intent_id": intent_id,
        "session_token": upstream.get("session_token") or upstream.get("token"),
        "expires_at": upstream.get("expires_at"),
        "persona": persona,
        "voice_id": voice_id,
        "mode": "concierge",
        "member_discount_pct": _meeting_mode.MEMBER_DISCOUNT_PCT if body.is_member else 0,
    }
```

- [ ] **Step 13.2: Run unit tests still pass**

Run: `python -m pytest tests/test_meeting_mode_inworld_session.py -v`

- [ ] **Step 13.3: Deploy + live smoke (assumes voiceIds pinned from Task 12)**

```bash
scp coastal-brewing/scripts/api_server.py aims-vps:/docker/coastal-brewing/scripts/
scp coastal-brewing/configs/meeting-mode-voices.json aims-vps:/docker/coastal-brewing/configs/
ssh aims-vps "cd /docker/coastal-brewing && docker compose up -d --force-recreate coastal-runner"
# Smoke:
ssh aims-vps "GATEWAY=\$(grep '^COASTAL_GATEWAY_TOKEN=' /docker/coastal-brewing/.env | cut -d= -f2-); \
  curl -s -X POST http://localhost:8080/api/meeting-mode/inworld-session \
  -H 'Content-Type: application/json' -H \"X-Coastal-Token: \$GATEWAY\" \
  -d '{\"email\":\"smoke@x.io\",\"persona\":\"acheevy\",\"is_member\":true}' | head -c 400"
```
Expected: JSON with `ok: true, session_token: <string>, voice_id: <pinned>, member_discount_pct: 25`

- [ ] **Step 13.4: Commit**

```bash
git add coastal-brewing/scripts/api_server.py
git commit -m "feat(meeting-mode): wire Inworld Concierge session mint w/ pinned voiceIds + member discount"
```

---

## Task 14: PWA client-side WebRTC + WebSocket wiring

**Files:**
- Create: `coastal-brewing/web/lib/meeting-mode/openai-realtime.ts`
- Create: `coastal-brewing/web/lib/meeting-mode/inworld-client.ts`
- Modify: `coastal-brewing/web/components/meeting-mode/translation-tile.tsx` to call openai-realtime client
- Modify: `coastal-brewing/web/components/meeting-mode/concierge-chat.tsx` to call inworld-client

- [ ] **Step 14.1: Write the openai-realtime helper**

```ts
// web/lib/meeting-mode/openai-realtime.ts
"use client";

export interface OpenAIRealtimeSession {
  pc: RTCPeerConnection;
  micStream: MediaStream;
  remoteAudio: HTMLAudioElement;
  close: () => void;
}

export async function openOpenAIRealtimeSession(opts: {
  clientSecret: string;
  onTheirTranscript?: (text: string) => void;
  onTheirTranslation?: (text: string) => void;
  onYourTranscript?: (text: string) => void;
  onYourTranslation?: (text: string) => void;
}): Promise<OpenAIRealtimeSession> {
  const pc = new RTCPeerConnection();
  const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  micStream.getTracks().forEach((t) => pc.addTrack(t, micStream));

  const remoteAudio = new Audio();
  remoteAudio.autoplay = true;
  pc.ontrack = (ev) => {
    remoteAudio.srcObject = ev.streams[0];
  };

  // Data channel for transcript + translation events
  const dc = pc.createDataChannel("oai-events");
  dc.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.type === "transcript.in") opts.onTheirTranscript?.(msg.text);
      else if (msg.type === "translation.in") opts.onTheirTranslation?.(msg.text);
      else if (msg.type === "transcript.out") opts.onYourTranscript?.(msg.text);
      else if (msg.type === "translation.out") opts.onYourTranslation?.(msg.text);
    } catch { /* non-JSON event — ignore */ }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // OpenAI Realtime SDP exchange endpoint (verify URL at run time against current docs)
  const sdpRes = await fetch("https://api.openai.com/v1/realtime", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.clientSecret}`,
      "Content-Type": "application/sdp",
    },
    body: offer.sdp,
  });
  const answerSDP = await sdpRes.text();
  await pc.setRemoteDescription({ type: "answer", sdp: answerSDP });

  return {
    pc,
    micStream,
    remoteAudio,
    close: () => {
      micStream.getTracks().forEach((t) => t.stop());
      pc.close();
    },
  };
}
```

- [ ] **Step 14.2: Write the inworld-client helper**

```ts
// web/lib/meeting-mode/inworld-client.ts
"use client";

export interface InworldSession {
  ws: WebSocket;
  close: () => void;
  send: (text: string) => void;
}

export function openInworldSession(opts: {
  sessionToken: string;
  voiceId: string;
  persona: string;
  onMessage?: (text: string) => void;
  onAudio?: (chunk: ArrayBuffer) => void;
  onClose?: () => void;
}): InworldSession {
  // Verify the exact Inworld Realtime WS URL against their docs at runtime.
  const url = `wss://api.inworld.ai/v1/realtime?token=${encodeURIComponent(opts.sessionToken)}&voiceId=${encodeURIComponent(opts.voiceId)}`;
  const ws = new WebSocket(url);

  ws.binaryType = "arraybuffer";
  ws.onmessage = (ev) => {
    if (typeof ev.data === "string") {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "text" || msg.role === "concierge") opts.onMessage?.(msg.text);
      } catch { /* non-JSON ignored */ }
    } else if (ev.data instanceof ArrayBuffer) {
      opts.onAudio?.(ev.data);
    }
  };
  ws.onclose = () => opts.onClose?.();

  return {
    ws,
    close: () => ws.close(),
    send: (text: string) => ws.send(JSON.stringify({ type: "text", text, persona: opts.persona })),
  };
}
```

- [ ] **Step 14.3: Wire `translation-tile.tsx` to mint a session + open WebRTC**

Add to the TranslationTile component a `useEffect` that on mount:
1. POSTs to `/forms/meeting-mode/openai-session` with the user's email + is_member
2. On 200, calls `openOpenAIRealtimeSession({clientSecret, ...})` and wires the transcript callbacks into local state
3. On 503/502, surfaces a friendly error per Sacred Separation: "Translation is coming online — please try in a moment"

(Exact implementation omitted here for plan brevity; engineer follows the existing PoolerPassCheckoutForm pattern for fetch + error surfacing.)

- [ ] **Step 14.4: Wire `concierge-chat.tsx` similarly**

POST to `/forms/meeting-mode/inworld-session`, on 200 open `openInworldSession`, route incoming messages into `messages` state.

- [ ] **Step 14.5: Commit**

```bash
git add coastal-brewing/web/lib/meeting-mode/ coastal-brewing/web/components/meeting-mode/
git commit -m "feat(meeting-mode/web): WebRTC + WebSocket clients wired to /forms proxies"
```

---

## Task 15: Trial Mode 10-min cap + $6.54 service initiation hook

**Files:**
- Modify: `coastal-brewing/scripts/api_server.py` — add session-start counter + cap-enforcer middleware
- Modify: `coastal-brewing/web/components/meeting-mode/translation-tile.tsx` — display countdown + upgrade CTA

- [ ] **Step 15.1: Add a session-counter store keyed by intent_id**

In api_server.py (or a new `meeting_mode_sessions.py` module if scope grows), add a simple in-memory dict (good enough for Phase 1; promote to audit-ledger row in Phase 1.5):

```python
# Phase 1 in-memory session tracker. Promote to audit_ledger row in 1.5.
_MEETING_MODE_SESSIONS: dict[str, dict] = {}


def _record_session_start(intent_id: str, *, email: str, is_member: bool, mode: str) -> None:
    _MEETING_MODE_SESSIONS[intent_id] = {
        "email": email, "is_member": is_member, "mode": mode,
        "started_at": _time.time(), "trial": (not is_member) and mode == "translation",
    }


def _is_trial_capped(intent_id: str) -> bool:
    rec = _MEETING_MODE_SESSIONS.get(intent_id)
    if not rec or not rec.get("trial"):
        return False
    elapsed_seconds = _time.time() - rec["started_at"]
    return elapsed_seconds > (_meeting_mode.trial_minutes_cap() * 60)
```

- [ ] **Step 15.2: Add `_record_session_start(intent_id, ...)` calls into both openai-session + inworld-session handlers**

(Just before the upstream-mint call.)

- [ ] **Step 15.3: Add a session-end endpoint that the client calls when they end the session**

```python
class MeetingModeSessionEndRequest(BaseModel):
    intent_id: str


@app.post("/api/meeting-mode/session-end")
def meeting_mode_session_end(
    body: MeetingModeSessionEndRequest,
    x_coastal_token: str = Header(""),
) -> dict:
    _auth(x_coastal_token)
    rec = _MEETING_MODE_SESSIONS.pop(body.intent_id, None)
    if not rec:
        return {"ok": True, "found": False}
    duration_seconds = int(_time.time() - rec["started_at"])
    return {
        "ok": True, "found": True,
        "intent_id": body.intent_id,
        "duration_seconds": duration_seconds,
        "mode": rec["mode"],
    }
```

- [ ] **Step 15.4: Frontend countdown**

In `translation-tile.tsx`, when `is_member === false`, run a 10-minute countdown. When the countdown ends:
1. Close the WebRTC session
2. Show an upgrade CTA pointing at `/membership` (Custee Card flow that runs the $6.54 service initiation as part of the first-month payment)

- [ ] **Step 15.5: Commit**

```bash
git add coastal-brewing/scripts/api_server.py coastal-brewing/web/components/meeting-mode/
git commit -m "feat(meeting-mode): 10-min trial cap enforcement + session-end endpoint"
```

---

## Task 16: Playwright e2e for the PWA

**Files:**
- Create: `coastal-brewing/web/tests/e2e/meeting-mode.spec.ts`

- [ ] **Step 16.1: Write the e2e**

```ts
import { test, expect } from "@playwright/test";

const SMOKE_EMAIL = "playwright-meeting@achievemor.io";

test("meeting-mode page renders with mode toggle and both tile shells", async ({ page }) => {
  await page.goto("/meeting-mode");
  await expect(page).toHaveTitle(/Meeting Mode|Coastal/i);

  const toggle = page.locator('[data-mode-toggle]');
  await expect(toggle).toBeVisible();
  await expect(page.locator('[data-mode-option="translation"]')).toBeVisible();
  await expect(page.locator('[data-mode-option="concierge"]')).toBeVisible();

  // Default = translation tile visible
  await expect(page.locator('[data-meeting-mode-tile="translation"]')).toBeVisible();

  // Click Concierge → swap UIs
  await page.locator('[data-mode-option="concierge"]').click();
  await expect(page.locator('[data-meeting-mode-tile="concierge"]')).toBeVisible();
  await expect(page.locator('[data-meeting-mode-tile="translation"]')).toHaveCount(0);
});

test("pricing endpoint returns expected shape", async ({ request }) => {
  const r = await request.get("/forms/meeting-mode/pricing");
  expect(r.status()).toBe(200);
  const body = await r.json();
  expect(body.ok).toBe(true);
  expect(body.trial_minutes_cap).toBe(10);
  expect(body.service_initiation_cents).toBe(654);
  expect(body.member_discount_pct).toBe(25);
});

test("openai-session 400s on missing email", async ({ request }) => {
  const r = await request.post("/forms/meeting-mode/openai-session", {
    data: { email: "" },
  });
  expect([400, 422]).toContain(r.status());
});
```

- [ ] **Step 16.2: Run the suite**

Run: `cd coastal-brewing/web && npx playwright test meeting-mode --reporter=list`
Expected: 3 PASS (after deploy of all preceding tasks)

- [ ] **Step 16.3: Commit**

```bash
git add coastal-brewing/web/tests/e2e/meeting-mode.spec.ts
git commit -m "test(meeting-mode/web): Playwright e2e — page renders + pricing + validation"
```

---

## Task 17: React Native + Expo scaffold (parallel mobile build)

**Files:**
- Create: `coastal-brewing/mobile/package.json`
- Create: `coastal-brewing/mobile/app.json`
- Create: `coastal-brewing/mobile/App.tsx`
- Create: `coastal-brewing/mobile/src/screens/MeetingMode.tsx`
- Create: `coastal-brewing/mobile/src/components/translation-tile.tsx`
- Create: `coastal-brewing/mobile/src/components/concierge-chat.tsx`
- Create: `coastal-brewing/mobile/src/lib/coastal-api.ts`
- Create: `coastal-brewing/mobile/src/lib/openai-realtime.ts`
- Create: `coastal-brewing/mobile/src/lib/inworld-client.ts`
- Create: `coastal-brewing/mobile/eas.json`
- Create: `coastal-brewing/mobile/README.md`

This is a fresh Expo project. Engineer follows the standard Expo workflow:

- [ ] **Step 17.1: Init the Expo project**

```bash
cd coastal-brewing
npx create-expo-app@latest mobile --template blank-typescript
cd mobile
npx expo install react-native-webrtc expo-av
```

- [ ] **Step 17.2: Wire the MeetingMode screen mirror of the PWA**

Mirror the PWA's `app/meeting-mode/page.tsx` structure but in RN primitives. Reuse the same data attributes for cross-platform Playwright/Maestro testing.

- [ ] **Step 17.3: Configure EAS Build for iOS + Android**

`eas.json`:

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "preview": { "distribution": "internal", "ios": { "simulator": true } },
    "production": {}
  },
  "submit": { "production": {} }
}
```

- [ ] **Step 17.4: Document setup in README.md**

```markdown
# Coastal Mobile — C|Brew Conversation Mode

React Native + Expo app that wraps the Meeting Mode flow for iOS + Android.

## Local dev
```
npm install
npx expo start
```

## Build
```
npx eas build --platform ios --profile preview
npx eas build --platform android --profile preview
```

## Production submit
```
npx eas submit --platform ios
npx eas submit --platform android
```

Bundle ID + package name TBD — owner to assign before first store submission.
```

- [ ] **Step 17.5: Commit**

```bash
git add coastal-brewing/mobile/
git commit -m "feat(meeting-mode/mobile): React Native + Expo scaffold w/ MeetingMode screen parity"
```

---

## Task 18: Sacred Separation lint pass

**Files:**
- Create: `coastal-brewing/scripts/check_sacred_separation.py`
- Modify: `coastal-brewing/Makefile` or CI workflow (run linter before commit)

- [ ] **Step 18.1: Write the linter**

```python
# scripts/check_sacred_separation.py
"""Sacred Separation lint — fail if customer-facing surfaces leak provider
names. Runs over web/app/**, web/components/**, mobile/src/**."""
import re
import sys
from pathlib import Path

FORBIDDEN = re.compile(
    r"\b(OpenAI|OpenRouter|Inworld|Gemini|GPT-Realtime-Translate|Anthropic|Claude|Whisper)\b",
    re.IGNORECASE,
)

CUSTOMER_FACING_GLOBS = [
    "coastal-brewing/web/app/meeting-mode",
    "coastal-brewing/web/components/meeting-mode",
    "coastal-brewing/mobile/src/screens",
    "coastal-brewing/mobile/src/components",
]


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    hits = []
    for glob_path in CUSTOMER_FACING_GLOBS:
        for f in (root / glob_path).rglob("*"):
            if not f.is_file() or f.suffix not in (".tsx", ".ts", ".jsx", ".js"):
                continue
            for lineno, line in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
                if FORBIDDEN.search(line):
                    hits.append(f"{f.relative_to(root)}:{lineno}: {line.strip()}")
    if hits:
        print("Sacred Separation violations:\n  " + "\n  ".join(hits))
        return 1
    print("Sacred Separation: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 18.2: Run locally**

```bash
cd coastal-brewing
python scripts/check_sacred_separation.py
```
Expected: `Sacred Separation: OK` (or a list of files to fix)

- [ ] **Step 18.3: Commit**

```bash
git add coastal-brewing/scripts/check_sacred_separation.py
git commit -m "feat(meeting-mode): Sacred Separation linter — fails if provider names leak into customer copy"
```

---

## Self-review notes

1. **Spec coverage:** PRD §1 (modes) ↔ Tasks 7+8+9; §2 (trial) ↔ Task 15; §3 (voices) ↔ Task 12; §4 (slug) ↔ Tasks 9+10; §5 (env) ↔ pre-task prerequisites + Task 11 compose change; §6 (branding) ↔ deferred to Phase 1.5 Higgsfield queue + Task 10's interim icon; §7 (trial flow) ↔ Task 15.
2. **Placeholder scan:** Several "engineer follows the existing pattern" notes in Tasks 14.3-14.4 and 17.2 — these reference concrete existing files (PoolerPassCheckoutForm, app/meeting-mode/page.tsx) so engineers can mirror without ambiguity. No "TODO" or "implement later".
3. **Type consistency:** `MeetingMode` type used consistently across mode-toggle.tsx + page.tsx; `ConciergeMessage` defined in concierge-chat.tsx and reused in page.tsx import. Persona slug case is consistent lowercase across runner + frontend + voice gen script.
4. **Dependency order:** Tasks 1→18 form a strict dependency chain. Tasks 2-5 ship a working stub-state PWA (Wave 1). Tasks 11+13 light up the real APIs (Wave 2). Task 12 (voice gen) blocks Task 13 (Inworld session needs pinned voiceIds). Task 17 (RN scaffold) is parallel — can start after Task 9 (PWA shape ratified).

---

## Execution handoff

**Plan complete and saved to `coastal-brewing/docs/plans/meeting-mode-phase-1-plan-2026-05-11.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
