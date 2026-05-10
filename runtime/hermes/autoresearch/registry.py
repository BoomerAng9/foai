"""Canonical registry of every OSS/commercial model we depend on.

One entry per model. Fields:
  - family: vendor family name ("nemotron", "cosmos", "seedance", ...)
  - pinned_id: the exact model ID currently running in production
  - role: what it does in the platform
  - consumers: which services / surfaces depend on it
  - source: which autoresearch source adapter tracks this family
  - upgrade_blocker: free-text reason if we can't just auto-upgrade

AutoResearch scans the upstream `source` for each entry, diffs the
latest release against `pinned_id`, and emits DriftEntry records for
anything out of date.

Editing this file IS the canonical way to:
  - add a new model to track
  - deprecate a model after migration
  - document an upgrade-blocker rationale

Registry changes are code-reviewed — we don't want auto-PRs silently
flipping production model ids. AutoResearch only detects and alerts;
humans approve the upgrade PR.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class TrackedModel:
    family: str
    pinned_id: str
    role: str
    consumers: tuple[str, ...]
    source: str  # key into sources/ adapter map
    upgrade_blocker: str = ""
    notes: str = ""
    added: str = ""  # ISO date when first tracked
    updated: str = ""  # ISO date of last pinned_id change


# ─── Registry (ordered by first-landed date) ────────────────────────

REGISTRY: tuple[TrackedModel, ...] = (
    TrackedModel(
        family="nemotron",
        pinned_id="nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-Base-BF16",
        role="PersonaPlex — reasoning/chat LLM for ACHEEVY 3-Consultant Engagement",
        consumers=(
            "backend/uef-gateway PERSONAPLEX_ENDPOINT",
            "ACHEEVY Consult_Ang / Note_Ang surface",
            "CRUCIBLE Planner + Judge_Hawk (potential)",
        ),
        source="nvidia_hf",
        upgrade_blocker="",
        notes=(
            "2026-04-19 AutoResearch flagged Nemotron 3 Super as a newer "
            "MoE Hybrid Mamba-Transformer for agentic reasoning. Upgrade "
            "candidate — evaluate before swapping."
        ),
        added="2026-04-19",
        updated="2026-04-19",
    ),
    TrackedModel(
        family="cosmos-transfer",
        pinned_id="nvidia-cosmos/cosmos-transfer1 @ main (Transfer2.5 variant)",
        role="3D Operations Floor — Stage 5 photoreal environment render",
        consumers=(
            "services/operations-floor-cosmos (Dockerfile clone)",
            "backend/uef-gateway cosmos-client.ts",
        ),
        source="nvidia_github_cosmos",
        upgrade_blocker="",
        notes=(
            "Tracks the nvidia-cosmos/cosmos-transfer GitHub repo. When "
            "v2.5 reaches a pinned release tag, bump the Dockerfile from "
            "--depth 1 main to the tag. Watch for v3.0."
        ),
        added="2026-04-19",
        updated="2026-04-19",
    ),
    TrackedModel(
        family="seedance",
        pinned_id="seedance-2.0 (via fal.ai)",
        role="Pre-viz + character motion (Stage 2 + Stage 6 i2v)",
        consumers=(
            "iller-ang skill seedance-video.md",
            "3D Operations Floor pipeline stages 2 + 6",
        ),
        source="fal_models",
        upgrade_blocker="",
        notes=(
            "Replaced LTX-Video 2.3 in the original research brief — "
            "ByteDance already billed via fal.ai."
        ),
        added="2026-04-19",
        updated="2026-04-19",
    ),
    TrackedModel(
        family="recraft",
        pinned_id="recraftv4",
        role="Character portrait + scene hero generation",
        consumers=(
            "cti-hub/scripts/iller-ang/render-operations-floor-cast.ts",
            "cti-hub/scripts/iller-ang/render-shield-recraft.ts",
            "cti-hub/scripts/iller-ang/render-scene-stills.ts",
        ),
        source="recraft_api",
        upgrade_blocker="",
        notes="Size 1024x1024 confirmed supported. V5 release TBD.",
        added="2026-04-19",
        updated="2026-04-19",
    ),
    TrackedModel(
        family="davinci-magihuman",
        pinned_id="davinci-magihuman (via fal.ai)",
        role="Talking-head lip sync (optional Stage 6 variant)",
        consumers=("3D Operations Floor pipeline stage 6 — narrated variant",),
        source="fal_models",
        upgrade_blocker="",
        notes="$0.05/sec on fal.ai. Only invoked for narrated scenes.",
        added="2026-04-19",
        updated="2026-04-19",
    ),
    TrackedModel(
        family="gemini",
        pinned_id="gemini-3.1-flash",
        role="Default chat + tool-call brain (ACHEEVY main surface)",
        consumers=(
            "cti-hub/src/lib/ai/gemini.ts",
            "Guide Me 3-party (Consult_Ang / ACHEEVY / Note_Ang)",
        ),
        source="google_aistudio",
        upgrade_blocker="",
        notes=(
            "Direct Google AI SDK, not OpenRouter. Paid tier (no "
            "training on customer content). Watch for 3.2 / 4.0."
        ),
        added="2026-04-19",
        updated="2026-04-19",
    ),
    TrackedModel(
        family="claude",
        pinned_id="claude-opus-4-7",
        role="Heavy-reasoning adapter (Computer Use fallback, IDE-agent)",
        consumers=("Claude Code sessions", "fallback for Playwright Computer Use"),
        source="anthropic_api",
        upgrade_blocker="",
        notes="Model IDs per Anthropic canonical list — always latest Opus.",
        added="2026-04-19",
        updated="2026-04-19",
    ),
    TrackedModel(
        family="higgsfield",
        pinned_id="open-higgsfield @ latest",
        role="Character motion + alpha channel (Stage 6 self-host fallback)",
        consumers=("3D Operations Floor pipeline stage 6 — fallback variant",),
        source="huggingface_search",
        upgrade_blocker="",
        notes=(
            "Primary character motion path is Seedance i2v. Higgsfield "
            "is the fallback if Seedance alpha isn't clean."
        ),
        added="2026-04-19",
        updated="2026-04-19",
    ),
)


def by_family(family: str) -> TrackedModel | None:
    for m in REGISTRY:
        if m.family == family:
            return m
    return None


def by_source(source: str) -> tuple[TrackedModel, ...]:
    return tuple(m for m in REGISTRY if m.source == source)
