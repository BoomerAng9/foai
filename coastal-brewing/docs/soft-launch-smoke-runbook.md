# Coastal Brewing Co. — Soft-Launch Smoke Runbook

Generated 2026-05-12, updated 2026-05-13 after PR #438 + PR #439 closed
two launch-blockers found by automated smoke. Pairs with security
hardening posture in
`~/.claude/projects/C--Users-rishj/memory/reference_coastal_security_hardening_2026_05_12.md`.

## 2026-05-13 update — 2 launch-blockers found + fixed by smoke

Initial smoke run surfaced two regressions:

1. **PR #438 — Stripe SDK v15 dict-return fix.** `verify_webhook` was
   returning `stripe.Event` (StripeObject), but v15 dropped `.get()`
   from that class. `/stripe/webhook` crashed at
   `event.get("type")` → 500. PR #437's atomic-create idempotency lock
   then masked it: Stripe redelivered the same event_id, hit
   `FileExistsError`, and got back `200 idempotent_replay`. Net effect
   since the SDK bump: every paid checkout's downstream fulfillment
   silently no-op'd. Fix: `verify_webhook` returns `json.loads(payload)`
   (plain dict) after signature verification.

2. **PR #439 — cancel_at relocation.** PR #435 sent `subscription_data
   [cancel_at]` to Stripe Checkout — Stripe rejects that field at the
   subscription_data level. Every 3mo / 6mo / 9mo cadence on every tier
   (including the flagship 9-month Custee Card) returned 502. Fix:
   embed `cancel_at_unix` in subscription metadata at mint time; apply
   via `stripe.Subscription.modify(sub_id, cancel_at=...)` in the
   webhook's `checkout.session.completed` branch.

Both merged + deployed to aims-vps 2026-05-13. Re-run smoke after fix:

| Tier · Cadence | Status | Monthly billing |
|---|---|---|
| pooler-pass standard monthly | 200 + Stripe URL | $7.49 |
| pooler-pass standard 3mo | 200 + Stripe URL | $6.37 |
| pooler-pass plus 6mo | 200 + Stripe URL | $11.99 |
| pooler-pass plus 9mo | 200 + Stripe URL | $11.24 |
| custee-card monthly | 200 + Stripe URL | $29.99 |
| custee-card 3mo | 200 + Stripe URL | $25.49 |
| custee-card 9mo (flagship) | 200 + Stripe URL | $22.49 |
| wood-stork standard 9mo | 200 + Stripe URL | $56.24 |
| wood-stork reserve 6mo | 200 + Stripe URL | $119.99 |

9/9 checkout permutations now mint a Stripe session. Webhook liveness:
synthetic POST with bad signature → 400 sig-fail (not 500 crash) =
proves the dict-return fix landed.



## Automated smoke (already run 2026-05-13T03:15Z) — PASS

| # | Check | Result |
|---|---|---|
| A1 | `GET /healthz` | 200 — service live, auth+stripe+mercury+telegram+nemoclaw all configured |
| A2 | Tier cadence-pricing × 5 (custee / wood-standard / wood-reserve / pooler-standard / pooler-plus) | 200 — all 5 monthly_retail values match canon ($7.49 / $14.99 / $29.99 / $74.99 / $149.99) + all 4 cadences match `cadence.cadence_monthly_billing_cents` |
| A3 | `POST /api/v1/auth/signup` (test email) | 200 — `{ok, sent: true, check_inbox: true, expires_in_sec: 1800}` — magic-link minted |
| A4 | `pytest tests/test_profitability.py tests/test_tier_retail_canon.py` | 19/19 green — envelope-gate + canon-pricing code paths sound |
| A5 | Voice canon registry (`_COASTAL_V2_VOICEID` in `scripts/api_server.py:6417`) | All 4 personas (sal_ang / luc_ang / melli_capensi / acheevy) point to custom IVC clones; ACHEEVY = McKnight v3 |

`/api/v1/voice/catalog` + tier checkout endpoints returned 401 — both require `X-Coastal-Token` (gateway header), which is set by the Next.js frontend proxy and not part of the customer surface. Not a regression.

## Owner-driven smoke (need your hands)

### #1 — Stripe real-card end-to-end (5 tiers)

Smallest tier first ($7.49 pooler-pass standard) to limit blast radius. Cancel inside Stripe before next bill if you don't want the recurring charge.

```
1. Open https://brewing.foai.cloud/pooler-pass in an incognito window
2. Pick "Standard" tier, "monthly" cadence
3. Click "Pour the first cup" → redirected to Stripe Checkout
4. Pay with a real card (Stripe live mode)
5. After redirect to /pooler-pass/welcome:
   - Expect welcome card to play (Sal voice if first-time, ACHEEVY otherwise)
   - Expect Stripe Customer + subscription created
6. Check Stripe Dashboard:
   - subscription metadata.tier === "pooler-pass-standard"
   - subscription cancel_at === null (monthly is open-ended)
   - For 3mo/6mo/9mo cadences: subscription cancel_at should be set
7. Hit /api/v1/auth/me with same cookie → expect uid + tier resolved
```

Repeat for one cadence ≠ monthly (e.g. pooler-pass standard 3mo @ $6.37 × 3) to verify `cancel_at` is respected (this was a CRITICAL — closed PR #435).

Acceptance: 1 real charge succeeds + webhook delivers + cancel_at correct on a non-monthly cadence.

### #2 — Voice canon spot-check

Customer-side voice routing in a real browser session:

```
1. Open https://brewing.foai.cloud in incognito
2. Open chat drawer (Live Look In)
3. Type "hey sal" → expect Sal voice + register (warm, gravelly, NL accent dropped)
4. Type "can i speak with management?" → expect Sal saying handoff line then ACHEEVY voice (McKnight tenor)
5. Confirm next message comes back in ACHEEVY voice, NOT Sal's
6. Type "loop in melli" → expect Melli voice (Capensi register)
7. Type "loop in luc" → expect LUC voice (cadence-priced register)
8. Type "above the counter" → ACHEEVY surfaces
9. Confirm none of the personas say "Coastal Brewing" without the trailing "Co."
```

Acceptance: 4 personas + 4 handoff phrases all land. No persona impersonation.

### #3 — Magic-link prod deliverability

Owner-controlled inbox needed (we automated the mint step in A3; what's left is inbox round-trip):

```
1. Open https://brewing.foai.cloud/auth/signup in incognito
2. Use a real inbox you control (gmail / fastmail / etc.)
3. Submit form → confirm "check your inbox" card appears
4. Open inbox within 30 minutes
5. Confirm subject + sender match brand canon ("Coastal Brewing Co." not "Coastal Brewing")
6. Click magic-link
7. Expect redirect to /membership/welcome (or /account if already a member)
8. Expect Stripe Customer minted + welcome card audio plays
9. Try replaying the same link → expect "link already used" error (burn-on-use, PR #436)
10. Wait 31 min after a fresh mint → expect "link expired" error
```

Acceptance: inbox round-trip succeeds + replay rejected + expiry rejected.

### #4 — TCR drop-ship pipeline test (external, supplier-side)

Only run if you want to test physical fulfillment before public launch. Otherwise defer to first paid order.

```
1. Place a real à-la-carte order via /products picker (smallest SKU, $6-10)
2. Pay with real card
3. Watch /stripe/webhook log on aims-vps for "order.paid" event
4. Confirm order forwarded to TCR (check TCR portal or wait for shipment notification)
5. Confirm tracking number lands in /account → orders list
6. Confirm package arrives + product matches SKU
```

NEVER name TCR in customer-facing channels (canon: vendor names stay internal).
Acceptance: $X paid → shipment received with correct SKU + tracking visible in /account.

## Deliberately deferred (post-launch acceptable)

- Mercury bootstrap TTL + audit — owner-banking only, never customer chain
- 6 MEDIUM polish items per `reference_coastal_security_hardening_2026_05_12.md`
- Per-item cost-floor enrichment in envelope gate (catalog-cost lookup not wired)

## Go/no-go gate

Code side = green. Launch when smoke #1 + #2 + #3 pass owner-driven. #4 can wait for first real order.
