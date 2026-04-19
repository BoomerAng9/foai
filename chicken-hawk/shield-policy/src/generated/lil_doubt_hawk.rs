//! GENERATED from chicken-hawk\config\shield\hawks\Lil_Doubt_Hawk.yml
//! DO NOT EDIT — regenerate via `python scripts/compile-shield-policy.py`
//! Content hash: 6d07ab3a23fe

use crate::types::{ReasoningPath, DataClass, Persona};

pub const LIL_DOUBT_HAWK_PROHIBITED_TOOL_CALLS: &[&str] = &[
    "accept.command_from_crypt_ang",
    "disclose.findings_to_crypt_ang_first",
    "disclose.schedule_to_crypt_ang",
];

pub const LIL_DOUBT_HAWK_PROHIBITED_REASONING: &[ReasoningPath] = &[
    ReasoningPath::DeferToCryptAngOnAuditConflict,
    ReasoningPath::ExcludeCryptAngFromSimulationScope,
];

pub const LIL_DOUBT_HAWK_PROHIBITED_TARGETS: &[&str] = &[
];

pub const LIL_DOUBT_HAWK_PROHIBITED_TARGET_PREFIXES: &[&str] = &[
];

pub const LIL_DOUBT_HAWK_PROHIBITED_DATA_CLASSES: &[DataClass] = &[
];

pub const LIL_DOUBT_HAWK_PROHIBITED_COMMANDERS: &[Persona] = &[
    Persona::CryptAng,
];

