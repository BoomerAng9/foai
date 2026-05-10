//! GENERATED from chicken-hawk\config\shield\squads\blue.yml
//! DO NOT EDIT — regenerate via `python scripts/compile-shield-policy.py`
//! Content hash: fc4e7493a39b

use crate::types::{ReasoningPath, DataClass, Persona};

pub const BLUE_PROHIBITED_TOOL_CALLS: &[&str] = &[
    "detection.suppress_alert_without_closure",
    "response.delay_containment_for_observation",
];

pub const BLUE_PROHIBITED_REASONING: &[ReasoningPath] = &[
    ReasoningPath::DetectionPriorityOverIsolation,
];

pub const BLUE_PROHIBITED_TARGETS: &[&str] = &[
];

pub const BLUE_PROHIBITED_TARGET_PREFIXES: &[&str] = &[
];

pub const BLUE_PROHIBITED_DATA_CLASSES: &[DataClass] = &[
];

pub const BLUE_PROHIBITED_COMMANDERS: &[Persona] = &[
];

