"""
gcs_adapter.py — Google Cloud Storage adapter for the ACHIEVEMOR platform.

Primary bucket: gs://smelter-os-personas/
Also used for: gs://foai-aims-*, avatar pipeline, reference library.

Authentication:
  1. GOOGLE_APPLICATION_CREDENTIALS env var (service account JSON path)
  2. GOOGLE_KEY env var (base64-encoded service account JSON)
  3. Default application credentials (gcloud auth)
"""

from __future__ import annotations

import base64
import json
import os
import tempfile
from dataclasses import dataclass
from typing import Optional


@dataclass
class GCSResult:
    """Result from a GCS operation."""

    success: bool
    data: Optional[bytes] = None
    error: Optional[str] = None
    path: Optional[str] = None
    files: Optional[list[str]] = None


# ---------------------------------------------------------------------------
# Client Factory
# ---------------------------------------------------------------------------

def _get_client():
    """Create an authenticated GCS client.

    Returns:
        google.cloud.storage.Client or None if not available.
    """
    try:
        from google.cloud import storage
    except ImportError:
        return None

    # Path 1: Standard credentials file
    if os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        return storage.Client()

    # Path 2: Base64-encoded key in GOOGLE_KEY
    encoded_key = os.environ.get("GOOGLE_KEY")
    if encoded_key:
        try:
            key_json = base64.b64decode(encoded_key)
            key_data = json.loads(key_json)
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".json", delete=False
            ) as tmp:
                json.dump(key_data, tmp)
                tmp_path = tmp.name
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = tmp_path
            return storage.Client()
        except Exception:
            pass

    # Path 3: Default application credentials
    try:
        return storage.Client()
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def upload(bucket: str, path: str, data: bytes) -> GCSResult:
    """Upload bytes to a GCS bucket.

    Args:
        bucket: Bucket name (e.g. 'smelter-os-personas').
        path: Object path within the bucket.
        data: Bytes to upload.

    Returns:
        GCSResult indicating success/failure.
    """
    client = _get_client()
    if client is None:
        return GCSResult(
            success=False,
            error=(
                "GCS client not available. Install google-cloud-storage "
                "and set GOOGLE_APPLICATION_CREDENTIALS."
            ),
        )

    try:
        bucket_obj = client.bucket(bucket)
        blob = bucket_obj.blob(path)
        blob.upload_from_string(data)
        return GCSResult(
            success=True,
            path=f"gs://{bucket}/{path}",
        )
    except Exception as exc:
        return GCSResult(success=False, error=str(exc))


def download(bucket: str, path: str) -> GCSResult:
    """Download an object from GCS.

    Args:
        bucket: Bucket name.
        path: Object path within the bucket.

    Returns:
        GCSResult with data bytes on success.
    """
    client = _get_client()
    if client is None:
        return GCSResult(
            success=False,
            error=(
                "GCS client not available. Install google-cloud-storage "
                "and set GOOGLE_APPLICATION_CREDENTIALS."
            ),
        )

    try:
        bucket_obj = client.bucket(bucket)
        blob = bucket_obj.blob(path)
        data = blob.download_as_bytes()
        return GCSResult(
            success=True,
            data=data,
            path=f"gs://{bucket}/{path}",
        )
    except Exception as exc:
        return GCSResult(success=False, error=str(exc))


def list_files(bucket: str, prefix: str = "") -> GCSResult:
    """List files in a GCS bucket under a prefix.

    Args:
        bucket: Bucket name.
        prefix: Path prefix to filter by (default: list all).

    Returns:
        GCSResult with list of file paths.
    """
    client = _get_client()
    if client is None:
        return GCSResult(
            success=False,
            error=(
                "GCS client not available. Install google-cloud-storage "
                "and set GOOGLE_APPLICATION_CREDENTIALS."
            ),
        )

    try:
        bucket_obj = client.bucket(bucket)
        blobs = bucket_obj.list_blobs(prefix=prefix)
        files = [blob.name for blob in blobs]
        return GCSResult(
            success=True,
            files=files,
        )
    except Exception as exc:
        return GCSResult(success=False, error=str(exc))


def upload_file(bucket: str, path: str, local_path: str) -> GCSResult:
    """Upload a local file to GCS.

    Args:
        bucket: Bucket name.
        path: Destination object path.
        local_path: Path to the local file.

    Returns:
        GCSResult indicating success/failure.
    """
    try:
        with open(local_path, "rb") as f:
            data = f.read()
        return upload(bucket, path, data)
    except FileNotFoundError:
        return GCSResult(success=False, error=f"Local file not found: {local_path}")
    except Exception as exc:
        return GCSResult(success=False, error=str(exc))
