"""Shopify Admin API adapter for Coastal Brewing Co.

Owner directive 2026-05-06: catalog management moves to Shopify Admin
GUI so prices/costs/inventory can be edited without redeploying.
catalog.py becomes a *cache* of the Shopify product API.

Auth pattern — Shopify "custom app" model (no marketplace listing):
1. Owner creates a custom app in Shopify Admin → Apps → Develop apps
2. Grants scopes: read_products, write_products, read_inventory,
   write_inventory, read_orders (for webhook verification)
3. Installs the app, copies the Admin API access token
4. Sets env vars on coastal-runner:
       SHOPIFY_SHOP_DOMAIN=your-shop.myshopify.com
       SHOPIFY_ADMIN_TOKEN=shpat_...
       SHOPIFY_WEBHOOK_SECRET=...   (for HMAC verification)

API-version pin: 2024-10 (latest stable). Bump cautiously — Shopify
deprecates fields on a 12-month rotation.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
from dataclasses import dataclass
from typing import Any, Dict, Iterator, List, Optional

import requests

log = logging.getLogger("coastal.shopify_adapter")

SHOPIFY_API_VERSION = "2024-10"
SHOPIFY_SHOP_DOMAIN = os.environ.get("SHOPIFY_SHOP_DOMAIN", "").strip().lower()
SHOPIFY_ADMIN_TOKEN = os.environ.get("SHOPIFY_ADMIN_TOKEN", "").strip()
SHOPIFY_WEBHOOK_SECRET = os.environ.get("SHOPIFY_WEBHOOK_SECRET", "").strip()


def is_configured() -> bool:
    return bool(SHOPIFY_SHOP_DOMAIN) and bool(SHOPIFY_ADMIN_TOKEN)


def missing_keys() -> List[str]:
    out: List[str] = []
    if not SHOPIFY_SHOP_DOMAIN:
        out.append("SHOPIFY_SHOP_DOMAIN")
    if not SHOPIFY_ADMIN_TOKEN:
        out.append("SHOPIFY_ADMIN_TOKEN")
    return out


def _base_url() -> str:
    return f"https://{SHOPIFY_SHOP_DOMAIN}/admin/api/{SHOPIFY_API_VERSION}"


def _headers() -> Dict[str, str]:
    return {
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


# ─── Webhook signature verification ─────────────────────────────────────


def verify_webhook(raw_body: bytes, hmac_header: str) -> bool:
    """Verify a Shopify webhook HMAC. Shopify sends an X-Shopify-Hmac-Sha256
    header; we hash the raw request body with the shared secret and
    constant-time compare. Failure → 401, never trust the payload."""
    if not SHOPIFY_WEBHOOK_SECRET or not hmac_header:
        return False
    digest = hmac.new(
        SHOPIFY_WEBHOOK_SECRET.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).digest()
    import base64
    expected = base64.b64encode(digest).decode("ascii")
    return hmac.compare_digest(expected, hmac_header)


# ─── REST API — products + variants ─────────────────────────────────────


def list_products(limit: int = 250) -> List[Dict[str, Any]]:
    """Page through every product. Shopify caps a single page at 250;
    we follow Link-header cursor pagination until done."""
    if not is_configured():
        raise RuntimeError(f"shopify_adapter not configured: missing {missing_keys()}")
    out: List[Dict[str, Any]] = []
    url = f"{_base_url()}/products.json?limit={min(limit, 250)}"
    while url:
        r = requests.get(url, headers=_headers(), timeout=30)
        r.raise_for_status()
        out.extend(r.json().get("products") or [])
        # Cursor-based pagination via Link header.
        link = r.headers.get("Link", "")
        next_url = None
        if 'rel="next"' in link:
            for part in link.split(","):
                if 'rel="next"' in part:
                    s = part.find("<")
                    e = part.find(">", s)
                    if s != -1 and e != -1:
                        next_url = part[s + 1:e]
                        break
        url = next_url
    return out


def get_product_by_handle(handle: str) -> Optional[Dict[str, Any]]:
    if not is_configured():
        raise RuntimeError("shopify_adapter not configured")
    r = requests.get(
        f"{_base_url()}/products.json?handle={handle}",
        headers=_headers(),
        timeout=15,
    )
    r.raise_for_status()
    products = r.json().get("products") or []
    return products[0] if products else None


def find_variant_by_sku(sku: str) -> Optional[Dict[str, Any]]:
    """Find a single variant by SKU. Best-effort scan via the products
    list — Shopify Admin doesn't have a native variant-by-sku query in
    REST. For 236 SKUs this is a few-hundred-row scan."""
    if not is_configured():
        raise RuntimeError("shopify_adapter not configured")
    for p in list_products():
        for v in p.get("variants") or []:
            if (v.get("sku") or "") == sku:
                return {"product": p, "variant": v}
    return None


def create_product(payload: Dict[str, Any]) -> Dict[str, Any]:
    if not is_configured():
        raise RuntimeError("shopify_adapter not configured")
    r = requests.post(
        f"{_base_url()}/products.json",
        headers=_headers(),
        json={"product": payload},
        timeout=30,
    )
    r.raise_for_status()
    return (r.json() or {}).get("product", {})


def update_product(product_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    if not is_configured():
        raise RuntimeError("shopify_adapter not configured")
    r = requests.put(
        f"{_base_url()}/products/{product_id}.json",
        headers=_headers(),
        json={"product": payload},
        timeout=30,
    )
    r.raise_for_status()
    return (r.json() or {}).get("product", {})


def update_variant(variant_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Update a single variant. Common payload fields: price (string),
    sku, weight, weight_unit, inventory_management. Cost-of-goods lives
    on a separate inventory_item endpoint (see set_inventory_item_cost).
    """
    if not is_configured():
        raise RuntimeError("shopify_adapter not configured")
    r = requests.put(
        f"{_base_url()}/variants/{variant_id}.json",
        headers=_headers(),
        json={"variant": payload},
        timeout=15,
    )
    r.raise_for_status()
    return (r.json() or {}).get("variant", {})


def set_inventory_item_cost(inventory_item_id: int, cost: float) -> Dict[str, Any]:
    """Cost-of-goods is on the `inventory_item` resource, not the
    variant directly. Shopify uses cost for margin reporting."""
    if not is_configured():
        raise RuntimeError("shopify_adapter not configured")
    r = requests.put(
        f"{_base_url()}/inventory_items/{inventory_item_id}.json",
        headers=_headers(),
        json={"inventory_item": {"cost": f"{cost:.2f}"}},
        timeout=15,
    )
    r.raise_for_status()
    return (r.json() or {}).get("inventory_item", {})


def set_metafield(
    owner_resource: str,
    owner_id: int,
    namespace: str,
    key: str,
    value: Any,
    type_: str = "single_line_text_field",
) -> Dict[str, Any]:
    """Generic metafield setter. Works on products, variants, orders, etc.
    namespace + key combine to form the metafield identifier.
    """
    if not is_configured():
        raise RuntimeError("shopify_adapter not configured")
    payload = {
        "metafield": {
            "namespace": namespace,
            "key": key,
            "type": type_,
            "value": str(value) if not isinstance(value, str) else value,
        }
    }
    r = requests.post(
        f"{_base_url()}/{owner_resource}/{owner_id}/metafields.json",
        headers=_headers(),
        json=payload,
        timeout=15,
    )
    r.raise_for_status()
    return (r.json() or {}).get("metafield", {})


# ─── High-level upsert ──────────────────────────────────────────────────


@dataclass
class UpsertResult:
    sku: str
    action: str  # "created" | "updated" | "skipped"
    product_id: Optional[int] = None
    variant_id: Optional[int] = None
    error: Optional[str] = None


def upsert_simple_product(
    sku: str,
    title: str,
    body_html: str,
    price: float,
    cost: float,
    image_url: Optional[str] = None,
    tags: Optional[List[str]] = None,
    weight_grams: Optional[float] = None,
    metafields: Optional[Dict[str, Any]] = None,
    dry_run: bool = False,
) -> UpsertResult:
    """Upsert a single-variant product by SKU. If the SKU exists, update
    its variant + cost. Otherwise create the product fresh.
    `metafields` is a flat dict of key→value; namespace defaults to
    'coastal'."""
    if dry_run:
        return UpsertResult(sku=sku, action="skipped (dry-run)")
    found = find_variant_by_sku(sku)
    if found:
        v = found["variant"]
        p = found["product"]
        update_variant(v["id"], {"price": f"{price:.2f}", "sku": sku})
        if v.get("inventory_item_id"):
            set_inventory_item_cost(v["inventory_item_id"], cost)
        if metafields:
            for k, val in metafields.items():
                set_metafield("products", p["id"], "coastal", k, val)
        return UpsertResult(sku=sku, action="updated", product_id=p["id"], variant_id=v["id"])

    # Create.
    payload: Dict[str, Any] = {
        "title": title,
        "body_html": body_html,
        "vendor": "Coastal Brewing Co.",
        "product_type": (tags or ["coffee"])[0],
        "tags": ", ".join(tags or []),
        "status": "active",
        "variants": [{
            "sku": sku,
            "price": f"{price:.2f}",
            "inventory_management": "shopify",
            "weight": weight_grams,
            "weight_unit": "g",
        }],
    }
    if image_url:
        payload["images"] = [{"src": image_url}]
    product = create_product(payload)
    pid = product.get("id")
    vid = (product.get("variants") or [{}])[0].get("id")
    iid = (product.get("variants") or [{}])[0].get("inventory_item_id")
    if iid:
        set_inventory_item_cost(iid, cost)
    if metafields and pid:
        for k, val in metafields.items():
            set_metafield("products", pid, "coastal", k, val)
    return UpsertResult(sku=sku, action="created", product_id=pid, variant_id=vid)


# ─── Connection probe ────────────────────────────────────────────────


def probe() -> Dict[str, Any]:
    """Hit /shop.json — minimum-privilege endpoint that returns shop
    metadata when the token is valid. Used for /shopify/status diagnostic."""
    if not is_configured():
        return {"ok": False, "missing_keys": missing_keys()}
    try:
        r = requests.get(f"{_base_url()}/shop.json", headers=_headers(), timeout=10)
        if r.status_code != 200:
            return {"ok": False, "status": r.status_code, "body": r.text[:200]}
        shop = (r.json() or {}).get("shop", {})
        return {
            "ok": True,
            "shop_name": shop.get("name"),
            "shop_domain": shop.get("myshopify_domain"),
            "currency": shop.get("currency"),
            "timezone": shop.get("iana_timezone"),
            "plan_name": shop.get("plan_display_name"),
        }
    except Exception as exc:
        return {"ok": False, "error": str(exc)}
