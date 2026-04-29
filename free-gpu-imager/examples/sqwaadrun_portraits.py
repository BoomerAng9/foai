"""Batch-regenerate the 17-hawk Sqwaadrun fleet to match the Deploy Platform look.

Canonical reference: cti-hub/public/plugs/sqwaadrun.webp — a hand-drawn editorial
illustration with flat color blocks, sage-green sky with chalky speckles, warm-orange
and dark-navy palette, slightly grainy crayon/risograph texture. NOT pixel art.
NOT photorealistic. The JSON roster's "pixel art pose" phrase describes the POSE,
not the rendering style.

The current portraits in hawk-ui/public/hawks/ are photorealistic CG with detailed
feathers and rain — the wrong style. This script regenerates them in the
editorial-illustration look so the fleet matches the Deploy Platform.

Usage:
    # 1. Start the Colab notebook, copy its public ngrok URL
    # 2. Run from this directory:
    python examples/sqwaadrun_portraits.py \\
        --api https://your-tunnel.ngrok.app \\
        --out ~/foai/chicken-hawk/hawk-ui/public/hawks

    # Dry run (prints prompts, makes no API calls):
    python examples/sqwaadrun_portraits.py --dry-run

For tighter style consistency, the eventual upgrade is to LoRA-tune SDXL on a
small set of canonical sqwaadrun.webp-style images. The prompt-engineering
interim below gets you in the right ballpark without LoRA.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT / 'free-gpu-imager'))

from client import FreeGpuImager  # noqa: E402

DEFAULT_ROSTER = REPO_ROOT / 'smelter-os' / 'sqwaadrun' / 'sqwaadrun' / 'sqwaadrun_hawks.json'
DEFAULT_OUT = REPO_ROOT / 'chicken-hawk' / 'hawk-ui' / 'public' / 'hawks'

# Locked style header — applied to every hawk so the fleet reads as one collection.
# Mirrors cti-hub/public/plugs/sqwaadrun.webp: editorial illustration, flat color,
# crayon/risograph texture, limited palette. NO ACHEEVY-specific identity tokens
# here (orange visor, ANG patch, tactical hoodie) — those belong on ACHEEVY itself.
STYLE_HEADER = (
    'editorial illustration of an anthropomorphic hawk character, '
    'hand-drawn, flat color blocks, risograph print aesthetic, '
    'crayon and grease-pencil texture, slightly grainy paper finish, '
    'limited palette of sage green, warm orange, dark navy, off-white, '
    'simple bold shapes, naive figurative style, contemporary op-ed cartoon, '
    'NYT-illustration sensibility, single subject centered, full body or 3/4 view'
)

NEGATIVE = (
    'photorealistic, photograph, 3D render, hyperdetailed, realistic feathers, '
    'smooth gradients, painterly, watercolor, oil painting, soft focus, '
    'depth of field, cinematic lighting, dramatic rain, ornate, intricate, '
    'pixel art, 16-bit sprite, anime, cel shading, '
    'multiple subjects, busy background, text, watermark, signature, logo'
)


# The JSON's `visual` field uses the phrase "Pixel art pose: ..." to describe
# the pose. Strip that directive so the editorial-illustration style header
# isn't fighting a pixel-art instruction inside the same prompt.
def _clean_visual(raw: str) -> str:
    text = raw.strip()
    # Drop "Pixel art pose:" prefix (anywhere it appears) but keep the description.
    return text.replace('Pixel art pose:', 'Pose:').replace('pixel art pose:', 'pose:')


def build_prompt(hawk: dict) -> str:
    visual = _clean_visual(hawk.get('visual', ''))
    return f'{STYLE_HEADER}. {visual}'


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description='Regenerate Sqwaadrun fleet portraits.')
    p.add_argument(
        '--api',
        default='https://avoid-capably-broadcast.ngrok-free.dev',
        help='Public ngrok URL of the Colab notebook (default: owner reserved domain)',
    )
    p.add_argument('--roster', default=str(DEFAULT_ROSTER), help='Path to sqwaadrun_hawks.json')
    p.add_argument('--out', default=str(DEFAULT_OUT), help='Output directory for portraits')
    p.add_argument('--steps', type=int, default=35)
    p.add_argument('--guidance', type=float, default=9.0, help='Higher locks pixel-art style harder')
    p.add_argument('--width', type=int, default=1024)
    p.add_argument('--height', type=int, default=1024)
    p.add_argument('--seed-base', type=int, default=20260427, help='Per-hawk seed = base + index for reproducibility')
    p.add_argument('--only', nargs='*', help='Restrict to specific hawk ids (e.g. Lil_Guard_Hawk Lil_Snap_Hawk)')
    p.add_argument('--dry-run', action='store_true', help='Print prompts; do not call the API')
    return p.parse_args()


def main() -> int:
    args = parse_args()

    roster_path = Path(args.roster).expanduser()
    if not roster_path.exists():
        print(f'roster not found: {roster_path}', file=sys.stderr)
        return 2
    roster = json.loads(roster_path.read_text(encoding='utf-8'))

    if args.only:
        wanted = set(args.only)
        roster = [h for h in roster if h['id'] in wanted]
        if not roster:
            print(f'no hawks matched --only {args.only}', file=sys.stderr)
            return 2

    out_dir = Path(args.out).expanduser()
    if not args.dry_run:
        out_dir.mkdir(parents=True, exist_ok=True)
        api = FreeGpuImager(args.api)
        health = api.health()
        print(f'API healthy: {health}')

    for idx, hawk in enumerate(roster):
        prompt = build_prompt(hawk)
        seed = args.seed_base + idx
        filename = f'{hawk["id"].lower()}.png'
        out_path = out_dir / filename

        print(f'\n[{idx + 1:02d}/{len(roster):02d}] {hawk["id"]} -> {out_path.name}')
        print(f'  seed: {seed}')
        print(f'  prompt: {prompt[:140]}{"..." if len(prompt) > 140 else ""}')

        if args.dry_run:
            continue

        t0 = time.time()
        result = api.generate(
            prompt=prompt,
            negative_prompt=NEGATIVE,
            steps=args.steps,
            guidance=args.guidance,
            width=args.width,
            height=args.height,
            seed=seed,
        )
        result.save(out_path)
        wall = time.time() - t0
        print(f'  saved in {wall:.1f}s (gpu: {result.elapsed_seconds}s, seed used: {result.seed})')

    if not args.dry_run:
        print(f'\nDone. {len(roster)} portraits written to {out_dir}')
        print('Next: cd ~/foai/chicken-hawk && git status; commit when the look is right.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
