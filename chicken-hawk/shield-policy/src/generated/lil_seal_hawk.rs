//! GENERATED from chicken-hawk\config\shield\hawks\Lil_Seal_Hawk.yml
//! DO NOT EDIT — regenerate via `python scripts/compile-shield-policy.py`
//! Content hash: 749516ec8ebe

use crate::types::{ReasoningPath, DataClass, Persona};

pub const LIL_SEAL_HAWK_PROHIBITED_TOOL_CALLS: &[&str] = &[
    "redaction.emit_unredacted_above_tenant_edge",
    "redaction.share_identifier_across_tenant",
    "unseal.raw_without_controller_approval",
];

pub const LIL_SEAL_HAWK_PROHIBITED_REASONING: &[ReasoningPath] = &[
    ReasoningPath::AcceptablePiiLeakForUtility,
];

pub const LIL_SEAL_HAWK_PROHIBITED_TARGETS: &[&str] = &[
    "/tenants/*/raw_ingest/**",
];

pub const LIL_SEAL_HAWK_PROHIBITED_TARGET_PREFIXES: &[&str] = &[
];
// complex (hand-written): "/tenants/*/raw_ingest/**"

pub const LIL_SEAL_HAWK_PROHIBITED_DATA_CLASSES: &[DataClass] = &[
    DataClass::UnredactedPhi,
    DataClass::UnredactedPii,
];

pub const LIL_SEAL_HAWK_PROHIBITED_COMMANDERS: &[Persona] = &[
];

