# Low-Risk Support Macro — DRAFT

- macro_id: {{macro_id}}
- intent: {{intent}}     (where_is_my_order | how_to_cancel | flavor_question | shipping_question | account_help | faq_lookup)
- risk_tier: low
- requires_human: false

## Greeting

Hi {{first_name}},

Thanks for reaching out to Coastal Brewing.

## Body

{{macro_body}}

## Close

If anything else comes up, just reply to this message and we'll keep it moving.

— Coastal Brewing

---

## Macro library (drop-in body blocks)

### where_is_my_order
Your order ({{order_id}}) was placed on {{order_date}}. Tracking is on its way to your inbox the moment it ships from our partner warehouse — usually within {{lead_time}} business days. If tracking has not arrived after {{lead_time_plus}} business days, reply here and we'll dig in.

### how_to_cancel
You can cancel your subscription any time from your account page → "Subscriptions" → "Cancel". If you'd rather we handle it on this end, reply with the email on the account and we'll process it within one business day.

### flavor_question
{{neutral_flavor_description}} — that's the honest read on the cup. We don't make claims about origin or certifications until our quality team has documentation in hand.

### shipping_question
We ship via {{carrier}} from a partner warehouse. Domestic orders typically arrive in {{domestic_window}}. International is {{international_window}}. Tracking goes out as soon as the label is created.

### account_help
You can update email, password, and shipping at {{account_url}}. If you're stuck, send us the email on file and a brief description and we'll fix it on this end.

### faq_lookup
You can find answers at {{faq_url}}. If your question isn't there, reply and we'll handle it directly.

---

_This is a draft macro library. Boomer_CX may select a body block. The draft must not be sent without owner-approved auto-reply policy. Until that policy is on file, all replies are reviewed by a human._
