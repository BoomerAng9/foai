//! Core types for Shield Division policy enforcement.
//!
//! These enums define the structural predicate vocabulary that
//! `SCHEMA.md` requires every prohibition to reduce to. Free-text
//! prohibitions are rejected by the generator.

use thiserror::Error;

/// All 32 Shield Division Hawks as a closed enum. Matches
/// `shield_personas.yml` canonical identifiers.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Hawk {
    // Black Squad (6)
    LilHookHawk, LilReconHawk, LilTagHawk, LilScopeHawk, LilSiteHawk, LilTestHawk,
    // Blue Squad (6)
    LilWatchHawk, LilWireHawk, LilTrackHawk, LilPatchHawk, LilLabHawk, LilPulseHawk,
    // Purple Squad (4)
    LilArcHawk, LilMimeHawk, LilChordHawk, LilLoopHawk,
    // White Squad (8)
    LilScriptHawk, LilVaneHawk, LilGridHawk, LilLockHawk, LilBookHawk, LilTellHawk, LilPlayHawk, LilSealHawk,
    // Gold & Platinum Squad (8)
    LilMastHawk, LilOmenHawk, LilSaltHawk, LilDriftHawk, LilBellHawk, LilVeilHawk, LilPeelHawk, LilDoubtHawk,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Squad {
    Black, Blue, Purple, White, GoldPlatinum,
}

impl Hawk {
    pub fn squad(&self) -> Squad {
        use Hawk::*;
        match self {
            LilHookHawk | LilReconHawk | LilTagHawk | LilScopeHawk | LilSiteHawk | LilTestHawk => Squad::Black,
            LilWatchHawk | LilWireHawk | LilTrackHawk | LilPatchHawk | LilLabHawk | LilPulseHawk => Squad::Blue,
            LilArcHawk | LilMimeHawk | LilChordHawk | LilLoopHawk => Squad::Purple,
            LilScriptHawk | LilVaneHawk | LilGridHawk | LilLockHawk | LilBookHawk | LilTellHawk | LilPlayHawk | LilSealHawk => Squad::White,
            LilMastHawk | LilOmenHawk | LilSaltHawk | LilDriftHawk | LilBellHawk | LilVeilHawk | LilPeelHawk | LilDoubtHawk => Squad::GoldPlatinum,
        }
    }
}

/// Risk level drives consensus depth — see Degradation Spectrum §2.2.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RiskLevel {
    Low,     // 1-instance syntactic in Mode 2
    Medium,  // 2-of-3 syntactic in Mode 2
    High,    // 3-instance full + CIA always
}

/// Tool-call ID — canonical identifiers from the Shield registry.
/// Represented as a string because the full catalog is open-ended; the
/// validator matches against per-profile prohibition lists.
///
/// The `'a` lifetime lets wire-deserialized invocations carry borrowed
/// strings into `validate()` without forcing the Spinner sidecar to
/// leak memory per request. Test harnesses that use string literals
/// get `ToolCallId<'static>` automatically via lifetime promotion.
pub type ToolCallId<'a> = &'a str;

/// Named reasoning-path patterns. This is a CLOSED enum — free-text
/// reasoning patterns are rejected by the YAML compiler (per SCHEMA.md).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReasoningPath {
    BypassCia,
    BypassSlct,
    BypassPrivacyBudget,
    DowngradeConsensus,
    StaleMerkleAccept,
    ScopeCreepFromSat,
    DetectionPriorityOverIsolation,
    CrossSquadDataLeakage,
    BudgetViolationOverride,
    GuardrailViolationOverride,
    TrustWithoutAttestation,
    CryptAngSatAcceptance,
    CosignByPolicyNotVerification,
    RealExfilJustifiedByProofValue,
    AcceptablePiiLeakForUtility,
    TrustTestsOverProof,
    PartialVerificationAcceptable,
    DeferToCryptAngOnAuditConflict,
    ExcludeCryptAngFromSimulationScope,
}

/// Data classes tagged at ingestion by Sparks (`Lil_Wire_Hawk`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DataClass {
    UnredactedPii,
    UnredactedPhi,
    TenantSecret,
    RootKeyMaterial,
    CanarySat,
    CrossTenantIdentifier,
}

/// Structural persona identifier for commander-prohibition checks.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Persona {
    Acheevy,
    CryptAng,
    PlatformOwner,
    PmoShieldLead,
    TenantAdmin,
    Hawk(Hawk),
}

/// Short-Lived Capability Token state — 60-second lifespan.
#[derive(Debug, Clone, Copy)]
pub struct Slct {
    pub issued_at_unix: u64,
    pub expires_at_unix: u64,
    pub is_live: bool,
}

impl Slct {
    pub fn is_live(&self) -> bool { self.is_live }
}

/// Scope Authorization Token — ed25519-signed, required for Black Squad ops.
#[derive(Debug, Clone, Copy)]
pub struct Sat {
    pub issuer: Persona,
    pub target_tenant_id: Option<u64>,
    pub valid: bool,
    pub co_signer: Option<Hawk>, // Mandatory Halo co-sign for Gold ops
}

impl Sat {
    pub fn valid(&self) -> bool { self.valid }
}

/// CIA Tri-Factor Intent — v1.6 §2.3.
#[derive(Debug, Clone, Copy)]
pub struct CiaProof {
    pub plan_signed: bool,
    pub intent_token_present: bool,
    pub intent_token_plan_hash_matches: bool,
    pub merkle_scope_proof_valid: bool,
    pub merkle_proof_age_seconds: u64,
}

impl CiaProof {
    pub fn valid(&self) -> bool {
        self.plan_signed
            && self.intent_token_present
            && self.intent_token_plan_hash_matches
            && self.merkle_scope_proof_valid
            && self.merkle_proof_age_seconds < 3600
    }
}

/// Classification of what KIND of operation a tool_id represents.
/// Used by per-Hawk properties that predicate on operation semantics
/// rather than specific tool_id strings (e.g. "forall AiMlTest actions
/// against ACHEEVY's persona, refuse").
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ToolClass {
    Unknown,
    AiMlTest,
    Emit,
    CrossTenantSignal,
    Enforce,
    Execute,
    RealExfil,
    SimulatedCapture,
    CoSign,
    Redact,
}

/// Payload flags referenced by Privacy's kernel-class properties.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Payload {
    pub redaction_applied: bool,
    pub is_zkp: bool,
}

/// Component with a Golden Image attestation — referenced by
/// Gold & Platinum's trust property (v1.6 §5 Phoenix Protocol).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Component {
    pub golden_image_signature_verified: bool,
}

impl Component {
    /// v1.6 §5 invariant: trusted IFF signature verified.
    pub fn trusted(&self) -> bool {
        self.golden_image_signature_verified
    }
}

/// Kernel build attestation referenced by Hex's release-gate properties.
/// Kani's job is to prove that `release_permitted()` returns true only
/// when ALL conditions hold.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct KernelBuild {
    pub kani_all_green: bool,
    pub prusti_all_green: bool,
    pub substrate_hashes_match: bool,
}

impl KernelBuild {
    /// v1.6 §3.1 / Hex's kani_properties: a kernel build is released
    /// ONLY if all three verification gates pass.
    pub fn release_permitted(&self) -> bool {
        self.kani_all_green && self.prusti_all_green && self.substrate_hashes_match
    }
}

/// A modification to kernel code referenced by Hex's reverify property.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct KernelModification {
    pub reverified: bool,
}

impl KernelModification {
    /// v1.6 Hex: a kernel modification is mergeable IFF reverified.
    pub fn merge_permitted(&self) -> bool {
        self.reverified
    }
}

/// Paranoia's audit-report emission record.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AuditReport {
    pub first_recipient: Persona,
}

impl AuditReport {
    /// v1.6 Paranoia: reports go to ACHEEVY first, always.
    pub fn valid_routing(&self) -> bool {
        self.first_recipient == Persona::Acheevy
    }
}

/// Paranoia's compromise-simulation scope record.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Simulation {
    pub scope_includes_crypt_ang_infra: bool,
    pub scope_is_narrow_approved_exception: bool,
}

impl Simulation {
    /// v1.6 Paranoia: simulations must either include Crypt_Ang infra
    /// (the normal case — the auditor tests the audited) OR be a
    /// narrow pre-approved exception (e.g. a specific carve-out).
    pub fn scope_valid(&self) -> bool {
        self.scope_includes_crypt_ang_infra
            || self.scope_is_narrow_approved_exception
    }
}

/// The full invocation record that the Spinner policy engine passes to
/// `validate()`. Every field is typed — there is no string-over-string
/// escape hatch.
#[derive(Debug, Clone)]
pub struct Invocation<'a> {
    pub hawk: Hawk,
    pub tool_id: ToolCallId<'a>,
    pub tool_class: ToolClass,                  // v0.3 — for class-based predicates
    pub risk: RiskLevel,
    pub commander: Persona,
    pub target_namespace: &'a str, // glob-matched
    pub data_classes: &'a [DataClass], // data touched by this call
    pub reasoning_paths: &'a [ReasoningPath], // patterns the LLM plan matched
    pub slct: Slct,
    pub sat: Option<Sat>,
    pub cia: Option<CiaProof>,
    pub payload: Option<Payload>,               // v0.3 — for Privacy emit/ZKP properties
    pub crosses_tenant: bool,                   // v0.3 — for Purple bridge property
    pub threat_confirmed: bool,
    pub action_is_containment: bool,
    pub privacy_budget_violated: bool,
    pub guardrail_violated: bool,
}

/// Denial categories — emitted by `validate()` on failure. Every
/// denial reason must reduce to one of these structural categories.
///
/// The `'a` lifetime matches the [`Invocation`] passed to `validate()`.
/// Embedded string slices (tool_id, target_namespace) borrow from the
/// invocation so no per-denial allocation is required on the hot path.
#[derive(Debug, Clone, Error, PartialEq, Eq)]
pub enum Denial<'a> {
    #[error("prohibited tool-call: {0}")]
    ProhibitedToolCall(ToolCallId<'a>),

    #[error("prohibited reasoning path: {0:?}")]
    ProhibitedReasoningPath(ReasoningPath),

    #[error("prohibited target namespace: {0}")]
    ProhibitedTarget(&'a str),

    #[error("prohibited data class: {0:?}")]
    ProhibitedDataClass(DataClass),

    #[error("prohibited commander: {0:?}")]
    ProhibitedCommander(Persona),

    #[error("SLCT is not live")]
    SlctNotLive,

    #[error("high-risk action without valid CIA Tri-Factor")]
    CiaRequired,

    #[error("SAT required for this action (Black Squad / enforcement / Gold ops)")]
    SatRequired,

    #[error("Halo co-sign required for Gold & Platinum operation")]
    CoSignRequired,

    #[error("Crypt_Ang SAT issuance is barred for Gold & Platinum")]
    CryptAngBarredFromGoldSat,

    #[error("Merkle proof is stale (>1 hour)")]
    MerkleStale,

    #[error("Privacy Budget violated — operation halts")]
    PrivacyBudgetViolation,

    #[error("Semantic Guardrail violated — operation halts")]
    GuardrailViolation,

    #[error("detection-only action attempted while containment pending")]
    DetectionOverIsolation,
}
