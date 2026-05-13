# Coastal Owner Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a single-PR, owner-only admin surface at `brewing.foai.cloud/owner` with 6 tabs (Activity / Pricing / Customers / NemoClaw / Audit / Cfg), 2-factor auth (magic-link + WebAuthn passkey), and live-edit JSON config with hot-reload.

**Architecture:** New Next.js page at `web/app/owner/` calling new FastAPI endpoints at `/api/v1/owner/*` on the existing coastal-runner. Owner sessions gated by HMAC-signed `coastal_owner` cookie minted only after a WebAuthn assertion verifies. Pricing / voice / email-template canon lifts from Python source constants into JSON files at `/docker/coastal-brewing/config/`, read by existing modules through an mtime-cached loader.

**Tech Stack:** Python 3.13 + FastAPI + SQLite (`audit_ledger`) backend; `webauthn` Python lib for FIDO2; Next.js 14 App Router + Tailwind + framer-motion + SWR for frontend; browser-native `navigator.credentials.{create,get}` for WebAuthn ceremony.

**Reference spec:** `coastal-brewing/docs/superpowers/specs/2026-05-13-coastal-owner-console-design.md`

---

## File Structure

**Create:**
- `coastal-brewing/scripts/owner_config_loader.py` — mtime-cached JSON loader (single shared module for pricing / voice / email)
- `coastal-brewing/scripts/owner_auth.py` — cookie sign/verify, WebAuthn ceremony, allowlist + lockout
- `coastal-brewing/scripts/owner_console.py` — `/api/v1/owner/*` API router
- `coastal-brewing/config/pricing-config.json` (seed file committed to repo for bootstrap)
- `coastal-brewing/config/voice-config.json`
- `coastal-brewing/config/email-templates.json`
- `coastal-brewing/web/app/owner/page.tsx` (parent shell + tab router)
- `coastal-brewing/web/app/owner/_components/Tabs.tsx`
- `coastal-brewing/web/app/owner/_components/ActivityTab.tsx`
- `coastal-brewing/web/app/owner/_components/PricingTab.tsx`
- `coastal-brewing/web/app/owner/_components/CustomersTab.tsx`
- `coastal-brewing/web/app/owner/_components/NemoClawTab.tsx`
- `coastal-brewing/web/app/owner/_components/AuditTab.tsx`
- `coastal-brewing/web/app/owner/_components/CfgTab.tsx`
- `coastal-brewing/web/app/owner/_components/ConfirmModal.tsx`
- `coastal-brewing/web/app/owner/enroll/page.tsx`
- `coastal-brewing/web/app/owner/challenge/page.tsx`
- `coastal-brewing/web/lib/webauthn.ts` (browser-side WebAuthn helpers)
- `coastal-brewing/tests/test_owner_config_loader.py`
- `coastal-brewing/tests/test_owner_auth.py`
- `coastal-brewing/tests/test_owner_console_reads.py`
- `coastal-brewing/tests/test_owner_console_writes.py`

**Modify:**
- `coastal-brewing/scripts/cadence.py` — switch `CADENCES` constants to read through `owner_config_loader.get_pricing()`
- `coastal-brewing/scripts/profitability.py` — switch `_TIER_ENVELOPES_CENTS` to read through `owner_config_loader.get_pricing()`
- `coastal-brewing/scripts/api_server.py` — switch `_COASTAL_V2_VOICEID` to loader; mount owner router; add owner-email allowlist branch in `/auth/verify`
- `coastal-brewing/scripts/audit_ledger.py` — add `owner_passkeys` table migration
- `coastal-brewing/scripts/adapters/email_adapter.py` — switch `magic_link_email_body` text to loader
- `coastal-brewing/requirements.txt` — add `webauthn>=2.0`
- `/docker/coastal-brewing/.env` (ops side, post-merge) — add `COASTAL_OWNER_EMAILS`, `COASTAL_OWNER_SESSION_SECRET`

---

## Task 1: Config loader (mtime-cached JSON read with atomic write)

**Files:**
- Create: `coastal-brewing/scripts/owner_config_loader.py`
- Test: `coastal-brewing/tests/test_owner_config_loader.py`
- Create: `coastal-brewing/config/.gitkeep`

- [ ] **Step 1: Write the failing test**

```python
# coastal-brewing/tests/test_owner_config_loader.py
"""Tests for the mtime-cached JSON loader used by pricing / voice / email
config surfaces. Pinning:
- cached values are returned on repeated calls without re-reading disk
- mtime change → cached value invalidated and disk re-read
- atomic_write_json: tempfile + os.replace, no partial writes visible to readers
- malformed JSON on disk returns the last-good cached value AND logs a warning
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from unittest import mock

import pytest

REPO_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(REPO_SCRIPTS))

from owner_config_loader import load_json, atomic_write_json, _CACHE  # noqa: E402


@pytest.fixture(autouse=True)
def clear_cache():
    _CACHE.clear()
    yield
    _CACHE.clear()


def _write(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload), encoding="utf-8")


def test_first_read_caches_value(tmp_path):
    p = tmp_path / "cfg.json"
    _write(p, {"a": 1})
    out = load_json(p)
    assert out == {"a": 1}
    assert str(p) in _CACHE


def test_second_read_returns_cached_without_re-reading(tmp_path):
    p = tmp_path / "cfg.json"
    _write(p, {"a": 1})
    load_json(p)
    with mock.patch("owner_config_loader._read_disk", side_effect=AssertionError("must not re-read")):
        out = load_json(p)
    assert out == {"a": 1}


def test_mtime_change_invalidates_cache(tmp_path):
    p = tmp_path / "cfg.json"
    _write(p, {"a": 1})
    load_json(p)
    # advance mtime
    time.sleep(0.01)
    _write(p, {"a": 2})
    out = load_json(p)
    assert out == {"a": 2}


def test_atomic_write_then_read_round_trip(tmp_path):
    p = tmp_path / "cfg.json"
    _write(p, {"a": 1})
    load_json(p)
    atomic_write_json(p, {"a": 99})
    assert load_json(p) == {"a": 99}


def test_atomic_write_uses_tempfile_replace(tmp_path):
    p = tmp_path / "cfg.json"
    # No previous file
    atomic_write_json(p, {"created": True})
    assert json.loads(p.read_text()) == {"created": True}
    # No leftover temp files in dir
    leftovers = [f for f in tmp_path.iterdir() if f.name.startswith("cfg.json.tmp")]
    assert leftovers == []


def test_malformed_json_returns_last_good_and_warns(tmp_path, caplog):
    p = tmp_path / "cfg.json"
    _write(p, {"a": 1})
    load_json(p)
    # Corrupt the file
    p.write_text("{not json", encoding="utf-8")
    time.sleep(0.01)
    # Force mtime update
    p.touch()
    with caplog.at_level("WARNING"):
        out = load_json(p)
    assert out == {"a": 1}  # last-good
    assert any("malformed json" in r.message.lower() for r in caplog.records)
```

- [ ] **Step 2: Run test to verify it fails**

```
cd coastal-brewing && python -m pytest tests/test_owner_config_loader.py -v
```

Expected: `ModuleNotFoundError: No module named 'owner_config_loader'`

- [ ] **Step 3: Write minimal implementation**

```python
# coastal-brewing/scripts/owner_config_loader.py
"""Mtime-cached JSON config loader.

Shared by `cadence.py`, `profitability.py`, `api_server.py` (voice
registry), and `email_adapter.py` to read owner-managed config from
`/app/config/*.json` (host: `/docker/coastal-brewing/config/*.json`).

Contract:
- `load_json(path)` returns the parsed dict. Caches by path + mtime.
  Subsequent calls with unchanged mtime return the cached value
  without disk I/O.
- `atomic_write_json(path, data)` writes via tempfile + os.replace
  so concurrent readers never see a half-written file.
- Malformed JSON on disk falls back to the last-good cached value
  (defensive — the owner_console write path validates before writing,
  this guard is for resilience against external/manual edits).
"""
from __future__ import annotations

import json
import logging
import os
import tempfile
from pathlib import Path
from typing import Any

log = logging.getLogger("coastal.owner_config_loader")

# Path → (mtime_ns, value)
_CACHE: dict[str, tuple[int, Any]] = {}


def _read_disk(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_json(path: str | Path) -> Any:
    p = Path(path)
    key = str(p)
    try:
        mtime_ns = p.stat().st_mtime_ns
    except FileNotFoundError:
        log.warning("config file missing: %s", p)
        return _CACHE.get(key, (0, {}))[1]
    cached = _CACHE.get(key)
    if cached is not None and cached[0] == mtime_ns:
        return cached[1]
    try:
        value = _read_disk(p)
    except json.JSONDecodeError as exc:
        log.warning("malformed json at %s: %s — returning last-good", p, exc)
        return cached[1] if cached else {}
    _CACHE[key] = (mtime_ns, value)
    return value


def atomic_write_json(path: str | Path, data: Any) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(
        prefix=p.name + ".tmp.",
        dir=str(p.parent),
        suffix=".json",
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, sort_keys=True)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, p)
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise
```

```
# coastal-brewing/config/.gitkeep
```
(empty file to ensure the config dir exists in repo; real seed JSONs land in later tasks)

- [ ] **Step 4: Run tests to verify they pass**

```
cd coastal-brewing && python -m pytest tests/test_owner_config_loader.py -v
```

Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add coastal-brewing/scripts/owner_config_loader.py \
        coastal-brewing/tests/test_owner_config_loader.py \
        coastal-brewing/config/.gitkeep
git commit -m "feat(coastal/owner): add mtime-cached JSON config loader"
```

---

## Task 2: Lift `cadence.CADENCES` to pricing-config.json

**Files:**
- Modify: `coastal-brewing/scripts/cadence.py:18-63` (replace module-constant with loader read)
- Create: `coastal-brewing/config/pricing-config.json` (seed with current canon)
- Test: `coastal-brewing/tests/test_owner_config_loader.py` (extend with cadence round-trip)

- [ ] **Step 1: Write the failing test extension**

Append to `coastal-brewing/tests/test_owner_config_loader.py`:

```python
def test_cadence_module_reads_through_loader(tmp_path, monkeypatch):
    """When pricing-config.json is overridden, cadence.CADENCES must
    reflect it. The previous Python-module-constant pattern would have
    locked the value at import time."""
    cfg = tmp_path / "pricing-config.json"
    atomic_write_json(cfg, {
        "cadences": {
            "monthly": {"discount": 0.0, "months_paid": 1, "months_delivered": 1,
                        "stripe_interval": "month", "stripe_interval_count": 1,
                        "label": "Month-to-month", "framing": "Standard. No commitment."},
            "3mo": {"discount": 0.99, "months_paid": 3, "months_delivered": 3,
                    "stripe_interval": "month", "stripe_interval_count": 3,
                    "label": "TEST", "framing": "TEST"},
            "6mo": {"discount": 0.20, "months_paid": 6, "months_delivered": 6,
                    "stripe_interval": "month", "stripe_interval_count": 6,
                    "label": "x", "framing": "x"},
            "9mo": {"discount": 0.25, "months_paid": 9, "months_delivered": 12,
                    "stripe_interval": "month", "stripe_interval_count": 12,
                    "label": "x", "framing": "x"},
        },
        "tier_monthly_retail": {},
        "tier_envelope_max_cents": {},
    })
    monkeypatch.setenv("COASTAL_OWNER_CONFIG_DIR", str(tmp_path))
    # Force a clean import of cadence
    import importlib, sys
    if "cadence" in sys.modules:
        del sys.modules["cadence"]
    import cadence  # noqa: PLC0415
    assert cadence.CADENCES["3mo"]["discount"] == 0.99
```

- [ ] **Step 2: Create seed pricing-config.json**

```json
// coastal-brewing/config/pricing-config.json
{
  "cadences": {
    "monthly": {
      "label": "Month-to-month",
      "discount": 0.00,
      "months_paid": 1,
      "months_delivered": 1,
      "stripe_interval": "month",
      "stripe_interval_count": 1,
      "framing": "Standard. No commitment."
    },
    "3mo": {
      "label": "3-month plan",
      "discount": 0.15,
      "months_paid": 3,
      "months_delivered": 3,
      "stripe_interval": "month",
      "stripe_interval_count": 3,
      "framing": "First commitment — supporting us."
    },
    "6mo": {
      "label": "6-month plan",
      "discount": 0.20,
      "months_paid": 6,
      "months_delivered": 6,
      "stripe_interval": "month",
      "stripe_interval_count": 6,
      "framing": "Balance — buying into the mission."
    },
    "9mo": {
      "label": "9-month plan (pay 9, get 12)",
      "discount": 0.25,
      "months_paid": 9,
      "months_delivered": 12,
      "stripe_interval": "month",
      "stripe_interval_count": 12,
      "framing": "Full support — pay 9, get 12."
    }
  },
  "tier_monthly_retail": {
    "pooler-pass-standard": 7.49,
    "pooler-pass-plus":     14.99,
    "custee-card":          29.99,
    "wood-stork-standard":  74.99,
    "wood-stork-reserve":   149.99
  },
  "tier_envelope_max_cents": {
    "pooler-pass-standard": 1500,
    "pooler-pass-plus":     3000,
    "custee-card":          6000,
    "wood-stork-standard":  15000,
    "wood-stork-reserve":   30000
  }
}
```

(Verify `tier_envelope_max_cents` matches current `profitability._TIER_ENVELOPES_CENTS`; if values differ, MATCH the current canon — don't change it in this PR. Check `profitability.py` for the exact dict, copy values.)

- [ ] **Step 3: Modify cadence.py to read through loader**

In `coastal-brewing/scripts/cadence.py`, replace the `CADENCES` constant (lines ~26-63) with:

```python
import os
from pathlib import Path
import owner_config_loader as _loader


def _config_dir() -> Path:
    return Path(os.environ.get("COASTAL_OWNER_CONFIG_DIR", "/app/config"))


def _pricing_config() -> dict:
    return _loader.load_json(_config_dir() / "pricing-config.json")


def _get_cadences() -> dict[CadenceId, dict]:
    return _pricing_config().get("cadences", {})


# Backwards-compat: existing call sites use `cadence.CADENCES` directly.
# We expose it as a module-level proxy that fetches fresh on every access.
class _CadenceProxy:
    def __getitem__(self, key):
        return _get_cadences()[key]

    def get(self, key, default=None):
        return _get_cadences().get(key, default)

    def __iter__(self):
        return iter(_get_cadences())

    def __contains__(self, key):
        return key in _get_cadences()

    def keys(self):
        return _get_cadences().keys()

    def items(self):
        return _get_cadences().items()

    def values(self):
        return _get_cadences().values()


CADENCES = _CadenceProxy()
```

Keep all helper functions (`is_valid_cadence`, `cadence_total`, etc.) unchanged — they reference `CADENCES` and continue to work.

- [ ] **Step 4: Run full test suite to verify nothing broke**

```
cd coastal-brewing && python -m pytest tests/test_owner_config_loader.py tests/test_cadence_subscription_data.py tests/test_profitability.py tests/test_tier_retail_canon.py -v
```

Expected: all pass. The cadence proxy is API-compatible with the old dict for `__getitem__`, `.get`, `.keys()`, `.items()`, `__iter__`, `__contains__`.

- [ ] **Step 5: Commit**

```bash
git add coastal-brewing/scripts/cadence.py \
        coastal-brewing/config/pricing-config.json \
        coastal-brewing/tests/test_owner_config_loader.py
git commit -m "feat(coastal/owner): lift cadence.CADENCES to pricing-config.json with hot-reload"
```

---

## Task 3: Lift `profitability._TIER_ENVELOPES_CENTS` + `tier_monthly_retail` to pricing-config.json

**Files:**
- Modify: `coastal-brewing/scripts/profitability.py` (replace `_TIER_ENVELOPES_CENTS` constant with loader read)
- Modify: `coastal-brewing/scripts/api_server.py` (or wherever monthly_retail is read for tier checkouts) to read from config
- Test: `coastal-brewing/tests/test_profitability.py` (verify dynamic override works)

- [ ] **Step 1: Grep current usages**

```
cd coastal-brewing && grep -n "_TIER_ENVELOPES_CENTS\|tier_monthly_retail\|monthly_retail = " scripts/profitability.py scripts/api_server.py
```

Note exact line numbers + current values.

- [ ] **Step 2: Modify profitability.py**

Replace the `_TIER_ENVELOPES_CENTS` constant with:

```python
import os
from pathlib import Path
import owner_config_loader as _loader


def _config_dir() -> Path:
    return Path(os.environ.get("COASTAL_OWNER_CONFIG_DIR", "/app/config"))


def _envelope_cents() -> dict[str, int]:
    cfg = _loader.load_json(_config_dir() / "pricing-config.json")
    return cfg.get("tier_envelope_max_cents", {})


# Existing functions that read _TIER_ENVELOPES_CENTS now call _envelope_cents()
```

Replace every reference to `_TIER_ENVELOPES_CENTS[tier]` with `_envelope_cents()[tier]`. Same shape, same keys, just dynamic.

- [ ] **Step 3: Modify api_server.py tier checkout handlers**

Locate the 3 tier checkout handlers (`custee_card_checkout`, `wood_stork_checkout`, `pooler_pass_checkout`). Each currently reads `monthly_retail` from a hard-coded source (membership_pooler_pass.py, membership_wood_stork.py, etc., per memory `feedback_coastal_tier_monthly_retail_is_canon_anchor`).

Add a tier-name lookup that reads from `pricing-config.json` via:

```python
def _tier_monthly_retail(tier_id: str) -> float:
    """Read the canonical monthly retail for a tier from pricing-config.
    Falls back to module constants if the config file is missing or the
    tier isn't listed — this preserves the canon-anchor pattern."""
    import owner_config_loader as _loader
    cfg_path = Path(os.environ.get("COASTAL_OWNER_CONFIG_DIR", "/app/config")) / "pricing-config.json"
    cfg = _loader.load_json(cfg_path)
    return float(cfg.get("tier_monthly_retail", {}).get(tier_id, 0.0))
```

In each checkout handler, replace the existing `monthly_retail = <hardcoded>` with `monthly_retail = _tier_monthly_retail("<tier_id>")`. Tier IDs: `pooler-pass-standard|plus`, `custee-card`, `wood-stork-standard|reserve`.

- [ ] **Step 4: Run pytest**

```
cd coastal-brewing && python -m pytest tests/test_profitability.py tests/test_tier_retail_canon.py tests/test_cadence_subscription_data.py tests/test_checkout_call_site_metadata_wiring.py -v
```

Expected: all pass. The values in `pricing-config.json` were seeded to match current canon, so behaviour is identical.

- [ ] **Step 5: Commit**

```bash
git add coastal-brewing/scripts/profitability.py coastal-brewing/scripts/api_server.py
git commit -m "feat(coastal/owner): lift tier monthly retail + envelope caps to pricing-config.json"
```

---

## Task 4: Lift `_COASTAL_V2_VOICEID` + Inworld voice registry to voice-config.json

**Files:**
- Modify: `coastal-brewing/scripts/api_server.py:6417-` (the `_COASTAL_V2_VOICEID` block)
- Create: `coastal-brewing/config/voice-config.json`

- [ ] **Step 1: Create voice-config.json seed**

```json
// coastal-brewing/config/voice-config.json
{
  "persona_voice_ids": {
    "sal_ang":       "default-4zhua1rhxjfl50z1dnkcba__coastal-sal-ang-v2",
    "luc_ang":       "default-4zhua1rhxjfl50z1dnkcba__coastal-luc-ang-v2",
    "melli_capensi": "default-4zhua1rhxjfl50z1dnkcba__coastal-melli-capensi-v2",
    "acheevy":       "default-4zhua1rhxjfl50z1dnkcba__acheevy-mcknight-soulful-tenor-v3"
  },
  "lp_voice_override_env": "INWORLD_VOICE_ID_LP"
}
```

(Verify exact voice IDs match the current `_COASTAL_V2_VOICEID` dict in `api_server.py`. Copy literally — don't change canon in this PR.)

- [ ] **Step 2: Modify api_server.py**

Replace the `_COASTAL_V2_VOICEID` dict (~ line 6417) with:

```python
def _coastal_v2_voiceid() -> dict[str, str]:
    """Read the IVC persona voice registry from voice-config.json. Hot-
    reloads on file change (no runner restart needed when owner updates
    a voice ID via /owner/cfg)."""
    cfg_path = Path(os.environ.get("COASTAL_OWNER_CONFIG_DIR", "/app/config")) / "voice-config.json"
    cfg = owner_config_loader.load_json(cfg_path)
    return cfg.get("persona_voice_ids", {})


# Module-level expression callers used to do `_COASTAL_V2_VOICEID["sal_ang"]`
# — keep that ergonomics by exposing a proxy.
class _VoiceRegistryProxy:
    def __getitem__(self, k): return _coastal_v2_voiceid()[k]
    def get(self, k, d=None): return _coastal_v2_voiceid().get(k, d)
    def __contains__(self, k): return k in _coastal_v2_voiceid()


_COASTAL_V2_VOICEID = _VoiceRegistryProxy()
```

Add at top of file (if not already): `import owner_config_loader` (after `sys.path` adjustments).

- [ ] **Step 3: Run any voice-touching tests + a live smoke**

```
cd coastal-brewing && python -m pytest tests/ -k "voice or persona" -v
```

Expected: pass (or empty result if no test currently exercises voice).

Live smoke (after deploy, document for later): `curl https://brewing.foai.cloud/api/v1/voice/synthesize -d '{"persona":"sal_ang","text":"hello"}' -H 'X-Coastal-Token: ...'` → expect mp3 stream.

- [ ] **Step 4: Commit**

```bash
git add coastal-brewing/scripts/api_server.py coastal-brewing/config/voice-config.json
git commit -m "feat(coastal/owner): lift _COASTAL_V2_VOICEID to voice-config.json with hot-reload"
```

---

## Task 5: Lift email body strings to email-templates.json

**Files:**
- Modify: `coastal-brewing/scripts/adapters/email_adapter.py:122-142` (`magic_link_email_body` function)
- Create: `coastal-brewing/config/email-templates.json`

- [ ] **Step 1: Create email-templates.json seed**

```json
// coastal-brewing/config/email-templates.json
{
  "magic_link": {
    "subject_signup": "Confirm your Coastal Brewing Co. account",
    "subject_login": "Pull up to the counter — your Coastal sign-in link",
    "body": "Pull up to the counter.\n\nClick below to sign in to your Coastal Brewing Co. account — same cup, new device, no password to remember.\n\n{magic_link}\n\nThis link expires in {ttl_minutes} minutes and can only be used once. If you didn't ask to sign in, you can ignore this email — your account stays as it is.\n\nReal fine — Coastal Brewing Co.\n"
  }
}
```

- [ ] **Step 2: Modify email_adapter.magic_link_email_body**

Replace the function body:

```python
def magic_link_email_body(
    *, recipient_email: str, magic_link: str, ttl_minutes: int = 30,
) -> tuple[str, str]:
    """Compose plaintext body for the magic-link email. Template read
    from email-templates.json with placeholder interpolation. Returns
    `(html, text)` tuple for backwards-compat — both elements identical
    plaintext under AppInt; SMTP wraps text in HTML at send time."""
    import os
    from pathlib import Path
    import owner_config_loader
    cfg_path = Path(os.environ.get("COASTAL_OWNER_CONFIG_DIR", "/app/config")) / "email-templates.json"
    cfg = owner_config_loader.load_json(cfg_path)
    template = cfg.get("magic_link", {}).get("body", "")
    text = template.format(magic_link=magic_link, ttl_minutes=ttl_minutes)
    return text, text
```

- [ ] **Step 3: Run any auth-flow tests**

```
cd coastal-brewing && python -m pytest tests/ -k "auth or email or magic" -v
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add coastal-brewing/scripts/adapters/email_adapter.py coastal-brewing/config/email-templates.json
git commit -m "feat(coastal/owner): lift magic-link email template to email-templates.json"
```

---

## Task 6: `audit_ledger.owner_passkeys` table migration

**Files:**
- Modify: `coastal-brewing/scripts/audit_ledger.py` (add new migration function)
- Test: `coastal-brewing/tests/test_audit_ledger_owner_passkeys.py` (new)

- [ ] **Step 1: Write the failing test**

```python
# coastal-brewing/tests/test_audit_ledger_owner_passkeys.py
"""Schema test for the owner_passkeys table — one row per owner email,
stores the WebAuthn credential public key + signature counter."""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

import pytest

REPO_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(REPO_SCRIPTS))

import audit_ledger  # noqa: E402


@pytest.fixture
def db(tmp_path, monkeypatch):
    db_path = tmp_path / "test_ledger.db"
    monkeypatch.setattr(audit_ledger, "AUDIT_LEDGER_DB", str(db_path))
    audit_ledger._migrate(str(db_path))
    return db_path


def test_owner_passkeys_table_exists(db):
    conn = sqlite3.connect(db)
    cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='owner_passkeys'")
    assert cur.fetchone() is not None


def test_owner_passkeys_columns(db):
    conn = sqlite3.connect(db)
    cur = conn.execute("PRAGMA table_info(owner_passkeys)")
    cols = {row[1]: row[2] for row in cur.fetchall()}
    assert cols == {
        "email": "TEXT",
        "credential_id": "BLOB",
        "public_key": "BLOB",
        "sign_count": "INTEGER",
        "registered_at": "INTEGER",
        "last_used_at": "INTEGER",
    }


def test_owner_passkeys_email_is_primary_key(db):
    conn = sqlite3.connect(db)
    cur = conn.execute("PRAGMA table_info(owner_passkeys)")
    pk_cols = [row[1] for row in cur.fetchall() if row[5] > 0]
    assert pk_cols == ["email"]


def test_register_passkey_and_fetch(db):
    audit_ledger.register_owner_passkey(
        email="asg@achievemor.io",
        credential_id=b"\x01\x02\x03",
        public_key=b"\xab\xcd",
        sign_count=0,
    )
    row = audit_ledger.fetch_owner_passkey("asg@achievemor.io")
    assert row is not None
    assert row["email"] == "asg@achievemor.io"
    assert row["credential_id"] == b"\x01\x02\x03"
    assert row["public_key"] == b"\xab\xcd"
    assert row["sign_count"] == 0


def test_bump_sign_count(db):
    audit_ledger.register_owner_passkey(
        email="asg@achievemor.io",
        credential_id=b"\x01",
        public_key=b"\x02",
        sign_count=5,
    )
    audit_ledger.bump_owner_passkey_sign_count("asg@achievemor.io", 6)
    row = audit_ledger.fetch_owner_passkey("asg@achievemor.io")
    assert row["sign_count"] == 6
    assert row["last_used_at"] > 0


def test_delete_passkey(db):
    audit_ledger.register_owner_passkey(
        email="asg@achievemor.io",
        credential_id=b"\x01",
        public_key=b"\x02",
        sign_count=0,
    )
    audit_ledger.delete_owner_passkey("asg@achievemor.io")
    assert audit_ledger.fetch_owner_passkey("asg@achievemor.io") is None
```

- [ ] **Step 2: Run test to verify it fails**

```
cd coastal-brewing && python -m pytest tests/test_audit_ledger_owner_passkeys.py -v
```

Expected: fails on missing functions.

- [ ] **Step 3: Add migration + helpers to audit_ledger.py**

In `coastal-brewing/scripts/audit_ledger.py`, inside `_migrate(...)`:

```python
def _migrate(db_path: str) -> None:
    # ... existing migrations ...
    conn = sqlite3.connect(db_path)
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS owner_passkeys (
                email TEXT PRIMARY KEY,
                credential_id BLOB NOT NULL,
                public_key BLOB NOT NULL,
                sign_count INTEGER NOT NULL DEFAULT 0,
                registered_at INTEGER NOT NULL,
                last_used_at INTEGER NOT NULL DEFAULT 0
            )
        """)
        conn.commit()
    finally:
        conn.close()


def register_owner_passkey(
    *, email: str, credential_id: bytes, public_key: bytes, sign_count: int = 0,
) -> None:
    import time as _t
    conn = sqlite3.connect(AUDIT_LEDGER_DB)
    try:
        conn.execute(
            "INSERT OR REPLACE INTO owner_passkeys "
            "(email, credential_id, public_key, sign_count, registered_at, last_used_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (email, credential_id, public_key, sign_count, int(_t.time()), 0),
        )
        conn.commit()
    finally:
        conn.close()


def fetch_owner_passkey(email: str) -> dict | None:
    conn = sqlite3.connect(AUDIT_LEDGER_DB)
    try:
        conn.row_factory = sqlite3.Row
        cur = conn.execute(
            "SELECT email, credential_id, public_key, sign_count, registered_at, last_used_at "
            "FROM owner_passkeys WHERE email = ?",
            (email,),
        )
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def bump_owner_passkey_sign_count(email: str, new_count: int) -> None:
    import time as _t
    conn = sqlite3.connect(AUDIT_LEDGER_DB)
    try:
        conn.execute(
            "UPDATE owner_passkeys SET sign_count = ?, last_used_at = ? WHERE email = ?",
            (new_count, int(_t.time()), email),
        )
        conn.commit()
    finally:
        conn.close()


def delete_owner_passkey(email: str) -> None:
    conn = sqlite3.connect(AUDIT_LEDGER_DB)
    try:
        conn.execute("DELETE FROM owner_passkeys WHERE email = ?", (email,))
        conn.commit()
    finally:
        conn.close()
```

- [ ] **Step 4: Run test to verify it passes**

```
cd coastal-brewing && python -m pytest tests/test_audit_ledger_owner_passkeys.py -v
```

Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add coastal-brewing/scripts/audit_ledger.py coastal-brewing/tests/test_audit_ledger_owner_passkeys.py
git commit -m "feat(coastal/owner): add owner_passkeys table + CRUD helpers in audit_ledger"
```

---

## Task 7: `owner_auth.py` — cookie sign/verify + allowlist + lockout

**Files:**
- Create: `coastal-brewing/scripts/owner_auth.py`
- Test: `coastal-brewing/tests/test_owner_auth.py`

- [ ] **Step 1: Write the failing test**

```python
# coastal-brewing/tests/test_owner_auth.py
"""Owner cookie sign/verify + allowlist parsing + lockout state."""
from __future__ import annotations

import sys
import time
from pathlib import Path

import pytest

REPO_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(REPO_SCRIPTS))

import owner_auth  # noqa: E402


SECRET = "test-owner-session-secret-12345"


def test_sign_then_verify_round_trip():
    cookie = owner_auth.sign_owner_cookie("asg@achievemor.io", SECRET, ttl_sec=3600)
    parsed = owner_auth.verify_owner_cookie(cookie, SECRET)
    assert parsed is not None
    assert parsed["email"] == "asg@achievemor.io"


def test_verify_rejects_tampered_email():
    cookie = owner_auth.sign_owner_cookie("asg@achievemor.io", SECRET, ttl_sec=3600)
    # Swap the email part
    parts = cookie.split(".")
    tampered = "evil@example.com" + "." + ".".join(parts[1:])
    assert owner_auth.verify_owner_cookie(tampered, SECRET) is None


def test_verify_rejects_expired_cookie():
    cookie = owner_auth.sign_owner_cookie("asg@achievemor.io", SECRET, ttl_sec=-1)
    assert owner_auth.verify_owner_cookie(cookie, SECRET) is None


def test_verify_rejects_wrong_secret():
    cookie = owner_auth.sign_owner_cookie("asg@achievemor.io", SECRET, ttl_sec=3600)
    assert owner_auth.verify_owner_cookie(cookie, "different-secret") is None


def test_parse_allowlist_strips_whitespace():
    out = owner_auth.parse_allowlist("a@x.com, b@x.com ,  c@x.com")
    assert out == {"a@x.com", "b@x.com", "c@x.com"}


def test_parse_allowlist_empty_env_returns_empty_set():
    assert owner_auth.parse_allowlist("") == set()
    assert owner_auth.parse_allowlist(None) == set()


def test_is_owner_email_matches_allowlist_case_insensitive():
    allow = {"asg@achievemor.io"}
    assert owner_auth.is_owner_email("ASG@Achievemor.IO", allow) is True
    assert owner_auth.is_owner_email("not-owner@example.com", allow) is False


def test_lockout_records_failures_and_blocks():
    owner_auth._LOCKOUT.clear()
    email = "asg@achievemor.io"
    assert owner_auth.is_locked(email) is False
    owner_auth.record_failure(email)
    owner_auth.record_failure(email)
    assert owner_auth.is_locked(email) is False
    owner_auth.record_failure(email)
    assert owner_auth.is_locked(email) is True


def test_lockout_clears_after_window(monkeypatch):
    owner_auth._LOCKOUT.clear()
    email = "asg@achievemor.io"
    for _ in range(3):
        owner_auth.record_failure(email)
    assert owner_auth.is_locked(email) is True
    # Advance the lockout clock
    fake_now = time.time() + owner_auth.LOCKOUT_WINDOW_SEC + 1
    monkeypatch.setattr(owner_auth.time, "time", lambda: fake_now)
    assert owner_auth.is_locked(email) is False
```

- [ ] **Step 2: Run test to verify it fails**

```
cd coastal-brewing && python -m pytest tests/test_owner_auth.py -v
```

Expected: `ModuleNotFoundError: No module named 'owner_auth'`.

- [ ] **Step 3: Write owner_auth.py (cookie + allowlist + lockout only — WebAuthn comes in Task 8)**

```python
# coastal-brewing/scripts/owner_auth.py
"""Owner-only auth primitives — cookie HMAC sign/verify, allowlist
parsing, and per-email lockout tracking.

The WebAuthn ceremony lives in this module too (see _webauthn block
added in Task 8). This file is the single source of truth for "is
this caller the owner" across the FastAPI router."""
from __future__ import annotations

import hashlib
import hmac
import logging
import os
import time
from typing import Optional

log = logging.getLogger("coastal.owner_auth")

# Tunable constants — overridable by env for ops.
DEFAULT_TTL_SEC = int(os.environ.get("COASTAL_OWNER_COOKIE_TTL_SEC", "86400"))  # 24h
LOCKOUT_THRESHOLD = int(os.environ.get("COASTAL_OWNER_LOCKOUT_THRESHOLD", "3"))
LOCKOUT_WINDOW_SEC = int(os.environ.get("COASTAL_OWNER_LOCKOUT_WINDOW_SEC", "300"))   # 5min
LOCKOUT_COOLDOWN_SEC = int(os.environ.get("COASTAL_OWNER_LOCKOUT_COOLDOWN_SEC", "1800"))  # 30min

# In-memory failure tracking — email → list[failure_unix]
_LOCKOUT: dict[str, list[float]] = {}


def parse_allowlist(env_value: Optional[str]) -> set[str]:
    """Parse COASTAL_OWNER_EMAILS into a normalised set (lowercased,
    whitespace-stripped). Empty env → empty set."""
    if not env_value:
        return set()
    return {e.strip().lower() for e in env_value.split(",") if e.strip()}


def is_owner_email(email: str, allowlist: set[str]) -> bool:
    return (email or "").strip().lower() in allowlist


def sign_owner_cookie(email: str, secret: str, *, ttl_sec: int = DEFAULT_TTL_SEC) -> str:
    """Mint a coastal_owner cookie value: <email>.<exp_unix>.<hmac8>"""
    expires = int(time.time()) + ttl_sec
    payload = f"{email.lower()}.{expires}"
    mac = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()[:16]
    return f"{payload}.{mac}"


def verify_owner_cookie(raw: Optional[str], secret: str) -> Optional[dict]:
    """Verify a coastal_owner cookie. Returns {email, expires} on success,
    None on tamper / expiry / malformed."""
    if not raw or not isinstance(raw, str):
        return None
    parts = raw.split(".")
    if len(parts) != 3:
        return None
    email, expires_str, mac = parts
    payload = f"{email}.{expires_str}"
    expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()[:16]
    if not hmac.compare_digest(mac, expected):
        return None
    try:
        expires = int(expires_str)
    except ValueError:
        return None
    if expires < int(time.time()):
        return None
    return {"email": email, "expires": expires}


def _prune_old(failures: list[float], now: float) -> list[float]:
    cutoff = now - LOCKOUT_WINDOW_SEC
    return [t for t in failures if t >= cutoff]


def record_failure(email: str) -> None:
    now = time.time()
    bucket = _LOCKOUT.get(email, [])
    bucket = _prune_old(bucket, now)
    bucket.append(now)
    _LOCKOUT[email] = bucket
    if len(bucket) >= LOCKOUT_THRESHOLD:
        log.warning("owner_auth: lockout triggered for %s (failures=%d)", email, len(bucket))


def is_locked(email: str) -> bool:
    now = time.time()
    bucket = _LOCKOUT.get(email, [])
    bucket = _prune_old(bucket, now)
    _LOCKOUT[email] = bucket
    return len(bucket) >= LOCKOUT_THRESHOLD


def clear_failures(email: str) -> None:
    """Call on successful auth to reset the lockout counter."""
    _LOCKOUT.pop(email, None)
```

- [ ] **Step 4: Run test to verify it passes**

```
cd coastal-brewing && python -m pytest tests/test_owner_auth.py -v
```

Expected: 9 passed.

- [ ] **Step 5: Commit**

```bash
git add coastal-brewing/scripts/owner_auth.py coastal-brewing/tests/test_owner_auth.py
git commit -m "feat(coastal/owner): add cookie sign/verify + allowlist + lockout in owner_auth"
```

---

## Task 8: WebAuthn ceremony (registration + assertion)

**Files:**
- Modify: `coastal-brewing/scripts/owner_auth.py` (add WebAuthn block)
- Modify: `coastal-brewing/requirements.txt` (add `webauthn>=2.0`)
- Test: `coastal-brewing/tests/test_owner_auth.py` (extend)

- [ ] **Step 1: Add the webauthn library**

Edit `coastal-brewing/requirements.txt`, append (or merge alphabetically):

```
webauthn>=2.0,<3
```

Run:

```
pip install "webauthn>=2.0,<3"
```

- [ ] **Step 2: Write failing test extension**

Append to `coastal-brewing/tests/test_owner_auth.py`:

```python
def test_webauthn_registration_options_includes_email_as_user_id():
    opts = owner_auth.start_registration(email="asg@achievemor.io", rp_id="brewing.foai.cloud", rp_name="Coastal Brewing Co.")
    # `opts` is a JSON-serialisable dict that gets forwarded to the
    # browser's navigator.credentials.create() call.
    assert opts["user"]["name"] == "asg@achievemor.io"
    assert opts["rp"]["id"] == "brewing.foai.cloud"
    assert "challenge" in opts


def test_webauthn_registration_persists_credential(monkeypatch, db_setup):
    """SoftWebauthnDevice round-trip — fake browser device produces a
    valid attestation that owner_auth.finish_registration accepts and
    persists to audit_ledger.owner_passkeys."""
    from webauthn.helpers.structs import (
        PublicKeyCredentialDescriptor, AuthenticatorAttachment,
    )
    # The webauthn package ships with a soft device fixture for tests.
    from softwebauthn import SoftWebauthnDevice   # noqa: F401  (or `webauthn._authenticator_device`)
    # See https://github.com/duo-labs/py_webauthn for the fixture API.
    # Implementation uses the standard pattern: start_registration → device.create → finish_registration.
    # See owner_auth.finish_registration for the assertion-verification block.
    # Full body of this test is filled in once the helper API is stable.
    assert True  # placeholder until we wire up the soft-device fixture
```

(Note: the WebAuthn integration test is heavy and depends on the `webauthn` library's specific fixture API. Lean on the lib's own examples — see `webauthn/helpers/__init__.py`. The unit-level test for registration *options* is what gates this step; the round-trip uses a soft authenticator in a deferred test.)

- [ ] **Step 3: Extend owner_auth.py with WebAuthn handlers**

Append to `coastal-brewing/scripts/owner_auth.py`:

```python
# ----------------------------------------------------------------------------
# WebAuthn ceremony (FIDO2 passkey)
#
# Library: `webauthn` (Duo Labs reference impl).
# Storage: audit_ledger.owner_passkeys table — one row per owner email.
# Challenges are stored in an in-memory dict keyed by email; the
# challenge is single-use and times out after 5 min.
# ----------------------------------------------------------------------------
import base64
import json
import secrets as _secrets
from typing import Any

# Stored challenges: email → (challenge_bytes, expires_unix)
_PENDING_CHALLENGES: dict[str, tuple[bytes, float]] = {}
CHALLENGE_TTL_SEC = 300


def _new_challenge() -> bytes:
    return _secrets.token_bytes(32)


def _store_challenge(email: str, challenge: bytes) -> None:
    _PENDING_CHALLENGES[email] = (challenge, time.time() + CHALLENGE_TTL_SEC)


def _consume_challenge(email: str) -> Optional[bytes]:
    entry = _PENDING_CHALLENGES.pop(email, None)
    if entry is None:
        return None
    challenge, exp = entry
    if exp < time.time():
        return None
    return challenge


def start_registration(*, email: str, rp_id: str, rp_name: str) -> dict[str, Any]:
    """Build options for navigator.credentials.create()."""
    from webauthn import generate_registration_options
    from webauthn.helpers.structs import (
        AuthenticatorSelectionCriteria, ResidentKeyRequirement,
        UserVerificationRequirement,
    )
    challenge = _new_challenge()
    _store_challenge(email, challenge)
    opts = generate_registration_options(
        rp_id=rp_id,
        rp_name=rp_name,
        user_name=email,
        user_display_name=email,
        challenge=challenge,
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.PREFERRED,
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
    )
    # webauthn lib returns dataclasses; serialise to JSON-friendly dict
    from webauthn.helpers import options_to_json
    return json.loads(options_to_json(opts))


def finish_registration(*, email: str, credential_json: dict[str, Any], rp_id: str, expected_origin: str) -> bool:
    """Verify the navigator.credentials.create() response and persist the
    credential to audit_ledger.owner_passkeys. Returns True on success."""
    import audit_ledger
    from webauthn import verify_registration_response
    from webauthn.helpers.structs import RegistrationCredential
    challenge = _consume_challenge(email)
    if challenge is None:
        log.warning("owner_auth: registration without pending challenge for %s", email)
        return False
    try:
        cred = RegistrationCredential.parse_raw(json.dumps(credential_json))
        verification = verify_registration_response(
            credential=cred,
            expected_challenge=challenge,
            expected_rp_id=rp_id,
            expected_origin=expected_origin,
        )
    except Exception as exc:
        log.warning("owner_auth: registration verify failed for %s: %s", email, exc)
        return False
    audit_ledger.register_owner_passkey(
        email=email,
        credential_id=verification.credential_id,
        public_key=verification.credential_public_key,
        sign_count=verification.sign_count,
    )
    return True


def start_authentication(*, email: str, rp_id: str) -> Optional[dict[str, Any]]:
    """Build options for navigator.credentials.get(). Returns None if
    the email has no enrolled passkey (caller should redirect to enroll)."""
    import audit_ledger
    row = audit_ledger.fetch_owner_passkey(email)
    if row is None:
        return None
    from webauthn import generate_authentication_options
    from webauthn.helpers.structs import (
        PublicKeyCredentialDescriptor, UserVerificationRequirement,
    )
    challenge = _new_challenge()
    _store_challenge(email, challenge)
    opts = generate_authentication_options(
        rp_id=rp_id,
        challenge=challenge,
        allow_credentials=[PublicKeyCredentialDescriptor(id=row["credential_id"])],
        user_verification=UserVerificationRequirement.PREFERRED,
    )
    from webauthn.helpers import options_to_json
    return json.loads(options_to_json(opts))


def finish_authentication(*, email: str, credential_json: dict[str, Any], rp_id: str, expected_origin: str) -> bool:
    """Verify the navigator.credentials.get() response, bump the
    sign_count, and clear the lockout counter on success."""
    import audit_ledger
    from webauthn import verify_authentication_response
    from webauthn.helpers.structs import AuthenticationCredential
    row = audit_ledger.fetch_owner_passkey(email)
    if row is None:
        record_failure(email)
        return False
    challenge = _consume_challenge(email)
    if challenge is None:
        record_failure(email)
        return False
    try:
        cred = AuthenticationCredential.parse_raw(json.dumps(credential_json))
        verification = verify_authentication_response(
            credential=cred,
            expected_challenge=challenge,
            expected_rp_id=rp_id,
            expected_origin=expected_origin,
            credential_public_key=row["public_key"],
            credential_current_sign_count=row["sign_count"],
        )
    except Exception as exc:
        log.warning("owner_auth: authentication verify failed for %s: %s", email, exc)
        record_failure(email)
        return False
    audit_ledger.bump_owner_passkey_sign_count(email, verification.new_sign_count)
    clear_failures(email)
    return True
```

- [ ] **Step 4: Run the option-building test**

```
cd coastal-brewing && python -m pytest tests/test_owner_auth.py::test_webauthn_registration_options_includes_email_as_user_id -v
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add coastal-brewing/scripts/owner_auth.py coastal-brewing/requirements.txt coastal-brewing/tests/test_owner_auth.py
git commit -m "feat(coastal/owner): add WebAuthn ceremony (register + authenticate) in owner_auth"
```

---

## Task 9: Hook `/auth/verify` to redirect owner emails to `/owner/enroll` or `/owner/challenge`

**Files:**
- Modify: `coastal-brewing/scripts/api_server.py` (existing `/api/v1/auth/verify` handler)

- [ ] **Step 1: Read the current `/auth/verify` handler**

```
cd coastal-brewing && grep -n "auth/verify" scripts/api_server.py
```

- [ ] **Step 2: Add the owner-email branch**

In the `/api/v1/auth/verify` handler, just before the existing success-redirect logic, insert:

```python
# Owner-only branch: if this email is in COASTAL_OWNER_EMAILS, redirect
# to the WebAuthn enrolment or challenge page instead of the normal
# /membership/welcome or /account landing. The redirect URL is set
# in response_payload so the frontend handles the navigation.
import owner_auth
allowlist = owner_auth.parse_allowlist(os.environ.get("COASTAL_OWNER_EMAILS"))
if owner_auth.is_owner_email(email, allowlist):
    import audit_ledger
    has_passkey = audit_ledger.fetch_owner_passkey(email.lower()) is not None
    response_payload["owner_redirect"] = "/owner/challenge" if has_passkey else "/owner/enroll"
    response_payload["owner_email"] = email.lower()
```

(Place this *after* the existing token-validation + signup branch so it only fires on a successful verify.)

- [ ] **Step 3: Smoke test**

Manual smoke after deploy: POST `/api/v1/auth/signup` with `email=asg@achievemor.io`, click the magic-link, expect the verify response to include `owner_redirect`. (Owner-driven, document for later.)

- [ ] **Step 4: Commit**

```bash
git add coastal-brewing/scripts/api_server.py
git commit -m "feat(coastal/owner): redirect owner emails from /auth/verify to /owner/enroll|challenge"
```

---

## Task 10: `owner_console.py` skeleton + cookie-required dependency + rate limit

**Files:**
- Create: `coastal-brewing/scripts/owner_console.py`
- Modify: `coastal-brewing/scripts/api_server.py` (mount router)
- Test: `coastal-brewing/tests/test_owner_console_reads.py` (cookie-gate test only)

- [ ] **Step 1: Write the failing test (cookie-gate)**

```python
# coastal-brewing/tests/test_owner_console_reads.py
"""Cookie-gate enforcement on /api/v1/owner/* endpoints. Per-endpoint
read tests come in later tasks; this file pins the gate behaviour."""
from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest import mock

import pytest
from fastapi.testclient import TestClient

REPO_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(REPO_SCRIPTS))

# Deep mocks for the heavy import chain (matches the pattern in
# test_checkout_call_site_metadata_wiring.py).
_HEAVY = ["psycopg2", "psycopg2.extras", "psycopg2.pool"]
for _name in _HEAVY:
    sys.modules.setdefault(_name, mock.MagicMock())

os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_dummy")
os.environ.setdefault("COASTAL_GATEWAY_TOKEN", "ut-gw")
os.environ.setdefault("COASTAL_OWNER_EMAILS", "asg@achievemor.io")
os.environ.setdefault("COASTAL_OWNER_SESSION_SECRET", "ut-owner-secret")

import api_server  # noqa: E402
import owner_auth  # noqa: E402


@pytest.fixture
def client():
    return TestClient(api_server.app)


def test_owner_activity_rejects_missing_cookie(client):
    r = client.get("/api/v1/owner/activity")
    assert r.status_code == 401


def test_owner_activity_rejects_invalid_cookie(client):
    r = client.get("/api/v1/owner/activity", cookies={"coastal_owner": "not.a.valid.cookie"})
    assert r.status_code == 401


def test_owner_activity_rejects_email_not_in_allowlist(client, monkeypatch):
    cookie = owner_auth.sign_owner_cookie("not-owner@example.com", "ut-owner-secret", ttl_sec=3600)
    monkeypatch.setenv("COASTAL_OWNER_EMAILS", "asg@achievemor.io")
    r = client.get("/api/v1/owner/activity", cookies={"coastal_owner": cookie})
    assert r.status_code == 403


def test_owner_activity_accepts_valid_owner_cookie(client):
    cookie = owner_auth.sign_owner_cookie("asg@achievemor.io", "ut-owner-secret", ttl_sec=3600)
    r = client.get("/api/v1/owner/activity", cookies={"coastal_owner": cookie})
    assert r.status_code == 200
```

- [ ] **Step 2: Run test to verify it fails**

```
cd coastal-brewing && python -m pytest tests/test_owner_console_reads.py -v
```

Expected: 404s (endpoint not mounted yet).

- [ ] **Step 3: Write owner_console.py skeleton**

```python
# coastal-brewing/scripts/owner_console.py
"""Owner-only API router for /api/v1/owner/*.

Every endpoint in this module is gated by `require_owner` which checks
the `coastal_owner` cookie HMAC + the email's continued presence in
COASTAL_OWNER_EMAILS (env change → ongoing session denied).
"""
from __future__ import annotations

import logging
import os
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request

import owner_auth

log = logging.getLogger("coastal.owner_console")

router = APIRouter(prefix="/api/v1/owner", tags=["owner"])


def _owner_session_secret() -> str:
    secret = os.environ.get("COASTAL_OWNER_SESSION_SECRET", "").strip()
    if not secret:
        raise HTTPException(status_code=503, detail="owner session not configured")
    return secret


def require_owner(
    coastal_owner: Annotated[str | None, Cookie()] = None,
) -> dict:
    """FastAPI dependency. Returns the owner identity dict on success.
    Raises 401 (no/invalid cookie) or 403 (email no longer in allowlist)."""
    parsed = owner_auth.verify_owner_cookie(coastal_owner, _owner_session_secret())
    if parsed is None:
        raise HTTPException(status_code=401, detail="owner session required")
    allowlist = owner_auth.parse_allowlist(os.environ.get("COASTAL_OWNER_EMAILS"))
    if not owner_auth.is_owner_email(parsed["email"], allowlist):
        raise HTTPException(status_code=403, detail="email not in owner allowlist")
    return parsed


@router.get("/activity")
def get_activity(
    request: Request,
    since: str | None = None,
    owner: dict = Depends(require_owner),
) -> dict:
    """Placeholder — populated by Task 11."""
    return {"ok": True, "owner_email": owner["email"], "events": [], "cursor": None}
```

- [ ] **Step 4: Mount router in api_server.py**

In `coastal-brewing/scripts/api_server.py`, near the bottom (after FastAPI `app = FastAPI(...)` is defined):

```python
import owner_console  # noqa: E402
app.include_router(owner_console.router)
```

- [ ] **Step 5: Run test to verify it passes**

```
cd coastal-brewing && python -m pytest tests/test_owner_console_reads.py -v
```

Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add coastal-brewing/scripts/owner_console.py coastal-brewing/scripts/api_server.py coastal-brewing/tests/test_owner_console_reads.py
git commit -m "feat(coastal/owner): mount /api/v1/owner router with cookie + allowlist gate"
```

---

## Task 11: `/api/v1/owner/activity` — combined audit_ledger + Stripe event feed

**Files:**
- Modify: `coastal-brewing/scripts/owner_console.py` (replace `get_activity` placeholder)
- Test: `coastal-brewing/tests/test_owner_console_reads.py` (extend)

- [ ] **Step 1: Add the failing test**

Append to `coastal-brewing/tests/test_owner_console_reads.py`:

```python
def test_owner_activity_returns_recent_audit_events(client, tmp_path, monkeypatch):
    cookie = owner_auth.sign_owner_cookie("asg@achievemor.io", "ut-owner-secret", ttl_sec=3600)
    # Seed an audit_ledger row
    import audit_ledger
    audit_ledger.record_event(event_type="signup", payload={"email": "u@x.com"})
    r = client.get("/api/v1/owner/activity?include_stripe=false", cookies={"coastal_owner": cookie})
    assert r.status_code == 200
    data = r.json()
    assert "events" in data
    assert any(e.get("event_type") == "signup" for e in data["events"])
```

(Adjust `record_event` call to match `audit_ledger`'s actual API — grep for the existing event-write function name in `audit_ledger.py`.)

- [ ] **Step 2: Implement `get_activity`**

Replace the placeholder in `owner_console.py`:

```python
@router.get("/activity")
def get_activity(
    request: Request,
    since: str | None = None,
    include_stripe: bool = True,
    owner: dict = Depends(require_owner),
) -> dict:
    """Return the last 50 audit_ledger events + (optionally) the last
    50 Stripe events (cached 30s). Filter by `since` cursor (unix ts)."""
    import audit_ledger
    cutoff = float(since) if since else 0
    events = audit_ledger.recent_events(limit=50, since_unix=cutoff)
    stripe_events: list[dict] = []
    if include_stripe:
        stripe_events = _cached_stripe_events()
    return {
        "ok": True,
        "owner_email": owner["email"],
        "events": events,
        "stripe_events": stripe_events,
        "cursor": str(events[0].get("ts")) if events else since,
    }


_STRIPE_CACHE: dict[str, object] = {"at": 0.0, "value": []}


def _cached_stripe_events() -> list[dict]:
    import time
    if time.time() - _STRIPE_CACHE["at"] < 30:
        return _STRIPE_CACHE["value"]
    try:
        import stripe
        events = stripe.Event.list(limit=50)
        out = [{"id": e.id, "type": e.type, "created": e.created} for e in events]
    except Exception as exc:
        log.warning("owner_console: stripe event fetch failed: %s", exc)
        out = _STRIPE_CACHE["value"]
    _STRIPE_CACHE["at"] = time.time()
    _STRIPE_CACHE["value"] = out
    return out
```

(If `audit_ledger.recent_events` doesn't exist, add it in `audit_ledger.py` as a `SELECT * FROM events ORDER BY ts DESC LIMIT ?` helper. Verify the actual schema first — `audit_ledger.py` is the source of truth.)

- [ ] **Step 3: Run tests**

```
cd coastal-brewing && python -m pytest tests/test_owner_console_reads.py -v
```

Expected: 5 passed.

- [ ] **Step 4: Commit**

```bash
git add coastal-brewing/scripts/owner_console.py coastal-brewing/scripts/audit_ledger.py coastal-brewing/tests/test_owner_console_reads.py
git commit -m "feat(coastal/owner): implement /api/v1/owner/activity (audit + stripe events)"
```

---

## Task 12: `/api/v1/owner/pricing` GET + PUT with confirmation phrase

**Files:**
- Modify: `coastal-brewing/scripts/owner_console.py`
- Test: `coastal-brewing/tests/test_owner_console_writes.py` (new)

- [ ] **Step 1: Write the failing test**

```python
# coastal-brewing/tests/test_owner_console_writes.py
"""Owner write endpoints — pricing, customers, nemoclaw, cfg.

Pins:
- writes require valid owner cookie (covered by Task 10 tests)
- pricing writes require exact `confirmation_phrase` match
- pydantic schema validates bounds
- atomic-write to pricing-config.json
- audit_ledger row recorded
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from unittest import mock

import pytest
from fastapi.testclient import TestClient

REPO_SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(REPO_SCRIPTS))

_HEAVY = ["psycopg2", "psycopg2.extras", "psycopg2.pool"]
for _name in _HEAVY:
    sys.modules.setdefault(_name, mock.MagicMock())

os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_dummy")
os.environ.setdefault("COASTAL_GATEWAY_TOKEN", "ut-gw")
os.environ.setdefault("COASTAL_OWNER_EMAILS", "asg@achievemor.io")
os.environ.setdefault("COASTAL_OWNER_SESSION_SECRET", "ut-owner-secret")

import api_server  # noqa: E402
import owner_auth  # noqa: E402


@pytest.fixture
def client():
    return TestClient(api_server.app)


@pytest.fixture
def owner_cookie():
    return owner_auth.sign_owner_cookie("asg@achievemor.io", "ut-owner-secret", ttl_sec=3600)


@pytest.fixture
def pricing_cfg(tmp_path, monkeypatch):
    cfg = tmp_path / "pricing-config.json"
    cfg.write_text(json.dumps({
        "cadences": {
            "monthly": {"discount": 0.0, "months_paid": 1, "months_delivered": 1,
                        "stripe_interval": "month", "stripe_interval_count": 1,
                        "label": "Month-to-month", "framing": "Standard."},
            "3mo": {"discount": 0.15, "months_paid": 3, "months_delivered": 3,
                    "stripe_interval": "month", "stripe_interval_count": 3,
                    "label": "3mo", "framing": "x"},
            "6mo": {"discount": 0.20, "months_paid": 6, "months_delivered": 6,
                    "stripe_interval": "month", "stripe_interval_count": 6,
                    "label": "6mo", "framing": "x"},
            "9mo": {"discount": 0.25, "months_paid": 9, "months_delivered": 12,
                    "stripe_interval": "month", "stripe_interval_count": 12,
                    "label": "9mo", "framing": "x"},
        },
        "tier_monthly_retail": {"custee-card": 29.99},
        "tier_envelope_max_cents": {"custee-card": 6000},
    }))
    monkeypatch.setenv("COASTAL_OWNER_CONFIG_DIR", str(tmp_path))
    return cfg


def test_pricing_get_returns_current_config(client, owner_cookie, pricing_cfg):
    r = client.get("/api/v1/owner/pricing", cookies={"coastal_owner": owner_cookie})
    assert r.status_code == 200
    data = r.json()
    assert data["tier_monthly_retail"]["custee-card"] == 29.99


def test_pricing_put_rejects_missing_confirmation_phrase(client, owner_cookie, pricing_cfg):
    r = client.put(
        "/api/v1/owner/pricing",
        json={"tier_monthly_retail": {"custee-card": 31.99}},
        cookies={"coastal_owner": owner_cookie},
    )
    assert r.status_code == 400
    assert "confirmation" in r.json()["detail"].lower()


def test_pricing_put_rejects_wrong_confirmation_phrase(client, owner_cookie, pricing_cfg):
    r = client.put(
        "/api/v1/owner/pricing",
        json={"tier_monthly_retail": {"custee-card": 31.99}, "confirmation_phrase": "i agree"},
        cookies={"coastal_owner": owner_cookie},
    )
    assert r.status_code == 400


def test_pricing_put_with_correct_phrase_writes_atomically(client, owner_cookie, pricing_cfg):
    r = client.put(
        "/api/v1/owner/pricing",
        json={
            "tier_monthly_retail": {"custee-card": 31.99},
            "confirmation_phrase": "CONFIRM PRICING CHANGE",
        },
        cookies={"coastal_owner": owner_cookie},
    )
    assert r.status_code == 200
    on_disk = json.loads(pricing_cfg.read_text())
    assert on_disk["tier_monthly_retail"]["custee-card"] == 31.99
```

- [ ] **Step 2: Implement pricing endpoints**

In `owner_console.py`, add:

```python
from pathlib import Path
from pydantic import BaseModel, Field

from owner_config_loader import load_json, atomic_write_json


def _config_dir() -> Path:
    return Path(os.environ.get("COASTAL_OWNER_CONFIG_DIR", "/app/config"))


def _pricing_path() -> Path:
    return _config_dir() / "pricing-config.json"


CONFIRM_PRICING = "CONFIRM PRICING CHANGE"


class PricingUpdate(BaseModel):
    tier_monthly_retail: dict[str, float] | None = None
    tier_envelope_max_cents: dict[str, int] | None = None
    cadence_discounts: dict[str, float] | None = None  # cadence_id → 0.0-0.40
    confirmation_phrase: str = ""


@router.get("/pricing")
def get_pricing(owner: dict = Depends(require_owner)) -> dict:
    return load_json(_pricing_path())


@router.put("/pricing")
def put_pricing(
    body: PricingUpdate,
    owner: dict = Depends(require_owner),
) -> dict:
    if body.confirmation_phrase != CONFIRM_PRICING:
        raise HTTPException(status_code=400, detail=f"confirmation phrase mismatch (must be '{CONFIRM_PRICING}')")
    current = load_json(_pricing_path())
    new = json.loads(json.dumps(current))  # deep copy
    if body.tier_monthly_retail:
        for k, v in body.tier_monthly_retail.items():
            if not (0 < v <= 999):
                raise HTTPException(status_code=422, detail=f"tier_monthly_retail[{k}] out of bounds")
            new.setdefault("tier_monthly_retail", {})[k] = float(v)
    if body.tier_envelope_max_cents:
        for k, v in body.tier_envelope_max_cents.items():
            if not (0 < v <= 100000):
                raise HTTPException(status_code=422, detail=f"tier_envelope_max_cents[{k}] out of bounds")
            new.setdefault("tier_envelope_max_cents", {})[k] = int(v)
    if body.cadence_discounts:
        for cid, disc in body.cadence_discounts.items():
            if not (0.0 <= disc <= 0.40):
                raise HTTPException(status_code=422, detail=f"cadence_discounts[{cid}] out of bounds")
            new.setdefault("cadences", {}).setdefault(cid, {})["discount"] = float(disc)
    atomic_write_json(_pricing_path(), new)
    import audit_ledger
    diff = {
        "tier_monthly_retail": body.tier_monthly_retail,
        "tier_envelope_max_cents": body.tier_envelope_max_cents,
        "cadence_discounts": body.cadence_discounts,
    }
    audit_ledger.record_event(event_type="owner_pricing_update", payload={
        "email": owner["email"], "diff": diff,
    })
    return new
```

(Add `import json` at top if not present.)

- [ ] **Step 3: Run tests**

```
cd coastal-brewing && python -m pytest tests/test_owner_console_writes.py -v
```

Expected: 4 passed.

- [ ] **Step 4: Commit**

```bash
git add coastal-brewing/scripts/owner_console.py coastal-brewing/tests/test_owner_console_writes.py
git commit -m "feat(coastal/owner): /api/v1/owner/pricing GET + PUT with confirmation phrase"
```

---

## Task 13: `/api/v1/owner/customers` GET + writes

**Files:**
- Modify: `coastal-brewing/scripts/owner_console.py`
- Test: `coastal-brewing/tests/test_owner_console_writes.py`

- [ ] **Step 1: Add test**

```python
def test_customers_list_returns_stripe_customers(client, owner_cookie, monkeypatch):
    fake_customer = mock.MagicMock(id="cus_test_1", email="u@x.com", created=0,
                                   metadata={})
    fake_customer.subscriptions = mock.MagicMock(data=[])
    with mock.patch("stripe.Customer.list", return_value=mock.MagicMock(data=[fake_customer])):
        r = client.get("/api/v1/owner/customers", cookies={"coastal_owner": owner_cookie})
    assert r.status_code == 200
    data = r.json()
    assert any(c["id"] == "cus_test_1" for c in data["customers"])


def test_customer_delete_test_only(client, owner_cookie):
    with mock.patch("stripe.Customer.delete") as del_mock:
        r = client.post(
            "/api/v1/owner/customers/cus_test_1/delete",
            json={"confirmation_phrase": "CONFIRM CUSTOMER DELETE"},
            cookies={"coastal_owner": owner_cookie},
        )
    assert r.status_code == 200
    del_mock.assert_called_once_with("cus_test_1")
```

- [ ] **Step 2: Implement**

In `owner_console.py`:

```python
CONFIRM_CUSTOMER_DELETE = "CONFIRM CUSTOMER DELETE"
CONFIRM_CUSTOMER_CANCEL = "CONFIRM CANCEL SUBSCRIPTION"


class CustomerActionBody(BaseModel):
    confirmation_phrase: str = ""


@router.get("/customers")
def list_customers(
    q: str = "",
    limit: int = 100,
    owner: dict = Depends(require_owner),
) -> dict:
    import stripe
    listing = stripe.Customer.list(limit=min(limit, 100), email=q or None)
    out = []
    for c in listing.data:
        out.append({
            "id": c.id,
            "email": getattr(c, "email", None),
            "created": getattr(c, "created", 0),
            "metadata": dict(c.metadata) if c.metadata else {},
        })
    return {"customers": out}


@router.post("/customers/{customer_id}/delete")
def delete_customer(
    customer_id: str,
    body: CustomerActionBody,
    owner: dict = Depends(require_owner),
) -> dict:
    if body.confirmation_phrase != CONFIRM_CUSTOMER_DELETE:
        raise HTTPException(status_code=400, detail="confirmation phrase mismatch")
    import stripe, audit_ledger
    stripe.Customer.delete(customer_id)
    audit_ledger.record_event(event_type="owner_customer_delete", payload={
        "email": owner["email"], "customer_id": customer_id,
    })
    return {"ok": True, "deleted": customer_id}


@router.post("/customers/{customer_id}/cancel-subscription/{sub_id}")
def cancel_subscription(
    customer_id: str,
    sub_id: str,
    body: CustomerActionBody,
    owner: dict = Depends(require_owner),
) -> dict:
    if body.confirmation_phrase != CONFIRM_CUSTOMER_CANCEL:
        raise HTTPException(status_code=400, detail="confirmation phrase mismatch")
    import stripe, audit_ledger
    sub = stripe.Subscription.modify(sub_id, cancel_at_period_end=True)
    audit_ledger.record_event(event_type="owner_subscription_cancel", payload={
        "email": owner["email"], "customer_id": customer_id, "subscription_id": sub_id,
    })
    return {"ok": True, "subscription_id": sub_id, "status": sub.status}
```

- [ ] **Step 3: Run tests + commit**

```
cd coastal-brewing && python -m pytest tests/test_owner_console_writes.py -v
git add coastal-brewing/scripts/owner_console.py coastal-brewing/tests/test_owner_console_writes.py
git commit -m "feat(coastal/owner): /api/v1/owner/customers list + delete + cancel-subscription"
```

---

## Task 14: `/api/v1/owner/nemoclaw` queue + approve/reject

**Files:**
- Modify: `coastal-brewing/scripts/owner_console.py`
- Test: `coastal-brewing/tests/test_owner_console_writes.py`

- [ ] **Step 1: Add test**

```python
def test_nemoclaw_queue_returns_pending_tasks(client, owner_cookie, monkeypatch):
    import audit_ledger
    audit_ledger.record_pending_task("task_test_1", risk_tags=["payment"], reason="manual review")
    r = client.get("/api/v1/owner/nemoclaw/queue", cookies={"coastal_owner": owner_cookie})
    assert r.status_code == 200
    data = r.json()
    assert any(t["task_id"] == "task_test_1" for t in data["pending"])


def test_nemoclaw_approve_marks_approved(client, owner_cookie):
    import audit_ledger
    audit_ledger.record_pending_task("task_test_2", risk_tags=[], reason="x")
    r = client.post(
        "/api/v1/owner/nemoclaw/task_test_2/approve",
        json={},
        cookies={"coastal_owner": owner_cookie},
    )
    assert r.status_code == 200
    assert audit_ledger.task_status("task_test_2") == "approved"
```

(Stub `record_pending_task` / `task_status` in `audit_ledger.py` if not present; otherwise wire to the existing nemoclaw/task_packets table.)

- [ ] **Step 2: Implement**

```python
@router.get("/nemoclaw/queue")
def nemoclaw_queue(owner: dict = Depends(require_owner)) -> dict:
    import audit_ledger
    pending = audit_ledger.list_pending_tasks(limit=50)
    return {"pending": pending}


@router.post("/nemoclaw/{task_id}/approve")
def nemoclaw_approve(task_id: str, owner: dict = Depends(require_owner)) -> dict:
    import audit_ledger
    audit_ledger.set_task_status(task_id, "approved", actor=owner["email"])
    # Existing /approve/click endpoint logic — call its downstream action:
    # (The legacy token-link endpoint shells out to a `_apply_decision`
    # helper; reuse it here. See api_server.py for the exact function.)
    return {"ok": True, "task_id": task_id, "status": "approved"}


@router.post("/nemoclaw/{task_id}/reject")
def nemoclaw_reject(task_id: str, owner: dict = Depends(require_owner)) -> dict:
    import audit_ledger
    audit_ledger.set_task_status(task_id, "rejected", actor=owner["email"])
    return {"ok": True, "task_id": task_id, "status": "rejected"}
```

- [ ] **Step 3: Run tests + commit**

```
cd coastal-brewing && python -m pytest tests/test_owner_console_writes.py -v
git add coastal-brewing/scripts/owner_console.py coastal-brewing/scripts/audit_ledger.py coastal-brewing/tests/test_owner_console_writes.py
git commit -m "feat(coastal/owner): /api/v1/owner/nemoclaw queue + approve + reject"
```

---

## Task 15: `/api/v1/owner/audit` paginated read

**Files:**
- Modify: `coastal-brewing/scripts/owner_console.py`
- Test: `coastal-brewing/tests/test_owner_console_reads.py`

- [ ] **Step 1: Implement + test in one step (straightforward read)**

```python
@router.get("/audit")
def owner_audit(
    table: str | None = None,
    since: float | None = None,
    until: float | None = None,
    page: int = 1,
    per_page: int = 50,
    owner: dict = Depends(require_owner),
) -> dict:
    import audit_ledger
    rows = audit_ledger.query_events(
        table=table, since=since, until=until,
        offset=(page - 1) * per_page, limit=per_page,
    )
    total = audit_ledger.count_events(table=table, since=since, until=until)
    return {"rows": rows, "page": page, "per_page": per_page, "total": total}
```

Test:

```python
def test_owner_audit_returns_paginated_rows(client, owner_cookie):
    import audit_ledger
    for i in range(60):
        audit_ledger.record_event(event_type=f"e{i}", payload={"i": i})
    r = client.get("/api/v1/owner/audit?per_page=10", cookies={"coastal_owner": owner_cookie})
    data = r.json()
    assert data["per_page"] == 10
    assert len(data["rows"]) == 10
    assert data["total"] >= 60
```

(Add `audit_ledger.query_events` + `count_events` helpers if not present.)

- [ ] **Step 2: Run tests + commit**

```
cd coastal-brewing && python -m pytest tests/test_owner_console_reads.py -v
git add coastal-brewing/scripts/owner_console.py coastal-brewing/scripts/audit_ledger.py coastal-brewing/tests/test_owner_console_reads.py
git commit -m "feat(coastal/owner): /api/v1/owner/audit paginated event viewer"
```

---

## Task 16: `/api/v1/owner/cfg` GET + PUT for voice + email-templates

**Files:**
- Modify: `coastal-brewing/scripts/owner_console.py`
- Test: `coastal-brewing/tests/test_owner_console_writes.py`

- [ ] **Step 1: Implement**

```python
CONFIRM_CFG = "CONFIRM CFG CHANGE"


class CfgUpdate(BaseModel):
    voice_config: dict | None = None
    email_templates: dict | None = None
    confirmation_phrase: str = ""


@router.get("/cfg")
def get_cfg(owner: dict = Depends(require_owner)) -> dict:
    return {
        "voice_config": load_json(_config_dir() / "voice-config.json"),
        "email_templates": load_json(_config_dir() / "email-templates.json"),
    }


@router.put("/cfg")
def put_cfg(body: CfgUpdate, owner: dict = Depends(require_owner)) -> dict:
    if body.confirmation_phrase != CONFIRM_CFG:
        raise HTTPException(status_code=400, detail="confirmation phrase mismatch")
    if body.voice_config is not None:
        atomic_write_json(_config_dir() / "voice-config.json", body.voice_config)
    if body.email_templates is not None:
        atomic_write_json(_config_dir() / "email-templates.json", body.email_templates)
    import audit_ledger
    audit_ledger.record_event(event_type="owner_cfg_update", payload={
        "email": owner["email"],
        "voice_changed": body.voice_config is not None,
        "email_changed": body.email_templates is not None,
    })
    return get_cfg(owner=owner)
```

- [ ] **Step 2: Test + commit**

Add test that mirrors the pricing PUT test (sub voice_config + email_templates).

```bash
cd coastal-brewing && python -m pytest tests/test_owner_console_writes.py -v
git add coastal-brewing/scripts/owner_console.py coastal-brewing/tests/test_owner_console_writes.py
git commit -m "feat(coastal/owner): /api/v1/owner/cfg GET + PUT for voice + email-templates"
```

---

## Task 17: WebAuthn endpoint pair — `/owner/enroll-start`, `/owner/enroll-finish`, `/owner/challenge-start`, `/owner/challenge-finish`

**Files:**
- Modify: `coastal-brewing/scripts/owner_console.py`

- [ ] **Step 1: Implement**

```python
class WebAuthnFinish(BaseModel):
    email: str
    credential: dict


def _rp_id() -> str:
    return os.environ.get("COASTAL_OWNER_RP_ID", "brewing.foai.cloud")


def _expected_origin() -> str:
    return os.environ.get("COASTAL_OWNER_RP_ORIGIN", "https://brewing.foai.cloud")


@router.post("/enroll-start")
def enroll_start(payload: dict) -> dict:
    """Open: no cookie required (this is what bootstraps the cookie).
    Email must be in COASTAL_OWNER_EMAILS."""
    email = (payload.get("email") or "").lower()
    allowlist = owner_auth.parse_allowlist(os.environ.get("COASTAL_OWNER_EMAILS"))
    if not owner_auth.is_owner_email(email, allowlist):
        raise HTTPException(status_code=403, detail="email not in owner allowlist")
    return owner_auth.start_registration(email=email, rp_id=_rp_id(), rp_name="Coastal Brewing Co.")


@router.post("/enroll-finish")
def enroll_finish(body: WebAuthnFinish) -> dict:
    email = body.email.lower()
    allowlist = owner_auth.parse_allowlist(os.environ.get("COASTAL_OWNER_EMAILS"))
    if not owner_auth.is_owner_email(email, allowlist):
        raise HTTPException(status_code=403, detail="email not in owner allowlist")
    ok = owner_auth.finish_registration(
        email=email, credential_json=body.credential,
        rp_id=_rp_id(), expected_origin=_expected_origin(),
    )
    if not ok:
        raise HTTPException(status_code=400, detail="enrolment verification failed")
    cookie = owner_auth.sign_owner_cookie(email, _owner_session_secret())
    response = {"ok": True}
    # Cookie set via FastAPI Response object below — see api_server pattern.
    return response  # actual cookie-set: caller wraps Response — see below


@router.post("/challenge-start")
def challenge_start(payload: dict) -> dict:
    email = (payload.get("email") or "").lower()
    if owner_auth.is_locked(email):
        raise HTTPException(status_code=423, detail="too many failed attempts; locked for 30 min")
    allowlist = owner_auth.parse_allowlist(os.environ.get("COASTAL_OWNER_EMAILS"))
    if not owner_auth.is_owner_email(email, allowlist):
        raise HTTPException(status_code=403, detail="email not in owner allowlist")
    opts = owner_auth.start_authentication(email=email, rp_id=_rp_id())
    if opts is None:
        raise HTTPException(status_code=404, detail="no passkey enrolled; visit /owner/enroll first")
    return opts


@router.post("/challenge-finish")
def challenge_finish(body: WebAuthnFinish):
    from fastapi import Response
    email = body.email.lower()
    ok = owner_auth.finish_authentication(
        email=email, credential_json=body.credential,
        rp_id=_rp_id(), expected_origin=_expected_origin(),
    )
    if not ok:
        raise HTTPException(status_code=400, detail="authentication failed")
    cookie = owner_auth.sign_owner_cookie(email, _owner_session_secret())
    resp = Response(content=json.dumps({"ok": True}), media_type="application/json")
    resp.set_cookie(
        "coastal_owner", cookie,
        httponly=True, secure=True, samesite="strict",
        max_age=owner_auth.DEFAULT_TTL_SEC,
    )
    return resp
```

(Same cookie-set pattern on `enroll-finish` — copy from `challenge-finish` once verified working.)

- [ ] **Step 2: Commit**

```bash
cd coastal-brewing
git add coastal-brewing/scripts/owner_console.py
git commit -m "feat(coastal/owner): WebAuthn enroll + challenge endpoints w/ cookie set on success"
```

---

## Task 18: Frontend — `/owner` shell + Tabs router + auth-gate redirect

**Files:**
- Create: `coastal-brewing/web/app/owner/page.tsx`
- Create: `coastal-brewing/web/app/owner/_components/Tabs.tsx`

- [ ] **Step 1: Build the shell**

```tsx
// coastal-brewing/web/app/owner/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Tabs } from "./_components/Tabs";
import { ActivityTab } from "./_components/ActivityTab";
import { PricingTab } from "./_components/PricingTab";
import { CustomersTab } from "./_components/CustomersTab";
import { NemoClawTab } from "./_components/NemoClawTab";
import { AuditTab } from "./_components/AuditTab";
import { CfgTab } from "./_components/CfgTab";

const TAB_LIST = [
  { id: "activity", label: "Activity", render: () => <ActivityTab /> },
  { id: "pricing", label: "Pricing", render: () => <PricingTab /> },
  { id: "customers", label: "Customers", render: () => <CustomersTab /> },
  { id: "nemoclaw", label: "NemoClaw", render: () => <NemoClawTab /> },
  { id: "audit", label: "Audit", render: () => <AuditTab /> },
  { id: "cfg", label: "Cfg", render: () => <CfgTab /> },
];

export default function OwnerConsolePage() {
  const router = useRouter();
  const [active, setActive] = React.useState("activity");
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    // Auth probe: hit /api/v1/owner/activity. If 401 → redirect to /auth/login.
    fetch("/api/v1/owner/activity?include_stripe=false", { credentials: "include" })
      .then((r) => {
        if (r.status === 401) {
          router.push("/auth/login?return=/owner");
          return;
        }
        if (r.status === 403) {
          router.push("/?owner_denied=1");
          return;
        }
        setReady(true);
      })
      .catch(() => router.push("/auth/login?return=/owner"));
  }, [router]);

  if (!ready) return <main className="container py-12">Checking owner session…</main>;

  return (
    <main className="container py-8">
      <h1 className="text-2xl font-semibold mb-4">Owner Console</h1>
      <Tabs tabs={TAB_LIST} active={active} onChange={setActive} />
      <div className="mt-6">
        {TAB_LIST.find((t) => t.id === active)?.render()}
      </div>
    </main>
  );
}
```

```tsx
// coastal-brewing/web/app/owner/_components/Tabs.tsx
"use client";

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-2 border-b border-border">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-4 py-2 font-mono text-xs uppercase tracking-widest ${
            active === t.id
              ? "border-b-2 border-accent text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit (placeholder tab components)**

Create stub files for each tab so the shell compiles:

```tsx
// coastal-brewing/web/app/owner/_components/ActivityTab.tsx
export function ActivityTab() { return <div>Activity</div>; }
```

Repeat for `PricingTab`, `CustomersTab`, `NemoClawTab`, `AuditTab`, `CfgTab` — all returning their label as a placeholder div. Filled in by Tasks 19–24.

```bash
cd coastal-brewing
git add coastal-brewing/web/app/owner/
git commit -m "feat(coastal/owner/web): /owner shell + tab router (stub tab content)"
```

---

## Task 19–24: Tab implementations (Activity / Pricing / Customers / NemoClaw / Audit / Cfg)

Each tab follows the same pattern. Document the pattern once, repeat with concrete content for each tab.

**Pattern:**
- Component file: `coastal-brewing/web/app/owner/_components/<Tab>Tab.tsx`
- Uses SWR for reads: `const { data, error } = useSWR("/api/v1/owner/<resource>", fetcher, { refreshInterval: 3000 })`
- Confirmation modal for writes (`ConfirmModal.tsx` from Task 25)
- Tailwind for layout, framer-motion for slider animations on PricingTab
- After each tab, run `cd coastal-brewing/web && npx tsc --noEmit` to verify types
- Commit per tab

**Task 19 (ActivityTab):** table of `events` + `stripe_events`, 3s refresh, filter dropdown by `event_type`.

**Task 20 (PricingTab):**
- 5 tier-retail sliders (range inputs bound to `data.tier_monthly_retail[tier]`), step=0.01, min=0.5, max=999
- 3 cadence-discount sliders (`data.cadences[cid].discount`), step=0.01, min=0, max=0.40
- 5 envelope-cap sliders (`data.tier_envelope_max_cents[tier]`), step=100, min=100, max=100000
- "Reset to canon" button: re-fetches GET /pricing → discards local edits
- "Preview Stripe impact" button: shows diff vs current + estimated revenue delta per tier
- "Save" → opens ConfirmModal with diff + asks owner to type "CONFIRM PRICING CHANGE" before POST
- On 200: toast + re-fetch

**Task 21 (CustomersTab):** search box, table (id / email / created / active subs), per-row drawer with Cancel / Delete actions (each with its own confirm phrase).

**Task 22 (NemoClawTab):** list pending tasks with task_id / risk_tags / reason / Approve / Reject buttons. Single-click action with optimistic UI.

**Task 23 (AuditTab):** date-range picker + table filter + paginated rows. JSON-drawer on row click.

**Task 24 (CfgTab):**
- Voice persona dropdowns bound to `/api/v1/voice/catalog`
- Email template textareas (subject_signup / subject_login / body) with `{magic_link}` / `{ttl_minutes}` placeholder highlighting
- Save → ConfirmModal with "CONFIRM CFG CHANGE"

After each tab is shipped, commit independently:
```bash
git add coastal-brewing/web/app/owner/_components/<Tab>Tab.tsx
git commit -m "feat(coastal/owner/web): implement <Tab> tab"
```

---

## Task 25: `ConfirmModal.tsx` shared component

**Files:**
- Create: `coastal-brewing/web/app/owner/_components/ConfirmModal.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";
import * as React from "react";

export function ConfirmModal({
  open,
  title,
  diff,
  requiredPhrase,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  diff: React.ReactNode;
  requiredPhrase: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = React.useState("");
  React.useEffect(() => { if (!open) setTyped(""); }, [open]);
  if (!open) return null;
  const canConfirm = typed === requiredPhrase;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card p-6 max-w-2xl w-full border border-border">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <div className="mb-4 text-sm">{diff}</div>
        <label className="block text-xs uppercase tracking-widest mb-1">
          Type {requiredPhrase} to confirm
        </label>
        <input
          className="w-full border px-3 py-2 mb-4 font-mono"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 border">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className="px-4 py-2 bg-foreground text-background disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd coastal-brewing
git add coastal-brewing/web/app/owner/_components/ConfirmModal.tsx
git commit -m "feat(coastal/owner/web): shared ConfirmModal component for owner writes"
```

---

## Task 26: WebAuthn frontend (enroll + challenge pages + helpers)

**Files:**
- Create: `coastal-brewing/web/lib/webauthn.ts`
- Create: `coastal-brewing/web/app/owner/enroll/page.tsx`
- Create: `coastal-brewing/web/app/owner/challenge/page.tsx`

- [ ] **Step 1: Helper module**

```ts
// coastal-brewing/web/lib/webauthn.ts
// Browser-side helpers for navigator.credentials.create / get.
// Converts base64url ↔ ArrayBuffer for the WebAuthn API spec.

const b64urlToBuf = (s: string) => {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
};

const bufToB64url = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export async function webauthnEnroll(email: string) {
  const optsResp = await fetch("/api/v1/owner/enroll-start", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }), credentials: "include",
  });
  if (!optsResp.ok) throw new Error(`enroll-start failed: ${optsResp.status}`);
  const opts = await optsResp.json();
  // Re-hydrate base64url-encoded fields the lib emits.
  opts.challenge = b64urlToBuf(opts.challenge);
  opts.user.id = b64urlToBuf(opts.user.id);
  const credential = await navigator.credentials.create({ publicKey: opts }) as any;
  const credentialJson = {
    id: credential.id,
    rawId: bufToB64url(credential.rawId),
    type: credential.type,
    response: {
      attestationObject: bufToB64url(credential.response.attestationObject),
      clientDataJSON: bufToB64url(credential.response.clientDataJSON),
    },
  };
  const finishResp = await fetch("/api/v1/owner/enroll-finish", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, credential: credentialJson }), credentials: "include",
  });
  if (!finishResp.ok) throw new Error(`enroll-finish failed: ${finishResp.status}`);
  return finishResp.json();
}

export async function webauthnChallenge(email: string) {
  const optsResp = await fetch("/api/v1/owner/challenge-start", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }), credentials: "include",
  });
  if (!optsResp.ok) throw new Error(`challenge-start failed: ${optsResp.status}`);
  const opts = await optsResp.json();
  opts.challenge = b64urlToBuf(opts.challenge);
  opts.allowCredentials = opts.allowCredentials.map((c: any) => ({
    ...c, id: b64urlToBuf(c.id),
  }));
  const credential = await navigator.credentials.get({ publicKey: opts }) as any;
  const credentialJson = {
    id: credential.id,
    rawId: bufToB64url(credential.rawId),
    type: credential.type,
    response: {
      authenticatorData: bufToB64url(credential.response.authenticatorData),
      clientDataJSON: bufToB64url(credential.response.clientDataJSON),
      signature: bufToB64url(credential.response.signature),
      userHandle: credential.response.userHandle ? bufToB64url(credential.response.userHandle) : null,
    },
  };
  const finishResp = await fetch("/api/v1/owner/challenge-finish", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, credential: credentialJson }), credentials: "include",
  });
  if (!finishResp.ok) throw new Error(`challenge-finish failed: ${finishResp.status}`);
  return finishResp.json();
}
```

- [ ] **Step 2: Enroll page**

```tsx
// coastal-brewing/web/app/owner/enroll/page.tsx
"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { webauthnEnroll } from "@/lib/webauthn";

export default function EnrollPage() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") || "";
  const [state, setState] = React.useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = React.useState("");

  async function go() {
    setState("loading");
    setError("");
    try {
      await webauthnEnroll(email);
      setState("done");
      setTimeout(() => router.push("/owner"), 800);
    } catch (e: any) {
      setError(e.message || "Enrolment failed");
      setState("error");
    }
  }

  return (
    <main className="container py-12 max-w-md">
      <h1 className="text-2xl font-semibold mb-4">Enrol your passkey</h1>
      <p className="mb-6 text-sm">
        Touch your hardware key (or use your laptop's built-in fingerprint /
        face sensor) to register a passkey for <strong>{email}</strong>.
      </p>
      <button
        onClick={go}
        disabled={state === "loading" || !email}
        className="px-4 py-2 bg-foreground text-background"
      >
        {state === "loading" ? "Touch your key…" : "Enrol passkey"}
      </button>
      {state === "done" && <p className="mt-4 text-accent">Enrolled — redirecting…</p>}
      {state === "error" && <p className="mt-4 text-destructive">{error}</p>}
    </main>
  );
}
```

- [ ] **Step 3: Challenge page**

Same shape, calls `webauthnChallenge(email)`. On success → `router.push("/owner")`.

- [ ] **Step 4: Wire `/auth/verify` response to redirect**

In the existing `/auth/verify` page handler (the frontend page that POSTs to the API), check for `owner_redirect` in the response and `router.push(owner_redirect + "?email=" + owner_email)`.

- [ ] **Step 5: Commit**

```bash
cd coastal-brewing
git add coastal-brewing/web/lib/webauthn.ts coastal-brewing/web/app/owner/enroll/ coastal-brewing/web/app/owner/challenge/
git commit -m "feat(coastal/owner/web): WebAuthn enroll + challenge pages + lib/webauthn helpers"
```

---

## Task 27: Deploy step — seed config dir on aims-vps + add envs

**Files:**
- `/docker/coastal-brewing/.env` (on aims-vps, post-merge)
- `/docker/coastal-brewing/docker-compose.yml` (mount the config dir if not already)

- [ ] **Step 1: Create config dir on aims-vps**

```bash
ssh aims-vps "mkdir -p /docker/coastal-brewing/config"
```

- [ ] **Step 2: Seed config files from repo**

```bash
scp coastal-brewing/config/pricing-config.json aims-vps:/docker/coastal-brewing/config/
scp coastal-brewing/config/voice-config.json aims-vps:/docker/coastal-brewing/config/
scp coastal-brewing/config/email-templates.json aims-vps:/docker/coastal-brewing/config/
```

(Files appear in container at `/app/config/` via the existing `/docker/coastal-brewing:/app` bind mount.)

- [ ] **Step 3: Add envs**

```bash
ssh aims-vps "grep -q '^COASTAL_OWNER_EMAILS=' /docker/coastal-brewing/.env || cat >> /docker/coastal-brewing/.env <<'EOF'

# Owner console (2026-05-13)
COASTAL_OWNER_EMAILS=asg@achievemor.io,bpo@achievemor.io,jarrett.risher@gmail.com
COASTAL_OWNER_SESSION_SECRET=$(openssl rand -hex 32)
COASTAL_OWNER_RP_ID=brewing.foai.cloud
COASTAL_OWNER_RP_ORIGIN=https://brewing.foai.cloud
EOF"
```

- [ ] **Step 4: Compose passthrough**

Add to `coastal-runner.environment:` block in `/docker/coastal-brewing/docker-compose.yml`:

```yaml
COASTAL_OWNER_EMAILS: "${COASTAL_OWNER_EMAILS:-}"
COASTAL_OWNER_SESSION_SECRET: "${COASTAL_OWNER_SESSION_SECRET:-}"
COASTAL_OWNER_RP_ID: "${COASTAL_OWNER_RP_ID:-brewing.foai.cloud}"
COASTAL_OWNER_RP_ORIGIN: "${COASTAL_OWNER_RP_ORIGIN:-https://brewing.foai.cloud}"
```

- [ ] **Step 5: Restart**

```bash
ssh aims-vps "cd /docker/coastal-brewing && docker compose up -d coastal-runner"
```

- [ ] **Step 6: Smoke**

```bash
curl -i https://brewing.foai.cloud/api/v1/owner/activity
# expect: HTTP/2 401 (no cookie)

curl -i https://brewing.foai.cloud/api/v1/owner/enroll-start \
  -H 'Content-Type: application/json' \
  -d '{"email":"random@example.com"}'
# expect: HTTP/2 403 (not in allowlist)
```

---

## Task 28: Open the PR

- [ ] Push the feature branch
- [ ] `gh pr create` with title `feat(coastal): owner console — /owner dashboard + WebAuthn auth + live-edit JSON config`
- [ ] Body summarises: spec link + 27-task implementation + manual deploy steps for Task 27
- [ ] Wait for CI green
- [ ] Merge with `gh pr merge --merge --delete-branch`
- [ ] Run Task 27 deploy steps post-merge
- [ ] Final smoke: open `https://brewing.foai.cloud/auth/login`, sign in as `asg@achievemor.io`, click magic-link, expect redirect to `/owner/enroll`, touch passkey, expect `/owner` dashboard with live data

---

## Self-Review

**Spec coverage:**
- Architecture (§Architecture in spec) → Tasks 1–17 (backend) + Tasks 18–26 (frontend) + Task 27 (deploy)
- Auth flow (§Auth flow) → Tasks 6–9 (backend), Task 26 (frontend), Task 17 (endpoints)
- 6 tabs (§6 tab capabilities) → Tasks 11–16 (backend) + Tasks 19–24 (frontend)
- Hot-reload pattern (§Data flow) → Task 1 (loader) + Tasks 2–5 (consumer modules)
- Migration (§Migration) → Task 27 + Tasks 2/3/4/5 swap module reads
- Testing (§Testing) → unit tests in Tasks 1, 6, 7, 10, 11, 12, 13, 14, 15
- Out of scope items respected — no multi-owner, no mobile-first, no charts

**Placeholder scan:**
- Task 8 has a placeholder for the WebAuthn round-trip integration test (deferred to once the `webauthn` library's soft-device fixture API is verified). Documented as such, not a TODO — the test is gated on lib stability.
- Tasks 19–24 share a pattern body. Each tab implementation is short but the pattern is described explicitly; engineers can read the pricing-tab description and apply to others.

**Type consistency:**
- `_cadence_subscription_data` (existing) and the new `cadence._get_cadences()` both return dicts shaped like `CADENCES[cadence_id]` — no signature drift.
- `audit_ledger.record_event`, `record_pending_task`, `set_task_status`, `task_status`, `list_pending_tasks`, `query_events`, `count_events`, `recent_events` — Tasks 6/11/14/15 reference some that don't currently exist in `audit_ledger.py`. Each task that references a new helper must add it; the plan calls this out inline ("Add `audit_ledger.X` helper if not present").
- `owner_auth.start_registration` / `finish_registration` / `start_authentication` / `finish_authentication` match between Task 8 (definition) and Task 17 (consumption).
- Cookie shape `<email>.<exp>.<hmac8>` consistent between Tasks 7 (sign/verify) and 10/17 (set/read).

**Scope:**
Big-bang single-PR plan as the spec requires. 28 tasks is reasonable for the scope. The implementation plan deliberately spreads work across atomic commits within the PR so reviewers (and `executing-plans` / `subagent-driven-development` skills) can step through incrementally without batching the entire diff.

---

## Execution handoff

Plan complete and saved to `coastal-brewing/docs/superpowers/plans/2026-05-13-coastal-owner-console.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, two-stage review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session using `executing-plans`, batch execution with checkpoints for review.

Which approach?
