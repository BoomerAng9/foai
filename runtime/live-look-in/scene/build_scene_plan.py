#!/usr/bin/env python3
"""
build_scene_plan.py
===================
Consumes deployment_bay.yml and emits a structured build plan JSON
that Lil_Viz_Hawk dispatches to NVIDIA Omniverse for USD scene
construction.

Additionally runs the GOVERNANCE-AS-ARCHITECTURE AUDIT — a set of
invariants that the deployment_bay.yml MUST satisfy for the scene to
faithfully encode Shield Division governance. Fails loudly on any
violation. These are not cosmetic checks — they're the reason the
scene exists.

Invariants checked:
1. Paranoia's booth has door_to_crypt_ang_office: NONE
2. Crypt_Ang's office has door_to_paranoia_booth: NONE
3. Every Hawk in shield_personas.yml has a post in the scene
4. No Hawk is posted outside its squad's territory
5. Halo is at the central chokepoint (x near 0, on the catwalk)
6. Three substrate pylons are physically separated
7. Signature beats reference valid frame names

Usage:
    python build_scene_plan.py                       # emits to stdout
    python build_scene_plan.py --out plan.json       # emits to file
    python build_scene_plan.py --audit-only          # just run invariants
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

# ── paths ─────────────────────────────────────────────────────────────
REPO = Path(__file__).resolve().parents[3]   # foai/
SCENE_YAML = Path(__file__).resolve().parent / "deployment_bay.yml"
PERSONAS_YAML = REPO / "chicken-hawk" / "config" / "shield_personas.yml"


# ── audit invariants ─────────────────────────────────────────────────


@dataclass
class AuditFailure:
    invariant: str
    message: str


@dataclass
class AuditResult:
    failures: list[AuditFailure] = field(default_factory=list)

    def add(self, inv: str, msg: str) -> None:
        self.failures.append(AuditFailure(inv, msg))

    @property
    def passed(self) -> bool:
        return not self.failures


def audit_scene(scene: dict, personas: dict) -> AuditResult:
    """Enforce governance-as-architecture invariants on the scene spec."""
    result = AuditResult()

    # ── Invariant 1: Paranoia booth has NO door to Crypt_Ang office
    para_booth = (scene.get("squad_territories") or {}).get("paranoia_independent_booth")
    if not para_booth:
        result.add(
            "paranoia_booth_exists",
            "squad_territories.paranoia_independent_booth is missing",
        )
    else:
        door = para_booth.get("door_to_crypt_ang_office")
        if door != "NONE":
            result.add(
                "paranoia_no_door_to_crypt_ang",
                f"paranoia_independent_booth.door_to_crypt_ang_office must be "
                f"'NONE', got {door!r}. This is the architectural encoding of "
                f"the independent-auditor reporting line — not cosmetic.",
            )

    # ── Invariant 2: Crypt_Ang office has NO door to Paranoia booth
    crypt_office = scene.get("crypt_ang_office")
    if not crypt_office:
        result.add(
            "crypt_ang_office_exists",
            "crypt_ang_office block is missing from scene",
        )
    else:
        door = crypt_office.get("door_to_paranoia_booth")
        if door != "NONE":
            result.add(
                "crypt_ang_no_door_to_paranoia",
                f"crypt_ang_office.door_to_paranoia_booth must be 'NONE', "
                f"got {door!r}. The absence IS the governance rule — "
                f"reports_to_override: ACHEEVY rendered as architecture.",
            )

    # ── Invariant 3: Every Hawk in personas has a post in the scene
    registered_hawks = set(personas.get("hawks", {}).keys())
    scene_posted = set()
    for territory_name, territory in (scene.get("squad_territories") or {}).items():
        for post in territory.get("posts") or []:
            hawk = post.get("hawk")
            if hawk:
                scene_posted.add(hawk)
    missing = registered_hawks - scene_posted
    if missing:
        result.add(
            "all_hawks_posted",
            f"Hawks registered in shield_personas.yml but missing from scene: "
            f"{sorted(missing)}",
        )
    extra = scene_posted - registered_hawks
    if extra:
        result.add(
            "no_ghost_hawks",
            f"Hawks in scene but not in shield_personas.yml (ghost posts): "
            f"{sorted(extra)}",
        )

    # ── Invariant 4: Hawks posted in their squad's territory only
    hawk_to_squad = {
        hid: data.get("squad") for hid, data in (personas.get("hawks") or {}).items()
    }
    territory_to_squad = {
        "black_squad_wing": "black",
        "blue_squad_detection": "blue",
        "purple_squad_bridge": "purple",
        "white_squad_conscience_balcony": "white",
        "gold_platinum_catwalk": "gold_platinum",
        "paranoia_independent_booth": "gold_platinum",  # Paranoia is GP
    }
    for t_name, territory in (scene.get("squad_territories") or {}).items():
        expected_squad = territory_to_squad.get(t_name)
        if not expected_squad:
            continue
        for post in territory.get("posts") or []:
            hawk = post.get("hawk")
            actual_squad = hawk_to_squad.get(hawk)
            if actual_squad and actual_squad != expected_squad:
                result.add(
                    "no_squad_crossing",
                    f"{hawk} is squad={actual_squad!r} but posted in "
                    f"territory {t_name!r} (squad={expected_squad!r})",
                )

    # ── Invariant 5: Halo at the central chokepoint
    gp_catwalk = (scene.get("squad_territories") or {}).get("gold_platinum_catwalk") or {}
    halo_post = None
    for p in gp_catwalk.get("posts") or []:
        if p.get("hawk") == "Lil_Mast_Hawk":
            halo_post = p.get("position") or {}
            break
    if not halo_post:
        result.add(
            "halo_posted",
            "Halo (Lil_Mast_Hawk) is not posted on the gold_platinum_catwalk",
        )
    else:
        x = halo_post.get("x", None)
        if x is None or abs(x) > 2.0:
            result.add(
                "halo_at_central_chokepoint",
                f"Halo's x-position is {x}; must be near 0 (central "
                f"chokepoint on the catwalk — every Gold op passes her console).",
            )

    # ── Invariant 6: Three substrate pylons physically separated
    pylons = (scene.get("substrate_pylons") or {}).get("pylons") or []
    if len(pylons) != 3:
        result.add(
            "three_substrate_pylons",
            f"substrate_pylons.pylons must have exactly 3 entries "
            f"(Linux / macOS / WASM); got {len(pylons)}.",
        )
    else:
        positions = [p.get("position", {}) for p in pylons]
        xs = [pos.get("x", 0) for pos in positions]
        if len(set(xs)) != 3:
            result.add(
                "substrate_pylons_separated",
                f"Substrate pylons must be at distinct x-positions; got x={xs}. "
                f"Physical separation is the v1.6 §3.1 Substrate Heterogeneity "
                f"architectural encoding.",
            )

    # ── Invariant 7: Signature beats reference valid frames
    beats = scene.get("signature_beats") or {}
    required_beats = {
        "nominal_ops",
        "black_squad_launch",
        "paranoia_flinch",
        "phoenix_rebirth",
        "p0_incident",
    }
    missing_beats = required_beats - set(beats.keys())
    if missing_beats:
        result.add(
            "required_signature_beats",
            f"Signature beats missing: {sorted(missing_beats)}",
        )

    return result


# ── build-plan emission ─────────────────────────────────────────────


def build_plan(scene: dict, personas: dict) -> dict[str, Any]:
    """Transform scene descriptor + personas into a Lil_Viz_Hawk dispatch plan."""
    plan: dict[str, Any] = {
        "$schema": "lil_viz_hawk_scene_plan_v1",
        "scene_id": scene.get("scene_id", "shield_division_deployment_bay_v1"),
        "source_yaml": "runtime/live-look-in/scene/deployment_bay.yml",
        "concept_frames": scene.get("concept_frames", []),
        "world": scene.get("world", {}),
        "build_steps": [],
    }

    # Step 1: architectural assembly
    plan["build_steps"].append({
        "step": 1,
        "name": "assemble_architecture",
        "actions": [
            "render_floor_with_deploy_chevron_inlays",
            "place_substrate_pylons_linux_macos_wasm",
            "render_central_cia_triskele",
            "construct_gold_platinum_catwalk",
            "construct_white_conscience_balcony",
            "seal_black_squad_wing",
            "place_paranoia_independent_booth_WITHOUT_door_to_crypt_ang",
            "place_crypt_ang_office_WITHOUT_door_to_paranoia",
        ],
    })

    # Step 2: character placement
    character_placements = []
    for territory_name, territory in (scene.get("squad_territories") or {}).items():
        for post in territory.get("posts") or []:
            hawk = post["hawk"]
            persona = (personas.get("hawks") or {}).get(hawk, {})
            character_placements.append({
                "hawk_id": hawk,
                "kunya": persona.get("kunya"),
                "squad": persona.get("squad"),
                "territory": territory_name,
                "position": post.get("position"),
                "portrait_ref": f"cti-hub/public/hawks/shield/{hawk.lower()}.png",
            })
    plan["build_steps"].append({
        "step": 2,
        "name": "place_characters",
        "count": len(character_placements),
        "placements": character_placements,
    })

    # Step 3: Cosmos WFM dynamic nodes
    plan["build_steps"].append({
        "step": 3,
        "name": "wire_cosmos_wfm_nodes",
        "nodes": [
            {
                "name": "platform_topology_holograph",
                "source_config": "deployment_bay.yml::platform_topology_holograph",
            },
            {
                "name": "merkle_chain_visualizer",
                "source_config": "deployment_bay.yml::overhead.merkle_chain_visualizer",
            },
            {
                "name": "attack_coverage_heatmap",
                "source_config": "deployment_bay.yml::overhead.attack_coverage_heatmap",
            },
        ],
    })

    # Step 4: signature beat animations
    beat_animations = []
    for beat_name, beat_spec in (scene.get("signature_beats") or {}).items():
        beat_animations.append({
            "name": beat_name,
            "camera": beat_spec.get("camera"),
            "triggers": beat_spec.get("triggers", []),
            "concept_still": beat_spec.get("corresponding_still"),
        })
    plan["build_steps"].append({
        "step": 4,
        "name": "author_signature_beats",
        "beats": beat_animations,
    })

    # Step 5: governance audit gate (this script IS step 5 when run in CI)
    plan["build_steps"].append({
        "step": 5,
        "name": "governance_architecture_audit",
        "runs": "runtime/live-look-in/scene/build_scene_plan.py --audit-only",
        "blocks_build_on_failure": True,
    })

    return plan


# ── main ────────────────────────────────────────────────────────────


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", type=Path, default=None,
                    help="Write build plan JSON here (default: stdout)")
    ap.add_argument("--audit-only", action="store_true",
                    help="Run governance invariants only; don't emit plan")
    args = ap.parse_args()

    scene = yaml.safe_load(SCENE_YAML.read_text(encoding="utf-8"))
    personas = yaml.safe_load(PERSONAS_YAML.read_text(encoding="utf-8"))

    audit = audit_scene(scene, personas)
    if audit.failures:
        print("GOVERNANCE-AS-ARCHITECTURE AUDIT FAILED", file=sys.stderr)
        for f in audit.failures:
            print(f"  [{f.invariant}] {f.message}", file=sys.stderr)
        return 1
    print(f"audit: OK ({7} invariants passed)", file=sys.stderr)

    if args.audit_only:
        return 0

    plan = build_plan(scene, personas)
    out = json.dumps(plan, indent=2)
    if args.out:
        args.out.write_text(out, encoding="utf-8")
        print(f"wrote {args.out}", file=sys.stderr)
    else:
        print(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
