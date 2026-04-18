//! GENERATED from chicken-hawk\config\shield\squads\black.yml
//! DO NOT EDIT — regenerate via `python scripts/compile-shield-policy.py`
//! Content hash: e1b26b49949a

use crate::types::{ReasoningPath, DataClass, Persona};

pub const BLACK_PROHIBITED_TOOL_CALLS: &[&str] = &[
    "exfil.real_data_egress",
    "kinetic.execute_without_sat",
    "kinetic.execute_without_target_tenant",
    "persistence.install_beyond_mission_ttl",
];

pub const BLACK_PROHIBITED_REASONING: &[ReasoningPath] = &[
    ReasoningPath::ScopeCreepFromSat,
];

pub const BLACK_PROHIBITED_TARGETS: &[&str] = &[
    "/production/**/live_customers/**",
    "/tenants/*/gold_platinum_infra/**",
];

pub const BLACK_PROHIBITED_DATA_CLASSES: &[DataClass] = &[
];

pub const BLACK_PROHIBITED_COMMANDERS: &[Persona] = &[
];

