"""Local filesystem storage provider implementation."""

import io
import os
import shutil
import requests
from typing import BinaryIO
from pathlib import Path
from .base import BaseStorage


class LocalStorage(BaseStorage):
    """Local filesystem storage provider for dev / single-node deployments."""

    def __init__(
        self,
        base_path: str = "/.ii_agent/storage",
        public_base_url: str = "",
        custom_domain: str | None = None,
    ):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
        self.public_base_url = public_base_url.rstrip("/") if public_base_url else ""
        self.custom_domain = custom_domain

    def _resolve(self, path: str) -> Path:
        full = self.base_path / path
        full.parent.mkdir(parents=True, exist_ok=True)
        return full

    # ---- write -----------------------------------------------------------

    def write(
        self, content: BinaryIO, path: str, content_type: str | None = None
    ) -> str:
        dest = self._resolve(path)
        content.seek(0)
        with open(dest, "wb") as f:
            shutil.copyfileobj(content, f)
        return self.get_public_url(path)

    def write_from_url(
        self, url: str, path: str, content_type: str | None = None
    ) -> str:
        dest = self._resolve(path)
        with requests.get(url, stream=True) as resp:
            resp.raise_for_status()
            with open(dest, "wb") as f:
                shutil.copyfileobj(resp.raw, f)
        return self.get_public_url(path)

    # ---- read ------------------------------------------------------------

    def read(self, path: str) -> BinaryIO:
        full = self.base_path / path
        if not full.exists():
            raise FileNotFoundError(f"File '{path}' not found in local storage.")
        buf = io.BytesIO(full.read_bytes())
        buf.seek(0)
        return buf

    # ---- signed URLs (no-op for local) -----------------------------------

    def get_download_signed_url(
        self, path: str, expiration_seconds: int = 3600
    ) -> str | None:
        """Local storage has no signed URLs — return public URL instead."""
        return self.get_public_url(path)

    def get_upload_signed_url(
        self, path: str, content_type: str, expiration_seconds: int = 3600
    ) -> str:
        """Local storage has no signed URLs — return public URL instead."""
        return self.get_public_url(path)

    # ---- existence / size ------------------------------------------------

    def is_exists(self, path: str) -> bool:
        return (self.base_path / path).exists()

    def get_file_size(self, path: str) -> int:
        full = self.base_path / path
        if not full.exists():
            raise FileNotFoundError(f"File '{path}' not found in local storage.")
        return full.stat().st_size

    # ---- public / permanent URLs -----------------------------------------

    def get_public_url(self, path: str) -> str:
        if self.public_base_url:
            return f"{self.public_base_url}/{path}"
        return f"file://{self.base_path / path}"

    def get_permanent_url(self, path: str) -> str:
        if self.custom_domain:
            return f"https://{self.custom_domain}/{path}"
        return self.get_public_url(path)

    def upload_and_get_permanent_url(
        self, content: BinaryIO, path: str, content_type: str | None = None
    ) -> str:
        self.write(content, path, content_type)
        return self.get_permanent_url(path)
