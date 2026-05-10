#!/usr/bin/env python3
"""
compile-shield-policy.py
========================
Parse config/shield/*.yml Semantic Constraint Profiles and emit Rust
modules at shield-policy/src/generated/*.rs.

v0.1 scope:
  - Validate YAML shape against SCHEMA.md structural predicates
  - Cross-reference shield_personas.yml for valid Hawk + Squad IDs
  - Emit generated/ Rust modules with prohibition CONSTANT DATA only
    (squad- and Hawk-specific imperative logic stays hand-written in
    existing modules; the generated constants are what the logic
    consumes)
  - Deterministic output (byte-for-byte reproducible, sorted entries)
    per v1.6 §3.1 Substrate Heterogeneity reproducibility requirement

Design choice:
  The hand-written squad/Hawk modules contain imperative checks
  (threat_confirmed state, SAT requirement matching, target-tenant
  verification) that are derived from the squad's narrative constraint,
  not mechanically from YAML prohibitions. Those stay hand-written.
  What THIS generator produces is the derivable piece: the constant
  tables that list prohibited tool_calls / reasoning_paths / targets /
  data_classes. Those tables are where YAML changes would otherwise
  require hand-editing Rust.

Usage:
  cd chicken-hawk
  python scripts/compile-shield-policy.py
  python scripts/compile-shield-policy.py --check   # dry-run, exits
                                                     # non-zero if
                                                     # output would
                                                     # differ from
                                                     # existing files
"""

from __future__ import annotations

import argparse
import hashlib
import sys
from dataclasses import dataclass, field
from pathlib import Path

import yaml

# ── paths ──────────────────────────────────────────────────────────────
REPO = Path(__file__).resolve().parent.parent       # chicken-hawk/
CONFIG_DIR = REPO / "config" / "shield"
PERSONAS_YAML = REPO / "config" / "shield_personas.yml"
CRATE_DIR = REPO / "shield-policy"
OUTPUT_DIR = CRATE_DIR / "src" / "generated"

# ── closed vocabularies from SCHEMA.md ─────────────────────────────────
VALID_REASONING_PATHS = {
    "bypass_cia", "bypass_slct", "bypass_privacy_budget",
    "downgrade_consensus", "stale_merkle_accept",
    "scope_creep_from_sat", "detection_priority_over_isolation",
    "cross_squad_data_leakage", "budget_violation_override",
    "guardrail_violation_override", "trust_without_attestation",
    "crypt_ang_sat_acceptance", "cosign_by_policy_not_verification",
    "real_exfil_justified_by_proof_value",
    "acceptable_pii_leak_for_utility", "trust_tests_over_proof",
    "partial_verification_acceptable",
    "defer_to_crypt_ang_on_audit_conflict",
    "exclude_crypt_ang_from_simulation_scope",
}
VALID_DATA_CLASSES = {
    "unredacted_pii", "unredacted_phi", "tenant_secret",
    "root_key_material", "canary_sat", "cross_tenant_identifier",
}
VALID_SQUADS = {"black", "blue", "purple", "white", "gold_platinum"}
VALID_PROFILE_TYPES = {"universal_base", "squad", "hawk"}

# ── data model ─────────────────────────────────────────────────────────

@dataclass
class Profile:
    profile_type: str
    id: str
    squad: str | None
    source_path: Path
    prohibited_tool_calls: list[str] = field(default_factory=list)
    prohibited_reasoning: list[str] = field(default_factory=list)
    prohibited_targets: list[str] = field(default_factory=list)
    prohibited_data_classes: list[str] = field(default_factory=list)
    prohibited_commanders: list[dict] = field(default_factory=list)


# ── validation ─────────────────────────────────────────────────────────

def _die(msg: str) -> None:
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)

def _load_yaml(path: Path) -> dict:
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as e:
        _die(f"YAML parse error in {path}: {e}")
    return {}  # unreachable

def load_personas() -> tuple[set[str], set[str]]:
    """Return (valid_squad_keys, valid_hawk_ids) from shield_personas.yml."""
    d = _load_yaml(PERSONAS_YAML)
    squads = set(d.get("squads", {}).keys())
    hawks = set(d.get("hawks", {}).keys())
    if squads != VALID_SQUADS:
        _die(f"shield_personas.yml squads {sorted(squads)} != canonical {sorted(VALID_SQUADS)}")
    if len(hawks) != 32:
        _die(f"shield_personas.yml should have 32 hawks, found {len(hawks)}")
    return squads, hawks

def parse_profile(path: Path, valid_hawk_ids: set[str]) -> Profile:
    d = _load_yaml(path)
    ptype = d.get("profile_type")
    if ptype not in VALID_PROFILE_TYPES:
        _die(f"{path}: invalid profile_type '{ptype}'")
    pid = d.get("id")
    if ptype == "universal_base":
        pid = "universal_base"          # no id in YAML, use fixed name
    elif ptype == "hawk" and pid not in valid_hawk_ids:
        _die(f"{path}: id '{pid}' not in shield_personas.yml")
    elif ptype == "squad" and pid not in VALID_SQUADS:
        _die(f"{path}: squad id '{pid}' not canonical")

    prof = Profile(
        profile_type=ptype,
        id=pid,
        squad=d.get("squad") if ptype == "hawk" else None,
        source_path=path,
    )
    proh = d.get("prohibitions", {}) or {}

    for entry in (proh.get("tool_calls") or []):
        tid = entry.get("id")
        if not tid or not isinstance(tid, str):
            _die(f"{path}: tool_call prohibition missing id")
        prof.prohibited_tool_calls.append(tid)

    for entry in (proh.get("reasoning_paths") or []):
        pat = entry.get("pattern")
        if pat not in VALID_REASONING_PATHS:
            _die(f"{path}: reasoning_path '{pat}' not in closed set "
                 f"(see SCHEMA.md — add to enum before using)")
        prof.prohibited_reasoning.append(pat)

    for entry in (proh.get("targets") or []):
        ns = entry.get("namespace")
        if not ns or not isinstance(ns, str):
            _die(f"{path}: target prohibition missing namespace")
        prof.prohibited_targets.append(ns)

    for entry in (proh.get("data_classes") or []):
        cls = entry.get("class")
        if cls not in VALID_DATA_CLASSES:
            _die(f"{path}: data_class '{cls}' not in closed set")
        prof.prohibited_data_classes.append(cls)

    for entry in (proh.get("commanders") or []):
        persona = entry.get("persona")
        if not persona:
            _die(f"{path}: commander prohibition missing persona")
        prof.prohibited_commanders.append({
            "persona": persona,
            "scope": entry.get("scope", "all"),
        })

    # Deterministic ordering for reproducible builds
    prof.prohibited_tool_calls.sort()
    prof.prohibited_reasoning.sort()
    prof.prohibited_targets.sort()
    prof.prohibited_data_classes.sort()
    prof.prohibited_commanders.sort(key=lambda c: (c["persona"], c["scope"]))

    return prof


# ── codegen ────────────────────────────────────────────────────────────

def _sha12(profile: Profile) -> str:
    raw = (
        "|".join(profile.prohibited_tool_calls)
        + "::" + "|".join(profile.prohibited_reasoning)
        + "::" + "|".join(profile.prohibited_targets)
        + "::" + "|".join(profile.prohibited_data_classes)
        + "::" + "|".join(f"{c['persona']}:{c['scope']}" for c in profile.prohibited_commanders)
    )
    return hashlib.sha256(raw.encode()).hexdigest()[:12]

def _reasoning_enum_variant(pat: str) -> str:
    """snake_case pattern → PascalCase ReasoningPath variant."""
    return "".join(word.capitalize() for word in pat.split("_"))

def _data_class_enum_variant(cls: str) -> str:
    return "".join(word.capitalize() for word in cls.split("_"))

def _persona_enum_variant(persona: str) -> str:
    # Canonical enum mapping — extend when Persona enum grows
    mapping = {
        "ACHEEVY": "Acheevy",
        "Crypt_Ang": "CryptAng",
        "PLATFORM_OWNER": "PlatformOwner",
        "PMO_SHIELD_LEAD": "PmoShieldLead",
        "TENANT_ADMIN": "TenantAdmin",
    }
    if persona not in mapping:
        _die(f"Persona '{persona}' has no enum mapping — add to _persona_enum_variant")
    return mapping[persona]

def _const_id(name: str) -> str:
    """Convert 'black' → 'BLACK', 'lil_doubt_hawk' → 'LIL_DOUBT_HAWK'."""
    return name.upper()

def emit_profile_module(profile: Profile) -> str:
    """Emit a generated Rust module with CONSTANT prohibition tables."""
    const_prefix = _const_id(profile.id)
    lines: list[str] = []
    lines.append(f"//! GENERATED from {profile.source_path.relative_to(REPO.parent)}")
    lines.append("//! DO NOT EDIT — regenerate via `python scripts/compile-shield-policy.py`")
    lines.append(f"//! Content hash: {_sha12(profile)}")
    lines.append("")
    lines.append("use crate::types::{ReasoningPath, DataClass, Persona};")
    lines.append("")

    # Tool calls
    lines.append(f"pub const {const_prefix}_PROHIBITED_TOOL_CALLS: &[&str] = &[")
    for tid in profile.prohibited_tool_calls:
        lines.append(f'    "{tid}",')
    lines.append("];")
    lines.append("")

    # Reasoning paths
    lines.append(f"pub const {const_prefix}_PROHIBITED_REASONING: &[ReasoningPath] = &[")
    for pat in profile.prohibited_reasoning:
        lines.append(f"    ReasoningPath::{_reasoning_enum_variant(pat)},")
    lines.append("];")
    lines.append("")

    # Targets
    lines.append(f"pub const {const_prefix}_PROHIBITED_TARGETS: &[&str] = &[")
    for ns in profile.prohibited_targets:
        lines.append(f'    "{ns}",')
    lines.append("];")
    lines.append("")

    # Data classes
    lines.append(f"pub const {const_prefix}_PROHIBITED_DATA_CLASSES: &[DataClass] = &[")
    for cls in profile.prohibited_data_classes:
        lines.append(f"    DataClass::{_data_class_enum_variant(cls)},")
    lines.append("];")
    lines.append("")

    # Commanders
    lines.append(f"pub const {const_prefix}_PROHIBITED_COMMANDERS: &[Persona] = &[")
    for c in profile.prohibited_commanders:
        lines.append(f"    Persona::{_persona_enum_variant(c['persona'])},")
    lines.append("];")
    lines.append("")

    return "\n".join(lines) + "\n"

def emit_mod_index(profiles: list[Profile]) -> str:
    lines = [
        "//! GENERATED — DO NOT EDIT",
        "//! Module index for compiled Shield Division Semantic Constraint Profiles.",
        "",
    ]
    for p in sorted(profiles, key=lambda x: (x.profile_type, x.id)):
        modname = p.id if p.profile_type != "universal_base" else "universal_base"
        lines.append(f"pub mod {modname.lower()};")
    return "\n".join(lines) + "\n"


# ── IO + diff ──────────────────────────────────────────────────────────

def write_if_changed(path: Path, content: str, check_only: bool) -> bool:
    """Return True if content would change (or did change). False if same."""
    existing = path.read_text(encoding="utf-8") if path.exists() else ""
    if existing == content:
        return False
    if check_only:
        print(f"would change: {path.relative_to(REPO.parent)}")
        return True
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"wrote: {path.relative_to(REPO.parent)}")
    return True


# ── main ───────────────────────────────────────────────────────────────

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true",
                    help="Dry-run: exit non-zero if output would differ")
    args = ap.parse_args()

    valid_squads, valid_hawks = load_personas()

    # Gather all YAMLs
    profiles: list[Profile] = []
    profiles.append(parse_profile(CONFIG_DIR / "universal_base.yml", valid_hawks))
    for p in sorted((CONFIG_DIR / "squads").glob("*.yml")):
        profiles.append(parse_profile(p, valid_hawks))
    for p in sorted((CONFIG_DIR / "hawks").glob("*.yml")):
        profiles.append(parse_profile(p, valid_hawks))

    print(f"parsed {len(profiles)} profile(s): "
          f"{sum(1 for p in profiles if p.profile_type == 'universal_base')} universal, "
          f"{sum(1 for p in profiles if p.profile_type == 'squad')} squad, "
          f"{sum(1 for p in profiles if p.profile_type == 'hawk')} hawk")

    changed = False
    for profile in profiles:
        modname = "universal_base" if profile.profile_type == "universal_base" else profile.id.lower()
        out_path = OUTPUT_DIR / f"{modname}.rs"
        content = emit_profile_module(profile)
        if write_if_changed(out_path, content, args.check):
            changed = True

    mod_rs = OUTPUT_DIR / "mod.rs"
    if write_if_changed(mod_rs, emit_mod_index(profiles), args.check):
        changed = True

    if args.check and changed:
        print("\nCHECK FAILED — regenerate via `python scripts/compile-shield-policy.py`")
        return 1
    if not changed:
        print("no changes.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
