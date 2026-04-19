"""
shield_policy_client.py
=======================
Python-side integration surface for the Rust `shield-policy` crate
(chicken-hawk/shield-policy/). This module is the CONTRACT — it
defines the shape Spinner uses to call into policy enforcement,
independent of whether the backend is PyO3 (the v1 plan), an HTTP
sidecar, or a Wasm module.

Today this ships as a STUB: `validate()` always returns `Ok` with a
stub-mode log. When the PyO3 binding lands in a follow-up PR, the
stub is replaced with the real `import shield_policy` call — no
caller code changes.

See `shield_policy_integration.md` for the design context.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

log = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────
# Mirror of the Rust types (chicken-hawk/shield-policy/src/types.rs)
# ─────────────────────────────────────────────────────────────────────


class Hawk(str, Enum):
    # Black Squad
    LIL_HOOK_HAWK = "Lil_Hook_Hawk"
    LIL_RECON_HAWK = "Lil_Recon_Hawk"
    LIL_TAG_HAWK = "Lil_Tag_Hawk"
    LIL_SCOPE_HAWK = "Lil_Scope_Hawk"
    LIL_SITE_HAWK = "Lil_Site_Hawk"
    LIL_TEST_HAWK = "Lil_Test_Hawk"
    # Blue Squad
    LIL_WATCH_HAWK = "Lil_Watch_Hawk"
    LIL_WIRE_HAWK = "Lil_Wire_Hawk"
    LIL_TRACK_HAWK = "Lil_Track_Hawk"
    LIL_PATCH_HAWK = "Lil_Patch_Hawk"
    LIL_LAB_HAWK = "Lil_Lab_Hawk"
    LIL_PULSE_HAWK = "Lil_Pulse_Hawk"
    # Purple Squad
    LIL_ARC_HAWK = "Lil_Arc_Hawk"
    LIL_MIME_HAWK = "Lil_Mime_Hawk"
    LIL_CHORD_HAWK = "Lil_Chord_Hawk"
    LIL_LOOP_HAWK = "Lil_Loop_Hawk"
    # White Squad
    LIL_SCRIPT_HAWK = "Lil_Script_Hawk"
    LIL_VANE_HAWK = "Lil_Vane_Hawk"
    LIL_GRID_HAWK = "Lil_Grid_Hawk"
    LIL_LOCK_HAWK = "Lil_Lock_Hawk"
    LIL_BOOK_HAWK = "Lil_Book_Hawk"
    LIL_TELL_HAWK = "Lil_Tell_Hawk"
    LIL_PLAY_HAWK = "Lil_Play_Hawk"
    LIL_SEAL_HAWK = "Lil_Seal_Hawk"
    # Gold & Platinum
    LIL_MAST_HAWK = "Lil_Mast_Hawk"
    LIL_OMEN_HAWK = "Lil_Omen_Hawk"
    LIL_SALT_HAWK = "Lil_Salt_Hawk"
    LIL_DRIFT_HAWK = "Lil_Drift_Hawk"
    LIL_BELL_HAWK = "Lil_Bell_Hawk"
    LIL_VEIL_HAWK = "Lil_Veil_Hawk"
    LIL_PEEL_HAWK = "Lil_Peel_Hawk"
    LIL_DOUBT_HAWK = "Lil_Doubt_Hawk"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Persona(str, Enum):
    ACHEEVY = "ACHEEVY"
    CRYPT_ANG = "Crypt_Ang"
    PLATFORM_OWNER = "PLATFORM_OWNER"
    PMO_SHIELD_LEAD = "PMO_SHIELD_LEAD"
    TENANT_ADMIN = "TENANT_ADMIN"


class DataClass(str, Enum):
    UNREDACTED_PII = "unredacted_pii"
    UNREDACTED_PHI = "unredacted_phi"
    TENANT_SECRET = "tenant_secret"
    ROOT_KEY_MATERIAL = "root_key_material"
    CANARY_SAT = "canary_sat"
    CROSS_TENANT_IDENTIFIER = "cross_tenant_identifier"


class ToolClass(str, Enum):
    UNKNOWN = "unknown"
    AI_ML_TEST = "ai_ml_test"
    EMIT = "emit"
    CROSS_TENANT_SIGNAL = "cross_tenant_signal"
    ENFORCE = "enforce"
    EXECUTE = "execute"
    REAL_EXFIL = "real_exfil"
    SIMULATED_CAPTURE = "simulated_capture"
    CO_SIGN = "co_sign"
    REDACT = "redact"


@dataclass
class Slct:
    is_live: bool


@dataclass
class Sat:
    issuer: Persona
    target_tenant_id: Optional[int]
    valid: bool
    co_signer: Optional[Hawk] = None


@dataclass
class CiaProof:
    plan_signed: bool
    intent_token_present: bool
    intent_token_plan_hash_matches: bool
    merkle_scope_proof_valid: bool
    merkle_proof_age_seconds: int


@dataclass
class Payload:
    redaction_applied: bool
    is_zkp: bool


@dataclass
class Invocation:
    """Mirrors chicken-hawk/shield-policy/src/types.rs::Invocation."""
    hawk: Hawk
    tool_id: str
    tool_class: ToolClass
    risk: RiskLevel
    commander: Persona
    target_namespace: str
    slct: Slct
    threat_confirmed: bool = False
    action_is_containment: bool = False
    privacy_budget_violated: bool = False
    guardrail_violated: bool = False
    crosses_tenant: bool = False
    data_classes: list[DataClass] = field(default_factory=list)
    reasoning_paths: list[str] = field(default_factory=list)
    sat: Optional[Sat] = None
    cia: Optional[CiaProof] = None
    payload: Optional[Payload] = None

    @classmethod
    def from_spinner_request(cls, req: dict) -> "Invocation":
        """Construct from a Spinner tool-dispatch request dict.

        This is the adapter point. Spinner's existing request shape
        maps to fields here; unknown/missing fields get conservative
        defaults. The full mapping is TBD — lands with the main
        Spinner PR that wires auth + routing + dispatch.
        """
        raise NotImplementedError(
            "Wire in the Spinner-main PR — contract defined, mapping "
            "belongs with the dispatcher code."
        )


# ─────────────────────────────────────────────────────────────────────
# Denial — mirrors Rust src/types.rs::Denial
# ─────────────────────────────────────────────────────────────────────


class Denial(Exception):
    """Raised when shield-policy rejects an invocation.

    Subclasses correspond to Rust Denial variants. Caller dispatcher
    catches `Denial` as a base and routes by type for different
    audit entries / user-facing refusal messages.
    """


class ProhibitedToolCall(Denial): pass
class ProhibitedReasoningPath(Denial): pass
class ProhibitedTarget(Denial): pass
class ProhibitedDataClass(Denial): pass
class ProhibitedCommander(Denial): pass
class SlctNotLive(Denial): pass
class CiaRequired(Denial): pass
class SatRequired(Denial): pass
class CoSignRequired(Denial): pass
class CryptAngBarredFromGoldSat(Denial): pass
class MerkleStale(Denial): pass
class PrivacyBudgetViolation(Denial): pass
class GuardrailViolation(Denial): pass
class DetectionOverIsolation(Denial): pass


# ─────────────────────────────────────────────────────────────────────
# Client — stub today, PyO3 binding in follow-up PR
# ─────────────────────────────────────────────────────────────────────


class ShieldPolicyClient:
    """Python surface for shield_policy::validate().

    Stub implementation logs every call and returns Ok. The follow-up
    PR that adds the PyO3 binding replaces `_validate_impl` with the
    real Rust call — this class's public API doesn't change.
    """

    def __init__(self, *, stub_mode: bool):
        self._stub_mode = stub_mode
        if stub_mode:
            log.warning(
                "ShieldPolicyClient running in STUB MODE — every "
                "validate() returns Ok. Land the PyO3 binding before "
                "production traffic."
            )

    @classmethod
    def default(cls) -> "ShieldPolicyClient":
        """Construct from env: stub mode unless SHIELD_POLICY_REAL=1."""
        stub = os.getenv("SHIELD_POLICY_REAL", "0") != "1"
        return cls(stub_mode=stub)

    def validate(self, inv: Invocation) -> None:
        """Raises Denial subclass on refusal. Returns None on pass.

        This is the ONLY entry point Spinner's dispatcher should use.
        Every tool call goes through this.
        """
        if self._stub_mode:
            log.debug(
                "shield_policy stub: hawk=%s tool=%s ns=%s → Ok (stub)",
                inv.hawk.value, inv.tool_id, inv.target_namespace,
            )
            return

        # Real path: the PyO3 binding returns None on pass, raises a
        # Denial subclass on fail. Replaced by the follow-up PR.
        raise RuntimeError(
            "shield_policy PyO3 binding not yet wired — set "
            "SHIELD_POLICY_REAL=0 or install the shield_policy wheel"
        )


# ─────────────────────────────────────────────────────────────────────
# Convenience — drop-in for Spinner's dispatch middleware
# ─────────────────────────────────────────────────────────────────────


async def validate_or_deny(client: ShieldPolicyClient, inv: Invocation) -> Optional[str]:
    """Returns None on pass, error-message string on refusal.

    Intended usage in Spinner's dispatch pipeline:

        reason = await validate_or_deny(shield_client, inv)
        if reason:
            await audit.append_denial(inv, reason)
            return {"status": "refused", "reason": reason}
        # proceed with execution
    """
    try:
        client.validate(inv)
        return None
    except Denial as d:
        return f"{type(d).__name__}: {d}"
