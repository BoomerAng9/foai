//! GENERATED from chicken-hawk\config\shield\hawks\Lil_Mast_Hawk.yml
//! DO NOT EDIT — regenerate via `python scripts/compile-shield-policy.py`
//! Content hash: 2d3f4592b310

use crate::types::{ReasoningPath, DataClass, Persona};

pub const LIL_MAST_HAWK_PROHIBITED_TOOL_CALLS: &[&str] = &[
    "cosign.accept_invalid_plan_signature",
    "cosign.batch_without_per_plan_verification",
    "cosign.delegate_authority",
    "cosign.self_issued",
];

pub const LIL_MAST_HAWK_PROHIBITED_REASONING: &[ReasoningPath] = &[
    ReasoningPath::CosignByPolicyNotVerification,
];

pub const LIL_MAST_HAWK_PROHIBITED_TARGETS: &[&str] = &[
];

pub const LIL_MAST_HAWK_PROHIBITED_TARGET_PREFIXES: &[&str] = &[
];

pub const LIL_MAST_HAWK_PROHIBITED_DATA_CLASSES: &[DataClass] = &[
];

pub const LIL_MAST_HAWK_PROHIBITED_COMMANDERS: &[Persona] = &[
];

