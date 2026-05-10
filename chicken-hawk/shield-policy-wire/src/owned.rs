//! Wire → kernel conversion via an owned intermediate.
//!
//! The kernel's `Invocation<'a>` borrows its variable-length fields
//! (strings, slice data). Wire deserialization produces owned `String`
//! and `Vec<i32>` values. This module bridges the two: `OwnedInvocation`
//! owns the backing memory; `.as_borrowed()` returns an
//! `Invocation<'_>` that borrows into it.
//!
//! Typical sidecar flow:
//!
//! ```no_run
//! use prost::Message;
//! use shield_policy_wire::{generated as w, owned::OwnedInvocation};
//!
//! # fn example(bytes: &[u8]) -> Result<(), Box<dyn std::error::Error>> {
//! let wire = w::Invocation::decode(bytes)?;
//! let owned = OwnedInvocation::try_from_wire(&wire)?;
//! let inv = owned.as_borrowed();
//! let result = shield_policy::validate(&inv);
//! # Ok(()) }
//! ```
//!
//! Unspecified enum values in required fields produce
//! [`WireConversionError`] rather than silently succeeding with a
//! default — decoding an `Unspecified` Hawk or RiskLevel signals either
//! a malformed sender or a schema mismatch, both of which should fail
//! loudly.

use shield_policy::types as k;
use thiserror::Error;

use crate::generated as w;

#[derive(Debug, Clone, Error, PartialEq, Eq)]
pub enum WireConversionError {
    #[error("Invocation.hawk is Unspecified or unknown ordinal: {0}")]
    UnspecifiedHawk(i32),
    #[error("Invocation.risk is Unspecified or unknown ordinal: {0}")]
    UnspecifiedRisk(i32),
    #[error("Invocation.tool_class is Unspecified or unknown ordinal: {0}")]
    UnspecifiedToolClass(i32),
    #[error("Invocation.commander missing")]
    MissingCommander,
    #[error("Invocation.slct missing")]
    MissingSlct,
    #[error("Invocation.data_classes[{index}] is Unspecified or unknown ordinal: {value}")]
    UnspecifiedDataClass { index: usize, value: i32 },
    #[error("Invocation.reasoning_paths[{index}] is Unspecified or unknown ordinal: {value}")]
    UnspecifiedReasoningPath { index: usize, value: i32 },
    #[error("Persona kind oneof is missing")]
    MissingPersonaKind,
    #[error("Persona.flat is Unspecified or unknown ordinal: {0}")]
    UnspecifiedFlatPersona(i32),
    #[error("Persona.hawk is Unspecified or unknown ordinal: {0}")]
    UnspecifiedPersonaHawk(i32),
    #[error("Sat.has_co_signer=true but co_signer enum is Unspecified or unknown ordinal: {0}")]
    UnspecifiedCoSigner(i32),
}

/// Owns the variable-length backing for an `Invocation<'_>` borrowed view.
#[derive(Debug, Clone)]
pub struct OwnedInvocation {
    pub hawk: k::Hawk,
    pub tool_id: String,
    pub tool_class: k::ToolClass,
    pub risk: k::RiskLevel,
    pub commander: k::Persona,
    pub target_namespace: String,
    pub data_classes: Vec<k::DataClass>,
    pub reasoning_paths: Vec<k::ReasoningPath>,
    pub slct: k::Slct,
    pub sat: Option<k::Sat>,
    pub cia: Option<k::CiaProof>,
    pub payload: Option<k::Payload>,
    pub crosses_tenant: bool,
    pub threat_confirmed: bool,
    pub action_is_containment: bool,
    pub privacy_budget_violated: bool,
    pub guardrail_violated: bool,
}

impl OwnedInvocation {
    pub fn try_from_wire(wire: &w::Invocation) -> Result<Self, WireConversionError> {
        let hawk = hawk_from_wire(wire.hawk)?;
        let risk = risk_from_wire(wire.risk)?;
        let tool_class = tool_class_from_wire(wire.tool_class)?;
        let commander = persona_from_wire(
            wire.commander.as_ref().ok_or(WireConversionError::MissingCommander)?,
        )?;

        let mut data_classes = Vec::with_capacity(wire.data_classes.len());
        for (i, v) in wire.data_classes.iter().enumerate() {
            data_classes.push(data_class_from_wire(*v).ok_or(
                WireConversionError::UnspecifiedDataClass { index: i, value: *v },
            )?);
        }

        let mut reasoning_paths = Vec::with_capacity(wire.reasoning_paths.len());
        for (i, v) in wire.reasoning_paths.iter().enumerate() {
            reasoning_paths.push(reasoning_path_from_wire(*v).ok_or(
                WireConversionError::UnspecifiedReasoningPath { index: i, value: *v },
            )?);
        }

        let slct_wire = wire.slct.as_ref().ok_or(WireConversionError::MissingSlct)?;
        let slct = k::Slct {
            issued_at_unix: slct_wire.issued_at_unix,
            expires_at_unix: slct_wire.expires_at_unix,
            is_live: slct_wire.is_live,
        };

        let sat = if wire.has_sat {
            wire.sat.as_ref().map(sat_from_wire).transpose()?
        } else {
            None
        };

        let cia = if wire.has_cia {
            wire.cia.as_ref().map(|c| k::CiaProof {
                plan_signed: c.plan_signed,
                intent_token_present: c.intent_token_present,
                intent_token_plan_hash_matches: c.intent_token_plan_hash_matches,
                merkle_scope_proof_valid: c.merkle_scope_proof_valid,
                merkle_proof_age_seconds: c.merkle_proof_age_seconds,
            })
        } else {
            None
        };

        let payload = if wire.has_payload {
            wire.payload.as_ref().map(|p| k::Payload {
                redaction_applied: p.redaction_applied,
                is_zkp: p.is_zkp,
            })
        } else {
            None
        };

        Ok(Self {
            hawk,
            tool_id: wire.tool_id.clone(),
            tool_class,
            risk,
            commander,
            target_namespace: wire.target_namespace.clone(),
            data_classes,
            reasoning_paths,
            slct,
            sat,
            cia,
            payload,
            crosses_tenant: wire.crosses_tenant,
            threat_confirmed: wire.threat_confirmed,
            action_is_containment: wire.action_is_containment,
            privacy_budget_violated: wire.privacy_budget_violated,
            guardrail_violated: wire.guardrail_violated,
        })
    }

    /// Borrow an `Invocation<'_>` view backed by self.
    ///
    /// The returned value borrows from self; it cannot outlive the
    /// `OwnedInvocation`. The kernel's `validate()` accepts any
    /// `Invocation<'a>`, so this view is directly dispatchable.
    pub fn as_borrowed(&self) -> k::Invocation<'_> {
        k::Invocation {
            hawk: self.hawk,
            tool_id: &self.tool_id,
            tool_class: self.tool_class,
            risk: self.risk,
            commander: self.commander,
            target_namespace: &self.target_namespace,
            data_classes: &self.data_classes,
            reasoning_paths: &self.reasoning_paths,
            slct: self.slct,
            sat: self.sat,
            cia: self.cia,
            payload: self.payload,
            crosses_tenant: self.crosses_tenant,
            threat_confirmed: self.threat_confirmed,
            action_is_containment: self.action_is_containment,
            privacy_budget_violated: self.privacy_budget_violated,
            guardrail_violated: self.guardrail_violated,
        }
    }
}

// ─────────────────────────────────────────────────────────────────────
// Enum conversions — ordinal → kernel. Unspecified / unknown returns
// None so callers can attribute the error site.
// ─────────────────────────────────────────────────────────────────────

fn hawk_from_wire(ord: i32) -> Result<k::Hawk, WireConversionError> {
    use k::Hawk::*;
    let hawk = match ord {
        1 => LilHookHawk, 2 => LilReconHawk, 3 => LilTagHawk, 4 => LilScopeHawk,
        5 => LilSiteHawk, 6 => LilTestHawk,
        7 => LilWatchHawk, 8 => LilWireHawk, 9 => LilTrackHawk, 10 => LilPatchHawk,
        11 => LilLabHawk, 12 => LilPulseHawk,
        13 => LilArcHawk, 14 => LilMimeHawk, 15 => LilChordHawk, 16 => LilLoopHawk,
        17 => LilScriptHawk, 18 => LilVaneHawk, 19 => LilGridHawk, 20 => LilLockHawk,
        21 => LilBookHawk, 22 => LilTellHawk, 23 => LilPlayHawk, 24 => LilSealHawk,
        25 => LilMastHawk, 26 => LilOmenHawk, 27 => LilSaltHawk, 28 => LilDriftHawk,
        29 => LilBellHawk, 30 => LilVeilHawk, 31 => LilPeelHawk, 32 => LilDoubtHawk,
        _ => return Err(WireConversionError::UnspecifiedHawk(ord)),
    };
    Ok(hawk)
}

fn risk_from_wire(ord: i32) -> Result<k::RiskLevel, WireConversionError> {
    match ord {
        1 => Ok(k::RiskLevel::Low),
        2 => Ok(k::RiskLevel::Medium),
        3 => Ok(k::RiskLevel::High),
        _ => Err(WireConversionError::UnspecifiedRisk(ord)),
    }
}

fn tool_class_from_wire(ord: i32) -> Result<k::ToolClass, WireConversionError> {
    use k::ToolClass::*;
    let tc = match ord {
        1 => Unknown,
        2 => AiMlTest,
        3 => Emit,
        4 => CrossTenantSignal,
        5 => Enforce,
        6 => Execute,
        7 => RealExfil,
        8 => SimulatedCapture,
        9 => CoSign,
        10 => Redact,
        _ => return Err(WireConversionError::UnspecifiedToolClass(ord)),
    };
    Ok(tc)
}

fn data_class_from_wire(ord: i32) -> Option<k::DataClass> {
    use k::DataClass::*;
    Some(match ord {
        1 => UnredactedPii,
        2 => UnredactedPhi,
        3 => TenantSecret,
        4 => RootKeyMaterial,
        5 => CanarySat,
        6 => CrossTenantIdentifier,
        _ => return None,
    })
}

fn reasoning_path_from_wire(ord: i32) -> Option<k::ReasoningPath> {
    use k::ReasoningPath::*;
    Some(match ord {
        1 => BypassCia,
        2 => BypassSlct,
        3 => BypassPrivacyBudget,
        4 => DowngradeConsensus,
        5 => StaleMerkleAccept,
        6 => ScopeCreepFromSat,
        7 => DetectionPriorityOverIsolation,
        8 => CrossSquadDataLeakage,
        9 => BudgetViolationOverride,
        10 => GuardrailViolationOverride,
        11 => TrustWithoutAttestation,
        12 => CryptAngSatAcceptance,
        13 => CosignByPolicyNotVerification,
        14 => RealExfilJustifiedByProofValue,
        15 => AcceptablePiiLeakForUtility,
        16 => TrustTestsOverProof,
        17 => PartialVerificationAcceptable,
        18 => DeferToCryptAngOnAuditConflict,
        19 => ExcludeCryptAngFromSimulationScope,
        _ => return None,
    })
}

fn persona_from_wire(p: &w::Persona) -> Result<k::Persona, WireConversionError> {
    let kind = p.kind.as_ref().ok_or(WireConversionError::MissingPersonaKind)?;
    match kind {
        w::persona::Kind::Flat(ord) => match ord {
            1 => Ok(k::Persona::Acheevy),
            2 => Ok(k::Persona::CryptAng),
            3 => Ok(k::Persona::PlatformOwner),
            4 => Ok(k::Persona::PmoShieldLead),
            5 => Ok(k::Persona::TenantAdmin),
            _ => Err(WireConversionError::UnspecifiedFlatPersona(*ord)),
        },
        w::persona::Kind::Hawk(ord) => hawk_from_wire(*ord)
            .map(k::Persona::Hawk)
            .map_err(|_| WireConversionError::UnspecifiedPersonaHawk(*ord)),
    }
}

fn sat_from_wire(s: &w::Sat) -> Result<k::Sat, WireConversionError> {
    let issuer = persona_from_wire(
        s.issuer.as_ref().ok_or(WireConversionError::MissingPersonaKind)?,
    )?;
    let target_tenant_id = if s.has_target_tenant_id {
        Some(s.target_tenant_id)
    } else {
        None
    };
    let co_signer = if s.has_co_signer {
        Some(hawk_from_wire(s.co_signer).map_err(|_| {
            WireConversionError::UnspecifiedCoSigner(s.co_signer)
        })?)
    } else {
        None
    };
    Ok(k::Sat {
        issuer,
        target_tenant_id,
        valid: s.valid,
        co_signer,
    })
}
