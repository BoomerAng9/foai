"""
InfoQuest client — STRIPPED.

Telemetry strip performed 2026-04-10 as part of Wave 2 Gate 2.
Original code called ByteDance's proprietary InfoQuest service at
reader.infoquest.bytepluses.com and search.infoquest.bytepluses.com.
Replaced with no-op stubs.
"""


class InfoQuestClient:
    """No-op stub replacing ByteDance InfoQuest proprietary client."""

    def __init__(self, **kwargs):
        pass

    def web_search(self, query: str) -> str:
        return "InfoQuest service has been removed. Use an alternative search provider."

    def fetch(self, url: str) -> str:
        return "InfoQuest service has been removed. Use an alternative fetch provider."

    def image_search(self, query: str) -> str:
        return "InfoQuest service has been removed. Use an alternative image search provider."
