//! GENERATED from chicken-hawk\config\shield\hawks\Lil_Peel_Hawk.yml
//! DO NOT EDIT — regenerate via `python scripts/compile-shield-policy.py`
//! Content hash: a8bbba9ceb7b

use crate::types::{ReasoningPath, DataClass, Persona};

pub const LIL_PEEL_HAWK_PROHIBITED_TOOL_CALLS: &[&str] = &[
    "build.release_without_kani_green",
    "build.release_without_prusti_green",
    "build.skip_cross_substrate_reproducibility_check",
    "verify.modify_verified_code_without_reverify",
    "verify.weaken_property_to_discharge",
];

pub const LIL_PEEL_HAWK_PROHIBITED_REASONING: &[ReasoningPath] = &[
    ReasoningPath::PartialVerificationAcceptable,
    ReasoningPath::TrustTestsOverProof,
];

pub const LIL_PEEL_HAWK_PROHIBITED_TARGETS: &[&str] = &[
    "/kernel/**",
];

pub const LIL_PEEL_HAWK_PROHIBITED_TARGET_PREFIXES: &[&str] = &[
    "/kernel/",
];

pub const LIL_PEEL_HAWK_PROHIBITED_DATA_CLASSES: &[DataClass] = &[
];

pub const LIL_PEEL_HAWK_PROHIBITED_COMMANDERS: &[Persona] = &[
];

