//! GENERATED from chicken-hawk\config\shield\squads\white.yml
//! DO NOT EDIT — regenerate via `python scripts/compile-shield-policy.py`
//! Content hash: 57b1210ae7cf

use crate::types::{ReasoningPath, DataClass, Persona};

pub const WHITE_PROHIBITED_TOOL_CALLS: &[&str] = &[
    "enforce.without_sat",
    "proceed.under_budget_violation",
    "proceed.under_guardrail_violation",
];

pub const WHITE_PROHIBITED_REASONING: &[ReasoningPath] = &[
    ReasoningPath::BudgetViolationOverride,
    ReasoningPath::GuardrailViolationOverride,
];

pub const WHITE_PROHIBITED_TARGETS: &[&str] = &[
];

pub const WHITE_PROHIBITED_TARGET_PREFIXES: &[&str] = &[
];

pub const WHITE_PROHIBITED_DATA_CLASSES: &[DataClass] = &[
];

pub const WHITE_PROHIBITED_COMMANDERS: &[Persona] = &[
];

