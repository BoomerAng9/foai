"""
Sqwaadrun storage layer — Puter + GCS dual-write facade
==========================================================
Smelter OS native storage on Puter. Scalable infrastructure on GCS.
Both writes fire in parallel, neither blocks the other on failure.

Architecture rule (immutable):
    Puter is home. GCS is scale. Both write. Neither blocks.

Classes:
    PuterStorage   — aiohttp client against the self-hosted Puter container
    GCSStorage     — google-cloud-storage wrapper for foai-aims buckets
    SmelterStorage — unified facade used by the gateway + TRCC pipeline

Routing rules (who writes where):
    store_mission_result — Puter + GCS
    store_ingot          — Puter + GCS (GCS public CDN URL returned)
    store_media          — Puter + GCS (GCS public CDN URL returned)
    log_heartbeat        — Puter ONLY (Chronicle Ledger, never GCS)
    log_doctrine         — Puter primary, GCS backup
    read_mission         — Puter first, GCS fallback

Both Puter and GCS are soft dependencies. If the respective client
library is missing or the service is unreachable, writes return
{puter: False, gcs: False} and the caller can decide whether to retry.
Reads fall through — None is returned if neither backend has the data.

Env vars (all optional — missing vars degrade gracefully):
    PUTER_BASE_URL          http://smelter-puter:4100 (internal Docker)
    PUTER_API_KEY           Bearer token for Puter API
    GCP_PROJECT_ID          foai-aims
    GCS_ARTIFACTS_BUCKET    foai-sqwaadrun-artifacts
    GCS_INGOTS_BUCKET       foai-ingots
    GCS_MEDIA_BUCKET        foai-media
    GCS_BACKUPS_BUCKET      foai-backups
    GOOGLE_APPLICATION_CREDENTIALS  (handled by google-cloud-storage)
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from pathlib import PurePosixPath
from typing import Any, Dict, Optional, Union

import aiohttp

# ─── Optional GCS import — degrade gracefully if missing ──────────────
try:
    from google.cloud import storage as _gcs  # type: ignore
    GCS_AVAILABLE = True
except Exception:  # pragma: no cover — missing dep is expected in dev
    _gcs = None  # type: ignore
    GCS_AVAILABLE = False

logger = logging.getLogger("Sqwaadrun.Storage")


# ─── Env accessors (runtime-safe, never cached at import) ─────────────

def _puter_base_url() -> str:
    return os.environ.get("PUTER_BASE_URL", "").rstrip("/")


def _puter_api_key() -> str:
    return os.environ.get("PUTER_API_KEY", "")


def _gcp_project() -> str:
    return os.environ.get("GCP_PROJECT_ID", "foai-aims")


def _bucket(name: str, default: str) -> str:
    return os.environ.get(name, default)


# ═════════════════════════════════════════════════════════════════════════
#  PUTER STORAGE — Smelter OS native
# ═════════════════════════════════════════════════════════════════════════

class PuterStorage:
    """
    Smelter OS native storage via the Puter HTTP API.

    All paths are relative to the /smelter-os/ root — the client
    prefixes it automatically. Missing directories are created
    recursively on write.

    If PUTER_BASE_URL is not set, every operation returns a
    not-available sentinel — the caller should treat this as a
    soft failure, not a crash.
    """

    SMELTER_ROOT = "/smelter-os"

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout_seconds: float = 10.0,
    ):
        self._base = (base_url if base_url is not None else _puter_base_url())
        self._key = api_key if api_key is not None else _puter_api_key()
        self._timeout = aiohttp.ClientTimeout(total=timeout_seconds)

    @property
    def available(self) -> bool:
        return bool(self._base)

    def _headers(self) -> Dict[str, str]:
        h = {"Content-Type": "application/json"}
        if self._key:
            h["Authorization"] = f"Bearer {self._key}"
        return h

    def _full(self, path: str) -> str:
        """Normalize a relative path to the full Puter path under /smelter-os/.
        Prevents path traversal attacks via ../ sequences."""
        clean = path.lstrip("/")
        if ".." in clean or clean.startswith("/"):
            raise ValueError(f"path traversal blocked: {path}")
        full = f"{self.SMELTER_ROOT}/{clean}"
        from posixpath import normpath
        normalized = normpath(full)
        if not normalized.startswith(self.SMELTER_ROOT):
            raise ValueError(f"path traversal blocked: {path}")
        return normalized

    async def write(
        self,
        path: str,
        data: Union[str, bytes],
        content_type: str = "application/json",
    ) -> bool:
        """
        Write a file to Puter. Creates parent directories as needed.
        Returns True on success, False on any failure.
        """
        if not self.available:
            return False

        full = self._full(path)
        parent = str(PurePosixPath(full).parent)

        try:
            async with aiohttp.ClientSession(timeout=self._timeout) as session:
                # Best-effort mkdir parents
                try:
                    await session.post(
                        f"{self._base}/mkdir",
                        headers=self._headers(),
                        json={"path": parent, "create_missing_parents": True},
                    )
                except Exception:
                    # mkdir failure is survivable — write may still work
                    pass

                body: Dict[str, Any]
                if isinstance(data, bytes):
                    # Puter HTTP accepts base64 for binary via a different path
                    import base64
                    body = {
                        "path": full,
                        "content_base64": base64.b64encode(data).decode("ascii"),
                        "content_type": content_type,
                    }
                else:
                    body = {
                        "path": full,
                        "content": data,
                        "content_type": content_type,
                    }

                resp = await session.post(
                    f"{self._base}/write",
                    headers=self._headers(),
                    json=body,
                )
                ok = resp.status in (200, 201)
                if not ok:
                    text = await resp.text()
                    logger.warning(
                        f"Puter write {resp.status} for {full}: {text[:200]}"
                    )
                return ok
        except asyncio.TimeoutError:
            logger.warning(f"Puter write timeout for {full}")
            return False
        except Exception as e:
            logger.warning(f"Puter write failed for {full}: {e}")
            return False

    async def read(self, path: str) -> Optional[str]:
        if not self.available:
            return None
        full = self._full(path)
        try:
            async with aiohttp.ClientSession(timeout=self._timeout) as session:
                resp = await session.get(
                    f"{self._base}/read",
                    headers=self._headers(),
                    params={"path": full},
                )
                if resp.status == 200:
                    return await resp.text()
                return None
        except Exception as e:
            logger.warning(f"Puter read failed for {full}: {e}")
            return None

    async def list_dir(self, path: str) -> list:
        if not self.available:
            return []
        full = self._full(path)
        try:
            async with aiohttp.ClientSession(timeout=self._timeout) as session:
                resp = await session.get(
                    f"{self._base}/readdir",
                    headers=self._headers(),
                    params={"path": full},
                )
                if resp.status == 200:
                    return await resp.json()
                return []
        except Exception as e:
            logger.warning(f"Puter list failed for {full}: {e}")
            return []


# ═════════════════════════════════════════════════════════════════════════
#  GCS STORAGE — Scalable infrastructure
# ═════════════════════════════════════════════════════════════════════════

class GCSStorage:
    """
    Google Cloud Storage wrapper. Uses Application Default Credentials
    (GOOGLE_APPLICATION_CREDENTIALS) or the VM's attached service account.

    All read/write methods run the blocking google-cloud-storage client
    off the event loop via asyncio.to_thread so they don't stall the
    aiohttp gateway.

    Degrades gracefully if google-cloud-storage is not installed.
    """

    def __init__(self, project: Optional[str] = None):
        self._project = project or _gcp_project()
        self._client: Any = None
        if GCS_AVAILABLE:
            try:
                self._client = _gcs.Client(project=self._project)  # type: ignore
            except Exception as e:
                logger.warning(f"GCS client init failed: {e}")
                self._client = None

    @property
    def available(self) -> bool:
        return self._client is not None

    async def write(
        self,
        bucket_name: str,
        blob_path: str,
        data: Union[str, bytes],
        content_type: str = "application/json",
    ) -> bool:
        if not self.available:
            return False

        def _upload() -> bool:
            try:
                bucket = self._client.bucket(bucket_name)
                blob = bucket.blob(blob_path)
                blob.upload_from_string(data, content_type=content_type)
                return True
            except Exception as e:
                logger.warning(f"GCS write failed for {bucket_name}/{blob_path}: {e}")
                return False

        return await asyncio.to_thread(_upload)

    async def read(self, bucket_name: str, blob_path: str) -> Optional[str]:
        if not self.available:
            return None

        def _download() -> Optional[str]:
            try:
                bucket = self._client.bucket(bucket_name)
                blob = bucket.blob(blob_path)
                if not blob.exists():
                    return None
                return blob.download_as_text()
            except Exception as e:
                logger.warning(f"GCS read failed for {bucket_name}/{blob_path}: {e}")
                return None

        return await asyncio.to_thread(_download)

    def get_public_url(self, bucket_name: str, blob_path: str, expiry_minutes: int = 60) -> str:
        """Generate a signed URL for secure, time-limited access. Never returns raw public URLs."""
        try:
            from datetime import timedelta
            bucket = self._client.bucket(bucket_name)
            blob = bucket.blob(blob_path)
            return blob.generate_signed_url(
                version="v4",
                expiration=timedelta(minutes=expiry_minutes),
                method="GET",
            )
        except Exception as e:
            logger.warning(f"Signed URL generation failed for {bucket_name}/{blob_path}: {e}")
            return ""


# ═════════════════════════════════════════════════════════════════════════
#  SMELTER STORAGE — Unified write-through facade
# ═════════════════════════════════════════════════════════════════════════

class SmelterStorage:
    """
    The single storage interface for everything inside the Sqwaadrun
    gateway and TRCC pipeline.

    Every method that writes to both backends does so with
    asyncio.gather(..., return_exceptions=True) so neither backend
    blocks the other. Results come back as a dict with boolean
    indicators per backend.

    Reads prefer Puter (source of truth). GCS is the safety net.
    """

    def __init__(
        self,
        puter: Optional[PuterStorage] = None,
        gcs: Optional[GCSStorage] = None,
    ):
        self.puter = puter or PuterStorage()
        self.gcs = gcs or GCSStorage()
        self.logger = logger

        self.artifacts_bucket = _bucket("GCS_ARTIFACTS_BUCKET", "foai-sqwaadrun-artifacts")
        self.ingots_bucket = _bucket("GCS_INGOTS_BUCKET", "foai-ingots")
        self.media_bucket = _bucket("GCS_MEDIA_BUCKET", "foai-media")
        self.backups_bucket = _bucket("GCS_BACKUPS_BUCKET", "foai-backups")

        self.logger.info(
            f"SmelterStorage init — puter={'online' if self.puter.available else 'offline'} "
            f"gcs={'online' if self.gcs.available else 'offline'}"
        )

    # ── Mission results — per-user namespace ───────────────────────────
    #
    # Customer missions land under customer/<user_id>/missions/<id>/...
    # Admin missions (SQWAADRUN_API_KEY bearer) land under admin/missions/
    # so operator traffic doesn't pollute any customer prefix. The cti-hub
    # signed-download route enforces that a caller can only resolve paths
    # under their own user_id prefix, giving per-tenant isolation at the
    # artifact layer.

    @staticmethod
    def _sanitize_user_id(user_id: Optional[str]) -> str:
        """Harden user_id so it can't escape its own prefix via ../ or slashes."""
        if not user_id or user_id == "admin":
            return "admin"
        # Firebase UIDs are [A-Za-z0-9]{28} in practice — strict allowlist
        # still lets us tolerate internal test IDs while rejecting traversal.
        safe = "".join(c for c in user_id if c.isalnum() or c in ("-", "_"))
        return safe or "anonymous"

    def _mission_prefix(self, user_id: Optional[str], mission_id: str) -> tuple[str, str]:
        """(puter_prefix, gcs_prefix) — both scoped to the caller's namespace."""
        safe = self._sanitize_user_id(user_id)
        if safe == "admin":
            return (
                f"sqwaadrun/admin/missions/{mission_id}",
                f"admin/missions/{mission_id}",
            )
        return (
            f"sqwaadrun/customer/{safe}/missions/{mission_id}",
            f"customer/{safe}/missions/{mission_id}",
        )

    async def store_mission_result(
        self,
        mission_id: str,
        data: Dict[str, Any],
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Persist a completed mission to both backends under the caller's
        per-user namespace. Returns {puter: bool, gcs: bool}.
        """
        json_data = json.dumps(data, indent=2, default=str)
        puter_prefix, gcs_prefix = self._mission_prefix(user_id, mission_id)
        puter_path = f"{puter_prefix}/results.json"
        gcs_path = f"{gcs_prefix}/results.json"

        puter_ok, gcs_ok = await asyncio.gather(
            self.puter.write(puter_path, json_data),
            self.gcs.write(self.artifacts_bucket, gcs_path, json_data),
            return_exceptions=True,
        )

        return {
            "puter": bool(puter_ok) if not isinstance(puter_ok, Exception) else False,
            "gcs": bool(gcs_ok) if not isinstance(gcs_ok, Exception) else False,
            "gcs_path": gcs_path,
        }

    async def store_mission_manifest(
        self,
        mission_id: str,
        manifest: Dict[str, Any],
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Write the mission manifest (intent, targets, config) separately."""
        json_data = json.dumps(manifest, indent=2, default=str)
        puter_prefix, gcs_prefix = self._mission_prefix(user_id, mission_id)
        puter_path = f"{puter_prefix}/manifest.json"
        gcs_path = f"{gcs_prefix}/manifest.json"

        puter_ok, gcs_ok = await asyncio.gather(
            self.puter.write(puter_path, json_data),
            self.gcs.write(self.artifacts_bucket, gcs_path, json_data),
            return_exceptions=True,
        )
        return {
            "puter": bool(puter_ok) if not isinstance(puter_ok, Exception) else False,
            "gcs": bool(gcs_ok) if not isinstance(gcs_ok, Exception) else False,
            "gcs_path": gcs_path,
        }

    async def store_mission_artifact(
        self,
        mission_id: str,
        artifact_name: str,
        data: Union[str, bytes],
        content_type: str = "application/octet-stream",
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Per-URL artifact (raw HTML, markdown, etc.) for a mission."""
        puter_prefix, gcs_prefix = self._mission_prefix(user_id, mission_id)
        puter_path = f"{puter_prefix}/artifacts/{artifact_name}"
        gcs_path = f"{gcs_prefix}/artifacts/{artifact_name}"

        puter_ok, gcs_ok = await asyncio.gather(
            self.puter.write(puter_path, data, content_type),
            self.gcs.write(self.artifacts_bucket, gcs_path, data, content_type),
            return_exceptions=True,
        )
        return {
            "puter": bool(puter_ok) if not isinstance(puter_ok, Exception) else False,
            "gcs": bool(gcs_ok) if not isinstance(gcs_ok, Exception) else False,
            "gcs_path": gcs_path,
        }

    async def read_mission(
        self,
        mission_id: str,
        user_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Puter first, GCS fallback — both scoped to caller's namespace."""
        puter_prefix, gcs_prefix = self._mission_prefix(user_id, mission_id)
        puter_path = f"{puter_prefix}/results.json"
        data = await self.puter.read(puter_path)
        if data:
            try:
                return json.loads(data)
            except json.JSONDecodeError:
                pass

        gcs_path = f"{gcs_prefix}/results.json"
        data = await self.gcs.read(self.artifacts_bucket, gcs_path)
        if data:
            try:
                return json.loads(data)
            except json.JSONDecodeError:
                pass

        return None

    # ── Ingots ─────────────────────────────────────────────────────────

    async def store_ingot(
        self,
        ingot_id: str,
        format_type: str,
        data: Union[str, bytes],
        content_type: str,
    ) -> Dict[str, Any]:
        """
        Store a certified Ingot. Format types: presentations, documents,
        webpages, social, raw.
        """
        puter_path = f"ingots/{format_type}/{ingot_id}"
        gcs_path = f"{format_type}/{ingot_id}"

        puter_ok, gcs_ok = await asyncio.gather(
            self.puter.write(puter_path, data, content_type),
            self.gcs.write(self.ingots_bucket, gcs_path, data, content_type),
            return_exceptions=True,
        )

        result: Dict[str, Any] = {
            "puter": bool(puter_ok) if not isinstance(puter_ok, Exception) else False,
            "gcs": bool(gcs_ok) if not isinstance(gcs_ok, Exception) else False,
        }
        if result["gcs"]:
            result["public_url"] = self.gcs.get_public_url(self.ingots_bucket, gcs_path)
        return result

    # ── Media (images, video, audio) ───────────────────────────────────

    async def store_media(
        self,
        media_type: str,
        media_id: str,
        data: bytes,
        content_type: str,
    ) -> Dict[str, Any]:
        """Media types: images, video, audio, thumbnails."""
        puter_path = f"media/{media_type}/{media_id}"
        gcs_path = f"{media_type}/{media_id}"

        puter_ok, gcs_ok = await asyncio.gather(
            self.puter.write(puter_path, data, content_type),
            self.gcs.write(self.media_bucket, gcs_path, data, content_type),
            return_exceptions=True,
        )

        result: Dict[str, Any] = {
            "puter": bool(puter_ok) if not isinstance(puter_ok, Exception) else False,
            "gcs": bool(gcs_ok) if not isinstance(gcs_ok, Exception) else False,
        }
        if result["gcs"]:
            result["public_url"] = self.gcs.get_public_url(self.media_bucket, gcs_path)
        return result

    # ── Heartbeat — Puter ONLY (Chronicle Ledger) ──────────────────────

    async def log_heartbeat(self, report: Dict[str, Any]) -> bool:
        """
        Heartbeat reports land in Puter /chronicle/ledger/ ONLY.
        Never GCS. Never customer-facing.
        """
        from datetime import datetime, timezone
        timestamp = report.get(
            "timestamp",
            datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S"),
        )
        path = f"chronicle/ledger/heartbeat-{timestamp}.json"
        return await self.puter.write(path, json.dumps(report, default=str))

    # ── Doctrine — Puter primary, GCS backup ──────────────────────────

    async def log_doctrine(self, entry: Dict[str, Any]) -> Dict[str, Any]:
        """
        General_Ang mission audit. Appended to Puter's doctrine.jsonl,
        backed up to GCS as individual per-entry files for durability.
        """
        line = json.dumps(entry, default=str) + "\n"
        ts = entry.get("timestamp", "unknown")

        puter_path = "sqwaadrun/doctrine/doctrine.jsonl"
        gcs_path = f"doctrine/doctrine-{ts}.json"

        # Note: Puter write REPLACES the file. For a true append we
        # would read + concat + write, which is expensive for every
        # entry. For MVP we write per-entry files and leave aggregation
        # to a nightly rollup. Same pattern as the GCS backup.
        puter_path_per_entry = f"sqwaadrun/doctrine/entries/doctrine-{ts}.json"

        puter_ok, gcs_ok = await asyncio.gather(
            self.puter.write(puter_path_per_entry, line),
            self.gcs.write(self.backups_bucket, gcs_path, line),
            return_exceptions=True,
        )

        return {
            "puter": bool(puter_ok) if not isinstance(puter_ok, Exception) else False,
            "gcs": bool(gcs_ok) if not isinstance(gcs_ok, Exception) else False,
        }


# ═════════════════════════════════════════════════════════════════════════
#  MODULE SINGLETON — lazy init on first access
# ═════════════════════════════════════════════════════════════════════════

_singleton: Optional[SmelterStorage] = None


def get_storage() -> SmelterStorage:
    """Lazy singleton. Safe to call from anywhere in the gateway."""
    global _singleton
    if _singleton is None:
        _singleton = SmelterStorage()
    return _singleton
