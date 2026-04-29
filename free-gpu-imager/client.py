"""Python client for the Free GPU Imager Colab REST API.

Usage:
    from client import FreeGpuImager
    api = FreeGpuImager('https://your-tunnel.ngrok.app')
    img = api.generate('a hawk in tactical gear, photoreal')
    img.save('out.png')
"""

from __future__ import annotations

import base64
import io
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import requests
from PIL import Image


@dataclass(frozen=True)
class GenerateResult:
    image: Image.Image
    seed: int
    elapsed_seconds: float
    model: str

    def save(self, path: str | Path, format: str = 'PNG') -> Path:
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        self.image.save(p, format=format)
        return p


class FreeGpuImager:
    def __init__(self, base_url: str, *, timeout: float = 180.0, retries: int = 2):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.retries = retries

    def health(self) -> dict:
        r = requests.get(f'{self.base_url}/health', timeout=10)
        r.raise_for_status()
        return r.json()

    def generate(
        self,
        prompt: str,
        *,
        negative_prompt: Optional[str] = None,
        steps: int = 30,
        guidance: float = 7.5,
        width: int = 1024,
        height: int = 1024,
        seed: Optional[int] = None,
    ) -> GenerateResult:
        payload = {
            'prompt': prompt,
            'negative_prompt': negative_prompt,
            'num_inference_steps': steps,
            'guidance_scale': guidance,
            'width': width,
            'height': height,
            'seed': -1 if seed is None else int(seed),
        }
        last_exc: Optional[Exception] = None
        for attempt in range(self.retries + 1):
            try:
                r = requests.post(
                    f'{self.base_url}/generate',
                    json=payload,
                    timeout=self.timeout,
                )
                r.raise_for_status()
                data = r.json()
                img = Image.open(io.BytesIO(base64.b64decode(data['image_base64'])))
                return GenerateResult(
                    image=img,
                    seed=int(data['seed']),
                    elapsed_seconds=float(data['elapsed_seconds']),
                    model=str(data['model']),
                )
            except (requests.RequestException, ValueError, KeyError) as exc:
                last_exc = exc
                if attempt < self.retries:
                    time.sleep(2 ** attempt)
                    continue
                raise
        raise RuntimeError(f'unreachable: {last_exc!r}')
