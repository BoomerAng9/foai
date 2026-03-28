"""
ACHEEVY Task Router

Determines whether a task stays on plugmein.cloud (ACHEEVY)
or gets routed to aimanagedsolutions.cloud (AIMS) for execution.
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)


# Tasks ACHEEVY handles directly (plugmein.cloud)
ACHEEVY_CAPABILITIES = frozenset({
    "code_generation",
    "code_review",
    "deep_research",
    "file_analysis",
    "slide_creation",
    "data_analysis",
    "web_scraping",
    "api_integration",
    "debugging",
    "documentation",
    "testing",
    "refactoring",
})

# Tasks routed to AIMS (aimanagedsolutions.cloud)
AIMS_CAPABILITIES = frozenset({
    "production_deploy",
    "infrastructure_setup",
    "domain_management",
    "database_migration",
    "ci_cd_pipeline",
    "monitoring_setup",
    "automation_workflow",
    "n8n_pipeline",
    "discord_bot_deploy",
    "telegram_bot_deploy",
    "payment_integration",
    "user_management",
})


class TaskRouter:
    """Routes tasks between ACHEEVY (local) and AIMS (remote)."""

    def __init__(self, aims_bridge_enabled: bool = False):
        self.aims_bridge_enabled = aims_bridge_enabled

    def route(self, task_type: str, metadata: Optional[dict] = None) -> str:
        """
        Returns 'acheevy' or 'aims' based on task type.
        Falls back to 'acheevy' if bridge is disabled.
        """
        if task_type in AIMS_CAPABILITIES and self.aims_bridge_enabled:
            logger.info(f"Routing '{task_type}' → AIMS (aimanagedsolutions.cloud)")
            return "aims"

        if task_type in ACHEEVY_CAPABILITIES:
            logger.info(f"Routing '{task_type}' → ACHEEVY (plugmein.cloud)")
            return "acheevy"

        # Default: handle locally
        logger.info(f"Routing '{task_type}' → ACHEEVY (default)")
        return "acheevy"

    def get_capability_map(self) -> dict:
        return {
            "acheevy": sorted(ACHEEVY_CAPABILITIES),
            "aims": sorted(AIMS_CAPABILITIES) if self.aims_bridge_enabled else [],
        }
