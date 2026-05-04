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

# Brand anchors passed as multimodal image inputs to ground gpt-image-2 in
# the canonical Coastal aesthetic. Match the existing 21 originals (which are
# the product photos already on real merchandise) — outdoor Lowcountry
# lakefront, golden daylight, palm trees, Spanish moss. Use the canonical
# Coastal Blend product shot as the primary aesthetic anchor.
BRAND_ANCHORS = [
    ANCHORS_DIR / "merchandise-anchor.jpg",  # downsampled 1024px JPEG (~150KB) — Lowcountry warm-daylight aesthetic
    ANCHORS_DIR / "coastal-logo.jpg",        # downsampled flying-stork logo (~160KB)
]

# Brand-consistent prompt prefix. Matches the EXISTING merchandise-photo
# aesthetic of the 21 originals (the product shots customers already see):
# outdoor Lowcountry coastal scene, warm golden daylight, palm trees, Spanish
# moss, lakefront/marsh background, kraft bag with cream parchment label,
# flying stork mark, COFFEE. TEA. MATCHA. PURPOSE. wooden frame visible.
BRAND_PREFIX = (
    "Outdoor product photograph for Coastal Brewing Co., a Lowcountry South "
    "Carolina coffee + tea + matcha brand. MATCH THE REFERENCE IMAGE EXACTLY "
    "— same outdoor Lowcountry coastal setting (lakefront or marsh visible in "
    "background), same warm golden daylight (late-afternoon, soft, airy), "
    "same kraft-paper bag form with wide cream-parchment label, same dark "
    "wood bar or shelf the product sits on, same atmospheric props (palm "
    "tree fronds, Spanish moss draping, copper pot, ceramic cup with diamond "
    "pattern, scattered coffee beans, wooden bowl). The brand mark is a "
    "FLYING STORK (wings up, vintage engraving style) in dark sepia ink — "
    "NEVER a palm tree, NEVER any other icon. The product label uses "
    "heavy-serif COASTAL / BREWING / CO. wordmark beneath the stork. Wooden "
    "frame visible behind product reads 'COFFEE. TEA. MATCHA. PURPOSE.' with "
    "a small carved stork. Background: Lowcountry lakefront or marsh, palm "
    "trees, Spanish moss, soft warm sky. Tagline 'Nothing chemically, ever.' "
    "may appear on the product label. Square 1:1 framing. Hero product "
    "center-frame. Style is warm + premium + Lowcountry editorial — the "
    "polar opposite of bright clinical white-bg e-commerce. Exact product:\n\n"
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

    if category in ("coffee", "flavored_coffee", "specialty_coffee", "functional"):
        bag_form = (
            f"a kraft-paper coffee bag with tin-tie top, sitting on a dark "
            f"polished-wood bar. The bag's cream-parchment label is centered "
            f"and shows the flying-stork mark above heavy-serif COASTAL / "
            f"BREWING / CO. wordmark. Below the wordmark, the product name "
            f"reads '{name}'"
            f"{f', net wt {size}' if size else ''}"
            f"{f' — {roast} roast' if roast else ''}"
            f". Behind the bag, more kraft bags and cream metal tins are "
            f"softly visible on dark wood shelves under amber Edison light."
        )
    elif category == "tea":
        bag_form = (
            f"a cream cylindrical metal tin sitting on a dark polished-wood "
            f"bar. The tin's label shows the flying-stork mark above "
            f"COASTAL / BREWING / CO. with the product name '{name}'"
            f"{f', net wt {size}' if size else ''} below. Loose tea leaves "
            f"are scattered at the base of the tin. Background: more cream "
            f"tins in a row, dark wood shelves, warm amber light."
        )
    elif category == "matcha":
        bag_form = (
            f"a cream cylindrical metal tin (slightly stubbier than the tea "
            f"tins) on a dark wood bar, with a small wooden chasen whisk and "
            f"a shallow ceramic bowl of bright vivid-green matcha powder "
            f"alongside. The tin's label shows the flying-stork mark above "
            f"COASTAL / BREWING / CO. with '{name}'"
            f"{f', net wt {size}' if size else ''} below. Warm amber light, "
            f"deep shadows."
        )
    elif category == "kcup":
        bag_form = (
            f"a recyclable K-cup pod box on a dark wood bar, with the "
            f"flying-stork mark and COASTAL / BREWING / CO. wordmark on the "
            f"front panel. Product name '{name}'"
            f"{f', {size}' if size else ''} reads below. A few loose K-cup "
            f"pods sit alongside. Warm Edison amber light."
        )
    elif category == "bundle":
        bag_form = (
            f"a curated bundle arrangement on a dark wood bar — 2 to 3 kraft "
            f"coffee bags and/or cream tea tins together with a small kraft "
            f"box, all bearing the flying-stork mark over COASTAL / BREWING "
            f"/ CO. wordmark. The bundle name '{name}' is visible on a small "
            f"hangtag or card."
        )
    elif category == "subscription":
        bag_form = (
            f"a kraft coffee bag on a dark wood bar with a small parchment "
            f"card-stock subscription insert tucked alongside, the card "
            f"reading '{name}' below the flying-stork mark over COASTAL / "
            f"BREWING / CO. wordmark."
        )
    else:
        bag_form = (
            f"product packaging for '{name}'"
            f"{f', {size}' if size else ''} on a dark wood bar with the "
            f"flying-stork mark and COASTAL / BREWING / CO. wordmark "
            f"prominent on the label."
        )

    return BRAND_PREFIX + bag_form + (
        " Photographed at eye level, sharp focus on the product label, "
        "shallow depth of field on the background. Vintage-engraving label "
        "art style. No text in the scene other than what appears on the "
        "product label itself. NO palm-tree icon — the brand mark is "
        "exclusively the flying stork."
    )


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


def _file_to_data_uri(path: Path) -> str:
    suffix = path.suffix.lower().lstrip(".")
    mime = "image/jpeg" if suffix in ("jpg", "jpeg") else "image/png"
    b = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{b}"


def _build_multimodal_content(prompt: str) -> list:
    """Build the OpenRouter content array: text prompt + brand anchor images
    as image_url parts. Anchors GROUND the gen in the canonical Coastal
    aesthetic — without them the model defaults to generic e-commerce style.
    """
    parts: list = [{"type": "text", "text": prompt}]
    for anchor in BRAND_ANCHORS:
        if anchor.exists():
            parts.append({
                "type": "image_url",
                "image_url": {"url": _file_to_data_uri(anchor)},
            })
        else:
            print(f"[anchor-missing] {anchor} — proceeding without it (output will likely drift off-brand)", file=sys.stderr)
    return parts


def _generate_image(prompt: str, out_path: Path) -> bool:
    """Call OpenRouter, save image to out_path. Returns True on success.
    Retries up to 3 times on connection-reset / timeout errors.
    """
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY not set in environment")

    body = {
        "model": MODEL,
        "messages": [{"role": "user", "content": _build_multimodal_content(prompt)}],
        "modalities": ["image", "text"],
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://brewing.foai.cloud",
        "X-Title": "Coastal Brewing Co - product imagery",
    }
    last_exc = None
    resp = None
    for attempt in range(3):
        try:
            resp = requests.post(OPENROUTER_URL, headers=headers, json=body, timeout=180)
        except (requests.exceptions.ConnectionError,
                requests.exceptions.Timeout,
                requests.exceptions.ChunkedEncodingError) as e:
            last_exc = e
            time.sleep(2 ** attempt)  # 1s, 2s, 4s
            continue
        # Retry on transient server-side errors too — rate limits and upstream
        # faults are common during long batches and recover on backoff.
        if resp.status_code in (429, 500, 502, 503, 504):
            last_exc = f"HTTP {resp.status_code}"
            resp = None
            time.sleep(2 ** attempt)
            continue
        break
    if resp is None:
        print(f"  ERROR: 3 retries failed: {last_exc}", file=sys.stderr)
        return False
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
    skus = _all_skus() if getattr(args, "all_skus", False) else _missing_skus()
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


def _regenerate_manifest_quiet():
    """Best-effort manifest regen so catalog._AVAILABLE_PRODUCT_IMAGES picks
    up new images on next runner restart. Never raises — script failure must
    not depend on manifest write."""
    try:
        sys.path.insert(0, str(REPO_ROOT / "scripts"))
        import regenerate_products_manifest as _r  # noqa: E402
        p = _r.regenerate()
        print(f"[manifest] {p['count']} images written to {_r.MANIFEST_PATH.name}")
    except Exception as e:
        print(f"[manifest] regen failed: {e}")


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
    if ok:
        _regenerate_manifest_quiet()


def cmd_batch(args):
    skus = _all_skus() if getattr(args, "all_skus", False) else _missing_skus()
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

    force_overwrite = bool(getattr(args, "force", False))

    def _worker(idx_sku):
        i, (sku_id, p) = idx_sku
        prompt = _build_prompt(sku_id, p)
        out_path = PRODUCTS_DIR / f"{sku_id}.png"
        if out_path.exists() and not getattr(args, "all_skus", False) and not force_overwrite:
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
    _regenerate_manifest_quiet()


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="cmd")

    p_dry = sub.add_parser("dry-run")
    p_dry.add_argument("--all", dest="all_skus", action="store_true", help="dry-run all SKUs, not just missing")
    p_dry.set_defaults(func=cmd_dry_run, missing_only=True)

    p_single = sub.add_parser("single")
    p_single.add_argument("sku")
    p_single.set_defaults(func=cmd_single)

    p_batch = sub.add_parser("batch")
    p_batch.add_argument("--all", dest="all_skus", action="store_true", help="batch all SKUs, not just missing")
    p_batch.add_argument("--yes", action="store_true", help="confirm spend")
    p_batch.add_argument("--concurrency", type=int, default=4)
    p_batch.add_argument("--force", action="store_true", help="overwrite existing files (regenerate)")
    p_batch.set_defaults(func=cmd_batch, missing_only=True)

    # Top-level shorthand
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--single", metavar="SKU")
    ap.add_argument("--batch", action="store_true")
    ap.add_argument("--yes", action="store_true")
    ap.add_argument("--all", dest="all_skus", action="store_true", help="all SKUs, not just missing")
    ap.add_argument("--concurrency", type=int, default=4)
    ap.add_argument("--force", action="store_true")

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
