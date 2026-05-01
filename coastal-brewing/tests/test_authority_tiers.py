"""Pytest matrix for `agents/shared/authority_tiers.py`.

Exhaustively tests tier × volume × pillar combinations against the canonical
tier-ceiling table. If a ceiling drifts, this suite hard-fails before deploy.

Owner directive 2026-04-30: ACHEEVY uncapped, Sal_Ang T3 ≤10%/15%, Melli
T2_BULK 15/25/35% by volume bracket, LUC T2_FINANCE coupons-only (zero
margin discount).

Run from repo root: `python -m pytest tests/test_authority_tiers.py -v`.
"""
from __future__ import annotations

import os
import pathlib
import sys

# Set a stable HMAC secret BEFORE importing the module — it reads env at
# module load. Tests then use this same secret implicitly for sign/verify.
os.environ.setdefault("COASTAL_APPROVE_SECRET", "test-secret-do-not-use-in-prod")

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from agents.shared import authority_tiers as at  # noqa: E402


# ---------------------------------------------------------------------------
# Tier resolution
# ---------------------------------------------------------------------------

def test_acheevy_resolves_to_t1():
    assert at.get_tier("acheevy") == "T1"


def test_melli_aliases_resolve_to_t2_bulk():
    assert at.get_tier("melli") == "T2_BULK"
    assert at.get_tier("melli_capensi") == "T2_BULK"


def test_luc_aliases_resolve_to_t2_finance():
    assert at.get_tier("luc") == "T2_FINANCE"
    assert at.get_tier("luc_ang") == "T2_FINANCE"


def test_sal_aliases_resolve_to_t3():
    assert at.get_tier("sal") == "T3"
    assert at.get_tier("sal_ang") == "T3"


def test_bgz_resolve_to_t2_bulk_dispatch():
    # When a BG engages a Custee under Melli's dispatch, they speak with
    # Melli's T2_BULK authority.
    for bg in ("persona_tah", "eve_retti", "leu_kurus", "ana_kuma"):
        assert at.get_tier(bg) == "T2_BULK", f"BG {bg} should inherit T2_BULK"


def test_unknown_actor_returns_none():
    assert at.get_tier("not_a_real_agent") is None
    assert at.get_tier("") is None


def test_actor_lookup_is_case_insensitive():
    assert at.get_tier("ACHEEVY") == "T1"
    assert at.get_tier("Sal_Ang") == "T3"


# ---------------------------------------------------------------------------
# Discount ceilings
# ---------------------------------------------------------------------------

def test_t1_uncapped():
    assert at.get_discount_ceiling_pct("T1") is None


def test_t3_ppu_capped_at_10():
    assert at.get_discount_ceiling_pct("T3", qty=1, is_bundle=False) == 10.0


def test_t3_bundle_capped_at_15():
    assert at.get_discount_ceiling_pct("T3", qty=3, is_bundle=True) == 15.0


def test_t2_finance_zero():
    # LUC has zero margin-discount authority (coupons only).
    assert at.get_discount_ceiling_pct("T2_FINANCE") == 0.0


def test_t2_bulk_below_minimum_qty_zero():
    # Below 12 units → no bulk discount available, falls through to 0.
    assert at.get_discount_ceiling_pct("T2_BULK", qty=11) == 0.0


def test_t2_bulk_ladder_steps():
    assert at.get_discount_ceiling_pct("T2_BULK", qty=12) == 15.0
    assert at.get_discount_ceiling_pct("T2_BULK", qty=49) == 15.0
    assert at.get_discount_ceiling_pct("T2_BULK", qty=50) == 25.0
    assert at.get_discount_ceiling_pct("T2_BULK", qty=99) == 25.0
    assert at.get_discount_ceiling_pct("T2_BULK", qty=100) == 35.0
    assert at.get_discount_ceiling_pct("T2_BULK", qty=500) == 35.0


# ---------------------------------------------------------------------------
# Coupon authority
# ---------------------------------------------------------------------------

def test_luc_can_issue_known_coupons():
    for code in ("WELCOME10", "BREW20", "FREESHIP", "TRY-ME"):
        assert at.is_coupon_within_authority("T2_FINANCE", code)


def test_luc_cannot_invent_coupons():
    assert not at.is_coupon_within_authority("T2_FINANCE", "FAKECODE99")
    assert not at.is_coupon_within_authority("T2_FINANCE", "")


def test_acheevy_can_issue_any_coupon():
    # T1 has full coupon authority — ACHEEVY can issue ad-hoc codes.
    assert at.is_coupon_within_authority("T1", "WELCOME10")
    assert at.is_coupon_within_authority("T1", "ACHEEVY-SPECIAL-2026")


def test_sal_and_melli_no_coupon_authority():
    # T3 (Sal) and T2_BULK (Melli) cannot issue coupons.
    assert not at.is_coupon_within_authority("T3", "WELCOME10")
    assert not at.is_coupon_within_authority("T2_BULK", "WELCOME10")


# ---------------------------------------------------------------------------
# is_within_authority — the integration decision
# ---------------------------------------------------------------------------

def test_sal_5pct_ppu_allowed():
    d = at.is_within_authority("sal_ang", requested_pct=5.0, qty=1)
    assert d["allowed"]
    assert not d["requires_escalation"]
    assert d["actor_tier"] == "T3"
    assert d["binding_ceiling_pct"] == 10.0


def test_sal_25pct_ppu_escalates():
    d = at.is_within_authority("sal_ang", requested_pct=25.0, qty=1)
    assert not d["allowed"]
    assert d["requires_escalation"]


def test_sal_15pct_bundle_at_ceiling():
    d = at.is_within_authority("sal_ang", requested_pct=15.0, qty=3, is_bundle=True)
    assert d["allowed"], "Sal at exact bundle ceiling should be allowed"
    assert d["binding_ceiling_pct"] == 15.0


def test_melli_30pct_at_50u_escalates():
    # 50u → 25% cap, 30% requested → escalation.
    d = at.is_within_authority("melli", requested_pct=30.0, qty=50)
    assert not d["allowed"]
    assert d["requires_escalation"]


def test_melli_30pct_at_100u_allowed():
    # 100u → 35% cap, 30% requested → allowed.
    d = at.is_within_authority("melli", requested_pct=30.0, qty=100)
    assert d["allowed"]


def test_luc_any_discount_escalates():
    d = at.is_within_authority("luc", requested_pct=5.0)
    assert not d["allowed"]
    assert d["requires_escalation"]


def test_acheevy_uncapped_when_no_floor_provided():
    # T1 with no max_giveable provided — authority defers.
    d = at.is_within_authority("acheevy", requested_pct=50.0)
    assert d["allowed"]
    assert d["actor_tier"] == "T1"


def test_acheevy_bound_by_floor_when_provided():
    # T1 still bound by the global floor; if floor only allows 30% but
    # ACHEEVY tries 50%, escalation is required (he can't override below floor).
    d = at.is_within_authority(
        "acheevy", requested_pct=50.0, max_giveable_pct=30.0
    )
    assert not d["allowed"]
    assert d["requires_escalation"]


def test_sal_bound_by_floor_when_floor_tighter_than_tier():
    # Sal cap = 15% on bundle, but floor only allows 8% — binding = 8%.
    d = at.is_within_authority(
        "sal_ang", requested_pct=10.0, qty=3, is_bundle=True, max_giveable_pct=8.0
    )
    assert not d["allowed"]
    assert d["binding_ceiling_pct"] == 8.0


def test_unknown_actor_fails_closed():
    d = at.is_within_authority("rogue_agent", requested_pct=5.0)
    assert not d["allowed"]
    assert "unknown_actor" in d["reason"]


# ---------------------------------------------------------------------------
# HMAC escalation tokens
# ---------------------------------------------------------------------------

def test_token_round_trips():
    tok = at.make_stepper_escalation_token(
        actor="sal_ang",
        sku="coastal-blend-12oz",
        qty=12,
        requested_pct=20.0,
        custee_id="custee_test_001",
    )
    assert tok and "." in tok
    payload = at.verify_stepper_escalation_token(tok)
    assert payload is not None
    assert payload["actor"] == "sal_ang"
    assert payload["tier"] == "T3"
    assert payload["sku"] == "coastal-blend-12oz"
    assert payload["qty"] == 12
    assert payload["requested_pct"] == 20.0
    assert payload["custee_id"] == "custee_test_001"
    assert payload["kind"] == "stepper_escalation"


def test_tampered_token_rejected():
    tok = at.make_stepper_escalation_token(
        actor="sal_ang", sku="coastal-blend-12oz", qty=12,
        requested_pct=20.0, custee_id="custee_test_001",
    )
    # Flip a bit in the signature.
    payload_b64, sig = tok.rsplit(".", 1)
    bad_sig = ("0" if sig[0] != "0" else "1") + sig[1:]
    bad_token = f"{payload_b64}.{bad_sig}"
    assert at.verify_stepper_escalation_token(bad_token) is None


def test_tampered_payload_rejected():
    tok = at.make_stepper_escalation_token(
        actor="sal_ang", sku="coastal-blend-12oz", qty=12,
        requested_pct=20.0, custee_id="custee_test_001",
    )
    payload_b64, sig = tok.rsplit(".", 1)
    # Flip a payload character — sig won't match the new payload.
    bad_payload = ("X" + payload_b64[1:]) if payload_b64[0] != "X" else ("Y" + payload_b64[1:])
    bad_token = f"{bad_payload}.{sig}"
    assert at.verify_stepper_escalation_token(bad_token) is None


def test_expired_token_rejected():
    # ttl_sec=-1 → immediately expired.
    tok = at.make_stepper_escalation_token(
        actor="sal_ang", sku="coastal-blend-12oz", qty=12,
        requested_pct=20.0, custee_id="custee_test_001",
        ttl_sec=-1,
    )
    assert at.verify_stepper_escalation_token(tok) is None


def test_malformed_token_rejected():
    assert at.verify_stepper_escalation_token("") is None
    assert at.verify_stepper_escalation_token("garbage") is None
    assert at.verify_stepper_escalation_token("a.b.c") is None  # too many dots


def test_wrong_kind_payload_rejected():
    # Build a manually-signed token with kind != "stepper_escalation".
    import base64, hashlib, hmac, json, time
    payload = {
        "kind": "approval",  # wrong kind
        "escalation_id": "esc_x",
        "actor": "sal_ang",
        "tier": "T3",
        "sku": "x",
        "qty": 1,
        "requested_pct": 5.0,
        "custee_id": "custee_x",
        "exp": int(time.time()) + 3600,
    }
    payload_b64 = base64.urlsafe_b64encode(
        json.dumps(payload, sort_keys=True).encode("utf-8")
    ).rstrip(b"=").decode("ascii")
    sig = hmac.new(
        os.environ["COASTAL_APPROVE_SECRET"].encode("utf-8"),
        payload_b64.encode("ascii"),
        hashlib.sha256,
    ).hexdigest()
    bad_kind_token = f"{payload_b64}.{sig}"
    assert at.verify_stepper_escalation_token(bad_kind_token) is None
