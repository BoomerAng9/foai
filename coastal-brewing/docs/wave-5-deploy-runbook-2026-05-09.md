# Wave 5 — Path A escalation deploy runbook (2026-05-09)

Owner directive: Wave 0 → 1 → 5 → 4. This is Wave 5 — deploy the
already-shipped Path A Stripe escalation code + AppInt email
adapter to live coastal-runner on aims-vps.

## Pre-deploy state (verified 2026-05-09)

**Branch**: `chore/coastal-ch-issue-coupon-handler`
**Last commit on branch**: `28a94c1b` (G1 Soul training spec, 2026-05-08)

**Uncommitted changes spanning Wave 0-1-5 work**:
- `scripts/api_server.py` — Path A escalation flow (3 helpers + branch in stripe_webhook), Coastal Path A canon comments
- `scripts/catalog.py` — 8-category taxonomy (`category_slug`), landing zones, subscription_required, visual tokens, expanded internal-fields strip
- `scripts/adapters/email_adapter.py` — AppInt rewrite (replaces SendGrid Function path)
- `scripts/aims_gateway.py` — small ?
- `scripts/user_profile.py` — small ?
- `scripts/streaming/message_types.py` — small ?
- `web/components/product-card.tsx` — "Ask Sal for a price" CTA + "Open price" badge
- `web/components/chat-panel.tsx` — earlier voice-routing work?
- `firebase-functions/send-email/*` — sidelined (kept on disk per never-delete rule)
- `docs/g1-soul-character-training-spec.md` — G1 spec uniform-canon corrections

**13 new docs in `docs/`** (this session's deliverables) + 1 new untracked dir `docs/sourcing/`.

## Commit + push strategy

**Recommended grouping** (5 commits for clean review):

### Commit 1 — Pricing research + spec docs (no code)

```
docs(coastal): pricing matrix + market research + 8-category spec — Wave 0/1 ratification gate

- product-categories-spec — owner-named 8 categories + per-category visual identity
- market-pricing-research — 8-agent cross-validated competitor pricing
- pricing-margin-model — per-SKU retail anchors
- coastal-billing-matrix-spec — 8-dim mirrors AIMS architecture
- negotiation-envelope-spec — Sal/LUC/ACHEEVY/Melli haggle ladder
- team-deliberation-ux-spec — visible team-huddle UX
- bundle-proposals — 8 bundles with margin floor
- sourcing/ — Habbak (SANI LLC) + accessories outreach drafts
- stripe-stepper-deep-dive — Path A decision record
- email-via-appint-runbook — AppInt deploy runbook
- google-forms-build-spec — superseded form path (kept on disk)
- paperform-build-spec.SUPERSEDED — kept on disk per never-delete rule
- catalog/single-origin-pricing-research — second SO agent's findings

Owner gates remain open: subscription-gate model, FT keep/drop, flavored
positioning, Whiskey Barrel ceiling. v2 retail prices = LANDING ZONES
post-haggle (per anchor → haggle → landing canon), not catalog MSRPs.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

### Commit 2 — Catalog 8-category taxonomy + landing zones

```
feat(catalog): 8-category storefront taxonomy + haggle-landing zones

- _derive_category_slug → maps existing category + vendor_source_sku to
  one of 8 owner-named categories (coffee_blends / special_offerings /
  flavored_coffees / single_origin / single_origin_ft / tea / instant /
  functional + format extensions kcup/sample_pack/bundle/subscription/merch).
- _derive_subscription_required → tags FT (fairtrade_program), Instant
  (premium_product), Functional (functional_coffee) per TCR partner rules.
- _derive_category_visual_token → 13 visual identity tokens for storefront
  per `docs/product-categories-spec-2026-05-09.md`.
- _derive_landing_zone → per-SKU haggle-target zone {min, mid, max, floor}
  for equation.py Sal/LUC/ACHEEVY/Melli counter-offer computation.
  Internal-only (NEVER public — would let Custees know floor + low-ball Sal).
- Expand _INTERNAL_FIELDS to strip effective_margin_pct + msrp_placeholder
  + landing_zone from public responses (margin × MSRP = exact cost).
- Reorder _enrich_products: MSRP computation runs BEFORE landing zone
  derivation (zone factors apply to policy-anchor MSRP, not literal placeholder).

236 SKUs enriched. Distribution: 64 flavored / 52 blends / 44 SO / 28 SO-FT
/ 12 special / 10 kcup / 10 tea / 5 functional / 3 sample_pack / 3 sub /
3 bundle / 1 tea_premium (matcha) / 1 instant.

60%-margin policy STAYS unchanged — this is the OPENING ANCHOR for the
agentic-haggle showcase per `reference_coastal_anchor_haggle_landing_canon`.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

### Commit 3 — Path A Stripe escalation flow

```
feat(runner): Path A — Stripe Checkout escalation flow (no Paperform/Stepper.io)

Replace planned Paperform-with-Stripe-field + Stepper.io-post-payment
chain with native Stripe Checkout Session that carries the HMAC
escalation_token in metadata. On checkout.session.completed,
/stripe/webhook decodes the token and records the audit-ledger commit
+ fires owner Telegram approval prompt.

- _stripe_escalation_checkout_create() — mints stripe.checkout.Session
  with deal price + token in metadata + success/cancel URLs.
- _record_escalation_commit() — shared audit-ledger + Telegram helper.
- escalation_commit POST endpoint — refactored to delegate to helper.
- escalation_form_url GET endpoint — semantics flipped: now returns
  Stripe Checkout URL instead of Paperform URL. Endpoint name kept for
  Spinner caller back-compat. Same {ok, redirect_url} response shape.
- stripe_webhook — new escalation branch on checkout.session.completed
  with metadata.flow == "stepper_escalation".

STEPPER_ESCALATION_FORM_URL env no longer needed.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

### Commit 4 — AppInt email adapter (replaces Firebase Function + SendGrid)

```
feat(email): GCP Application Integration Send Email adapter

Owner directive 2026-05-09: GCP-first canon. Email automation routes
through AppInt "Send Email" task in ai-managed-services GCP project,
NOT through SendGrid or any third-party email vendor.

- email_adapter.py rewritten to POST plaintext to AppInt
  executeIntegration URL. New env: COASTAL_APPINT_EMAIL_URL +
  COASTAL_APPINT_AUTH_TOKEN.
- magic_link_email_body returns plaintext only (AppInt is plaintext-only).
- api_server.py /api/v1/auth/login call site updated.
- firebase-functions/send-email/ marked SIDELINED-2026-05-09.md (kept
  on disk per never-delete rule); Firebase project references patched
  foai-aims → ai-managed-services for future reactivation.

Owner runbook: `docs/email-via-appint-runbook.md`.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

### Commit 5 — Product card "Ask Sal for a price" CTA

```
feat(web): visible "Ask Sal for a price" CTA on product cards

Per anchor → haggle → landing canon (2026-05-09 PM): catalog MSRP is
opening anchor; Sal/LUC/ACHEEVY/Melli negotiate Custee down to ideal
landing zone. Hidden haggle = pay anchor + feel ripped off OR no sale.
Visible haggle = engagement + experience + sale.

Changes:
- Price prefix "From" instead of bare $X.XX.
- New badge: "Open price — Sal will work with you" in monospace accent.
- Primary CTA flipped: "Ask Sal for a price" (was: "View" then "Ask").
- Chat URL adds intent=negotiate query param for chat panel routing.
- Secondary CTA "Details" links to PDP (was primary).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

## Deploy steps (after commits + push)

```bash
# 1. SSH to aims-vps
ssh aims-vps

# 2. Pull latest on the runner repo
cd /opt/coastal-brewing  # or wherever the runner repo lives — verify path
git fetch origin
git checkout chore/coastal-ch-issue-coupon-handler   # or merged branch
git pull

# 3. Drop legacy env (no longer used per Path A)
# Edit /docker/coastal-brewing/.env (or compose env block) and remove:
#   STEPPER_ESCALATION_FORM_URL  (Path A mints Stripe URLs on demand)

# 4. Recreate coastal-runner container
docker compose -f /docker/coastal-brewing/compose.yml up -d coastal-runner

# 5. Verify container is up + new code is loaded
docker logs --tail 50 coastal-runner | grep -E "Started|api_server|escalation"
docker exec coastal-runner python -c "import ast; src=open('/app/scripts/api_server.py').read(); ast.parse(src); print('AST OK,', len(src.splitlines()),'lines')"
```

## Smoke test plan

### Test 1: Catalog enrichment loaded correctly

```bash
docker exec coastal-runner python -c "
import sys; sys.path.insert(0, '/app/scripts')
import catalog as c
sample = c.PRODUCTS['coastal-italian-roast-12oz']
print('category_slug:', sample.get('category_slug'))     # → coffee_blends
print('msrp:', sample.get('msrp'))                       # → 43.99
print('landing_zone:', sample.get('landing_zone'))       # → {min: 24.19, mid: 28.59, max: 34.31, floor: 19.08}
"
```

Expected: `category_slug: coffee_blends`, `msrp: 43.99`, `landing_zone: {'min': 24.19, ...}`.

### Test 2: Stripe escalation endpoint responds correctly

```bash
# From local laptop:
TOKEN=$(curl -sS https://brewing.foai.cloud/healthz | grep -oP '"token":\s*"\K[^"]+' || echo "MANUAL_TOKEN_REQUIRED")
# Mint a test escalation token via existing equation engine flow
# Then call:
curl -sS "https://brewing.foai.cloud/api/v1/escalation/form-url?token=<test_escalation_token>" | jq
```

Expected: `{ok: true, redirect_url: "https://checkout.stripe.com/..."}` if token is valid + Stripe is configured.

### Test 3: Stripe webhook handles escalation branch

Dry-run via Stripe CLI:
```bash
stripe listen --forward-to https://brewing.foai.cloud/stripe/webhook
stripe trigger checkout.session.completed --add metadata.flow=stepper_escalation --add metadata.escalation_token=<test_hmac_token>
```

Expected: response body includes `escalation_report: {ok: true, escalation_id: ...}`.

### Test 4: PDP "Ask Sal for a price" CTA

Visit https://brewing.foai.cloud/shop (or wherever ProductCard is rendered).
Expected:
- Each card shows "From $XX.XX" instead of bare "$XX.XX"
- Subtle badge "Open price — Sal will work with you"
- Primary button reads "Ask Sal for a price"

### Test 5: End-to-end escalation flow

1. Open chat at brewing.foai.cloud → ask Sal for "30% off Italian Roast 12oz"
2. Equation engine mints stepper escalation token (above-cap)
3. Frontend calls /api/v1/escalation/form-url → gets Stripe Checkout URL
4. Click → Stripe Checkout opens with deal pre-priced
5. Test card 4242 4242 4242 4242 → checkout.session.completed fires
6. /stripe/webhook → _record_escalation_commit fires
7. Telegram message lands in owner channel: "T1 escalation committed via Stripe..."
8. Audit ledger has new volume_commitment row

### Test 6: AppInt email (only after F1-F5 owner-side AppInt config done)

POST /api/v1/auth/login with a real email → response `{ok:true, sent:true}` (no inline `magic_link`) → email lands in inbox.

If email doesn't arrive: check AppInt console **Integration execution logs** for failed runs.

## Rollback plan

If anything breaks post-deploy:

```bash
ssh aims-vps
cd /opt/coastal-brewing  # confirm path
git log --oneline -10            # find prior good commit
git checkout <prior_good_sha>
docker compose -f /docker/coastal-brewing/compose.yml up -d coastal-runner
```

Path A escalation is additive — old `/api/escalation/commit` POST endpoint still works for back-compat. Stripe webhook escalation branch only fires when `metadata.flow == "stepper_escalation"` is set — does NOT affect existing checkout flows.

## What this deploy DOES NOT include

- AppInt integration publish (owner-side GCP console, separate ~30 min)
- AppInt service account + bearer token (owner-side, separate ~15 min)
- Setting COASTAL_APPINT_EMAIL_URL / COASTAL_APPINT_AUTH_TOKEN env on coastal-runner (separate)
- Stripe Product/Price record creation per bundle (Stripe dashboard, owner-side)
- Iller_Ang category visuals (parallel deliverable, separate)
- TeamHuddle UX (Wave 3, post-launch)
- Build-Your-Bag matrix tuner (optional Wave 7, post-launch)

These layer in after Wave 5 deploy lands. None block the launch.

## Owner go/no-go

This runbook prepares the deploy. Actual git commit + push + ssh-deploy
requires explicit owner go per `~/CLAUDE.md` "NEVER commit changes
unless the user explicitly asks you to."

When ready: respond "ship Wave 5" or "commit only" or "hold".
