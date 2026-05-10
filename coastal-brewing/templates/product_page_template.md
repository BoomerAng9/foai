# Product Page Template — Coastal Brewing

> Boomer_Marketing fills the variables. Boomer_Quality reviews against this template before any publish request reaches the owner. No claim ships without a `claim_verification_receipts` row with `verdict='kept'`.

## Required fields

- product_id: {{product_id}}
- product_name: {{product_name}}
- category: {{category}}   (coffee | tea | matcha | bundle | subscription)
- supplier_id: {{supplier_id}}
- variant_skus: {{variant_skus}}

## Hero copy (≤ 140 characters)

{{hero_copy}}

## Body copy

{{body_copy}}

## Tasting / brewing notes

{{tasting_notes}}

## Sourcing line (no claim unless verified)

Default safe: "Sourced through a verified roasting/tea partner. Certifications pending supplier verification."

## Allowed claim slots — populated only from verified receipts

| Claim | verdict | basis | cert_id | feynman_receipt |
|---|---|---|---|---|
| organic | {{verdict_organic}} | {{basis_organic}} | {{cert_organic}} | {{feyn_organic}} |
| fair-trade | {{verdict_fair_trade}} | {{basis_fair_trade}} | {{cert_fair_trade}} | {{feyn_fair_trade}} |
| non-GMO | {{verdict_non_gmo}} | {{basis_non_gmo}} | {{cert_non_gmo}} | {{feyn_non_gmo}} |

If `verdict != kept`, the claim does not appear on the page.

## Forbidden language (always strike, regardless of cert)

- "boosts immunity"
- "cures"
- "prevents disease"
- "detoxifies"
- "chemical-free"
- "all natural"
- "FDA approved"
- "doctor recommended" (without named clinician + receipt)
- "lab tested" (without named lab + receipt)
- "mold-free" (without test results + receipt)

## Imagery

- Lifestyle imagery only
- No people in coats holding test tubes
- No "certified" badge that is not actually certified

## Pre-publish gate

- [ ] Boomer_Quality verdict on every claim
- [ ] No forbidden language anywhere on the page
- [ ] Boomer_Marketing brand-voice review
- [ ] Chicken_Hawk green-light receipt
- [ ] Owner approval (publish_public_page)
