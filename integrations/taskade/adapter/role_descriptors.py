"""Sacred Separation enforcement: agent name → role descriptor mapping.

Per the Sacred Separation canon (memory: feedback_owner_brief_is_not_customer_copy
+ reference_taskade_org_future_of_ai_canon_2026_05_14), any Taskade surface that
is visible beyond the owner (consultancy clients, customer-facing wikis, etc.)
must NEVER expose internal agent names, internal tool names, model names, or
provider names. This module is the canonical mapping table.

Surface levels:
- owner_tier: shows raw names (for owner-only surfaces like the HRPMO cycles folder)
- client_tier: maps to role descriptors (for any surface a consultancy client sees)
"""
from __future__ import annotations

import re
from typing import Final

# Canonical agent-name → role-descriptor mapping. Update here when the roster
# changes; the redaction function uses word-boundary regex over this dict.
AGENT_ROLE_MAP: Final[dict[str, str]] = {
    # Executive + 2IC
    "ACHEEVY": "CEO",
    "Chicken_Hawk": "Operations Coordinator",
    "Chicken Hawk": "Operations Coordinator",
    "AVVA_NOON": "Platform Brain",
    "AVVA NOON": "Platform Brain",

    # Boomer_Angs (C-suite)
    "Iller_Ang": "Creative Director",
    "Sal_Ang": "Customer Experience Manager",
    "LUC": "Finance & Technology Lead",
    "Melli_Capensi": "Marketing PMO Lead",
    "Melli Capensi": "Marketing PMO Lead",
    "Betty-Anne_Ang": "HR-PMO Director",
    "Betty_Anne_Ang": "HR-PMO Director",
    "Betty-Anne Ang": "HR-PMO Director",
    "Edu_Ang": "Education Lead",
    "Scout_Ang": "Recruiting & Research Lead",
    "Content_Ang": "Content Strategy Lead",
    "Ops_Ang": "Operations Lead",
    "Biz_Ang": "Business Development Lead",
    "TPS_Report_Ang": "Reporting & Compliance Lead",
    "Code_Ang": "Engineering Lead",
    "Publish_Ang": "Publishing Coordinator",
    "Press_Ang": "Press Automation Lead",
    "Boomer_CDO": "Chief Design Officer",
    "Boomer_Roo": "Fleet Safety Director",

    # Super Agent runtimes / infrastructure
    "NemoClaw": "Policy & Risk Reviewer",
    "OpenClaw": "Runtime Engine",
    "Hermes": "Audit & Eval Service",
    "Spinner": "Voice Service",

    # Sqwaadrun / Lil_Hawks (collective)
    "Lil_Hawks": "Operations Team",
    "Lil_Hawk": "Operations Specialist",
    "Sqwaadrun": "Operations Fleet",
    "Lil_YouTube_Hawk": "Video Publishing Specialist",
    "Lil_Telegram_Hawk": "Messaging Specialist",
    "Lil_Slack_Hawk": "Workspace Messaging Specialist",
    "Lil_Mercury_Hawk": "Banking Operations Specialist",
    "Lil_Deep_Hawk": "Research Specialist",
    "Lil_Render_Hawk": "Asset Render Specialist",
    "Lil_Push_Hawk": "Deploy Specialist",
    "Lil_Schedule_Hawk": "Scheduling Specialist",

    # Sett / Mob roles
    "Badger": "Marketing Specialist",
    "Badgers": "Marketing Team",
    "Roo": "Fleet Compliance Specialist",
    "Roos": "Fleet Compliance Team",

    # The Sett / The Mob PMOs
    "The_Sett": "Marketing PMO",
    "The Sett": "Marketing PMO",
    "The_Mob": "Fleet Safety PMO",
    "The Mob": "Fleet Safety PMO",
}

# Model + provider names that must NEVER appear in any client_tier surface.
# Redaction collapses these to neutral descriptors.
MODEL_PROVIDER_REDACTIONS: Final[dict[str, str]] = {
    # Model families
    r"\bclaude[-_]?(opus|sonnet|haiku)?[-_]?\d+(?:\.\d+)?\b": "language model",
    r"\bgpt[-_]?\d+(?:\.\d+)?\b": "language model",
    r"\bgemini[-_]?\d+(?:\.\d+)?(?:[-_]?(?:pro|flash|nano))?\b": "language model",
    r"\bgrok[-_]?\d+\b": "language model",

    # Provider names
    r"\banthropic\b": "model provider",
    r"\bopenai\b": "model provider",
    r"\bgoogle\s+(?:vertex|gemini)\b": "model provider",
    r"\bvertex\s*ai\b": "model provider",
    r"\bopenrouter\b": "model gateway",
    r"\blitellm\b": "model gateway",

    # Internal infrastructure
    r"\bnemoclaw[_\-]?check[_\-]?passed\b": "policy review: passed",
    r"\bnemoclaw[_\-]?check[_\-]?failed\b": "policy review: blocked",
}


def map_agent(name: str, surface: str = "client_tier") -> str:
    """Map a single agent name to its role descriptor (client_tier) or pass through (owner_tier).

    Unknown agent names at client_tier are passed through as-is. The caller is responsible
    for adding unknown names to AGENT_ROLE_MAP — this is intentional so trust gate audits
    surface "what got through unmapped".
    """
    if surface == "owner_tier":
        return name
    return AGENT_ROLE_MAP.get(name, name)


def redact_text(text: str, surface: str = "client_tier") -> str:
    """Walk through `text` and apply Sacred Separation redactions.

    At owner_tier this is a no-op. At client_tier:
    - All AGENT_ROLE_MAP keys are replaced with their role descriptors (word-boundary match).
    - All MODEL_PROVIDER_REDACTIONS regex patterns are replaced with neutral descriptors.
    - Other potentially sensitive strings stay as-is; trust gate audits catch leaks.
    """
    if surface == "owner_tier":
        return text

    out = text
    # Agent name replacements — longest keys first so "Iller_Ang" matches before "Ang"
    for name in sorted(AGENT_ROLE_MAP.keys(), key=len, reverse=True):
        pattern = re.compile(r"\b" + re.escape(name) + r"\b")
        out = pattern.sub(AGENT_ROLE_MAP[name], out)

    # Model + provider redactions
    for pattern, replacement in MODEL_PROVIDER_REDACTIONS.items():
        out = re.sub(pattern, replacement, out, flags=re.IGNORECASE)

    return out


def redact_dict(data: dict, surface: str = "client_tier") -> dict:
    """Recursively walk a dict + redact every string value via redact_text."""
    if surface == "owner_tier":
        return data

    out: dict = {}
    for key, value in data.items():
        if isinstance(value, str):
            out[key] = redact_text(value, surface)
        elif isinstance(value, dict):
            out[key] = redact_dict(value, surface)
        elif isinstance(value, list):
            out[key] = [
                redact_dict(item, surface) if isinstance(item, dict)
                else redact_text(item, surface) if isinstance(item, str)
                else item
                for item in value
            ]
        else:
            out[key] = value
    return out
