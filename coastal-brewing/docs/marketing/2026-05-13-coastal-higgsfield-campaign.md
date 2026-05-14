# Coastal Brewing Co. — Higgsfield-Executed Marketing Campaign

**Date:** 2026-05-13
**Owner of build:** Iller_Ang (Office of the CDO) — assets routed through Higgsfield as execution surface
**Approver:** ACHEEVY → Human-in-the-Loop
**Scope:** SEO-driven, organic-first, multi-channel media to drive customer-facing traffic to `brewing.foai.cloud`
**Pairs with:** Launch Savannah Cohort 3 application package (`iCloud/Professional Things_/Launch_Savannah_Cohort_3/`)

---

## 0. Sacred Separation (read first)

Customer-facing copy NEVER mentions:
- **Higgsfield** (the execution surface — internal-only)
- **Soul / Soul Cinema / Soul Cast / Seedance / Veo / Nano Banana** (model names — internal-only)
- **Inworld, Gemini, Anthropic, OpenAI, Stripe, Resend, Google Workspace** (vendor names — internal-only)
- **The roastery partner** (supplier — always anonymized as "our verified roastery partner")
- **TCR** or other drop-ship operator names
- Mushroom-as-medicine, "organic", "all natural", "low acid", "boosts immunity", health claims (PRD §4.3 prohibitions)

This document is internal-only. Every customer-facing asset it produces must pass through the §10 Compliance Gate before publishing.

---

## 1. Strategic positioning

**Headline thesis** (carries across every channel):

> **"Build a Company. Without a Company."**
>
> Coastal Brewing Co. is the storefront where you talk to Sal, the math comes from LUC, the brewer's notes come from Melli, and the cup ships from our verified roastery partner — orchestrated by ACHEEVY, served by Custeez.

**SEO topic clusters** (anchor for all written copy + video descriptions + hashtags):

| Cluster | Primary keywords | Pillar pages on brewing.foai.cloud |
|---|---|---|
| **Specialty coffee subscription** | "coffee subscription", "monthly coffee club", "pay 9 get 12 coffee", "low Country coffee" | `/membership`, `/pooler-pass`, `/wood-stork` |
| **Pooler / Savannah coffee** | "Pooler GA coffee", "Savannah specialty coffee", "Low Country roasters", "coffee delivery Pooler" | `/pooler-pass`, `/live` |
| **Custom-brewed for you** | "custom coffee blend", "personalised coffee", "coffee for my taste", "barista picks my coffee" | `/membership`, `/live` |
| **Coffee + culture (lifestyle)** | "coffee ritual", "morning routine", "small-batch roastery", "real fine coffee" | All landing pages |
| **Build a Company. Without a Company.** | autonomous business, AI orchestrator, agent-run retail, owner-in-the-loop, future of small business | Press / About / Founder's blog |

Long-tail: every video description includes 2-3 keywords from the cluster matrix above; thumbnails carry the Custeez wordmark; alt text on every Instagram post is keyword-loaded.

---

## 2. The Cast (consistent across every asset)

Customer-facing Boomer_Angs (per Coastal brand canon):

| Persona | Role on storefront | Voice register | Visual signature |
|---|---|---|---|
| **Sal_Ang** | Bartender at the counter — first contact, friendly, knows your name | Warm, gravelly, Lowcountry Spanish-moss drawl | Apron, wraparound visor, mask, behind the wood bar |
| **LUC** | Calculator — "the math is the math" — pricing transparency | Cadence-priced register, calm, dry | Visor + mask, cream-poster backdrop, ledger or scale prop |
| **Melli_Capensi** | Brewer's notes — origin storytelling, flavor walkthroughs | Capensi register, lyrical | Apron + visor, coffee bag prop, dark-wood shelving |
| **ACHEEVY** | The orchestrator — "above the counter" — owner POV | McKnight smooth-tenor (v3 clone) | Different setting — office or roastery floor, not behind bar |
| **(LP team — Mac, Joey, Sky, Boomer)** | Loss prevention — warehouse, never customer-facing | (Not voiced — visual only) | Warehouse digital-camo, never in storefront |

**Visual canon refresher** (per existing portrait library + memory `reference_boomer_ang_visual_canon_2026_05_10`):
- ONE integrated face shield (wraparound helmet-style, covers both eyes + lower face)
- Bust-shot composition, not full body
- Cream brand poster backdrop with stork + "Nothing chemically, ever." tagline
- Dark wood shelving, palm fronds, warm lamp, Spanish moss visible
- Brand-portrait soft lighting (NOT cinematic)
- Documentary photorealism — never CGI / cartoon / rendered

---

## 3. Higgsfield Soul-ID training (one-time, blocks the rest)

Per `higgsfield-soul-id` skill: train a Soul Character for each of the 4 customer-facing Boomer_Angs so they appear identity-faithful across every generated image and video. Without Soul IDs, Higgsfield's `text2image_soul_v2` and `soul_cinema_studio` models lose character consistency between assets.

**Source frames (already exist in the portrait library):**
- Sal_Ang: existing Higgsfield-generated portrait (bar-shot)
- LUC: existing portrait (visor + cream backdrop)
- Melli_Capensi: existing portrait (apron + coffee bag)
- ACHEEVY: existing portrait (smooth-tenor reference set — Brian McKnight register)

**Training workflow (one-shot, per persona):**

1. Upload 5-10 source images per persona via `media_upload` → `media_confirm`
2. Invoke `higgsfield-soul-id` train → returns `reference_id` per persona
3. Save reference_ids to `coastal-brewing/config/higgsfield-soul-ids.json`:

```json
{
  "sal_ang":       "soul_<REFID>",
  "luc":           "soul_<REFID>",
  "melli_capensi": "soul_<REFID>",
  "acheevy":       "soul_<REFID>"
}
```

Once trained, every subsequent `higgsfield-generate` call uses `--soul-id <id>` for character consistency across image-to-video, marketing-studio ads, Pinterest pins, etc.

---

## 4. Asset matrix by channel × content pillar

Four content pillars × five channels = 20 asset categories. Production rotates weekly, not daily. Quality > volume.

### Content pillars

| Pillar | Cast | Cadence | Purpose | SEO anchor |
|---|---|---|---|---|
| **A. The 30-Second Pour** | Sal_Ang | Daily on Reels/Shorts, 1× weekly to feed | Quick reaction to a customer question, 1 short answer + CTA | "ask Sal coffee", "is this coffee for me" |
| **B. The Math** | LUC | 2× weekly long-form post + 1× weekly Reel | Pricing transparency, value math, cadence breakdown | "9-month coffee plan", "pay 9 get 12 math" |
| **C. Brewer's Notes** | Melli_Capensi | 1× weekly Reel + 1 monthly long-form YouTube | Origin storytelling, flavor walkthroughs, brewing tutorials | "single-origin coffee notes", "how to taste coffee" |
| **D. Above the Counter** | ACHEEVY (founder POV) | Bi-weekly long-form (LinkedIn + YouTube) | "Build a Company Without a Company" — the meta-story | "autonomous business", "AI-run small business", "Savannah entrepreneur" |

### Channel × Pillar × Higgsfield-model matrix

Format: **Channel** · **Pillar** · *Higgsfield model* · _Cadence_

| Channel | A: Pour (Sal) | B: Math (LUC) | C: Notes (Melli) | D: Above (ACHEEVY) |
|---|---|---|---|---|
| **Instagram Reels** (9:16, ≤90s) | `soul_cinema_studio` (i2v from existing portrait + ambient bar reference clip) · Daily | `soul_cinema_studio` + on-screen number animation · 1×/week | `soul_cinema_studio` + brewing close-up reference · 1×/week | `soul_cinema_studio` (office register) · 1×/2 weeks |
| **Instagram Posts/Carousels** (1:1, image) | `nano_banana_2` (still from Reel) · 3×/week | `gpt_image_2` (number cards) · 2×/week | `nano_banana_2` (bag/cup beauty) · 2×/week | `gpt_image_2` (quote card) · 1×/2 weeks |
| **YouTube Shorts** (9:16, ≤60s) | Mirror Reels · Daily | Mirror Reels · 1×/week | Mirror Reels · 1×/week | — |
| **YouTube long-form** (16:9, 5-12 min) | — | Quarterly "Math of Coastal" tour · 1×/quarter | Monthly "Brewer's Notes" episode · 1×/month | "Owner's Log" — bi-weekly · 2×/month |
| **LinkedIn posts + articles** | — | 1×/week native carousel | 1×/month article | 2×/month long-form article + native video |
| **TikTok** (9:16, ≤90s) | Mirror IG Reels (cross-post via Print_Press) | Mirror IG Reels | Mirror IG Reels | — |
| **X / Threads** | Daily quote-card from Sal's Reels | Number-card from LUC's Reels | Weekly origin-snippet | Weekly "Build a Company Without a Company" thread |

**Production load (steady state):**
- ~7 short-form videos / week (1 Sal daily + 1 LUC weekly + 1 Melli weekly + 1 ACHEEVY biweekly)
- ~12 still images / week (carousels + quote cards + product beauty shots)
- ~1 long-form video / 2 weeks
- ~2 LinkedIn articles / month

---

## 5. The 5-step pipeline mapped to Higgsfield

Per Iller_Ang's canonical pipeline (`references/seedance-video.md`), execution surface = Higgsfield (which natively offers Seedance 2.0 + GPT Image 2 + Soul Cinema, the same models Iller_Ang routes to).

**Step 0 — Reference acquisition.** Brave Video Search API → save 10-second reference clips to `coastal-brewing/assets/video/refs/` once per asset class:
- `cafe_ambient_bar_shot.mp4` (for Sal Reels — bar register, soft pour-over motion)
- `coffee_pour_macro.mp4` (for Melli Reels — slow-motion pour)
- `chalkboard_handwriting.mp4` (for LUC Reels — number-reveal motion)
- `office_window_light.mp4` (for ACHEEVY long-form — quiet desk setting)
- `warehouse_pallet_dust.mp4` (for LP visuals — never customer-facing, but B-roll for "Above the Counter" episodes)

**Step 1 — Image generation (seed frame).** Higgsfield routes:
- Sal/LUC/Melli stills + Reel seed frames → `higgsfield-generate` with `text2image_soul_v2` + persona's `soul-id`
- Product hero + Pinterest pins + carousel beauty shots → `higgsfield-product-photoshoot` mode (`product_shot` / `lifestyle_scene` / `moodboard_pin`)
- Number cards + quote cards (typography-heavy) → `higgsfield-generate` with `gpt_image_2`
- Marketplace listing cards (Amazon-style if we ever sell on a marketplace) → `higgsfield-marketplace-cards`

**Step 2 — Image-to-video.** `higgsfield-generate` with `soul_cinema_studio` (identity-faithful) + persona's `soul-id` + Step 0's reference clip. 5-10 second i2v output at 1080p.

**Step 3 — Upscale + audio.** FFmpeg `lanczos` 1080p→4K + audio master `-af loudnorm=I=-14:LRA=11:TP=-1.5`. Voice from Gemini 3.1 Flash TTS (matched to persona register — never said aloud in customer copy).

**Step 4 — Compose + ship.** Remotion templates per channel:
- `coastal_reel.tsx` — 9:16 Reel template with Custeez wordmark lower-third + end card
- `coastal_short.tsx` — same shape, YouTube Shorts metadata
- `coastal_carousel.tsx` — 1:1 stills with brand frame
- `coastal_longform.tsx` — 16:9 with chapter markers + lower-thirds + end card
- `coastal_linkedin_native.tsx` — 1:1 LinkedIn-native video with captions baked in (LinkedIn auto-plays muted)

Each Remotion template lives in `coastal-brewing/web/remotion/` and renders deterministically via `npx remotion render`.

---

## 6. SEO mechanics (per asset)

Every asset published carries this metadata:

### YouTube Shorts + long-form
- **Title:** keyword-front-loaded, ≤60 chars (e.g., "Pay 9, Get 12 — How Coastal's coffee math works | LUC")
- **Description:** 3 paragraphs — pillar context (50 words) + keyword cluster (75 words) + CTA + 3 internal links to brewing.foai.cloud
- **Tags:** 8-12 from the cluster matrix
- **Thumbnail:** 1280×720, persona face + 2-word hook in Bebas Neue, Custeez wordmark bottom-right
- **Chapters** (long-form only): every 60-90s with keyword-loaded chapter titles
- **End screen:** 3 cards — next video + subscribe + brewing.foai.cloud
- **Pinned comment:** first comment is owner-voiced (ACHEEVY narrator) with a question to drive engagement

### Instagram Reels + Posts
- **Caption:** hook (≤2 lines visible) + 80-word body + 1 CTA + 5-8 hashtags + alt text
- **Hashtag strategy:** mix of 2× broad (#coffee #specialty), 3× niche (#poolerga #lowcountrycoffee #single-origin), 2× branded (#coastalbrewingco #custeez), 1× campaign (#buildacompany)
- **Alt text:** 1-2 sentences keyword-loaded (auto-fill avoided — Iller_Ang writes the alt text)
- **Cover frame:** branded thumbnail (same template as YouTube — visual consistency across both channels feeds cross-platform SEO)
- **Pinned grid:** top 3 = current Brand Director's picks (Sal welcome, LUC math explainer, ACHEEVY founder's story)

### LinkedIn (B2B — Wood Stork tier lever)
- **Articles** (long-form): 800-1500 words, headline carries primary keyword in first 6 words, embedded native video at 60s mark, 3 internal links
- **Posts** (native video / carousel): hook in first line, 1500-3000 char body, 3 hashtags MAX
- **Native video**: captions baked in (LinkedIn auto-plays muted), aspect 1:1 for in-feed performance
- **Cadence**: 2 long-form articles/month (under ACHEEVY-Founder byline) + 1 carousel/week (LUC math)

### TikTok
- **First 2-second hook** is non-negotiable (algo behavior). Sal opening line is the hook.
- **Captions:** auto-burned via Remotion + style tokens. Hashtags 4-6 max.
- **Cross-post** from Instagram via Print_Press (existing pp daemon — `pp publish reel-coastal-XXX --target tiktok`).

### X / Threads
- **Threads**: 5-7 tweet threads, ACHEEVY-Founder byline, "Build a Company Without a Company" angle. Each thread terminates in brewing.foai.cloud link.
- **Quote cards**: standalone Sal/LUC tweets with image attachment.

---

## 7. Production schedule — Week 1 to Week 8

### Week 0 (one-time setup, BLOCKS the rest)

- [ ] Soul-ID training × 4 personas (sal_ang / luc / melli_capensi / acheevy) — owner runs `higgsfield-soul-id` workflow, saves IDs to `config/higgsfield-soul-ids.json`
- [ ] Reference clip library (Step 0) — 5 clips × 10 sec each, saved to `assets/video/refs/`
- [ ] Remotion template scaffolding (5 templates: reel / short / carousel / longform / linkedin_native) committed to `web/remotion/`
- [ ] Channel handles + verification: confirm `@coastalbrewingco` (or canonical handle) is owned on IG, TikTok, YouTube, LinkedIn, X. If any are squatter-held, fall back to `@coastalbrewing.co` per memory `reference_coastal_brewing_co_period_brand_canon_2026_05_10`
- [ ] Brand keyword research finalized — Google Keyword Planner pass on the 5 SEO clusters in §1; pick top 30 long-tail keywords; saved to `docs/marketing/seo-keyword-bank.md` for content team reference
- [ ] Print_Press schedule recipes for IG/TikTok/YT cross-post (existing `~/bin/pp` workflow — recipe templates for daily Sal Reels + weekly LUC math)

### Week 1 — "Sal Welcomes You"

Theme: introduce the storefront experience. Sal as the friendly face.

- 5 × Sal Reels (1/day, M-F) — different questions: "Is this coffee for me?", "What's the 9-month plan?", "Do you ship?", "Can I cancel anytime?", "What if I don't like it?"
- 2 × Instagram carousels (M/W) — bag-shot + Sal portrait + 3-step welcome flow
- 1 × YouTube long-form (Friday) — "Walk into Coastal Brewing Co." 8-minute storefront tour (Sal narrator)
- 2 × X quote-cards (T/Th) — pull Sal lines from Reels

### Week 2 — "LUC Shows the Math"

Theme: pricing transparency. The cadence math is the moat.

- 5 × Sal Reels (continuing pillar A)
- 1 × LUC long-form Reel (Wed) — "The 9-month plan, drawn on a chalkboard"
- 1 × LinkedIn article (Tue) — "How a $22.49/mo coffee plan beats a $29.99/mo coffee plan in nine months: the math"
- 1 × LinkedIn carousel (Fri) — 6 slides walking through the cadence table
- 1 × YouTube long-form (Friday) — "What does it cost to run Coastal Brewing Co. autonomously? Owner's Log."

### Week 3 — "Melli's Notes"

Theme: brewer's notes, flavor, origin.

- 5 × Sal Reels
- 2 × Melli Reels (Tue + Thu) — single-origin walkthrough, flavor wheel
- 1 × Instagram carousel (Wed) — flavor wheel beauty pin (cross-posted to Pinterest)
- 1 × YouTube long-form (Fri) — "Melli walks through a single-origin tasting" 6-min

### Week 4 — "Above the Counter" launch

Theme: meta-story. The Human-Less Company reveal.

- 5 × Sal Reels
- 1 × LinkedIn article (Tue) — "I run a coffee company from my laptop. Here's what's actually shipping today." (ACHEEVY-Founder byline)
- 1 × LinkedIn native video (Thu) — 60-sec founder talking-head, Sacred Separation maintained (no vendor names)
- 1 × YouTube long-form (Fri) — "Owner's Log — Episode 1" 10-min walkthrough of brewing.foai.cloud + the agent fleet (Sal / LUC / Melli at the bar)
- 2 × X threads (Mon + Thu) — "Build a Company. Without a Company." angle + math thread

### Weeks 5-8 — sustained cadence (no new pillar, deeper compounding)

Same shape as Weeks 1-4 with topic rotation:
- Sal Reels rotate through 20 customer-question prompts (saved bank in `docs/marketing/sal-prompt-bank.md`)
- LUC moves from cadence math → envelope economics → "what does pay-9-get-12 actually cost the business" transparency
- Melli adds: brewing-method tutorials (pour-over / French press / cold brew), seasonal SKU drops
- ACHEEVY adds: "Behind the orchestrator" episode + Launch Savannah Cohort 3 progress dispatch (PR cycle around the May 26 deadline + post-acceptance announcement if admitted)

---

## 8. Distribution funnel

```
   PRODUCTION                  DISTRIBUTION                     MEASUREMENT
   ──────────                  ────────────                     ───────────

   Higgsfield                  Print_Press daemon               GA4 + UTM tags
   ├── Soul Cinema   ─────►    (existing pp daemon at           ├── source/medium/campaign
   │   (video gen)              127.0.0.1:8472)                 ├── UTM template per channel
   ├── Soul V2       ─────►    │                                │
   │   (still gen)             ├── instagram (Reels + posts)    │  Owner-facing dashboard
   ├── Product       ─────►    ├── tiktok                       │  ├── /owner/marketing tab
   │   Photoshoot              ├── youtube (Shorts + long-form) │  │   (deferred — Phase 2)
   └── Marketing     ─────►    ├── linkedin (articles + posts) │  └── weekly digest via
       Studio (ads)            ├── x / threads                  │       @CoastalBrewBot
                               └── pinterest (image pins)
                                                                Search Console + YouTube
                               All carry UTM tags +             Analytics + LinkedIn
                               kontextful CTAs to               creator analytics —
                               brewing.foai.cloud               consolidated weekly
```

**UTM template** (every link from every channel):
```
?utm_source=<channel>&utm_medium=<format>&utm_campaign=<pillar>&utm_content=<asset_id>
```

Example: `https://brewing.foai.cloud/membership?utm_source=instagram&utm_medium=reel&utm_campaign=sal_pour&utm_content=reel_2026_05_15_001`

---

## 9. Higgsfield budget envelope (internal — NEVER customer-facing)

Steady-state production load × Higgsfield API pricing (read at job time — pricing changes; this is the order-of-magnitude check, not the canon source):

| Asset class | Volume/week | Higgsfield model | Notional cost |
|---|---|---|---|
| Sal Reel (i2v 9:16, 8 sec) | 5 | Soul Cinema Studio | ~$1-3/clip × 5 = $5-15 |
| LUC Reel (i2v with number overlay) | 1 | Soul Cinema Studio + GPT Image 2 | ~$3-5 |
| Melli Reel | 1 | Soul Cinema Studio | ~$2-4 |
| ACHEEVY Reel (bi-weekly) | 0.5 | Soul Cinema Studio | ~$1.5 |
| Stills (carousels + pins) | 12 | nano_banana_2 / gpt_image_2 / product_photoshoot | ~$0.05-0.30 × 12 = $0.60-3.60 |
| Long-form (bi-weekly) | 0.5 | Soul Cinema Studio multi-scene + Remotion compose | ~$10-30 |

**Weekly steady-state: ~$25-60.** Owner sets monthly cap via Higgsfield workspace billing; alert at 80%. Soul-ID training is one-time, ~$10-30 per persona × 4 = ~$40-120 setup.

---

## 10. Compliance gate (every asset before publish)

Five-check Iller_Ang DMAIC + Coastal-specific overlays:

1. **Sacred Separation** — no vendor names, no supplier name, no model names, no infra surfaces, no internal cost/margin numbers
2. **Compliance language** — no "organic", "all natural", "low acid", "boosts immunity", "improves focus", "supports gut health", "cures/treats/prevents", no mushroom-as-medicine framing, no same-day "roasted to order" (supplier SOP is "small batch roasted throughout the week")
3. **Brand canon** — "Coastal Brewing Co." with trailing period; "Custeez" with Z; persona names spelled correctly (Sal_Ang / LUC / Melli_Capensi / ACHEEVY); visor LED reads persona's own name in all visible LED frames
4. **Visual canon** — face shield is ONE integrated piece; bust-shot composition; cream poster backdrop; documentary photorealism (NOT CGI / cartoon); LP team in warehouse never storefront; Roo's tail visible if any Boomer_Ang is a kangaroo
5. **Owner Telegram approval** (when risk_tags fire) — any asset that names a price not in canon, any asset that references an unreleased SKU, any asset that makes a comparative claim about another brand, any asset that surfaces an internal employee name — all route through Telegram approval before publish (per NemoClaw policy gate, same flow as Stripe escalations)

Assets failing any check get **reworked, not shipped**. Iller_Ang owns the gate. ACHEEVY signs off on borderline calls. Owner approves anything tagged.

---

## 11. Open questions (owner input needed before Week 0)

- [ ] Confirm channel handles + ownership: `@coastalbrewingco` (period in display name, hyphen-free handle) on IG / TikTok / YouTube / LinkedIn / X / Pinterest — any squatter-held? Need fallback plan.
- [ ] Brand keyword research budget: free Google Keyword Planner pass is fine, or invest in Ahrefs / SEMrush for a one-month deep dive ($99-129/mo)? Iller_Ang recommends free pass for Phase 1, upgrade in Q2 if SEO traction is real.
- [ ] Founder-camera comfort level: ACHEEVY-narrated long-form is the high-value angle, but the founder doesn't appear on camera in the customer-facing canon (ACHEEVY is the orchestrator persona, not the founder's face). LinkedIn often performs best with a real human face. Decision: keep ACHEEVY as the on-screen narrator (avatar register), OR introduce a "Jarrett Risher, Founder" personal-brand secondary handle that does LinkedIn talking-head while the storefront stays orchestrator-faced. Default: Phase 1 stays ACHEEVY-only; Phase 2 owner-facing if SEO data says LinkedIn audiences need a real human face.
- [ ] Launch Savannah Cohort 3 alignment: pause the ACHEEVY Founder narration content during Cohort interview window (or amplify it as part of the application submission story)? Default: amplify — Week 4 long-form drop is timed to land 1-2 days before the May 26 deadline as part of the application package.
- [ ] Founder photoshoot for "About" page: existing portrait library has the 4 Boomer_Ang personas but no founder face. Skip (ACHEEVY remains the front-of-house) OR commission one (Higgsfield Soul training for the human owner)? Iller_Ang's call: skip for Phase 1.

---

## 12. Deliverables to ship before Week 1 production starts

1. `config/higgsfield-soul-ids.json` (committed to coastal-brewing repo)
2. `assets/video/refs/` (5 reference clips, R2-pinned per Iller_Ang cost canon)
3. `web/remotion/` (5 templates) — committed + CI builds clean
4. `docs/marketing/seo-keyword-bank.md` (top 30 long-tail keywords + cluster mapping)
5. `docs/marketing/sal-prompt-bank.md` (20 customer-question prompts for Sal Reels)
6. Print_Press recipes: `recipes/coastal-instagram-reel.yaml`, `recipes/coastal-tiktok-mirror.yaml`, `recipes/coastal-youtube-short.yaml`, `recipes/coastal-linkedin-native.yaml`, `recipes/coastal-x-quotecard.yaml`
7. UTM tag generator helper at `~/bin/coastal-utm` (existing CLI factory pattern per `agentic-cli` skill)

---

## Closing — what this plan is and isn't

**Is:** a phased, channel-mapped, SEO-anchored production calendar that uses Higgsfield as the execution surface for Iller_Ang's canonical 5-step pipeline. Soul-ID training gates the rest; once trained, the production loop runs at ~$25-60/week steady-state through Print_Press daemon for distribution.

**Isn't:** a content factory that generates 100 videos/week of slop. Iller_Ang's DMAIC gate is the throttle. One Sal Reel/day + one LUC math/week + one Melli notes/week + one ACHEEVY long-form/2 weeks is enough volume to compound SEO traction without diluting brand voice or burning through the Higgsfield budget.

Sacred Separation discipline is non-negotiable. Every asset passes the §10 gate before publish.
