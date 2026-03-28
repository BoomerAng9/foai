"""LUC Metering Engine — tracks every billable operation.

Records: LLM calls (tokens in/out, model, cost), scrapes, Sheets exports,
agent dispatches, and any other billable event. All data append-only.
"""

from datetime import datetime, timezone
from dataclasses import dataclass, field, asdict
from typing import Optional
import json

from .catalog import get_model

@dataclass
class UsageEvent:
    event_type: str           # llm_call, scrape, sheets_export, agent_dispatch
    service: str              # which service generated this
    model: Optional[str]      # OpenRouter model ID (for LLM calls)
    tokens_in: int = 0
    tokens_out: int = 0
    cost_usd: float = 0.0
    metadata: dict = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict:
        return asdict(self)


class LUCMeter:
    """In-memory meter with append-only event log.

    In production, events flush to Firestore luc_events collection.
    For now, holds state in memory + optional file-based log.
    """

    def __init__(self):
        self._events: list[UsageEvent] = []
        self._budget_limit_usd: float = 100.0  # daily budget ceiling
        self._daily_spend: float = 0.0
        self._daily_reset: str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    def _check_daily_reset(self):
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if today != self._daily_reset:
            self._daily_spend = 0.0
            self._daily_reset = today

    def set_budget(self, daily_limit_usd: float):
        self._budget_limit_usd = daily_limit_usd

    def can_spend(self, estimated_cost: float) -> bool:
        """Budget gate — returns False if spend would exceed daily limit."""
        self._check_daily_reset()
        return (self._daily_spend + estimated_cost) <= self._budget_limit_usd

    def estimate_llm_cost(self, model_id: str, est_tokens_in: int, est_tokens_out: int) -> float:
        """Estimate cost before making the call."""
        spec = get_model(model_id)
        if not spec:
            return 0.0
        cost_in = (est_tokens_in / 1_000_000) * spec.cost_in_per_m
        cost_out = (est_tokens_out / 1_000_000) * spec.cost_out_per_m
        return cost_in + cost_out

    def record_llm_call(
        self,
        service: str,
        model: str,
        tokens_in: int,
        tokens_out: int,
        metadata: dict | None = None,
    ) -> UsageEvent:
        """Record an LLM call and compute actual cost."""
        spec = get_model(model)
        cost_in = (tokens_in / 1_000_000) * spec.cost_in_per_m if spec else 0.0
        cost_out = (tokens_out / 1_000_000) * spec.cost_out_per_m if spec else 0.0
        cost = cost_in + cost_out

        event = UsageEvent(
            event_type="llm_call",
            service=service,
            model=model,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            cost_usd=cost,
            metadata=metadata or {},
        )
        self._events.append(event)
        self._daily_spend += cost
        return event

    def record_scrape(self, service: str, url: str, engine: str) -> UsageEvent:
        """Record a scrape operation. Firecrawl ~$0.001/page, Apify ~$0.005/page."""
        cost = 0.001 if engine == "firecrawl" else 0.005
        event = UsageEvent(
            event_type="scrape",
            service=service,
            model=None,
            cost_usd=cost,
            metadata={"url": url, "engine": engine},
        )
        self._events.append(event)
        self._daily_spend += cost
        return event

    def record_sheets_export(self, service: str, rows: int) -> UsageEvent:
        """Record a Sheets export. Google Sheets API is free within quota."""
        event = UsageEvent(
            event_type="sheets_export",
            service=service,
            model=None,
            cost_usd=0.0,
            metadata={"rows": rows},
        )
        self._events.append(event)
        return event

    def record_agent_dispatch(self, service: str, agent: str, task: str) -> UsageEvent:
        """Record an agent dispatch (no direct cost, but tracked for metrics)."""
        event = UsageEvent(
            event_type="agent_dispatch",
            service=service,
            model=None,
            cost_usd=0.0,
            metadata={"agent": agent, "task": task},
        )
        self._events.append(event)
        return event

    # ─── Metrics ──────────────────────────────────────────────

    @property
    def total_spend(self) -> float:
        return sum(e.cost_usd for e in self._events)

    @property
    def daily_spend(self) -> float:
        self._check_daily_reset()
        return self._daily_spend

    @property
    def daily_remaining(self) -> float:
        self._check_daily_reset()
        return max(0, self._budget_limit_usd - self._daily_spend)

    @property
    def event_count(self) -> int:
        return len(self._events)

    def get_metrics(self) -> dict:
        """Full metrics summary."""
        self._check_daily_reset()
        by_type: dict[str, float] = {}
        by_service: dict[str, float] = {}
        by_model: dict[str, float] = {}
        total_tokens_in = 0
        total_tokens_out = 0

        for e in self._events:
            by_type[e.event_type] = by_type.get(e.event_type, 0) + e.cost_usd
            by_service[e.service] = by_service.get(e.service, 0) + e.cost_usd
            if e.model:
                by_model[e.model] = by_model.get(e.model, 0) + e.cost_usd
            total_tokens_in += e.tokens_in
            total_tokens_out += e.tokens_out

        return {
            "total_spend_usd": round(self.total_spend, 6),
            "daily_spend_usd": round(self.daily_spend, 6),
            "daily_budget_usd": self._budget_limit_usd,
            "daily_remaining_usd": round(self.daily_remaining, 6),
            "total_events": self.event_count,
            "total_tokens_in": total_tokens_in,
            "total_tokens_out": total_tokens_out,
            "cost_by_type": {k: round(v, 6) for k, v in by_type.items()},
            "cost_by_service": {k: round(v, 6) for k, v in by_service.items()},
            "cost_by_model": {k: round(v, 6) for k, v in by_model.items()},
        }

    def recent_events(self, limit: int = 50) -> list[dict]:
        return [e.to_dict() for e in self._events[-limit:]]


# Singleton
luc_meter = LUCMeter()
