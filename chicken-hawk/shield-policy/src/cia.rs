//! CIA — Cryptographic Intent Attestation (v1.6 §2.3)
//!
//! A dedicated formally-verified kernel component implementing the
//! Tri-Factor Intent proof. Every high-risk Hawk invocation must
//! attach a valid `CiaTriFactor` before the Spinner policy engine
//! permits execution.
//!
//! The Tri-Factor is a MATHEMATICAL INTERSECTION — not a heuristic
//! aggregation. Either all three factors validate or the action is
//! refused:
//!
//!   1. The "What" — a Plan signed by the invoking Hawk's hybrid
//!      ed25519+ML-DSA identity key
//!   2. The "Why" — an Intent Token signed by an INDEPENDENT external
//!      source (ServiceNow change request, hardware-backed HITL,
//!      pre-signed playbook entry, multi-party maintenance declaration)
//!   3. The "Where" — a Merkle inclusion proof showing the target
//!      resource exists in the tenant's resource-inventory tree,
//!      max 1 hour old
//!
//! No score, no threshold, no policy tuning. The intersection either
//! exists or it does not. That's the structural guarantee that
//! separates CIA from the v1.5 Confidence Score it replaced.

use crate::types::Denial;

/// The signed execution Plan — the "What" factor.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SignedPlan {
    /// ed25519 + ML-DSA (Dilithium) hybrid signature verified against
    /// the invoking Hawk's identity key registered in Vault.
    pub signature_valid: bool,
    /// Hash of the Plan body — the thing the Intent Token must
    /// reference. Represented as a u64 tag here for Kani tractability;
    /// the production implementation uses SHA-256 bytes.
    pub plan_hash_tag: u64,
}

/// The Intent Token — the "Why" factor. Signed by an external,
/// independent authority; references the Plan by hash.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct IntentToken {
    /// Signed by one of: ServiceNow change-request authority,
    /// hardware-backed HITL signer, pre-signed playbook entry's
    /// authority, multi-party maintenance declaration. Verified
    /// against a public key NOT belonging to the invoking Hawk.
    pub signature_valid: bool,
    /// The plan_hash_tag this token blesses. If the invocation's
    /// Plan hash doesn't match this field, the token is for a
    /// DIFFERENT plan and is refused.
    pub references_plan_hash_tag: u64,
    /// Lineage marker — non-zero means "signed by an authority
    /// OTHER than the invoking Hawk's identity key". Zero means
    /// the token came from the same keypair as the Plan, which
    /// is structurally prohibited (the whole point is independence).
    pub signer_independent_of_invoker: bool,
}

/// The Merkle scope proof — the "Where" factor.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MerkleScopeProof {
    /// Proof verifies against the tenant's resource-inventory root.
    pub inclusion_proof_valid: bool,
    /// Age of the Merkle proof in seconds. Must be < 3600 (1 hour)
    /// per v1.6 §2.3 — stale proofs are refused.
    pub age_seconds: u64,
    /// The tenant this proof is scoped to. Must match the
    /// SAT.target_tenant_id (checked externally, not in this struct).
    pub tenant_id: u64,
}

/// The full CIA Tri-Factor bundle. Compose once per invocation; pass
/// to `validate_cia_tri_factor()` as the gate before any high-risk
/// dispatch proceeds.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CiaTriFactor {
    pub plan: SignedPlan,
    pub intent_token: IntentToken,
    pub scope_proof: MerkleScopeProof,
}

/// Dedicated denial categories for CIA failures. Surfaced as
/// Denial::CiaRequired in the top-level validator; these sub-types
/// let the audit layer attribute WHICH conjunct failed.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CiaFailure {
    PlanSignatureInvalid,
    IntentTokenSignatureInvalid,
    IntentTokenBlessesWrongPlan,
    IntentTokenSignerNotIndependent,
    ScopeProofInvalid,
    ScopeProofStale,
}

impl CiaFailure {
    pub fn as_denial(&self) -> Denial<'static> {
        // All CIA failures collapse to Denial::CiaRequired at the top
        // layer. The specific CiaFailure reason is recorded in the
        // audit entry separately. 'static because the returned Denial
        // carries no borrowed data.
        Denial::CiaRequired
    }
}

/// Validate a CIA Tri-Factor. Returns Ok iff the mathematical
/// intersection holds across all three conjuncts. Any single
/// failing conjunct produces Err with the specific failure mode
/// for audit attribution.
///
/// This is ONE of the five formally verified kernel components
/// (v1.6 §5). Kani harnesses in src/kani_harnesses.rs prove each
/// conjunct is individually load-bearing (removing any one
/// changes the result).
pub fn validate_cia_tri_factor(cia: &CiaTriFactor) -> Result<(), CiaFailure> {
    // ── Factor 1: the What ─────────────────────────────────────────
    if !cia.plan.signature_valid {
        return Err(CiaFailure::PlanSignatureInvalid);
    }

    // ── Factor 2: the Why ──────────────────────────────────────────
    if !cia.intent_token.signature_valid {
        return Err(CiaFailure::IntentTokenSignatureInvalid);
    }
    if cia.intent_token.references_plan_hash_tag != cia.plan.plan_hash_tag {
        return Err(CiaFailure::IntentTokenBlessesWrongPlan);
    }
    if !cia.intent_token.signer_independent_of_invoker {
        return Err(CiaFailure::IntentTokenSignerNotIndependent);
    }

    // ── Factor 3: the Where ────────────────────────────────────────
    if !cia.scope_proof.inclusion_proof_valid {
        return Err(CiaFailure::ScopeProofInvalid);
    }
    if cia.scope_proof.age_seconds >= 3600 {
        return Err(CiaFailure::ScopeProofStale);
    }

    // All three conjuncts hold — the intersection exists.
    Ok(())
}

// ─── Runtime tests ────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn valid_tri_factor() -> CiaTriFactor {
        CiaTriFactor {
            plan: SignedPlan {
                signature_valid: true,
                plan_hash_tag: 0x1234_abcd,
            },
            intent_token: IntentToken {
                signature_valid: true,
                references_plan_hash_tag: 0x1234_abcd,
                signer_independent_of_invoker: true,
            },
            scope_proof: MerkleScopeProof {
                inclusion_proof_valid: true,
                age_seconds: 100,
                tenant_id: 42,
            },
        }
    }

    #[test]
    fn valid_tri_factor_passes() {
        assert!(validate_cia_tri_factor(&valid_tri_factor()).is_ok());
    }

    #[test]
    fn invalid_plan_signature_refused() {
        let mut c = valid_tri_factor();
        c.plan.signature_valid = false;
        assert_eq!(
            validate_cia_tri_factor(&c),
            Err(CiaFailure::PlanSignatureInvalid)
        );
    }

    #[test]
    fn wrong_plan_hash_refused() {
        let mut c = valid_tri_factor();
        c.intent_token.references_plan_hash_tag = 0xdead_beef;
        assert_eq!(
            validate_cia_tri_factor(&c),
            Err(CiaFailure::IntentTokenBlessesWrongPlan)
        );
    }

    #[test]
    fn non_independent_signer_refused() {
        let mut c = valid_tri_factor();
        c.intent_token.signer_independent_of_invoker = false;
        assert_eq!(
            validate_cia_tri_factor(&c),
            Err(CiaFailure::IntentTokenSignerNotIndependent)
        );
    }

    #[test]
    fn stale_merkle_refused() {
        let mut c = valid_tri_factor();
        c.scope_proof.age_seconds = 3600;  // exactly at boundary
        assert_eq!(
            validate_cia_tri_factor(&c),
            Err(CiaFailure::ScopeProofStale)
        );
        c.scope_proof.age_seconds = 3599;  // just under
        assert!(validate_cia_tri_factor(&c).is_ok());
    }
}
