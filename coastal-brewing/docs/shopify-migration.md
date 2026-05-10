# Shopify Migration Runbook — Coastal Brewing Co.

> Owner directive 2026-05-06.
> Move catalog management to Shopify Admin GUI so prices, costs,
> inventory, and product copy can be edited without redeploying.
> `catalog.py` becomes a *cache* of the Shopify product API.

## Why Shopify

- Coastal already touches Shopify on the fulfillment side (TCR
  drop-ship runs through a Shopify app — `tcr-app.herokuapp.com`).
- Shopify Admin is industry-standard for product / price / inventory
  management. Free GUI, no custom build.
- Webhook-based change propagation keeps the customer-facing site in
  sync without polling.
- Future inventory + multi-variant + bundle features come for free.

## What we built

| File | Role |
|---|---|
| `scripts/adapters/shopify_adapter.py` | REST client (products / variants / inventory_items / metafields), HMAC verification, connection probe |
| `scripts/sync_catalog_to_shopify.py` | One-shot uploader. Pushes every catalog.py SKU to Shopify as a single-variant product with price + cost + tags + metafields. Idempotent — re-run updates rather than duplicates. Has `--dry-run` and `--sku <id>` flags. |
| `api_server.py POST /shopify/webhook` | Webhook landing pad. Verifies HMAC. Logs every event to audit_ledger. |
| `api_server.py GET /api/v1/shopify/status` | Diagnostic — confirms shop domain + token are wired. |

## Owner setup steps

### 1 · Create the Shopify custom app

1. Open Shopify Admin → **Settings → Apps and sales channels → Develop apps**
2. Click **Create an app**, name it `Coastal Catalog Sync`
3. Click **Configure Admin API scopes**, grant:
   - `read_products`
   - `write_products`
   - `read_inventory`
   - `write_inventory`
   - `read_orders` (used for future order-receipt validation)
4. Click **Install app**
5. Copy the **Admin API access token** (starts with `shpat_`). This
   shows ONCE — store it in 1Password / vault.

### 2 · Push env vars to coastal-runner

On `aims-vps`, edit `/docker/coastal-brewing/.env`:

```dotenv
SHOPIFY_SHOP_DOMAIN=your-shop-name.myshopify.com
SHOPIFY_ADMIN_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SHOPIFY_WEBHOOK_SECRET=                    # populate after step 4
```

Recreate the runner so the env loads:

```bash
ssh aims-vps "cd /docker/coastal-brewing && docker compose up -d coastal-runner"
```

Verify the connection:

```bash
curl -s https://brewing.foai.cloud/api/v1/shopify/status
# expect: {"ok":true,"configured":true,"missing_keys":[],"shop_name":"...",...}
```

### 3 · Dry-run the catalog upload

```bash
ssh aims-vps "docker exec coastal-runner python /app/scripts/sync_catalog_to_shopify.py --dry-run --sku coastal-italian-roast-12oz"
```

You should see one line printed describing the would-be upsert. If
that looks right, dry-run the entire catalog:

```bash
ssh aims-vps "docker exec coastal-runner python /app/scripts/sync_catalog_to_shopify.py --dry-run"
```

Expected: 236 lines, all `SKIPPED (DRY-RUN)`. Confirms the script
walks the full catalog without errors.

### 4 · Real catalog upload

```bash
ssh aims-vps "docker exec coastal-runner python /app/scripts/sync_catalog_to_shopify.py --limit 5"
```

Run with `--limit 5` first — uploads five SKUs and stops. Verify in
Shopify Admin that they look right (title, price, cost, image,
description). If they do, run the full sync:

```bash
ssh aims-vps "docker exec coastal-runner python /app/scripts/sync_catalog_to_shopify.py"
```

Throttled to ~3 SKUs/sec to stay within Shopify's 2-call/sec REST
limit. Full catalog ≈ 80 seconds. The script prints a summary line at
the end with `created / updated / skipped / errors` counts.

**Idempotency:** safe to re-run. Existing SKUs get UPDATED, not
duplicated. Find-by-SKU is the lookup key.

### 5 · Wire the webhook

In Shopify Admin → **Settings → Notifications → Webhooks** (or via
Admin API), create webhooks for:

| Event | URL | Format |
|---|---|---|
| `Product create` | `https://brewing.foai.cloud/shopify/webhook` | JSON |
| `Product update` | `https://brewing.foai.cloud/shopify/webhook` | JSON |
| `Product delete` | `https://brewing.foai.cloud/shopify/webhook` | JSON |
| `Inventory levels update` | `https://brewing.foai.cloud/shopify/webhook` | JSON |

Shopify generates a **shared secret** for webhook signature
verification — copy it into `SHOPIFY_WEBHOOK_SECRET` in the runner's
`.env` and recreate the runner.

Test by editing a product price in Admin and watching the runner logs:

```bash
ssh aims-vps "docker logs --tail 30 coastal-runner | grep shopify"
```

You should see the audit-ledger entry with `category=shopify_webhook_products_update`.

### 6 · (Future) sync-back script

Currently the customer-facing site reads from `catalog.py`. After the
upload step, Shopify is the source of truth for prices/costs but the
runner still holds its baked-in copy. Two paths to close the loop:

- **Manual refresh**: `python scripts/sync_shopify_to_catalog.py` runs
  on demand, pulls Shopify Admin, regenerates `catalog.runtime.json`.
  (Script ships in a focused turn after this commit.)
- **Webhook-driven refresh**: webhook handler triggers an in-process
  refresh of the catalog cache. Same script, automated.

For v1, **owner edits in Shopify → manual refresh trigger**. v2 closes
the loop via webhook.

## Rollback

If the migration causes a problem:

1. **Revert env**: clear `SHOPIFY_ADMIN_TOKEN` and `SHOPIFY_SHOP_DOMAIN`
   from `.env`, recreate runner. Catalog reads return to `catalog.py`
   directly. Customer-facing site is unaffected by Shopify state.
2. **Disable webhook**: in Shopify Admin → Notifications → Webhooks,
   delete the webhook entries. Stops the audit-ledger noise.
3. **Bulk delete**: NOT recommended — the products in Shopify are
   safe even if unused. Better to leave them and re-enable the sync
   when the issue is fixed.

## Sacred Separation discipline

The customer-facing storefront NEVER surfaces:
- `wholesale_cost` (lives in Shopify as `cost_per_item` — internal-only
  by Shopify policy)
- `margin_floor_pct`, `effective_margin_pct`, `fulfillment_cost`
  (stored as `coastal` namespace metafields — Storefront API does
  not return private metafields by default)
- Supplier name (never written to Shopify; lives in source-only docs)

When configuring the Storefront API access token (separate from the
Admin token used here), DO NOT grant access to the `coastal`
metafield namespace. Internal economics stay internal.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `/api/v1/shopify/status` returns `{"ok": false, "missing_keys": [...]}` | Env vars not loaded | Recreate runner: `docker compose up -d coastal-runner` |
| Probe returns 401 | Invalid token or wrong shop domain | Re-copy from Shopify Admin → Apps → custom app |
| Sync script: `403 Forbidden` on a SKU | Missing scope on the custom app | Grant `write_products`, re-install |
| Sync script: `429 Too Many Requests` | Rate limit hit | Bump `--sleep-ms 600` |
| Webhook signature mismatch in logs | Stale `SHOPIFY_WEBHOOK_SECRET` | Copy fresh secret from Shopify webhook settings |
| Product image missing in Admin | `brewing.foai.cloud` was unreachable when Shopify fetched it | Re-run the sync for that SKU; Shopify retries asynchronously |

## Related

- Memory canon: `reference_temecula_canon_q1_2026_2026_05_05.md` (TCR
  Shopify integration on the fulfillment side)
- Pricing policy: `scripts/catalog.py` `_MARGIN_FLOOR_BY_CATEGORY`
  (default 60% gross floor, env override
  `COASTAL_MARGIN_FLOOR_PCT`). After Shopify migration completes,
  this becomes the *fallback* when Shopify Admin has no override —
  Shopify-stored prices win.
