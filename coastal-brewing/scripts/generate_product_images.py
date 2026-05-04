"""
Generate per-SKU product images for Coastal Brewing Co. via OpenRouter.

Routes to `openai/gpt-image` (OpenAI Image Gen 2.0) per owner directive
2026-05-04. Pricing (per `aims-tools/aims-pricing-matrix/src/seed-models.ts`):
$0.05/image. 229 missing SKUs ≈ $11.45 total.

Usage:
    # See what would be generated (no API calls, no spend)
    python generate_product_images.py --dry-run

    # Generate one SKU for visual review before batch run
    python generate_product_images.py --single coastal-italian-roast-12oz

    # Generate all SKUs missing from web/public/products/
    python generate_product_images.py --batch

After --batch completes, update _AVAILABLE_PRODUCT_IMAGES in catalog.py with
the new filenames (or refactor catalog.py to read the directory at boot).

Env: requires OPENROUTER_API_KEY. Writes to coastal-brewing/web/public/products/.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import time
from pathlib import Path

# Force UTF-8 on stdout/stderr so unicode in prompts/logs doesn't crash
# the script under Windows cp1252.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

import requests

REPO_ROOT = Path(__file__).resolve().parent.parent
PRODUCTS_DIR = REPO_ROOT / "web" / "public" / "products"
ANCHORS_DIR = REPO_ROOT / "assets" / "brand-anchors"

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
# `openai/gpt-5.4-image-2` on OpenRouter == `gpt-image-2` on direct OpenAI API
# (released 2026-04-21). The "5.4" is the text-reasoning backbone version,
# not a separate older image model. Per memory feedback_image_models_strict_allowlist_2026_05_04.md.
MODEL = "openai/gpt-5.4-image-2"
PRICE_PER_IMAGE_USD = 0.05  # approximate; verify against OR billing post-batch

# Brand-consistent prompt prefix. References the Coastal aesthetic without
# inventing supplier-specific details (per zero-fab canon).
BRAND_PREFIX = (
    "Studio product photograph for Coastal Brewing Co., a Lowcountry "
    "South Carolina coffee, tea, and matcha brand. Clean white seamless "
    "background, soft natural lighting from the upper left, slight shadow "
    "below the product. Square 1:1 framing, product centered with ~10% "
    "negative space margin. Editorial e-commerce style. No text overlays "
    "beyond what appears on the product label itself. No props, no "
    "lifestyle scene, no people, no pour shots — pure product on white. "
)


def _load_catalog():
    """Import the catalog module from this repo's scripts dir."""
    sys.path.insert(0, str(REPO_ROOT / "scripts"))
    import catalog  # noqa: E402
    return catalog.PRODUCTS


def _build_prompt(sku_id: str, p: dict) -> str:
    """Construct a deterministic per-SKU prompt from catalog metadata."""
    name = p.get("name", sku_id)
    category = p.get("category", "coffee")
    size = p.get("size", "")
    roast = p.get("roast_level", "")

    if category == "coffee" or category in ("flavored_coffee", "specialty_coffee"):
        bag_form = (
            f"craft kraft-paper coffee bag with a tin tie at the top, "
            f"product label reading '{name}'"
            f"{f', {size}' if size else ''}"
            f"{f', {roast} roast' if roast else ''}"
        )
    elif category == "tea":
        bag_form = (
            f"small loose-leaf tea pouch with a label reading '{name}'"
            f"{f', {size}' if size else ''}"
        )
    elif category == "matcha":
        bag_form = (
            f"small ceramic-look matcha tin or pouch labeled '{name}'"
            f"{f', {size}' if size else ''}"
        )
    elif category == "kcup":
        bag_form = f"recyclable K-cup pod box labeled '{name}'{f', {size}' if size else ''}"
    elif category == "bundle":
        bag_form = (
            f"curated bundle: 2-3 craft coffee bags arranged in a clean "
            f"flat-lay composition labeled '{name}'"
        )
    elif category == "subscription":
        bag_form = (
            f"single craft coffee bag with a small subscription card tag "
            f"reading '{name}'"
        )
    elif category == "functional" or "mushroom" in name.lower():
        bag_form = (
            f"functional coffee bag with subtle medicinal-mushroom iconography, "
            f"label reads '{name}'{f', {size}' if size else ''}"
        )
    else:
        bag_form = f"product packaging for '{name}'{f', {size}' if size else ''}"

    return BRAND_PREFIX + bag_form + ". Photographed at eye level, slight 5-degree tilt, sharp focus on the label."


def _missing_skus() -> list[tuple[str, dict]]:
    """Return SKUs whose declared image filename is not yet shipped.

    Reads `image_original` (the pre-substitution declared path), not `image`
    (which catalog._enrich_products has already rewritten to the fallback for
    missing SKUs). Without this, every SKU appears to have its image and the
    pipeline would never generate anything.
    """
    products = _load_catalog()
    have = {f.name for f in PRODUCTS_DIR.iterdir()} if PRODUCTS_DIR.exists() else set()
    # Fall back to the catalog's known-shipped frozenset when PRODUCTS_DIR
    # is unreadable (e.g. running inside coastal-runner where /app/web/ is
    # absent).
    if not have:
        try:
            sys.path.insert(0, str(REPO_ROOT / "scripts"))
            import catalog as _cat  # noqa: E402
            have = set(_cat._AVAILABLE_PRODUCT_IMAGES)
        except Exception:
            have = set()
    missing = []
    for sku_id, p in products.items():
        img_path = p.get("image_original") or p.get("image", "")
        if not img_path:
            continue
        fname = os.path.basename(img_path)
        if fname not in have:
            missing.append((sku_id, p))
    return missing


def _all_skus() -> list[tuple[str, dict]]:
    return list(_load_catalog().items())


def _generate_image(prompt: str, out_path: Path) -> bool:
    """Call OpenRouter, save image to out_path. Returns True on success."""
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY not set in environment")

    body = {
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "modalities": ["image", "text"],
    }
    resp = requests.post(
        OPENROUTER_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://brewing.foai.cloud",
            "X-Title": "Coastal Brewing Co - product imagery",
        },
        json=body,
        timeout=120,
    )
    if resp.status_code != 200:
        print(f"  ERROR: {resp.status_code} {resp.text[:300]}", file=sys.stderr)
        return False

    data = resp.json()
    # OpenRouter returns image content in choices[0].message.content
    # — exact shape may vary by model. Handle both URL and base64 forms.
    msg = data["choices"][0]["message"]
    images = msg.get("images") or []
    content = msg.get("content")

    img_bytes = None
    if images and isinstance(images, list):
        # OpenRouter standard: {"images": [{"image_url": {"url": "data:image/png;base64,..." or "https://..."}}]}
        first = images[0]
        url = first.get("image_url", {}).get("url") if isinstance(first, dict) else first
        if url and url.startswith("data:image/"):
            img_bytes = base64.b64decode(url.split(",", 1)[1])
        elif url:
            img_resp = requests.get(url, timeout=60)
            img_bytes = img_resp.content
    elif isinstance(content, list):
        for part in content:
            if isinstance(part, dict) and part.get("type") in ("image", "image_url"):
                url = part.get("image_url", {}).get("url") or part.get("data")
                if url and url.startswith("data:image/"):
                    img_bytes = base64.b64decode(url.split(",", 1)[1])
                    break

    if not img_bytes:
        print(f"  ERROR: response did not contain image bytes. Shape: {json.dumps(msg)[:300]}", file=sys.stderr)
        return False

    out_path.write_bytes(img_bytes)
    return True


def cmd_dry_run(args):
    skus = _missing_skus() if args.missing_only else _all_skus()
    print(f"Would generate {len(skus)} images at ${PRICE_PER_IMAGE_USD}/each = ${len(skus) * PRICE_PER_IMAGE_USD:.2f}")
    print(f"Output: {PRODUCTS_DIR}")
    print(f"Brand anchors: {ANCHORS_DIR}")
    print()
    for i, (sku_id, p) in enumerate(skus[:5]):
        print(f"--- SAMPLE {i+1}: {sku_id} ---")
        print(_build_prompt(sku_id, p))
        print()
    if len(skus) > 5:
        print(f"... + {len(skus) - 5} more")


def cmd_single(args):
    products = _load_catalog()
    if args.sku not in products:
        print(f"SKU not found: {args.sku}", file=sys.stderr)
        sys.exit(1)
    p = products[args.sku]
    prompt = _build_prompt(args.sku, p)
    print(f"PROMPT: {prompt}")
    print()
    out_path = PRODUCTS_DIR / f"{args.sku}.png"
    PRODUCTS_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Generating -> {out_path}")
    ok = _generate_image(prompt, out_path)
    print("OK" if ok else "FAILED")


def cmd_batch(args):
    skus = _missing_skus() if args.missing_only else _all_skus()
    cost = len(skus) * PRICE_PER_IMAGE_USD
    print(f"BATCH: {len(skus)} images, ~${cost:.2f}")
    if not args.yes:
        print("Pass --yes to proceed (this will spend money via OpenRouter).")
        sys.exit(0)

    PRODUCTS_DIR.mkdir(parents=True, exist_ok=True)

    from concurrent.futures import ThreadPoolExecutor, as_completed
    import threading
    counter_lock = threading.Lock()
    counters = {"done": 0, "ok": 0, "fail": 0}
    succeeded: list[str] = []
    failed: list[str] = []

    def _worker(idx_sku):
        i, (sku_id, p) = idx_sku
        prompt = _build_prompt(sku_id, p)
        out_path = PRODUCTS_DIR / f"{sku_id}.png"
        if out_path.exists() and args.missing_only:
            with counter_lock:
                counters["done"] += 1
                print(f"[{counters['done']}/{len(skus)}] SKIP {sku_id} (exists)", flush=True)
            return ("skip", sku_id)
        try:
            ok = _generate_image(prompt, out_path)
        except Exception as e:
            with counter_lock:
                counters["done"] += 1
                counters["fail"] += 1
                print(f"[{counters['done']}/{len(skus)}] EXC {sku_id}: {e}", flush=True)
            return ("fail", sku_id)
        with counter_lock:
            counters["done"] += 1
            if ok:
                counters["ok"] += 1
                print(f"[{counters['done']}/{len(skus)}] OK {sku_id}", flush=True)
                return ("ok", sku_id)
            else:
                counters["fail"] += 1
                print(f"[{counters['done']}/{len(skus)}] FAIL {sku_id}", flush=True)
                return ("fail", sku_id)

    workers = max(1, int(getattr(args, "concurrency", 4) or 4))
    print(f"Concurrency: {workers}")
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futures = [ex.submit(_worker, (i, x)) for i, x in enumerate(skus, 1)]
        for f in as_completed(futures):
            status, sku = f.result()
            if status == "ok":
                succeeded.append(sku)
            elif status == "fail":
                failed.append(sku)

    print()
    print(f"DONE. Succeeded: {len(succeeded)}, Failed: {len(failed)}")
    if failed:
        print("FAILED SKUs:")
        for s in failed:
            print(f"  {s}")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="cmd")

    p_dry = sub.add_parser("dry-run")
    p_dry.add_argument("--missing-only", action="store_true", default=True)
    p_dry.set_defaults(func=cmd_dry_run)

    p_single = sub.add_parser("single")
    p_single.add_argument("sku")
    p_single.set_defaults(func=cmd_single)

    p_batch = sub.add_parser("batch")
    p_batch.add_argument("--missing-only", action="store_true", default=True)
    p_batch.add_argument("--yes", action="store_true", help="confirm spend")
    p_batch.add_argument("--concurrency", type=int, default=4)
    p_batch.set_defaults(func=cmd_batch)

    # Top-level shorthand
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--single", metavar="SKU")
    ap.add_argument("--batch", action="store_true")
    ap.add_argument("--yes", action="store_true")
    ap.add_argument("--missing-only", action="store_true", default=True)
    ap.add_argument("--concurrency", type=int, default=4)

    args = ap.parse_args()

    if args.cmd:
        args.func(args)
    elif args.dry_run:
        cmd_dry_run(args)
    elif args.single:
        args.sku = args.single
        cmd_single(args)
    elif args.batch:
        cmd_batch(args)
    else:
        ap.print_help()


if __name__ == "__main__":
    main()
