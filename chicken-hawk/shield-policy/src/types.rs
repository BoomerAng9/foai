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
pub type ToolCallId = &'static str;

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

/// The full invocation record that the Spinner policy engine passes to
/// `validate()`. Every field is typed — there is no string-over-string
/// escape hatch.
#[derive(Debug, Clone)]
pub struct Invocation {
    pub hawk: Hawk,
    pub tool_id: ToolCallId,
    pub risk: RiskLevel,
    pub commander: Persona,
    pub target_namespace: &'static str, // glob-matched
    pub data_classes: &'static [DataClass], // data touched by this call
    pub reasoning_paths: &'static [ReasoningPath], // patterns the LLM plan matched
    pub slct: Slct,
    pub sat: Option<Sat>,
    pub cia: Option<CiaProof>,
    pub threat_confirmed: bool,
    pub action_is_containment: bool,
    pub privacy_budget_violated: bool,
    pub guardrail_violated: bool,
}

/// Denial categories — emitted by `validate()` on failure. Every
/// denial reason must reduce to one of these structural categories.
#[derive(Debug, Clone, Error, PartialEq, Eq)]
pub enum Denial {
    #[error("prohibited tool-call: {0}")]
    ProhibitedToolCall(ToolCallId),

    #[error("prohibited reasoning path: {0:?}")]
    ProhibitedReasoningPath(ReasoningPath),

    #[error("prohibited target namespace: {0}")]
    ProhibitedTarget(&'static str),

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
