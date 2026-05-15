"""Taskade sync worker — main loop.

Reads unsynced rows from foai.audit_ledger every SYNC_INTERVAL_SECONDS,
renders each to HTML via the Taskade adapter, posts to the audit-ledger-mirror
folder (date-bucketed daily projects), marks the row synced.

On consecutive adapter failures > MAX_CONSECUTIVE_FAILURES, fires a Telegram
alert via Chicken Hawk's notifier.
"""
from __future__ import annotations

import hashlib
import logging
import signal
import sys
import time
from datetime import datetime, timezone
from typing import Optional

from .adapter_client import AdapterError, TaskadeAdapterClient
from .config import Settings
from .ledger_reader import AuditEvent, LedgerReader
from .notifier import send_alert

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s :: %(message)s",
)
log = logging.getLogger("taskade.sync_worker")


_STOP = False


def _request_stop(*_: object) -> None:
    global _STOP
    _STOP = True
    log.info("stop requested — finishing current cycle then exiting")


class SyncWorker:
    """One worker per process. Daily-bucketed project cache prevents
    re-creating the same audit-<YYYY-MM-DD> project across loop iterations.
    """

    def __init__(self, settings: Settings):
        self.settings = settings
        self.reader = LedgerReader(settings.neon_database_url)
        self.adapter = TaskadeAdapterClient(
            base_url=settings.taskade_adapter_url,
            bearer=settings.taskade_adapter_bearer,
        )
        # Daily bucket -> project_id
        self._project_cache: dict[str, str] = {}
        self._consecutive_failures = 0

    # ─── Sacred Separation: customer_uid hashing on the worker side ──
    def _hash_customer_uid(self, raw: Optional[str]) -> Optional[str]:
        if not raw:
            return None
        salt = self.settings.taskade_pii_salt
        if not salt:
            log.warning("TASKADE_PII_SALT empty — refusing to render customer_uid raw")
            return None
        return hashlib.sha256((salt + raw).encode("utf-8")).hexdigest()

    def _bucket_for(self, event: AuditEvent) -> str:
        ts = event.timestamp_event
        if not isinstance(ts, datetime):
            ts = datetime.now(timezone.utc)
        return f"audit-{ts.strftime('%Y-%m-%d')}"

    def _process_event(self, event: AuditEvent) -> None:
        """Render + push one audit event. Raises on adapter failure."""
        # Pre-hash customer_uid at the worker layer too (defense in depth) —
        # the adapter also hashes when surface=client_tier, but we never want
        # the raw UID to leave the worker process.
        params = self.reader.to_render_params(event, surface=self.settings.sacred_separation_surface)
        if params.get("customer_uid"):
            params["customer_uid"] = self._hash_customer_uid(params["customer_uid"])

        html_block = self.adapter.render_audit_html(params)

        bucket = self._bucket_for(event)
        existing = self._project_cache.get(bucket)
        project_id = self.adapter.project_create_or_update(
            workspace_id=self.settings.taskade_default_workspace_id,
            folder_id=self.settings.taskade_audit_ledger_folder_id,
            title=bucket,
            content_html=html_block,
            existing_project_id=existing,
        )
        self._project_cache[bucket] = project_id

    def run_one_cycle(self) -> dict[str, int]:
        """Single sync pass. Returns {synced, failed} counters."""
        unsynced = self.reader.fetch_unsynced(limit=100)
        if not unsynced:
            log.info("no unsynced events — sleeping")
            return {"synced": 0, "failed": 0}

        synced = 0
        failed = 0
        for event in unsynced:
            try:
                self._process_event(event)
                self.reader.mark_synced(str(event.event_id))
                synced += 1
                self._consecutive_failures = 0
            except AdapterError as e:
                log.warning("adapter error on event %s: %s", event.event_id, e)
                self.reader.mark_failed(str(event.event_id), str(e))
                failed += 1
                self._consecutive_failures += 1
                if self._consecutive_failures >= self.settings.max_consecutive_failures:
                    self._fire_alert(
                        f"sync worker: {self._consecutive_failures} consecutive failures",
                        f"Latest error: {e}",
                    )
                    # Break the cycle — next cycle will retry.
                    break
            except Exception as e:  # pragma: no cover — defensive
                log.exception("unexpected error on event %s", event.event_id)
                self.reader.mark_failed(str(event.event_id), repr(e))
                failed += 1
        log.info("cycle complete: synced=%d failed=%d", synced, failed)
        return {"synced": synced, "failed": failed}

    def _fire_alert(self, subject: str, body: str) -> None:
        send_alert(
            notifier_url=self.settings.chicken_hawk_notifier_url,
            bearer=self.settings.chicken_hawk_notifier_bearer,
            subject=subject,
            body=body,
        )

    def loop_forever(self) -> None:
        global _STOP
        signal.signal(signal.SIGINT, _request_stop)
        signal.signal(signal.SIGTERM, _request_stop)
        log.info(
            "starting sync loop interval=%ds workspace=%s folder=%s",
            self.settings.sync_interval_seconds,
            self.settings.taskade_default_workspace_id or "<unset>",
            self.settings.taskade_audit_ledger_folder_id or "<unset>",
        )
        while not _STOP:
            try:
                self.run_one_cycle()
            except Exception:  # pragma: no cover — defensive top-level
                log.exception("cycle crashed; sleeping then retrying")
            # Sleep in 1s chunks so SIGTERM is responsive.
            for _ in range(self.settings.sync_interval_seconds):
                if _STOP:
                    break
                time.sleep(1)
        log.info("sync loop exiting cleanly")


def main() -> int:
    settings = Settings()
    if not settings.taskade_default_workspace_id or not settings.taskade_audit_ledger_folder_id:
        log.error("TASKADE_DEFAULT_WORKSPACE_ID and TASKADE_AUDIT_LEDGER_FOLDER_ID must be set")
        return 2
    if not settings.taskade_adapter_bearer:
        log.error("TASKADE_ADAPTER_BEARER must be set")
        return 2
    if not settings.taskade_pii_salt:
        log.error("TASKADE_PII_SALT must be set (Sacred Separation enforcement)")
        return 2

    worker = SyncWorker(settings)
    worker.loop_forever()
    return 0


if __name__ == "__main__":
    sys.exit(main())
