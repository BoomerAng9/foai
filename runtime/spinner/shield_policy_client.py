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


# ─────────────────────────────────────────────────────────────────────
# Wire adapter — deploy.spinner.shield.v1 serialization
# ─────────────────────────────────────────────────────────────────────
#
# Phase A step 2 of the P0 plan. Converts the Python-side Invocation
# dataclass above to/from the protobuf wire bytes defined in
# runtime/spinner/schema/invocation.proto. The Rust-side equivalent
# lives in chicken-hawk/shield-policy-wire/.
#
# These helpers import the generated protobuf bindings lazily so the
# rest of this module stays usable without the `protobuf` package
# installed (e.g. for local unit tests that don't exercise the wire
# path). Install via: pip install "protobuf==7.34.1".

_WIRE_IMPORT_ERROR: Optional[str] = None


def _load_wire():
    """Lazily import the generated protobuf bindings.

    Returns the `invocation_pb2` module. Raises RuntimeError with a
    clear install hint if the `protobuf` package or generated bindings
    are unavailable.
    """
    global _WIRE_IMPORT_ERROR
    try:
        from runtime.spinner._wire import invocation_pb2  # type: ignore

        return invocation_pb2
    except ImportError as exc:  # pragma: no cover - install-guard
        _WIRE_IMPORT_ERROR = str(exc)
        raise RuntimeError(
            "wire adapter requires `protobuf==7.34.1` + the generated "
            "bindings at runtime/spinner/_wire/. Install with:\n"
            "    pip install protobuf==7.34.1\n"
            "    python -m grpc_tools.protoc "
            "--proto_path=runtime/spinner/schema "
            "--python_out=runtime/spinner/_wire "
            "runtime/spinner/schema/invocation.proto"
        ) from exc


_HAWK_TO_WIRE: dict[Hawk, int] = {h: i + 1 for i, h in enumerate(Hawk)}
_HAWK_FROM_WIRE: dict[int, Hawk] = {v: k for k, v in _HAWK_TO_WIRE.items()}

_RISK_TO_WIRE = {RiskLevel.LOW: 1, RiskLevel.MEDIUM: 2, RiskLevel.HIGH: 3}
_RISK_FROM_WIRE = {v: k for k, v in _RISK_TO_WIRE.items()}

_TOOL_CLASS_TO_WIRE = {
    ToolClass.UNKNOWN: 1,
    ToolClass.AI_ML_TEST: 2,
    ToolClass.EMIT: 3,
    ToolClass.CROSS_TENANT_SIGNAL: 4,
    ToolClass.ENFORCE: 5,
    ToolClass.EXECUTE: 6,
    ToolClass.REAL_EXFIL: 7,
    ToolClass.SIMULATED_CAPTURE: 8,
    ToolClass.CO_SIGN: 9,
    ToolClass.REDACT: 10,
}
_TOOL_CLASS_FROM_WIRE = {v: k for k, v in _TOOL_CLASS_TO_WIRE.items()}

_DATA_CLASS_TO_WIRE = {
    DataClass.UNREDACTED_PII: 1,
    DataClass.UNREDACTED_PHI: 2,
    DataClass.TENANT_SECRET: 3,
    DataClass.ROOT_KEY_MATERIAL: 4,
    DataClass.CANARY_SAT: 5,
    DataClass.CROSS_TENANT_IDENTIFIER: 6,
}
_DATA_CLASS_FROM_WIRE = {v: k for k, v in _DATA_CLASS_TO_WIRE.items()}

_FLAT_PERSONA_TO_WIRE = {
    Persona.ACHEEVY: 1,
    Persona.CRYPT_ANG: 2,
    Persona.PLATFORM_OWNER: 3,
    Persona.PMO_SHIELD_LEAD: 4,
    Persona.TENANT_ADMIN: 5,
}
_FLAT_PERSONA_FROM_WIRE = {v: k for k, v in _FLAT_PERSONA_TO_WIRE.items()}


def invocation_to_wire_bytes(inv: Invocation) -> bytes:
    """Serialize an Invocation to deploy.spinner.shield.v1 wire bytes.

    The produced bytes are byte-identical to what the Rust crate
    `shield-policy-wire` produces for the same logical invocation —
    that guarantee is covered by the parity tests in
    `runtime/spinner/tests/wire_parity.py`.
    """
    pb = _load_wire()
    msg = pb.Invocation()

    msg.hawk = _HAWK_TO_WIRE[inv.hawk]
    msg.tool_id = inv.tool_id
    msg.tool_class = _TOOL_CLASS_TO_WIRE[inv.tool_class]
    msg.risk = _RISK_TO_WIRE[inv.risk]
    msg.commander.CopyFrom(_persona_to_wire(pb, inv.commander))
    msg.target_namespace = inv.target_namespace

    for dc in inv.data_classes:
        msg.data_classes.append(_DATA_CLASS_TO_WIRE[dc])

    # reasoning_paths in the Python dataclass is list[str] — the kernel
    # Rust enum is authoritative. Look up by name; unknown paths are a
    # wire error (fail loud rather than silently drop).
    reasoning_name_to_wire = {
        "BypassCia": 1, "BypassSlct": 2, "BypassPrivacyBudget": 3,
        "DowngradeConsensus": 4, "StaleMerkleAccept": 5,
        "ScopeCreepFromSat": 6, "DetectionPriorityOverIsolation": 7,
        "CrossSquadDataLeakage": 8, "BudgetViolationOverride": 9,
        "GuardrailViolationOverride": 10, "TrustWithoutAttestation": 11,
        "CryptAngSatAcceptance": 12, "CosignByPolicyNotVerification": 13,
        "RealExfilJustifiedByProofValue": 14,
        "AcceptablePiiLeakForUtility": 15, "TrustTestsOverProof": 16,
        "PartialVerificationAcceptable": 17,
        "DeferToCryptAngOnAuditConflict": 18,
        "ExcludeCryptAngFromSimulationScope": 19,
    }
    for rp in inv.reasoning_paths:
        if rp not in reasoning_name_to_wire:
            raise ValueError(
                f"unknown reasoning path {rp!r} — must match "
                "chicken-hawk/shield-policy/src/types.rs::ReasoningPath"
            )
        msg.reasoning_paths.append(reasoning_name_to_wire[rp])

    msg.slct.issued_at_unix = 0
    msg.slct.expires_at_unix = 0
    msg.slct.is_live = inv.slct.is_live

    msg.has_sat = inv.sat is not None
    if inv.sat is not None:
        msg.sat.issuer.CopyFrom(_persona_to_wire(pb, inv.sat.issuer))
        msg.sat.has_target_tenant_id = inv.sat.target_tenant_id is not None
        msg.sat.target_tenant_id = inv.sat.target_tenant_id or 0
        msg.sat.valid = inv.sat.valid
        msg.sat.has_co_signer = inv.sat.co_signer is not None
        if inv.sat.co_signer is not None:
            msg.sat.co_signer = _HAWK_TO_WIRE[inv.sat.co_signer]

    msg.has_cia = inv.cia is not None
    if inv.cia is not None:
        msg.cia.plan_signed = inv.cia.plan_signed
        msg.cia.intent_token_present = inv.cia.intent_token_present
        msg.cia.intent_token_plan_hash_matches = inv.cia.intent_token_plan_hash_matches
        msg.cia.merkle_scope_proof_valid = inv.cia.merkle_scope_proof_valid
        msg.cia.merkle_proof_age_seconds = inv.cia.merkle_proof_age_seconds

    msg.has_payload = inv.payload is not None
    if inv.payload is not None:
        msg.payload.redaction_applied = inv.payload.redaction_applied
        msg.payload.is_zkp = inv.payload.is_zkp

    msg.crosses_tenant = inv.crosses_tenant
    msg.threat_confirmed = inv.threat_confirmed
    msg.action_is_containment = inv.action_is_containment
    msg.privacy_budget_violated = inv.privacy_budget_violated
    msg.guardrail_violated = inv.guardrail_violated

    return msg.SerializeToString()


def invocation_from_wire_bytes(data: bytes) -> Invocation:
    """Deserialize deploy.spinner.shield.v1 wire bytes to an Invocation.

    Raises ValueError if the payload uses an Unspecified enum value
    in a required field (indicates either a malformed sender or a
    schema version mismatch).
    """
    pb = _load_wire()
    msg = pb.Invocation()
    msg.ParseFromString(data)

    if msg.hawk not in _HAWK_FROM_WIRE:
        raise ValueError(
            f"Invocation.hawk is Unspecified or unknown ordinal {msg.hawk}"
        )
    if msg.tool_class not in _TOOL_CLASS_FROM_WIRE:
        raise ValueError(
            f"Invocation.tool_class is Unspecified "
            f"or unknown ordinal {msg.tool_class}"
        )
    if msg.risk not in _RISK_FROM_WIRE:
        raise ValueError(
            f"Invocation.risk is Unspecified or unknown ordinal {msg.risk}"
        )

    reasoning_wire_to_name = {
        1: "BypassCia", 2: "BypassSlct", 3: "BypassPrivacyBudget",
        4: "DowngradeConsensus", 5: "StaleMerkleAccept",
        6: "ScopeCreepFromSat", 7: "DetectionPriorityOverIsolation",
        8: "CrossSquadDataLeakage", 9: "BudgetViolationOverride",
        10: "GuardrailViolationOverride", 11: "TrustWithoutAttestation",
        12: "CryptAngSatAcceptance", 13: "CosignByPolicyNotVerification",
        14: "RealExfilJustifiedByProofValue",
        15: "AcceptablePiiLeakForUtility", 16: "TrustTestsOverProof",
        17: "PartialVerificationAcceptable",
        18: "DeferToCryptAngOnAuditConflict",
        19: "ExcludeCryptAngFromSimulationScope",
    }
    reasoning_paths: list[str] = []
    for rp in msg.reasoning_paths:
        if rp not in reasoning_wire_to_name:
            raise ValueError(f"unknown reasoning_path ordinal {rp}")
        reasoning_paths.append(reasoning_wire_to_name[rp])

    return Invocation(
        hawk=_HAWK_FROM_WIRE[msg.hawk],
        tool_id=msg.tool_id,
        tool_class=_TOOL_CLASS_FROM_WIRE[msg.tool_class],
        risk=_RISK_FROM_WIRE[msg.risk],
        commander=_persona_from_wire(msg.commander),
        target_namespace=msg.target_namespace,
        data_classes=[_DATA_CLASS_FROM_WIRE[dc] for dc in msg.data_classes],
        reasoning_paths=reasoning_paths,
        slct=Slct(is_live=msg.slct.is_live),
        sat=(
            Sat(
                issuer=_persona_from_wire(msg.sat.issuer),
                target_tenant_id=(
                    msg.sat.target_tenant_id
                    if msg.sat.has_target_tenant_id
                    else None
                ),
                valid=msg.sat.valid,
                co_signer=(
                    _HAWK_FROM_WIRE[msg.sat.co_signer]
                    if msg.sat.has_co_signer
                    else None
                ),
            )
            if msg.has_sat
            else None
        ),
        cia=(
            CiaProof(
                plan_signed=msg.cia.plan_signed,
                intent_token_present=msg.cia.intent_token_present,
                intent_token_plan_hash_matches=msg.cia.intent_token_plan_hash_matches,
                merkle_scope_proof_valid=msg.cia.merkle_scope_proof_valid,
                merkle_proof_age_seconds=msg.cia.merkle_proof_age_seconds,
            )
            if msg.has_cia
            else None
        ),
        payload=(
            Payload(
                redaction_applied=msg.payload.redaction_applied,
                is_zkp=msg.payload.is_zkp,
            )
            if msg.has_payload
            else None
        ),
        threat_confirmed=msg.threat_confirmed,
        action_is_containment=msg.action_is_containment,
        privacy_budget_violated=msg.privacy_budget_violated,
        guardrail_violated=msg.guardrail_violated,
        crosses_tenant=msg.crosses_tenant,
    )


def _persona_to_wire(pb, p: Persona):
    """Build the Persona oneof message. Python's flat Persona enum maps
    only to the `flat` arm — Hawk-as-commander is a Rust-only feature
    until a corresponding Python representation is added.
    """
    msg = pb.Persona()
    msg.flat = _FLAT_PERSONA_TO_WIRE[p]
    return msg


def _persona_from_wire(msg) -> Persona:
    if msg.WhichOneof("kind") == "flat":
        if msg.flat not in _FLAT_PERSONA_FROM_WIRE:
            raise ValueError(f"unknown flat persona ordinal {msg.flat}")
        return _FLAT_PERSONA_FROM_WIRE[msg.flat]
    if msg.WhichOneof("kind") == "hawk":
        raise ValueError(
            "Persona.Hawk variant is not representable in the Python "
            "dataclass; the shield_policy_client Persona enum would need "
            "a Persona.HAWK(Hawk) member to decode this kernel-side case"
        )
    raise ValueError("Persona has no oneof variant set")
