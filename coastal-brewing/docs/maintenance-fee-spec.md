# Maintenance Fee — $6.54 Buy-Me-a-Coffee Mechanic

> Owner directive 2026-05-06.
> One-time fee charged on a customer's FIRST purchase. Funds the AI
> runtime + QA/QC. Customer receives free merch in return.
> Implementation: spec only — Stripe wiring lands in a focused turn
> after this spec is approved.

## Why $6.54

Iconic price-anchor (echoes the "Buy Me a Coffee" cultural mechanic at
$5; the $1.54 above accounts for actual TTS + LLM + fulfillment runtime
overhead per customer first-touch). Reads as a coffee, prices as a
cost-of-service.

## When it fires

- **Once per `coastal_uid`** — first checkout only.
- After first-purchase, the user is flagged `maintenance_fee_paid: true`
  in their profile and never charged the fee again.
- Anonymous checkouts — fee charged on first paid order, profile
  retroactively created on the email used.

## How it appears

- **Stripe Checkout Session**: an additional `line_item` titled
  "Onboarding maintenance — supports the AI counter" at $6.54.
- **Customer-facing copy**: `"One-time onboarding fee — keeps the AI
  counter running and ships you a free merch item."` Visible in the
  pre-checkout summary, NOT a surprise.
- **Receipt** lists it as a separate line so the customer's accounting
  surface reads cleanly.

## Free merch deliverable

Every paid maintenance fee triggers a **merch fulfillment item** in
the order:
- T-shirt, sticker pack, hat, or branded enamel mug — picked from the
  current merch rotation.
- Owner stocks merch SKUs in TCR's drop-ship + bulk pipeline OR uses
  a separate POD fulfillment vendor (Printful / Printify) — TBD.
- Merch SKUs are catalog entries (`category: "merch"`) with their own
  pricing/cost rows. Maintenance fee covers the merch landed cost.

## Implementation surface (deferred)

When this spec is approved:

1. **Profile schema** — `coastal.user_profile.maintenance_fee_paid: BOOLEAN DEFAULT false`
2. **Stripe checkout flow** — `web/app/order/intake/route.ts` reads the
   profile flag; if `false`, prepends the maintenance line item to
   the Stripe Checkout payload + flips the flag in the
   `checkout.session.completed` webhook handler.
3. **Merch picker** — `coastal-brewing/scripts/merch_picker.py` takes
   the order's `coastal_uid` + the current merch rotation, returns one
   merch SKU. Triggered alongside the order creation in
   `api_server.py:_handle_checkout_completed`.
4. **Customer copy** — pre-checkout summary block renders the
   maintenance fee line ONLY when the profile flag is `false`.
5. **Audit ledger** — every maintenance-fee charge writes a
   receipt with `category: "maintenance_fee_collected"` so the
   operator can reconcile against Stripe.

## What this is NOT

- Not a recurring subscription.
- Not gated behind a paywall — products are still browsable and
  purchasable; the fee is added at checkout once.
- Not a service charge dressed as merch — the merch is real; owner
  picks the rotation, fulfills the item.

## Edge cases

- **Refunded first order**: the fee + merch are refunded with the
  order; the profile flag flips back to `false` so the next order
  re-collects.
- **Account-required users (post-ACHEEVY warning)**: still pay the
  maintenance fee on their next checkout. The flag isn't waived.
- **Bulk-order customers (Melli's lane)**: same fee applies. $6.54 is
  noise on a 50-unit order, but the merch deliverable still goes out.

---

## Account-required-after-warning mechanic (companion to LP team)

Owner directive 2026-05-06: when ACHEEVY warns + flags a user, that
user must create an account before they can re-engage the chat.

### Implementation surface (also deferred)

1. **Profile schema** — add `lp_state: TEXT NULL` and
   `lp_warned_count: INT DEFAULT 0` to `coastal.user_profile`.
2. **IP flag table** — `coastal.lp_flagged_ips(ip TEXT, coastal_uid TEXT, warned_at TIMESTAMP, account_required BOOL)`.
   On ACHEEVY warning, the runner reads the request IP from the
   `X-Forwarded-For` header (Traefik passes it through), inserts a row.
3. **Chat-panel gate** — frontend reads `/api/v1/auth/me` on session
   start; if `lp_flagged && !authenticated`, render the chat as
   "create-account-to-resume" wall with the signup CTA inline.
4. **Audit logging** — every flag-and-record event lands in
   `audit_ledger.risk_event` with severity `high`,
   category `lp_account_required`.
5. **Account creation auto-clears the flag** — once the user
   completes signup with a verified email, the IP flag's
   `account_required` flips false. The user's `lp_warned_count`
   persists (visible to operator only) so repeat offenders can be
   tracked over time.

### What the customer sees

A clean modal: *"To continue shopping at Coastal, please create an
account. Registered customers get the full counter — Sal, LUC, Melli,
and ACHEEVY are all available."* Single CTA → `/auth/signup`. No
explanation of why the wall exists. No accusation.
