"""
General_Ang — Boomer_Ang supervisor flanked by ACHEEVY and Chicken_Hawk
=========================================================================
The Boomer_Ang above the Sqwaadrun. General_Ang does not dispatch missions
directly — that's Chicken_Hawk's job. General_Ang sets policy, signs off
on missions above the allowance threshold, reviews KPIs, maintains the
mission doctrine, and is the single point of accountability for the
entire scraping fleet's output to upstream ACHIEVEMOR systems.

Hierarchy reminder:
    ACHEEVY (Digital CEO)
      └── General_Ang (Boomer_Ang supervisor)  ← THIS MODULE
            ├── ACHEEVY-facing intake (left flank)
            └── Chicken_Hawk (right flank)
                  └── Sqwaadrun (17 Lil_Hawks)

The Boomer_Ang ring includes: Research_Ang, Content_Ang, Analytics_Ang,
Sales_Ang, Biz_Ang, Iller_Ang, Void_Ang. General_Ang is THE supervisor
they all report to (not a peer).

Policy enforcement:
  - Missions marked "restricted" require General_Ang sign-off
  - Daily quota caps per domain prevent abuse
  - KPI thresholds trigger doctrine review if breached
  - Every mission is logged to the doctrine journal
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from sqwaadrun.lil_scrapp_hawk import (
    FullScrappHawkSquadrun,
    Mission,
    MissionType,
)

logger = logging.getLogger("General_Ang")


# ═════════════════════════════════════════════════════════════════════════
#  DOCTRINE & POLICY
# ═════════════════════════════════════════════════════════════════════════

@dataclass
class Policy:
    """Mission policy enforced by General_Ang before dispatch."""
    # Per-domain daily mission quota
    daily_quota_per_domain: int = 500
    # Missions above this target count require sign-off
    sign_off_threshold: int = 100
    # Allowed mission types without sign-off
    freely_allowed: List[str] = field(default_factory=lambda: [
        "recon", "survey", "intercept",
    ])
    # Mission types that always require sign-off
    always_restricted: List[str] = field(default_factory=lambda: [
        "sweep", "harvest", "patrol", "batch_ops",
    ])
    # Domains on the permanent denylist
    denied_domains: List[str] = field(default_factory=list)


@dataclass
class DoctrineEntry:
    """A single audited mission in the doctrine journal."""
    mission_id: str
    mission_type: str
    target_count: int
    primary_domain: str
    signed_off_by: Optional[str]
    status: str
    throughput_pps: float
    timestamp: str
    kpi_snapshot: Dict[str, Any] = field(default_factory=dict)


# ═════════════════════════════════════════════════════════════════════════
#  GENERAL_ANG
# ═════════════════════════════════════════════════════════════════════════

class GeneralAng:
    """
    The Boomer_Ang supervisor above Chicken_Hawk. General_Ang validates
    missions against policy, tracks the doctrine journal, and is the
    accountable author of every scraping result delivered upstream to
    ACHEEVY.

    Usage:
        async with FullScrappHawkSquadrun() as squad:
            general = GeneralAng(squad)
            mission = await general.accept_intent(
                intent="scrape the front page",
                targets=["https://example.com"],
                requested_by="acheevy",
            )
            # General_Ang may hold the mission if sign-off is required
            await general.approve_pending()
    """

    def __init__(
        self,
        squad: FullScrappHawkSquadrun,
        policy: Optional[Policy] = None,
        doctrine_path: Union[str, Path] = "./doctrine.jsonl",
    ):
        self.squad = squad
        self.policy = policy or Policy()
        self.doctrine_path = Path(doctrine_path)
        self.doctrine_path.parent.mkdir(parents=True, exist_ok=True)

        self._pending: List[Mission] = []
        self._domain_quota_used: Dict[str, int] = {}
        self.logger = logger

        # Injected by the gateway on_startup so doctrine writes also
        # fire a Puter + GCS dual-write. When None, only the local
        # doctrine.jsonl file is written (dev mode / CLI mode).
        self.storage: Optional[Any] = None

    # ── Intent intake (ACHEEVY-facing left flank) ──

    async def accept_intent(
        self,
        intent: str,
        targets: List[str],
        requested_by: str = "acheevy",
        **config,
    ) -> Mission:
        """
        Accept a natural-language intent from ACHEEVY and translate it
        into a concrete Chicken_Hawk mission. Enforces policy; may place
        the mission in pending state awaiting sign-off.

        Intent → MissionType mapping is keyword-based (no LLM needed):
          "recon" / "read" / "check" / "look at"          → RECON
          "crawl" / "sweep" / "map" / "all pages"         → SWEEP
          "extract" / "harvest" / "pull fields"           → HARVEST
          "monitor" / "watch" / "patrol" / "changes"      → PATROL
          "api" / "intercept" / "endpoint"                → INTERCEPT
          "sitemap" / "survey" / "discover"               → SURVEY
          "batch" / "multiple"                            → BATCH_OPS
        """
        mission_type = self._intent_to_mission_type(intent)
        self.logger.info(
            f"Intent from {requested_by}: '{intent}' → {mission_type.value}"
        )

        # Build mission through Chicken_Hawk (General_Ang doesn't
        # dispatch directly — Chicken_Hawk still owns that)
        mission = self.squad.chicken_hawk.create_mission(
            mission_type, targets, **config
        )
        mission.config["requested_by"] = requested_by
        mission.config["intent"] = intent

        # Policy gate
        allowed, reason, requires_sign_off = self._check_policy(mission)
        if not allowed:
            mission.status = "rejected"
            mission.error = reason
            self.logger.warning(f"Mission {mission.mission_id} rejected: {reason}")
            self._log_doctrine(mission, signed_off_by=None)
            return mission

        if requires_sign_off:
            mission.status = "pending_signoff"
            mission.config["policy_reason"] = reason
            self._pending.append(mission)
            self.logger.info(
                f"Mission {mission.mission_id} held for sign-off: {reason}"
            )
            return mission

        # Auto-approved → dispatch through Chicken_Hawk
        return await self._dispatch_and_audit(mission, signed_off_by="auto")

    # ── Sign-off (General_Ang's unique authority) ──

    async def approve(self, mission_id: str, approver: str = "general_ang") -> Mission:
        """Approve a pending mission and dispatch it."""
        mission = next((m for m in self._pending if m.mission_id == mission_id), None)
        if not mission:
            raise ValueError(f"No pending mission {mission_id}")
        self._pending.remove(mission)
        return await self._dispatch_and_audit(mission, signed_off_by=approver)

    async def approve_pending(self, approver: str = "general_ang") -> List[Mission]:
        """Approve and dispatch all pending missions."""
        results = []
        pending_copy = list(self._pending)
        self._pending.clear()
        for m in pending_copy:
            results.append(await self._dispatch_and_audit(m, signed_off_by=approver))
        return results

    def deny(self, mission_id: str, reason: str) -> Mission:
        """Deny a pending mission."""
        mission = next((m for m in self._pending if m.mission_id == mission_id), None)
        if not mission:
            raise ValueError(f"No pending mission {mission_id}")
        self._pending.remove(mission)
        mission.status = "denied"
        mission.error = reason
        self._log_doctrine(mission, signed_off_by=None)
        return mission

    # ── Status / reporting ──

    def pending_missions(self) -> List[Dict[str, Any]]:
        return [
            {
                "mission_id": m.mission_id,
                "type": m.mission_type.value,
                "targets": len(m.targets),
                "intent": m.metadata.get("intent"),
                "reason": m.metadata.get("policy_reason"),
            }
            for m in self._pending
        ]

    def doctrine_summary(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Return last N doctrine entries."""
        if not self.doctrine_path.exists():
            return []
        entries = []
        with self.doctrine_path.open("r", encoding="utf-8") as f:
            for line in f:
                try:
                    entries.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
        return entries[-limit:]

    def quota_report(self) -> Dict[str, int]:
        return dict(self._domain_quota_used)

    # ── Internals ──

    def _intent_to_mission_type(self, intent: str) -> MissionType:
        low = intent.lower()
        mapping = [
            (("crawl", "sweep", "all pages", "map site", "spider"), MissionType.SWEEP),
            (("extract", "harvest", "pull field", "structured", "scrape data"), MissionType.HARVEST),
            (("monitor", "watch", "patrol", "change", "diff"), MissionType.PATROL),
            (("api", "endpoint", "intercept", "rest", "graphql"), MissionType.INTERCEPT),
            (("sitemap", "survey", "discover", "index"), MissionType.SURVEY),
            (("batch", "multiple", "list", "bulk"), MissionType.BATCH_OPS),
            (("recon", "read", "check", "look at", "page", "grab", "fetch", "scrape the"), MissionType.RECON),
        ]
        for keywords, mtype in mapping:
            if any(k in low for k in keywords):
                return mtype
        # Default fallback
        return MissionType.RECON

    def _check_policy(self, mission: Mission) -> tuple[bool, str, bool]:
        """Returns (allowed, reason, requires_sign_off)."""
        from urllib.parse import urlparse
        domains = {urlparse(t).netloc for t in mission.targets if t}

        # Denylist
        for d in domains:
            if d in self.policy.denied_domains:
                return False, f"Domain {d} is on denylist", False

        # Quota
        today_key = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        for d in domains:
            key = f"{today_key}::{d}"
            used = self._domain_quota_used.get(key, 0)
            if used + len(mission.targets) > self.policy.daily_quota_per_domain:
                return False, f"Daily quota exceeded for {d}", False

        mission_type_str = mission.mission_type.value

        # Always restricted
        if mission_type_str in self.policy.always_restricted:
            return True, f"{mission_type_str} is restricted mission type", True

        # Size threshold
        if len(mission.targets) >= self.policy.sign_off_threshold:
            return (
                True,
                f"Target count {len(mission.targets)} >= sign-off threshold",
                True,
            )

        # Freely allowed
        if mission_type_str in self.policy.freely_allowed:
            return True, "freely allowed", False

        # Default: require sign-off
        return True, "default policy: sign-off required", True

    async def _dispatch_and_audit(
        self,
        mission: Mission,
        signed_off_by: Optional[str],
    ) -> Mission:
        """Dispatch via Chicken_Hawk and log to doctrine journal."""
        start = time.monotonic()
        dispatched = await self.squad.chicken_hawk.dispatch(mission)
        elapsed = time.monotonic() - start

        # Update quota ledger
        from urllib.parse import urlparse
        today_key = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        for t in dispatched.targets:
            d = urlparse(t).netloc
            key = f"{today_key}::{d}"
            self._domain_quota_used[key] = self._domain_quota_used.get(key, 0) + 1

        self._log_doctrine(dispatched, signed_off_by)
        return dispatched

    def _log_doctrine(self, mission: Mission, signed_off_by: Optional[str]) -> None:
        """
        Append a mission to the doctrine journal.

        Local-first: always writes to doctrine.jsonl on disk (the
        authoritative audit trail from General_Ang's perspective).

        If a SmelterStorage instance has been injected (by the gateway
        on_startup), a Puter + GCS dual-write is scheduled as a
        fire-and-forget background task. Failures are logged but
        never block the local write.
        """
        from urllib.parse import urlparse
        primary_domain = (
            urlparse(mission.targets[0]).netloc if mission.targets else "none"
        )
        entry = DoctrineEntry(
            mission_id=mission.mission_id,
            mission_type=mission.mission_type.value,
            target_count=len(mission.targets),
            primary_domain=primary_domain,
            signed_off_by=signed_off_by,
            status=mission.status,
            throughput_pps=mission.kpis.get("throughput_pps", 0.0),
            timestamp=datetime.now(timezone.utc).isoformat(),
            kpi_snapshot=dict(mission.kpis),
        )
        entry_dict = asdict(entry)

        # Local doctrine.jsonl — always
        with self.doctrine_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry_dict) + "\n")

        # Puter primary + GCS backup — fire and forget
        if self.storage is not None:
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(self._dual_write_doctrine(entry_dict))
            except RuntimeError:
                # Not in an async context (e.g. CLI mode) — skip dual-write
                pass

    async def _dual_write_doctrine(self, entry: Dict[str, Any]) -> None:
        try:
            result = await self.storage.log_doctrine(entry)  # type: ignore[union-attr]
            self.logger.debug(
                f"Doctrine dual-write: puter={result.get('puter')} gcs={result.get('gcs')}"
            )
        except Exception as e:
            self.logger.warning(f"Doctrine dual-write failed: {e}")


# ═════════════════════════════════════════════════════════════════════════
#  ACHEEVY BRIDGE — async facade for ACHEEVY to call
# ═════════════════════════════════════════════════════════════════════════

class AcheevyBridge:
    """
    ACHEEVY calls this. It wraps General_Ang and exposes a clean
    async interface that maps 1:1 to ACHEEVY's tool surface.

    ACHEEVY does not know about Chicken_Hawk, policy, or the Hawks. It
    only sees:
        await bridge.scrape_intent(intent, targets)
        await bridge.status()
        await bridge.approve(mission_id)
    """

    def __init__(self, general_ang: GeneralAng):
        self.general = general_ang
        self.logger = logging.getLogger("ACHEEVY_Bridge")

    async def scrape_intent(
        self,
        intent: str,
        targets: List[str],
        **config,
    ) -> Dict[str, Any]:
        """
        Primary ACHEEVY entry point. Accepts natural-language intent +
        target URLs. Returns a clean dict ACHEEVY can turn into a user
        reply.
        """
        mission = await self.general.accept_intent(
            intent=intent,
            targets=targets,
            requested_by="acheevy",
            **config,
        )
        return {
            "mission_id": mission.mission_id,
            "type": mission.mission_type.value,
            "status": mission.status,
            "target_count": len(mission.targets),
            "results_count": len(mission.results),
            "error": mission.error,
            "kpis": mission.kpis,
            "needs_sign_off": mission.status == "pending_signoff",
            "doctrine_reason": mission.config.get("policy_reason"),
        }

    async def status(self) -> Dict[str, Any]:
        return {
            "pending": self.general.pending_missions(),
            "quota": self.general.quota_report(),
            "recent_doctrine": self.general.doctrine_summary(limit=20),
        }

    async def approve(self, mission_id: str) -> Dict[str, Any]:
        mission = await self.general.approve(mission_id)
        return {
            "mission_id": mission.mission_id,
            "status": mission.status,
            "error": mission.error,
            "kpis": mission.kpis,
        }

    async def deny(self, mission_id: str, reason: str) -> Dict[str, Any]:
        mission = self.general.deny(mission_id, reason)
        return {"mission_id": mission.mission_id, "status": mission.status}


# ═════════════════════════════════════════════════════════════════════════
#  FACTORY — the "blessed" way to bring the whole chain online
# ═════════════════════════════════════════════════════════════════════════

async def launch_full_stack(
    policy: Optional[Policy] = None,
    doctrine_path: Union[str, Path] = "./doctrine.jsonl",
    **squad_kwargs,
) -> tuple[FullScrappHawkSquadrun, GeneralAng, AcheevyBridge]:
    """
    Bring the full ACHEEVY → General_Ang → Chicken_Hawk → Sqwaadrun
    chain online. Caller is responsible for calling `await squad.shutdown()`
    when done.

    Example:
        squad, general, bridge = await launch_full_stack()
        try:
            result = await bridge.scrape_intent(
                "grab the front page", ["https://example.com"],
            )
            print(result)
        finally:
            await squad.shutdown()
    """
    squad = FullScrappHawkSquadrun(**squad_kwargs)
    await squad.startup()
    general = GeneralAng(squad, policy=policy, doctrine_path=doctrine_path)
    bridge = AcheevyBridge(general)
    return squad, general, bridge
