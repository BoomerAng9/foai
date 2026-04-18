//! GENERATED from chicken-hawk\config\shield\squads\purple.yml
//! DO NOT EDIT — regenerate via `python scripts/compile-shield-policy.py`
//! Content hash: cb44f5eb2171

use crate::types::{ReasoningPath, DataClass, Persona};

pub const PURPLE_PROHIBITED_TOOL_CALLS: &[&str] = &[
    "bridge.cross_tenant_data_transit",
    "bridge.non_verified_api",
];

pub const PURPLE_PROHIBITED_REASONING: &[ReasoningPath] = &[
    ReasoningPath::CrossSquadDataLeakage,
];

pub const PURPLE_PROHIBITED_TARGETS: &[&str] = &[
    "/tenants/*/bridge_buffer/**",
];

pub const PURPLE_PROHIBITED_DATA_CLASSES: &[DataClass] = &[
    DataClass::CrossTenantIdentifier,
];

pub const PURPLE_PROHIBITED_COMMANDERS: &[Persona] = &[
];

