//! GENERATED from chicken-hawk\config\shield\squads\gold_platinum.yml
//! DO NOT EDIT — regenerate via `python scripts/compile-shield-policy.py`
//! Content hash: d1da8f7412a0

use crate::types::{ReasoningPath, DataClass, Persona};

pub const GOLD_PLATINUM_PROHIBITED_TOOL_CALLS: &[&str] = &[
    "operate.without_halo_cosign",
    "sat.accept_from_crypt_ang",
    "trust.unattested_component",
];

pub const GOLD_PLATINUM_PROHIBITED_REASONING: &[ReasoningPath] = &[
    ReasoningPath::CryptAngSatAcceptance,
    ReasoningPath::TrustWithoutAttestation,
];

pub const GOLD_PLATINUM_PROHIBITED_TARGETS: &[&str] = &[
];

pub const GOLD_PLATINUM_PROHIBITED_TARGET_PREFIXES: &[&str] = &[
];

pub const GOLD_PLATINUM_PROHIBITED_DATA_CLASSES: &[DataClass] = &[
];

pub const GOLD_PLATINUM_PROHIBITED_COMMANDERS: &[Persona] = &[
    Persona::CryptAng,
];

