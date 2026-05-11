# AppSumo Lifetime-Deal Research — Coastal/AIMS Agentic SDK

Date: 2026-05-11
Purpose: Background brief for owner directive — package the Coastal/AIMS agentic stack as a licensable AppSumo lifetime deal. Lifetime deals apply to TECHNOLOGY (SDK / DK / deployment platform), NOT coffee/tea SKUs.

---

## 1. AppSumo Lifetime-Deal Mechanics

- **Tiering**: Two patterns — (a) **code stacking** (buy 1–5 of the same code at base price each, each stack unlocks higher seats/usage); (b) **explicit tier ladder** (Tier 1 / Tier 2 / … Tier 5, distinct prices per tier) [appsumo.com]. Stack must be set at purchase time; once the deal closes you cannot stack more.
- **Refunds**: 60-day, no-questions-asked, full money-back guarantee on every Marketplace deal [help.appsumo.com/article/31].
- **Marketplace fees**: New customer = seller keeps **95%** (5% processing). Returning AppSumo customer = seller keeps **70%**. Plus first-$100 of every brand-new buyer = 100% to the partner. Net 60 EOM payout [appsumo.com/blog/breaking-down-appsumo-revenue-share].
- **Stacking**: Each stack code typically same $ as base; unlocks seats, usage, white-label, premium features.
- **Transferability**: AppSumo TOS bars resale/barter; account-to-account license transfer is partner-discretion (must be declared in deal terms).
- **Redemption**: AppSumo emits a code → user redeems on partner site → partner provisions the lifetime tier on their plan-tier ID.
- **Discontinuation risk** for buyers: ~40% of AppSumo products shut down within 3 years; estimated ~30% buyer-side refund-considering rate on average deals (anecdotal) [tabswire.com].

## 2. What Sells on AppSumo (closest comps to agentic SDK)

| Product | Category | Tier ladder | URL |
|---|---|---|---|
| **AgenticFlow** | Agentic AI builder, multi-agent | T1 $59 / T2 $159 / T3 $409 / T4 $749 / T5 $999 | appsumo.com/products/agenticflow |
| **DM Champ** | White-label AI sales agent (DMs) | T1 $59 / T2 $139 / T3 $? / T4 $319 (unlim sub-acct) / 6 tiers total | appsumo.com/products/dm-champ |
| **Dialora** | 24/7 AI voice agents | tiered | appsumo.com/products/dialora |
| **ManyChat** | Multi-platform chatbot | tiered | appsumo.com/products/manychat |
| **Chatbot Builder** | KPI-targeted chatbot | tiered | appsumo.com/products/chatbot-builder |
| **SocialNowa** | No-code chatbot, lead-gen | tiered | appsumo.com/products/socialnowa-chatbot |
| **FuseBase** | White-label client portal + AI agents | T3 $? recommended for agencies (10 users / 15 portals) | appsumo.com (FuseBase) |
| **TagMango** | Creator/community SaaS | tiered | appsumo.com/products/tagmango |
| **Brilliant Directories** | White-label directory builder | up to T6 + LTD wall | appsumo.com/products/brilliant-directories |
| **VoiceDash** | AI voice tooling | tiered | getvoibe.com (review) |

**Pattern**: Agentic / white-label / agency-targeted SDKs ladder from **$59 entry → ~$1000 ceiling** in 4–6 tiers. White-label and sub-account capability is ALWAYS gated to T2+. T5 is the “agency / power user” cap. **Voiceflow is NOT on AppSumo** (their cheapest plan is $60/mo SaaS) — no direct agent-builder-of-record comp.

## 3. Coastal/AIMS Agentic-SDK Lifetime-Deal Shape

**What customer gets**: SDK access to deploy Sal/LUC/Melli/ACHEEVY-class agentic team under THEIR brand — voice (Inworld v2 IVC clones, retrained on their seed WAV), cadence pricing matrix, live look-in panel, haggle envelope, welcome-box flow, referral mechanic, Print_Press multi-channel publish, `pp` daemon, fleet HMAC tokens. Deploys to their domain via Deploy Platform.

**Recommended 3-tier ladder** (anchored to AppSumo agentic-comp range, marked up for SDK-grade depth):

| Tier | Price | What's in it |
|---|---|---|
| **T1 Starter** | **$249** | 1 vertical / 1 brand / up to 4 agents (1 Boomer_Ang archetype + 3 Lil_Hawks). Voice: 2 IVC clones. Deploy domain: subdomain on `*.foai.cloud`. Print_Press: 3 channels (Email / Telegram / 1 social). 90-day onboarding. SDK = deployment access only (no source). |
| **T2 Growth** | **$699** | Up to 3 verticals / 3 brands / unlimited agents per brand. 8 IVC voice slots. Custom domain (CNAME). Full Print_Press (10+ channels). White-label UI (your logo, your colors, your copy). Sub-accounts: 5. 12-month onboarding + 1 quarterly review. Deployment + config access. |
| **T3 Enterprise White-Label** | **$1,499** | Unlimited verticals / brands. Unlimited IVC voice slots. Multi-domain. Full Print_Press incl. custom channels. Sub-accounts: unlimited. Source-included for the agent-orchestration layer (Boomer_Ang base classes + Lil_Hawk SDK; NOT AIMS core / NOT Coastal product data). Resale rights: own-clients-only, no SaaS resale. Quarterly architecture office hours. |

**Rationale**:
- Entry-tier $249 is 4× AgenticFlow T1 ($59) — justifiable because Coastal stack ships with **trained voices, working pricing/haggle math, and a proven retail dogfood** (CBrew). AppSumo buyers comparison-shop a pre-built agency stack, not a blank canvas.
- T2 $699 sits between AgenticFlow T3 ($409) and T4 ($749). Captures the “small agency / multi-brand operator” buyer.
- T3 $1499 = ceiling. Higher than the $999 AgenticFlow ceiling because it includes **partial source** + multi-domain. Stays under the $1500 mental wall most AppSumo buyers will swipe through.
- **Stacking option**: allow up to 3× stack on T2 to scale sub-accounts (5 → 15), revenue compounding without us touching the price grid.

## 4. Implementation Gotchas

- **Self-serve onboarding**: AppSumo gates new partners on having a working signup → activate-code → land-in-product flow with **zero human in the loop**. Need: code-redemption endpoint that accepts AppSumo's webhook, mints a tenant in Deploy Platform, provisions Boomer_Ang archetypes, emits credentials. Currently we do this manually for Coastal — must be templated.
- **Sandbox / demo**: AppSumo buyers expect (a) public demo URL, (b) 5-min walkthrough video, (c) docs site with quickstart in <10 min. Coastal’s live `brewing.foai.cloud/team` IS the demo — point T1 prospects at it. Need a Loom/YouTube walkthrough showing tenant-provision → first-agent-deploy.
- **Support SLA**: Marketplace expectation is <24h business-day response on support tickets. Need a dedicated support inbox + Lil_Hawk auto-triage (good Lil_Telegram_Hawk + Lil_Email_Hawk fit).
- **Refund risk**: SaaS LTDs commonly refund **15–30%** in the 60-day window per anecdotal partner data. Plan cash flow accordingly: assume 25% will refund, so net realised = ~75% of gross on Net-60 EOM payout.
- **Discontinuation reputation hit**: ~40% of AppSumo products die within 3 years. Coastal/AIMS must publicly commit to a **5-year minimum support window** in the deal terms — or the buyer pool will price in death-risk and skip our deal.

## 5. Owner Decisions Required

1. **Source-code scope**: Does T3 include source for the agent-orchestration layer, or only deployment-and-config access?
2. **Resale rights**: Can a T3 buyer offer the deployed stack as their own SaaS to their own clients? (Recommended: yes-for-direct-clients, no-for-SaaS-resale.)
3. **Voice IVC ownership**: When buyer trains new IVC clones on their seed WAV, who owns the resulting voice IDs — buyer (clean) or shared (we keep usage rights)?
4. **Coastal product-data carve-out**: Confirm Coastal retail catalog / TCR pricing / Habbak supplier map are EXCLUDED from any tier (proprietary).
5. **Support SLA**: Commit to <24h business-day response, or set a softer SLA explicitly?
6. **Stacking allowance**: Permit T2 stacking (up to 3×) for sub-account scaling? (Recommended: yes.)
7. **Discount on AIMS marketplace pricing matrix**: AppSumo lifetime is one-shot — does it bypass the cadence/category multipliers in the 8-dim matrix entirely, or layer on top?

---

Sources: appsumo.com/blog/breaking-down-appsumo-revenue-share | help.appsumo.com/article/31 (refund) | appsumo.com/products/agenticflow | appsumo.com/products/dm-champ | appsumo.com/products/dialora | appsumo.com/products/manychat | tabswire.com/appsumo-review (5-year buyer view) | octolens.com/blog/200k-in-60-days-honest-review (founder math) | findfahim.com/lead-generation-tools/dm-champ-lifetime-deal-review
