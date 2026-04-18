//! GENERATED from chicken-hawk\config\shield\hawks\Lil_Scope_Hawk.yml
//! DO NOT EDIT — regenerate via `python scripts/compile-shield-policy.py`
//! Content hash: 505e05d2aae4

use crate::types::{ReasoningPath, DataClass, Persona};

pub const LIL_SCOPE_HAWK_PROHIBITED_TOOL_CALLS: &[&str] = &[
    "ai_ml.model_extraction_on_production_weights",
    "ai_ml.prompt_injection_target_acheevy",
    "ai_ml.prompt_injection_target_crypt_ang",
];

pub const LIL_SCOPE_HAWK_PROHIBITED_REASONING: &[ReasoningPath] = &[
    ReasoningPath::RealExfilJustifiedByProofValue,
];

pub const LIL_SCOPE_HAWK_PROHIBITED_TARGETS: &[&str] = &[
    "/personas/ACHEEVY/**",
    "/personas/Crypt_Ang/**",
];

pub const LIL_SCOPE_HAWK_PROHIBITED_DATA_CLASSES: &[DataClass] = &[
];

pub const LIL_SCOPE_HAWK_PROHIBITED_COMMANDERS: &[Persona] = &[
];

