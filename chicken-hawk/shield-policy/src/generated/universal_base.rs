//! GENERATED from chicken-hawk\config\shield\universal_base.yml
//! DO NOT EDIT — regenerate via `python scripts/compile-shield-policy.py`
//! Content hash: d2ab1fda7dad

use crate::types::{ReasoningPath, DataClass, Persona};

pub const UNIVERSAL_BASE_PROHIBITED_TOOL_CALLS: &[&str] = &[
    "identity.impersonate_other_hawk",
    "phoenix.skip_rebirth",
    "sec_audit.append_backdated",
    "sec_audit.truncate",
    "spinner.bypass_consensus",
    "spinner.disable_policy_engine",
    "vault.exfiltrate_root_key",
];

pub const UNIVERSAL_BASE_PROHIBITED_REASONING: &[ReasoningPath] = &[
    ReasoningPath::BypassCia,
    ReasoningPath::BypassPrivacyBudget,
    ReasoningPath::BypassSlct,
    ReasoningPath::DowngradeConsensus,
    ReasoningPath::StaleMerkleAccept,
];

pub const UNIVERSAL_BASE_PROHIBITED_TARGETS: &[&str] = &[
    "/sec_audit/**",
    "/spinner/policy_engine/**",
    "/vault/root_keys/**",
];

pub const UNIVERSAL_BASE_PROHIBITED_TARGET_PREFIXES: &[&str] = &[
    "/sec_audit/",
    "/spinner/policy_engine/",
    "/vault/root_keys/",
];

pub const UNIVERSAL_BASE_PROHIBITED_DATA_CLASSES: &[DataClass] = &[
    DataClass::CanarySat,
    DataClass::RootKeyMaterial,
];

pub const UNIVERSAL_BASE_PROHIBITED_COMMANDERS: &[Persona] = &[
];

