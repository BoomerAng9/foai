# Merch Spec — $6.54 Maintenance-Fee Free-Merch Deliverable

> Owner directive 2026-05-06.
> Every customer's first paid purchase carries a $6.54 onboarding fee
> ("Buy Me a Coffee" mechanic, per `docs/maintenance-fee-spec.md`).
> The customer gets a piece of low-cost branded merch in return — the
> fee funds the AI runtime + QA/QC and ships them something tangible.

## Constraints

- **Retail floor: $5.00** — owner directive: nothing in the merch
  shop sells for less than $5.
- **Production cost: ≤$2.50 landed** — keeps the maintenance fee
  ($6.54) covering both runtime + the merch with margin.
- **Print-on-demand fulfilled** — Printify integration; we never hold
  inventory. They ship direct to the customer.
- **Brand-consistent visuals** — all designs use the wood-stork mark
  + canonical brand palette (parchment cream + dark sepia + accent
  gold). Same logo treatment as Sal's apron.

## Recommended SKU lineup (12 items, $5 retail floor)

| SKU | Description | Printify cost | Coastal retail | Margin |
|---|---|---:|---:|---:|
| `merch-stork-sticker-vinyl-3in` | Die-cut vinyl sticker, flying stork mark | $0.95 | $5.00 | $4.05 |
| `merch-nothing-chemically-sticker-pack` | 4-pack vinyl stickers — motto + mark | $1.65 | $7.99 | $6.34 |
| `merch-stork-magnet-square-3in` | Square fridge magnet, stork mark on cream | $1.20 | $6.49 | $5.29 |
| `merch-stork-enamel-pin` | Soft-enamel lapel pin, antique-gold stork | $2.40 | $9.99 | $7.59 |
| `merch-coastal-bookmark-cream` | Heavy-stock bookmark, parchment + stork + motto | $0.85 | $5.00 | $4.15 |
| `merch-coastal-postcard-set-4` | 4-postcard set, Lowcountry-stylized brand cards | $1.95 | $8.99 | $7.04 |
| `merch-stork-coaster-cork-set-4` | Cork coaster 4-pack, embossed stork on each | $2.40 | $14.99 | $12.59 |
| `merch-coastal-bandana-22in` | Cotton bandana, repeating stork pattern, sepia on cream | $2.30 | $12.99 | $10.69 |
| `merch-stork-mini-print-5x7` | Matte mini print, framed-stork artwork | $1.10 | $7.99 | $6.89 |
| `merch-coastal-keychain-leather` | Mini leather keychain with embossed stork | $2.20 | $11.99 | $9.79 |
| `merch-stork-button-pin-1.5in` | Pinback button, stork mark | $0.50 | $5.00 | $4.50 |
| `merch-coastal-patch-iron-on` | Iron-on canvas patch, stork mark + motto | $2.05 | $9.99 | $7.94 |

**Owner-side default for the maintenance-fee delivery**: the random
picker selects from the bottom-margin half — sticker, magnet,
bookmark, postcard, mini-print, button, patch. These run $0.85-$2.05
landed; the $6.54 fee comfortably covers fulfillment + runtime.

## Design language (apply to every SKU)

- **Logo treatment**: matches Sal's apron — flying-stork mark in dark
  sepia engraving, on cream parchment background. Logo source:
  `web/public/coastal-brewing-logo-official.png`.
- **Colors**: parchment cream `#F4EDE0`, dark sepia `#3E2C1C`, accent
  gold `#C9A24C`. NO black, NO neon, NO tech-startup palette.
- **Typography**: heavy serif wordmark when used (Cormorant or
  similar humanist serif). Same as the bag label.
- **Voice (when copy appears)**: "Nothing chemically, ever." | "Brewed
  honest." | "Lowcountry-rooted." | "Coffee, tea, matcha." Always
  short. Never tagline-spam.
- **Photography style** (for marketing thumbnails, NOT the product):
  natural light on weathered wood / cream linen / live-oak shadow.

## Higgsfield image generation plan

All merch product images generate via Higgsfield (per the
2026-05-06 routing canon at
`~/.claude/.../reference_higgsfield_media_routing_canon_2026_05_06.md`).

- **Model**: `marketing_studio_image` for commercial product shots.
- **Per SKU**: 1 hero shot (white-background product), 1 lifestyle
  shot (in-context — porch / counter / bookshelf / desk).
- **Output**: PNG, 2k quality, square + 3:4 portrait variants.
- **Storage**:
  `iCloudDrive/.../coastal-brewing/04-merch/low-cost-printify/<sku>/`
  (folder structure created 2026-05-06).
- **Owner approval gate**: each SKU's hero shot reviewed before
  Printify upload.

## Printify integration path

1. **API key**: owner adds `PRINTIFY_API_KEY` + `PRINTIFY_SHOP_ID`
   to `/docker/coastal-brewing/.env` on aims-vps.
2. **Adapter** (deferred build):
   `coastal-brewing/scripts/adapters/printify_adapter.py` — REST
   client, mirror the Shopify-adapter pattern (idempotent
   create-or-update by SKU, metafield support).
3. **Sync flow**: For each merch SKU, the adapter PUTs the design
   image + assigns the right Printify blueprint (sticker / magnet /
   etc.) → Printify generates the product → owner approves → product
   becomes live.
4. **Order routing**: When a customer order containing a `merch-*`
   SKU completes Stripe Checkout, our webhook splits the fulfillment:
   - Coffee/tea SKUs → existing TCR drop-ship pipeline
   - `merch-*` SKUs → Printify order API call (separate shipment per
     owner directive: "Merch ships separately from coffee orders").
5. **Audit ledger**: every Printify create/update writes a receipt
   under `category=printify_sync`.

## What's already built / staged

- iCloud merch folders: `04-merch/team-portraits`, `04-merch/low-cost-printify`,
  `04-merch/cinematic-walkthrough` — staged 2026-05-06.
- Higgsfield routing canon: established 2026-05-06.
- Shopify adapter + uploader: shipped commit `530971e4`. Merch SKUs
  will sync through the same path with `category=merch` filter.
- Maintenance-fee spec: `docs/maintenance-fee-spec.md` — defines the
  $6.54 mechanic + free-merch obligation.

## What's NOT in this round (deferred)

- Stripe checkout split-fulfillment logic (one order, two shipments
  routed to TCR + Printify).
- Printify adapter implementation.
- Per-SKU image generation batches.
- Customer-facing "your free merch" picker on `/checkout/success`.

These are bounded next-turn builds once the merch designs land + owner
greenlights the Printify shop creation.
