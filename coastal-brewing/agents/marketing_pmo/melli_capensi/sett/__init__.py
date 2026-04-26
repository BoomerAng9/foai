"""The Sett — 12 BG'z (Badger Generals).

Each BG is an LlmAgent with role-specific Spinner kit and a charter-faithful
identity. BG'z report internally to Melli Capensi (sub_agents pattern); they
do NOT have direct conversational access to customers. Customer-facing
marketing copy always passes through Melli's `sign_for_culture_attribution`
gate before publication, per Sett Charter §13.

Each BG file documents:
  - Taxonomy (binomial scientific name)
  - Seeded colony (Sett charter §6 ancestral region)
  - Role
  - BARS dialect signature
  - Spinner kit (role-derived)
"""
from .meles_mehli import agent as meles_mehli_agent  # noqa: F401
from .taxi_dea import agent as taxi_dea_agent  # noqa: F401
from .arcto_nyx import agent as arcto_nyx_agent  # noqa: F401
from .ana_kuma import agent as ana_kuma_agent  # noqa: F401
from .leu_kurus import agent as leu_kurus_agent  # noqa: F401
from .moscha_tah import agent as moscha_tah_agent  # noqa: F401
from .persona_tah import agent as persona_tah_agent  # noqa: F401
from .orien_talis import agent as orien_talis_agent  # noqa: F401
from .eve_retti import agent as eve_retti_agent  # noqa: F401
from .cuc_phuong import agent as cuc_phuong_agent  # noqa: F401
from .java_nessa import agent as java_nessa_agent  # noqa: F401
from .mar_che import agent as mar_che_agent  # noqa: F401
