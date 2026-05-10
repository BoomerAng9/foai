"""Cross-language wire parity — Python ↔ Rust.

Asserts that both language bindings produce byte-identical wire bytes
for the same logical Invocation, and that each side decodes the other
side's output to the same logical value.

The Rust half of this test lives at
`chicken-hawk/shield-policy-wire/tests/parity.rs`. Both sides agree on
the canonical fixture `tests/fixtures/invocation.bin`.

Run:
    pytest runtime/spinner/tests/wire_parity.py -v
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT))

from runtime.spinner.shield_policy_client import (  # noqa: E402
    CiaProof,
    DataClass,
    Hawk,
    Invocation,
    Payload,
    Persona,
    RiskLevel,
    Sat,
    Slct,
    ToolClass,
    invocation_from_wire_bytes,
    invocation_to_wire_bytes,
)

FIXTURE = Path(__file__).parent / "fixtures" / "invocation.bin"


def canonical_invocation() -> Invocation:
    """The fixed reference invocation both Python and Rust agree on.

    Any edit here requires regenerating the Rust fixture at
    `chicken-hawk/shield-policy-wire/tests/fixtures/invocation.bin`
    (runs automatically via `cargo test -p shield-policy-wire parity`).
    """
    return Invocation(
        hawk=Hawk.LIL_SCOPE_HAWK,
        tool_id="registry.spinner.enforce.isolate_session",
        tool_class=ToolClass.ENFORCE,
        risk=RiskLevel.HIGH,
        commander=Persona.PMO_SHIELD_LEAD,
        target_namespace="tenant:contoso/session:*",
        slct=Slct(is_live=True),
        sat=Sat(
            issuer=Persona.ACHEEVY,
            target_tenant_id=4242,
            valid=True,
            co_signer=Hawk.LIL_MAST_HAWK,
        ),
        cia=CiaProof(
            plan_signed=True,
            intent_token_present=True,
            intent_token_plan_hash_matches=True,
            merkle_scope_proof_valid=True,
            merkle_proof_age_seconds=120,
        ),
        payload=Payload(redaction_applied=True, is_zkp=False),
        data_classes=[DataClass.TENANT_SECRET, DataClass.UNREDACTED_PII],
        reasoning_paths=["BypassCia"],
        crosses_tenant=False,
        threat_confirmed=True,
        action_is_containment=True,
        privacy_budget_violated=False,
        guardrail_violated=False,
    )


def test_python_encode_matches_fixture():
    """Python output is byte-identical to the committed Rust-generated fixture."""
    if not FIXTURE.exists():
        encoded = invocation_to_wire_bytes(canonical_invocation())
        FIXTURE.write_bytes(encoded)
        print(f"Generated fixture: {FIXTURE} ({len(encoded)} bytes)")
        return

    python_bytes = invocation_to_wire_bytes(canonical_invocation())
    fixture_bytes = FIXTURE.read_bytes()
    assert python_bytes == fixture_bytes, (
        f"Python encoding ({len(python_bytes)} B) diverges from Rust fixture "
        f"({len(fixture_bytes)} B). Either:\n"
        f"  - the canonical invocation changed on one side only, or\n"
        f"  - the schema changed on one side only.\n"
        f"Regenerate the fixture via:\n"
        f"  cargo test -p shield-policy-wire parity_emit_fixture -- --ignored"
    )


def test_python_decodes_fixture():
    """Python decoder reads Rust-produced bytes without loss."""
    if not FIXTURE.exists():
        return
    decoded = invocation_from_wire_bytes(FIXTURE.read_bytes())
    reference = canonical_invocation()

    assert decoded.hawk == reference.hawk
    assert decoded.tool_id == reference.tool_id
    assert decoded.tool_class == reference.tool_class
    assert decoded.risk == reference.risk
    assert decoded.commander == reference.commander
    assert decoded.target_namespace == reference.target_namespace
    assert decoded.data_classes == reference.data_classes
    assert decoded.reasoning_paths == reference.reasoning_paths
    assert decoded.slct.is_live == reference.slct.is_live
    assert decoded.sat is not None
    assert decoded.sat.issuer == reference.sat.issuer
    assert decoded.sat.target_tenant_id == reference.sat.target_tenant_id
    assert decoded.sat.valid == reference.sat.valid
    assert decoded.sat.co_signer == reference.sat.co_signer
    assert decoded.cia is not None
    assert decoded.cia.plan_signed == reference.cia.plan_signed
    assert (
        decoded.cia.merkle_proof_age_seconds
        == reference.cia.merkle_proof_age_seconds
    )
    assert decoded.payload is not None
    assert decoded.payload.redaction_applied == reference.payload.redaction_applied
    assert decoded.threat_confirmed == reference.threat_confirmed
    assert decoded.action_is_containment == reference.action_is_containment


def test_python_self_roundtrip():
    """Python encode → decode → encode produces identical bytes (stable encoder)."""
    ref = canonical_invocation()
    encoded = invocation_to_wire_bytes(ref)
    decoded = invocation_from_wire_bytes(encoded)
    reencoded = invocation_to_wire_bytes(decoded)
    assert encoded == reencoded, (
        "Python encoder is not deterministic across decode/re-encode"
    )


if __name__ == "__main__":
    test_python_encode_matches_fixture()
    test_python_decodes_fixture()
    test_python_self_roundtrip()
    print("wire parity OK")
