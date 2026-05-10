"""FastAPI app wiring auth → KMS signing."""

from __future__ import annotations

import logging
import os
import re
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, status
from pydantic import BaseModel, Field

from vault_signer import auth, kms

log = logging.getLogger(__name__)

_HEX_SHA256 = re.compile(r"^[0-9a-f]{64}$")

app = FastAPI(
    title="vault-signer",
    description=(
        "GCP KMS signing facade for ACHIEVEMOR shield-policy per-substrate "
        "attestation. Per v1.6 §3.1 each substrate gets a distinct KMS key."
    ),
    version="0.1.0",
    docs_url=None if os.getenv("VAULT_SIGNER_HIDE_DOCS") == "1" else "/docs",
    redoc_url=None,
)


def _signer() -> kms.KmsSigner:
    """Dependency for the signer.

    Overridden in tests via `app.dependency_overrides[_signer]`.
    """
    return kms.CloudKmsSigner()


def _caller(
    authorization: Annotated[str | None, Header()] = None,
) -> auth.CallerIdentity:
    try:
        return auth.validate_bearer(authorization)
    except auth.AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc


class SignRequest(BaseModel):
    substrate: str = Field(
        ...,
        description=(
            "Rust target triple. One of x86_64-unknown-linux-gnu, "
            "aarch64-apple-darwin, wasm32-unknown-unknown."
        ),
        min_length=1,
        max_length=128,
    )
    artifact_sha256: str = Field(
        ...,
        description="SHA-256 digest of the artifact bytes, lowercase hex.",
        min_length=64,
        max_length=64,
    )


class SignResponse(BaseModel):
    signature: str
    signer_key_id: str
    signed_at_unix: int


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/sign", response_model=SignResponse)
def sign(
    req: SignRequest,
    caller: Annotated[auth.CallerIdentity, Depends(_caller)],
    signer: Annotated[kms.KmsSigner, Depends(_signer)],
) -> SignResponse:
    if not _HEX_SHA256.match(req.artifact_sha256):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="artifact_sha256 must be 64 lowercase hex chars",
        )

    try:
        result = signer.sign(req.substrate, req.artifact_sha256)
    except kms.UnknownSubstrate as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"unknown substrate: {exc}",
        ) from exc

    log.info(
        "signed substrate=%s caller=%s version=%s",
        req.substrate,
        caller.email,
        result.signer_key_id,
    )
    return SignResponse(
        signature=result.signature,
        signer_key_id=result.signer_key_id,
        signed_at_unix=result.signed_at_unix,
    )
