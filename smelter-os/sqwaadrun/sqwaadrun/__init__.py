"""
Sqwaadrun — ACHIEVEMOR Smelter OS 17-Hawk scraping swarm.

Pure Python web scraping framework with Chicken Hawk command layer.
No LLM required. No API keys. No inference costs.

Core usage:
    from sqwaadrun import FullScrappHawkSquadrun, MissionType

    async with FullScrappHawkSquadrun() as squad:
        mission = await squad.mission(
            MissionType.RECON,
            targets=["https://example.com"],
        )

Hierarchy:
    ACHEEVY (Digital CEO)
      └─ General_Ang (Boomer_Ang supervisor)
          ├─ Chicken_Hawk (dispatcher, 2IC/COO)
          │   └─ Sqwaadrun (17 Lil_Hawks)
          └─ (ACHEEVY + Chicken_Hawk flank General_Ang)
"""

from sqwaadrun.lil_scrapp_hawk import (
    # Data structures
    ScrapeStatus,
    ScrapeTarget,
    ScrapeResult,
    CrawlManifest,
    ExtractionRule,
    ExtractionSchema,
    FeedEntry,
    DiffResult,
    QueueJob,
    SitemapEntry,
    PipelineStep,
    ScheduledJob,
    Mission,
    MissionType,

    # Core 6 Hawks
    BaseLilHawk,
    LilGuardHawk,
    LilScrappHawk,
    LilParseHawk,
    LilCrawlHawk,
    LilSnapHawk,
    LilStoreHawk,

    # Expansion 6 Hawks
    LilExtractHawk,
    LilFeedHawk,
    LilDiffHawk,
    LilCleanHawk,
    LilAPIHawk,
    LilQueueHawk,

    # Specialist 5 Hawks
    LilSitemapHawk,
    LilStealthHawk,
    LilSchemaHawk,
    LilPipeHawk,
    LilSchedHawk,

    # Coordinators
    ScrappHawkSquadrun,
    ExpandedScrappHawkSquadrun,
    FullScrappHawkSquadrun,
    ChickenHawkDispatcher,

    # Quick helpers
    quick_scrape,
    quick_extract,
    quick_crawl,
    quick_api,
    quick_mission,
)

__version__ = "2.0.0"

__all__ = [
    "__version__",
    # Data structures
    "ScrapeStatus", "ScrapeTarget", "ScrapeResult", "CrawlManifest",
    "ExtractionRule", "ExtractionSchema", "FeedEntry", "DiffResult",
    "QueueJob", "SitemapEntry", "PipelineStep", "ScheduledJob",
    "Mission", "MissionType",
    # Core
    "BaseLilHawk",
    "LilGuardHawk", "LilScrappHawk", "LilParseHawk",
    "LilCrawlHawk", "LilSnapHawk", "LilStoreHawk",
    # Expansion
    "LilExtractHawk", "LilFeedHawk", "LilDiffHawk",
    "LilCleanHawk", "LilAPIHawk", "LilQueueHawk",
    # Specialist
    "LilSitemapHawk", "LilStealthHawk", "LilSchemaHawk",
    "LilPipeHawk", "LilSchedHawk",
    # Coordinators
    "ScrappHawkSquadrun", "ExpandedScrappHawkSquadrun",
    "FullScrappHawkSquadrun", "ChickenHawkDispatcher",
    # Quick helpers
    "quick_scrape", "quick_extract", "quick_crawl",
    "quick_api", "quick_mission",
]
