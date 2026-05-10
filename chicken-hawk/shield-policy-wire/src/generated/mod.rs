// Prost-annotated Rust types for deploy.spinner.shield.v1.
//
// This module mirrors runtime/spinner/schema/invocation.proto byte-for-byte
// at the wire level. The field tag numbers, enum ordinals, and oneof
// discriminants MUST match the .proto file exactly — the canonical source
// of truth is the .proto, and divergence here is a cross-language wire
// break.
//
// Regeneration (when invocation.proto changes):
//   See ../../regenerate.sh. Developer runs locally on a Linux/macOS host
//   with protoc installed; commits the output. Cloud Build never runs
//   protoc — it only compiles the committed file.

use prost::{Enumeration, Message};

// ─────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────

/// All 32 Shield Division Hawks. Ordinals match the .proto.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Enumeration)]
#[repr(i32)]
pub enum Hawk {
    Unspecified = 0,
    LilHookHawk = 1,
    LilReconHawk = 2,
    LilTagHawk = 3,
    LilScopeHawk = 4,
    LilSiteHawk = 5,
    LilTestHawk = 6,
    LilWatchHawk = 7,
    LilWireHawk = 8,
    LilTrackHawk = 9,
    LilPatchHawk = 10,
    LilLabHawk = 11,
    LilPulseHawk = 12,
    LilArcHawk = 13,
    LilMimeHawk = 14,
    LilChordHawk = 15,
    LilLoopHawk = 16,
    LilScriptHawk = 17,
    LilVaneHawk = 18,
    LilGridHawk = 19,
    LilLockHawk = 20,
    LilBookHawk = 21,
    LilTellHawk = 22,
    LilPlayHawk = 23,
    LilSealHawk = 24,
    LilMastHawk = 25,
    LilOmenHawk = 26,
    LilSaltHawk = 27,
    LilDriftHawk = 28,
    LilBellHawk = 29,
    LilVeilHawk = 30,
    LilPeelHawk = 31,
    LilDoubtHawk = 32,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Enumeration)]
#[repr(i32)]
pub enum RiskLevel {
    Unspecified = 0,
    Low = 1,
    Medium = 2,
    High = 3,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Enumeration)]
#[repr(i32)]
pub enum ReasoningPath {
    Unspecified = 0,
    BypassCia = 1,
    BypassSlct = 2,
    BypassPrivacyBudget = 3,
    DowngradeConsensus = 4,
    StaleMerkleAccept = 5,
    ScopeCreepFromSat = 6,
    DetectionPriorityOverIsolation = 7,
    CrossSquadDataLeakage = 8,
    BudgetViolationOverride = 9,
    GuardrailViolationOverride = 10,
    TrustWithoutAttestation = 11,
    CryptAngSatAcceptance = 12,
    CosignByPolicyNotVerification = 13,
    RealExfilJustifiedByProofValue = 14,
    AcceptablePiiLeakForUtility = 15,
    TrustTestsOverProof = 16,
    PartialVerificationAcceptable = 17,
    DeferToCryptAngOnAuditConflict = 18,
    ExcludeCryptAngFromSimulationScope = 19,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Enumeration)]
#[repr(i32)]
pub enum DataClass {
    Unspecified = 0,
    UnredactedPii = 1,
    UnredactedPhi = 2,
    TenantSecret = 3,
    RootKeyMaterial = 4,
    CanarySat = 5,
    CrossTenantIdentifier = 6,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Enumeration)]
#[repr(i32)]
pub enum ToolClass {
    Unspecified = 0,
    Unknown = 1,
    AiMlTest = 2,
    Emit = 3,
    CrossTenantSignal = 4,
    Enforce = 5,
    Execute = 6,
    RealExfil = 7,
    SimulatedCapture = 8,
    CoSign = 9,
    Redact = 10,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Enumeration)]
#[repr(i32)]
pub enum Substrate {
    Unspecified = 0,
    X8664Linux = 1,
    Arm64Darwin = 2,
    Wasm32 = 3,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Enumeration)]
#[repr(i32)]
pub enum FlatPersona {
    Unspecified = 0,
    Acheevy = 1,
    CryptAng = 2,
    PlatformOwner = 3,
    PmoShieldLead = 4,
    TenantAdmin = 5,
}

// ─────────────────────────────────────────────────────────────────────
// Persona — oneof Hawk or flat
// ─────────────────────────────────────────────────────────────────────

#[derive(Clone, PartialEq, Message)]
pub struct Persona {
    #[prost(oneof = "persona::Kind", tags = "1, 2")]
    pub kind: ::core::option::Option<persona::Kind>,
}

pub mod persona {
    #[derive(Clone, Copy, PartialEq, ::prost::Oneof)]
    pub enum Kind {
        #[prost(enumeration = "super::FlatPersona", tag = "1")]
        Flat(i32),
        #[prost(enumeration = "super::Hawk", tag = "2")]
        Hawk(i32),
    }
}

// ─────────────────────────────────────────────────────────────────────
// Supporting records
// ─────────────────────────────────────────────────────────────────────

#[derive(Clone, PartialEq, Message)]
pub struct Slct {
    #[prost(uint64, tag = "1")]
    pub issued_at_unix: u64,
    #[prost(uint64, tag = "2")]
    pub expires_at_unix: u64,
    #[prost(bool, tag = "3")]
    pub is_live: bool,
}

#[derive(Clone, PartialEq, Message)]
pub struct Sat {
    #[prost(message, optional, tag = "1")]
    pub issuer: ::core::option::Option<Persona>,
    #[prost(bool, tag = "2")]
    pub has_target_tenant_id: bool,
    #[prost(uint64, tag = "3")]
    pub target_tenant_id: u64,
    #[prost(bool, tag = "4")]
    pub valid: bool,
    #[prost(bool, tag = "5")]
    pub has_co_signer: bool,
    #[prost(enumeration = "Hawk", tag = "6")]
    pub co_signer: i32,
}

#[derive(Clone, PartialEq, Message)]
pub struct CiaProof {
    #[prost(bool, tag = "1")]
    pub plan_signed: bool,
    #[prost(bool, tag = "2")]
    pub intent_token_present: bool,
    #[prost(bool, tag = "3")]
    pub intent_token_plan_hash_matches: bool,
    #[prost(bool, tag = "4")]
    pub merkle_scope_proof_valid: bool,
    #[prost(uint64, tag = "5")]
    pub merkle_proof_age_seconds: u64,
}

#[derive(Clone, PartialEq, Message)]
pub struct Payload {
    #[prost(bool, tag = "1")]
    pub redaction_applied: bool,
    #[prost(bool, tag = "2")]
    pub is_zkp: bool,
}

// ─────────────────────────────────────────────────────────────────────
// Invocation
// ─────────────────────────────────────────────────────────────────────

#[derive(Clone, PartialEq, Message)]
pub struct Invocation {
    #[prost(enumeration = "Hawk", tag = "1")]
    pub hawk: i32,
    #[prost(string, tag = "2")]
    pub tool_id: ::prost::alloc::string::String,
    #[prost(enumeration = "ToolClass", tag = "3")]
    pub tool_class: i32,
    #[prost(enumeration = "RiskLevel", tag = "4")]
    pub risk: i32,
    #[prost(message, optional, tag = "5")]
    pub commander: ::core::option::Option<Persona>,
    #[prost(string, tag = "6")]
    pub target_namespace: ::prost::alloc::string::String,
    #[prost(enumeration = "DataClass", repeated, packed = "true", tag = "7")]
    pub data_classes: ::prost::alloc::vec::Vec<i32>,
    #[prost(enumeration = "ReasoningPath", repeated, packed = "true", tag = "8")]
    pub reasoning_paths: ::prost::alloc::vec::Vec<i32>,
    #[prost(message, optional, tag = "9")]
    pub slct: ::core::option::Option<Slct>,
    #[prost(bool, tag = "10")]
    pub has_sat: bool,
    #[prost(message, optional, tag = "11")]
    pub sat: ::core::option::Option<Sat>,
    #[prost(bool, tag = "12")]
    pub has_cia: bool,
    #[prost(message, optional, tag = "13")]
    pub cia: ::core::option::Option<CiaProof>,
    #[prost(bool, tag = "14")]
    pub has_payload: bool,
    #[prost(message, optional, tag = "15")]
    pub payload: ::core::option::Option<Payload>,
    #[prost(bool, tag = "16")]
    pub crosses_tenant: bool,
    #[prost(bool, tag = "17")]
    pub threat_confirmed: bool,
    #[prost(bool, tag = "18")]
    pub action_is_containment: bool,
    #[prost(bool, tag = "19")]
    pub privacy_budget_violated: bool,
    #[prost(bool, tag = "20")]
    pub guardrail_violated: bool,
}

// ─────────────────────────────────────────────────────────────────────
// Denial — oneof of 14 variants
// ─────────────────────────────────────────────────────────────────────

#[derive(Clone, PartialEq, Message)]
pub struct DenialUnit {}

#[derive(Clone, PartialEq, Message)]
pub struct ProhibitedToolCall {
    #[prost(string, tag = "1")]
    pub tool_id: ::prost::alloc::string::String,
}

#[derive(Clone, PartialEq, Message)]
pub struct ProhibitedReasoningPath {
    #[prost(enumeration = "ReasoningPath", tag = "1")]
    pub reasoning_path: i32,
}

#[derive(Clone, PartialEq, Message)]
pub struct ProhibitedTarget {
    #[prost(string, tag = "1")]
    pub target_namespace: ::prost::alloc::string::String,
}

#[derive(Clone, PartialEq, Message)]
pub struct ProhibitedDataClass {
    #[prost(enumeration = "DataClass", tag = "1")]
    pub data_class: i32,
}

#[derive(Clone, PartialEq, Message)]
pub struct ProhibitedCommander {
    #[prost(message, optional, tag = "1")]
    pub commander: ::core::option::Option<Persona>,
}

#[derive(Clone, PartialEq, Message)]
pub struct Denial {
    #[prost(oneof = "denial::Reason", tags = "1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14")]
    pub reason: ::core::option::Option<denial::Reason>,
}

pub mod denial {
    #[derive(Clone, PartialEq, ::prost::Oneof)]
    pub enum Reason {
        #[prost(message, tag = "1")]
        ProhibitedToolCall(super::ProhibitedToolCall),
        #[prost(message, tag = "2")]
        ProhibitedReasoningPath(super::ProhibitedReasoningPath),
        #[prost(message, tag = "3")]
        ProhibitedTarget(super::ProhibitedTarget),
        #[prost(message, tag = "4")]
        ProhibitedDataClass(super::ProhibitedDataClass),
        #[prost(message, tag = "5")]
        ProhibitedCommander(super::ProhibitedCommander),
        #[prost(message, tag = "6")]
        SlctNotLive(super::DenialUnit),
        #[prost(message, tag = "7")]
        CiaRequired(super::DenialUnit),
        #[prost(message, tag = "8")]
        SatRequired(super::DenialUnit),
        #[prost(message, tag = "9")]
        CosignRequired(super::DenialUnit),
        #[prost(message, tag = "10")]
        CryptAngBarredFromGoldSat(super::DenialUnit),
        #[prost(message, tag = "11")]
        MerkleStale(super::DenialUnit),
        #[prost(message, tag = "12")]
        PrivacyBudgetViolation(super::DenialUnit),
        #[prost(message, tag = "13")]
        GuardrailViolation(super::DenialUnit),
        #[prost(message, tag = "14")]
        DetectionOverIsolation(super::DenialUnit),
    }
}

// ─────────────────────────────────────────────────────────────────────
// Decision — oneof Pass or Denial
// ─────────────────────────────────────────────────────────────────────

#[derive(Clone, PartialEq, Message)]
pub struct Pass {}

#[derive(Clone, PartialEq, Message)]
pub struct Decision {
    #[prost(oneof = "decision::Outcome", tags = "1, 2")]
    pub outcome: ::core::option::Option<decision::Outcome>,
}

pub mod decision {
    #[derive(Clone, PartialEq, ::prost::Oneof)]
    pub enum Outcome {
        #[prost(message, tag = "1")]
        Pass(super::Pass),
        #[prost(message, tag = "2")]
        Deny(super::Denial),
    }
}

// ─────────────────────────────────────────────────────────────────────
// AuditEntry — chain-linked tamper-evident record
// ─────────────────────────────────────────────────────────────────────

#[derive(Clone, PartialEq, Message)]
pub struct AuditEntry {
    #[prost(uint64, tag = "1")]
    pub sequence: u64,
    #[prost(bytes = "vec", tag = "2")]
    pub prev_hash: ::prost::alloc::vec::Vec<u8>,
    #[prost(bytes = "vec", tag = "3")]
    pub this_hash: ::prost::alloc::vec::Vec<u8>,
    #[prost(uint64, tag = "4")]
    pub emitted_at_unix_ms: u64,
    #[prost(enumeration = "Substrate", tag = "5")]
    pub substrate: i32,
    #[prost(bytes = "vec", tag = "6")]
    pub build_content_hash: ::prost::alloc::vec::Vec<u8>,
    #[prost(message, optional, tag = "7")]
    pub invocation: ::core::option::Option<Invocation>,
    #[prost(message, optional, tag = "8")]
    pub decision: ::core::option::Option<Decision>,
}
