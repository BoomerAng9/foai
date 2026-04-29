# Free GPU Imager

**SDXL Base 1.0 on a free Google Colab T4, exposed as a REST API via FastAPI + ngrok. $0/image.**

The development-tier image generator for FOAI. Production imagery still routes through Recraft V4 / Ideogram 3.0 / GPT Image 2.0 per Iller_Ang's standing routing — this gives the team a free, controllable path for staging, batch regeneration, and prompt iteration.

## What you get

- A Jupyter notebook that runs end-to-end on Colab's free tier
- A live REST API at a public ngrok URL (`POST /generate`, `GET /health`, Swagger at `/docs`)
- A Python client (`client.py`) and a Sqwaadrun-portrait batch example (`examples/sqwaadrun_portraits.py`)
- Reproducibility via explicit seeds; raw base64 PNG over the wire

## Quick start

1. Open `notebook.ipynb` in Colab: https://colab.research.google.com → File → Upload notebook
2. **Runtime → Change runtime type → T4 GPU**
3. **Tools → Secrets** — add two secrets and toggle notebook access ON for both:
   - `HF_TOKEN` from https://huggingface.co/settings/tokens (read scope is fine)
   - `NGROK_AUTH_TOKEN` from https://dashboard.ngrok.com/get-started/your-authtoken
4. **Runtime → Run all**

The notebook is pinned to the owner's reserved ngrok domain `https://avoid-capably-broadcast.ngrok-free.dev`, so the API URL is the same across Colab restarts. After ~3 minutes (model download + load), hit `https://avoid-capably-broadcast.ngrok-free.dev/docs` to test in the browser, or call from any client.

## Pinned versions (verified at PyPI 2026-04-27)

| Package | Version |
|---|---|
| `diffusers` | 0.37.1 |
| `transformers` | 5.6.2 |
| `accelerate` | 1.13.0 |
| `fastapi` | 0.136.1 |
| `pyngrok` | 8.1.1 |
| `gradio` | 6.13.0 |

`torch` is provided by Colab — do not pin it.

## API

### `POST /generate`

```json
{
  "prompt": "string (required, 1-2000 chars)",
  "negative_prompt": "string (optional)",
  "num_inference_steps": 30,
  "guidance_scale": 7.5,
  "width": 1024,
  "height": 1024,
  "seed": -1
}
```

Response:
```json
{
  "image_base64": "iVBORw0KGgo...",
  "seed": 42,
  "elapsed_seconds": 11.4,
  "model": "stabilityai/stable-diffusion-xl-base-1.0"
}
```

### `GET /health`

```json
{
  "ok": true,
  "model": "stabilityai/stable-diffusion-xl-base-1.0",
  "device": "cuda:0",
  "dtype": "torch.float16"
}
```

## Calling from FOAI

```python
from foai.free_gpu_imager.client import FreeGpuImager

api = FreeGpuImager('https://your-tunnel.ngrok.app')
img = api.generate('a hawk in tactical gear, photoreal', steps=30)
img.save('out.png')
```

See `examples/sqwaadrun_portraits.py` for the canonical pattern: roster → prompt template → batch generation → `hawk-ui/public/hawks/` drop.

## Limits & gotchas

- **Free Colab idles after ~90 min** of inactivity. The ngrok URL rotates each restart unless you pin a static domain on the ngrok side.
- **One request at a time.** SDXL on a T4 saturates the GPU. Concurrent requests queue (or fail) — wrap a `threading.Lock` if you need explicit serialization.
- **First call ~25 s, subsequent ~10-15 s** at 1024×1024 / 30 steps.
- **VRAM:** loaded pipeline ~7 GB; inference peaks ~11 GB. Drop to 768×768 if you hit OOM.
- **The base SDXL model is general-purpose.** Brand consistency across the Sqwaadrun fleet wants a LoRA fine-tune on canonical FOAI portraits — see `examples/sqwaadrun_portraits.py` for the prompt-engineering interim.

## Where this fits in FOAI

- **Iller_Ang's standing routing** (Recraft V4 / Ideogram 3.0 / GPT Image 2.0) is unchanged for production deliverables.
- This is the **free dev/staging path** — fine for prompt iteration, batch experiments, internal mockups.
- A future `Lil_Imager_Hawk` could wrap this endpoint behind the gateway's `/run` contract for owner-tier asynchronous image generation, with NemoClaw-checked rate limits.

## Files

```
free-gpu-imager/
├── notebook.ipynb              # Run this on Colab
├── README.md                   # You are here
├── client.py                   # Python client wrapper
└── examples/
    └── sqwaadrun_portraits.py  # Batch-regen the 17-hawk fleet
```
