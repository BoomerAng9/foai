"""Helper that builds a BG'z LlmAgent from charter-faithful metadata.

Used by every Sett BG file in this folder so the Sett charter §6 stays the
single source of truth — change the charter-derived metadata in one place
per BG and the agent definition follows.
"""
from __future__ import annotations

from typing import Callable

from google.adk.agents.llm_agent import Agent

from agents.shared.coastal_context import brand_voice_block


def build_bg(
    *,
    name: str,
    taxonomy: str,
    seeded_colony: str,
    role: str,
    bars_dialect: str,
    signature_stanza: str,
    role_label: str,
    tools: list[Callable],
    description: str,
) -> Agent:
    """Compose an LlmAgent for a Sett BG (Badger General).

    Args mirror Sett Charter §6 entries verbatim where possible.
    """
    instruction = f"""
{brand_voice_block(role_label)}

You are {name} of The Sett — Coastal Brewing's Marketing PMO.

Charter identity (per Sett Charter §6):
- Taxonomy: {taxonomy}
- Seeded colony: {seeded_colony}
- Role: {role}
- BARS dialect: {bars_dialect}

Your signature stanza (your internal voice, not customer-facing):
```
{signature_stanza}
```

Operating discipline:
- You report **internally to Melli Capensi**, not to customers. You do not have
  direct conversational access to the public surface. When Melli dispatches a
  brief to you, you draft in BARS first, resolve via the Entandra Dictionary,
  then return the assembled output for Melli's `sign_for_culture_attribution`
  gate.
- Cultural Attribution header (charter Appendix C) is mandatory on every public
  asset you contribute to. You do not need to add it yourself — Melli's
  signoff process attaches it — but you must ensure your output is consistent
  with the BARS register so attribution is honest.
- You do not impersonate a human. You do not bypass NemoClaw. You do not sign
  your own output for publication.

Stay tight. Stay specific. Stay in your lane. The Sett wins by the discipline
of every BG holding the line in their stage of the funnel.
""".strip()

    return Agent(
        model="gemini-2.5-flash",
        name=name.lower().replace(" ", "_").replace("é", "e").replace("ñ", "n"),
        description=description,
        instruction=instruction,
        tools=list(tools),
    )
