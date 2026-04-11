# Per|Form Podcasters Producer — Design Spec

**Date:** 2026-04-11
**Status:** APPROVED
**Approving Authority:** ACHEEVY (Digital CEO)
**For:** Claw-Code Agent Execution via SmelterOS + Cloud Run Jobs
**Depends on:** Sqwaadrun SaaS Innovation Design (2026-04-10), Per|Form for Podcasters Directive v1

---

## 0. Executive Summary

Per|Form for Podcasters gives independent sports podcasters a production team powered by real sports data. The core offering is **The Producer** — a persistent autonomous agent per client that monitors their team, compiles data-enriched briefings, generates show notes with verified stats, cuts social clips, and delivers on the client's schedule. Every deliverable is DMAIC quality-gated before delivery. Nothing ships below B grade.

Two product lines: **Enterprise** (B2B, custom pricing) and **Public Access** (B2C, fixed tiers). Monthly subscriptions via Paperform + Stepper onboarding.

The Producer runs on **Cloud Run Jobs** (autonomous containers on our infrastructure), NOT Managed Agents. Sqwaadrun (17-Hawk scraping fleet) feeds verified data to the Producer via the gateway at port 7700. No proprietary IP leaves our infrastructure.

---

## 1. Two Product Lines

### 1.1 Enterprise (B2B)

- **Clients:** Sports media companies, podcast networks (Bleav, Blue Wire, Locked On), team-affiliated media operations
- **Pricing:** Custom via LUC discovery + sales conversation
- **Delivery:** Dedicated Producer with custom data feeds, custom branding, API access
- **QA:** SLA-backed delivery with DMAIC reporting
- **Onboarding:** Paperform + Stepper, custom billing terms
- **Sqwaadrun intelligence:** Market comparison data used internally to substantiate pricing — never exposed to the client

### 1.2 Public Access (B2C)

- **Clients:** Independent podcasters at every level
- **Pricing:** Fixed tier pricing — BMC / Premium / Bucket List / LFG
- **Sales Channel:** Monthly via Paperform + Stepper
- **Delivery:** Self-service dashboard with standard delivery formats
- **QA:** Same DMAIC quality gate as Enterprise — no tier-based quality degradation

---

## 2. Pricing Structure

### 2.1 Tier Pricing

| Plan | Monthly | What's Delivered Per Cycle |
|---|---|---|
| **BMC** | $7/mo + tokens | War Room access. 1 episode package: data-enriched show notes, description, tags. Token-based extras |
| **Premium** | $47/mo | 4 episode packages/mo. Daily team briefing. 3 clips per episode. Multi-platform descriptions |
| **Bucket List** | $87/mo | 8 episode packages/mo. Guest research packets. Analytics digest. Sponsor opportunity scan. 5 clips per episode |
| **LFG** | $147/mo | Unlimited episodes. White-label deliverables. Custom data feeds. API access. Dedicated Producer memory |

**Nothing is free.** $7 BMC entry is the floor. No free trials, no freebies.

### 2.2 Sales Flow (Paperform + Stepper)

```
Stepper Step 1: Channel URL + sport/team
Stepper Step 2: Pain points (multi-choice)
Stepper Step 3: LUC recommends tier
Stepper Step 4: Billing (built into Paperform)
Stepper Step 5: Delivery preferences (time, format, channels)
Stepper Step 6: Producer activates
  → Monthly cycle begins
  → DMAIC gate every delivery cycle
```

### 2.3 Pricing Substantiation

Sqwaadrun runs market intelligence missions (Use Cases #1 + #11 + #13) to scrape agency retainers, production service rates, and competitor offerings. This data is used internally by LUC to substantiate pricing decisions. It is NEVER exposed to clients. We don't compare ourselves to competitors — we deliver quality and let the product speak.

---

## 3. Scheduled Delivery System

### 3.1 Client Delivery Preferences

Set during onboarding via Stepper:

| Setting | Options |
|---|---|
| **Interval** | Daily / Weekly / Per-episode / Custom cron |
| **Delivery time** | e.g., 5:00 AM ET |
| **Email delivery** | Yes/No + email address |
| **Dashboard delivery** | Always (default) |
| **Format** | Study (private prep) / Commercial (shareable) / Both |
| **Notification channels** | Email, dashboard alert, webhook (LFG) |

### 3.2 Scheduled Briefing Flow

Lil_Sched_Hawk triggers the Producer 30 minutes before the client's delivery time:

1. Scrape overnight news for client's team/sport via Sqwaadrun gateway
2. Compile briefing with verified data (Lil_Diff_Hawk cross-references every claim)
3. Format into client's chosen format (study, commercial, or both)
4. DMAIC gate — QA_Ang checks:
   - No broken formatting
   - No template variables in output (`{{name}}`, `(name)`, `[INSERT]` — zero tolerance)
   - No missing data fields
   - All stats verified against scraped sources
   - All player names correct (verified against War Room database)
   - All links valid
   - Document renders correctly in email clients (Gmail, Outlook, Apple Mail)
   - PDF/DOCX exports open with proper fonts, margins, headers
5. Grade >= B → deliver at scheduled time
6. Grade < B → improve cycle → re-grade → deliver when >= B
7. Chronicle Charter logged

### 3.3 No News Protocol — Zero Hallucination Policy

If Sqwaadrun scrapes sources and finds zero new items for the client's team:

> **"No significant developments for the NY Giants overnight. Your War Room data is current as of April 10, 2026, 11:47 PM ET. Monitoring continues — you'll be notified the moment news breaks."**

**Rules:**
- Zero new items → deliver the "No News" notice with timestamp of last data check
- Minor news (practice report, roster transaction) → deliver clearly labeled: "Low activity day — 1 minor update"
- NEVER pad a thin news day with generated analysis to fill space
- NEVER fabricate quotes, stats, or developments
- DMAIC Measure phase includes explicit hallucination check — Lil_Diff_Hawk verifies every claim against a scraped source. No source = no claim
- The "No News" delivery is itself a quality signal: "We checked. Nothing happened. We're not making things up."

### 3.4 Live Ticker + Instant Notifications

**The briefing is a snapshot. The ticker is always live.**

The system doesn't stop checking after the scheduled briefing. Lil_Feed_Hawk and Lil_Sched_Hawk monitor continuously.

**Platform-Wide Ticker:**
- Lil_Feed_Hawk monitors RSS feeds, news sites, team beat writers, social accounts, official team channels — continuously
- New items enter the ticker as they're detected
- The ticker is a live feed visible on every client's dashboard
- ALL clients see league-wide news. Each client's team-specific items are highlighted/pinned

**Direct Notification — Per Client, Immediate:**
- When news hits that matches a specific client's team → push notification immediately
- Delivery channels (client configures): email, dashboard alert, webhook (LFG)
- Notification includes: headline, verified summary, source link, relevance tag
- Significant news (trade, injury, draft pick, coaching change) → Producer auto-generates a briefing supplement (the delta, not a full re-brief)
- Supplement delivered to dashboard + email (if opted in)

**Flow:**
```
5:00 AM  — Scheduled briefing delivered (or "No News" notice)
           Monitoring continues all day
2:14 PM  — Breaking: Giants trade up to #3 pick
           → Ticker updates platform-wide
           → Direct notification to all Giants-subscribed clients
           → Producer generates briefing supplement:
             "BREAKING UPDATE — Giants Trade to #3"
             Verified details, TIE impact, draft scenario recalculation
           → Delivered to dashboard + email
5:00 AM  — Next morning's briefing includes full picture
           (overnight recap + trade analysis + updated scenarios)
```

---

## 4. Dual Format — Study vs Commercial

Every deliverable exists in two formats. Client chooses which they want, or gets both.

### 4.1 Study Format (Private Prep)

- For the podcaster's eyes only — their prep material
- Dense, information-rich, structured for quick scanning
- Talking points with bullet stats
- "Hot take opportunities" flagged
- Counter-arguments pre-loaded
- Notes on what other shows covered this week (competitive awareness from Sqwaadrun)
- NOT designed to be shared — raw, utilitarian, packed with data
- Ingot tier: **Refined**

### 4.2 Commercial Format (Shareable/Publishable)

- Professional, branded, ready to share on social or embed on their site
- Clean typography, team colors, Per|Form Ingot watermark
- Formatted for platform-specific sharing:
  - LinkedIn article format
  - X thread format
  - Instagram carousel format
  - Newsletter format (Substack/Beehiiv/Mailchimp compatible)
  - PDF download (media kit quality)
- Shareable link: `perform.foai.cloud/d/{slug}`
- Ingot tier: **Forged**
- LFG white-label: **Holo** (client's branding replaces Per|Form, live surface)

### 4.3 Visibility Controls

| Setting | Study | Commercial |
|---|---|---|
| Dashboard visibility | Private (only client) | Public (shareable link) |
| Download | PDF/DOCX | PDF/DOCX/PNG (for social graphics) |
| Share to social | No | Yes (one-click to connected platforms) |
| Share link | No | Yes (`perform.foai.cloud/d/{slug}`) |
| Email delivery | Private attachment | Branded newsletter-style |

---

## 5. Ingot Watermark — ANG Pressed Stamp

### 5.1 Design Direction

The ANG forge stamp rendered as a **pressed-into-paper** aesthetic. Not the thick 3D embossed metal from the forge visual — the opposite. A blind deboss / wax-seal-flattened impression:

- Subtle, low-opacity (10-15% on light backgrounds, 8-12% on dark)
- Looks physically pressed INTO the document surface, not sitting on top
- No glow, no sparks, no 3D depth — flat, embossed-into-paper texture
- Same ANG logo geometry as the forge stamp, just rendered as an impression
- Works on both white (study format) and dark (commercial format) backgrounds

### 5.2 Placement

- **PDF/DOCX:** Bottom-right corner of every page footer
- **Social clips:** Lower-right video watermark (semi-transparent)
- **Dashboard documents:** Subtle background stamp
- **PNG social graphics:** Bottom-right corner

### 5.3 White-Label Override

LFG tier clients can replace the ANG stamp with their own mark. The Holo Ingot carries the client's branding instead of Per|Form's.

### 5.4 Design Execution

Iller_Ang designs the stamp. Routing: Recraft V4 for clean vector generation → format variants (PDF overlay, video watermark, social graphic, dashboard element).

---

## 6. The Dashboard (SaaS Experience)

### 6.1 Layout

```
┌──────────────────────────────────────────────────────┐
│  Per|Form Producer Dashboard           [Settings] [?] │
├──────────┬───────────────────────────────────────────┤
│          │                                           │
│ MY SHOW  │  TODAY'S BRIEFING              [Download] │
│ ──────── │  April 11, 2026 · NY Giants     [Share]  │
│ Schedule │  ─────────────────────────────            │
│ Delivery │  • Daniel Jones cleared for     [Study]   │
│ Content  │    minicamp (verified: 3 sources) [Comm]  │
│ Clips    │  • Draft: Giants pick #6 — 3              │
│ Ticker   │    scenarios with TIE grades               │
│ Analytics│  • Rival watch: Eagles signed...           │
│ Settings │                                           │
│          ├───────────────────────────────────────────┤
│          │  LIVE TICKER                    [League]   │
│          │  ▸ 2:14 PM — Giants trade to #3 [NEW]     │
│          │  ▸ 1:45 PM — Eagles sign FA LB            │
│          │  ▸ 11:20 AM — NFL schedule released       │
│          ├───────────────────────────────────────────┤
│          │  RECENT DELIVERIES                        │
│          │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐        │
│          │  │Ep 42│ │Ep 41│ │Ep 40│ │Ep 39│        │
│          │  │ S   │ │ A   │ │ A   │ │ S   │        │
│          │  │grade│ │grade│ │grade│ │grade│        │
│          │  └─────┘ └─────┘ └─────┘ └─────┘        │
│          ├───────────────────────────────────────────┤
│          │  CLIPS READY TO POST              [All]   │
│          │  "Jones is BACK" (0:42)    [X] [IG] [TT] │
│          │  "Draft scenario 2" (0:55) [X] [IG]      │
│          │  "Eagles rivalry" (0:38)   [X] [TT]      │
└──────────┴───────────────────────────────────────────┘
```

### 6.2 Key Features

- **Today's Briefing** front and center — first thing they see on login
- **Study/Commercial toggle** on every document — switch views instantly
- **Download button** on everything — PDF, DOCX, PNG
- **Share buttons** per platform — one click to post clips or share links
- **Grade badges** on every delivery — transparent quality (S/A/B)
- **Live Ticker** — platform-wide news feed with client's team highlighted
- **Recent Deliveries** timeline — full archive, searchable, all graded
- **Settings** — delivery preferences, schedule, format defaults, connected platforms

---

## 7. DMAIC/DMADV Quality Gate

### 7.1 DMAIC (Recurring Delivery QA)

Applied to every deliverable before it reaches the client.

| Phase | Action | Owner |
|---|---|---|
| **Define** | What did we promise this tier? Count deliverables, specify quality metrics | LUC sets from tier definition |
| **Measure** | What did we actually produce? Automated completeness check | QA_Ang |
| **Analyze** | Did we hit every target? Gap analysis — what's missing, what's wrong | QA_Ang |
| **Improve** | Fix gaps before delivery — regenerate, correct, fill | Producer re-runs failed items |
| **Control** | Grade the delivery S/A/B/C/D via PCP scoring. Log to Chronicle Ledger | Betty-Anne_Ang evaluates |

### 7.2 DMADV (New Tier/Feature Design QA)

Applied when designing new tiers or capabilities.

| Phase | Action |
|---|---|
| **Define** | What does this tier need to deliver? Requirements from LUC discovery |
| **Measure** | What are the quality metrics? (accuracy, completeness, timeliness) |
| **Analyze** | Can we deliver at this cost? Cost model against tier price |
| **Design** | Build the Producer workflow for this tier |
| **Verify** | Test with synthetic podcaster personas before launching to real clients |

### 7.3 Grade Actions

| Grade | Score | Action |
|---|---|---|
| **S** | 95-100 | Ship immediately. BAMARAM celebrates |
| **A** | 85-94 | Ship. Log minor gaps for next cycle |
| **B** | 70-84 | Ship. Note improvement areas |
| **C** | 55-69 | Hold. Improve cycle runs. Re-grade before shipping |
| **D** | 0-54 | Do not ship. Escalate to ACHEEVY. Fix and re-run |

Nothing below B ships. If a cycle grades below B, Producer re-runs before delivery date. Client never sees sub-B work.

### 7.4 DMAIC Formatting Checks (Zero Tolerance)

Every deliverable is scanned for:
- Template variables (`{{name}}`, `(name)`, `[INSERT]`, `{placeholder}`)
- Broken markdown/HTML rendering
- Player name spelling (verified against War Room database)
- Stale stats (verified against latest Sqwaadrun scrape timestamp)
- Valid links (no 404s, no broken URLs)
- Email client rendering (Gmail, Outlook, Apple Mail)
- PDF/DOCX export integrity (fonts, margins, headers)

A single formatting failure = automatic grade reduction to C. Fix before shipping.

### 7.5 Chronicle Charter

Every delivery generates a Chronicle Charter — the client's transparent receipt showing:
- What was promised (tier deliverables)
- What was delivered (item-by-item checklist)
- Quality grade (S/A/B)
- Data sources used (Sqwaadrun source count, Lil_Diff_Hawk verifications)
- Delivery timestamp

This eliminates refund disputes. The Charter is evidence of delivery quality.

---

## 8. LUC Discovery + Pricing Intelligence

### 8.1 LUC Discovery Flow

When a podcaster approaches:

```
Step 1: "What's your show?"
  → Channel URL or show name
  → Sqwaadrun RECON mission scrapes their channel
  → Returns: sub count, upload frequency, platforms, view averages, growth rate

Step 2: "What do you cover?"
  → Sport / team / topic
  → Maps to Per|Form vertical (NFL, CFB, NBA, MLB, general)

Step 3: "What's eating your time?"
  → Multiple choice: Research / Editing / Social clips / Show notes /
     Distribution / Guest prep / Analytics / Thumbnails / Monetization

Step 4: "Where do you want to be in 6 months?"
  → Growth targets
  → LUC projects cost curve from NOW to GOAL
  → Recommends tier based on current state + growth trajectory
```

### 8.2 PodcasterProfile Schema

```typescript
interface PodcasterProfile {
  // Scraped by Sqwaadrun at discovery
  channelUrl: string;
  currentSubs: number;
  monthlyViews: number;
  uploadFrequency: number;        // episodes per month
  platformCount: number;
  averageEpisodeLength: number;   // minutes
  hasCoHost: boolean;
  hasGuests: boolean;
  monetizationStage: 'none' | 'early' | 'active' | 'mature';
  networkAffiliation: string | null;

  // Computed by LUC
  tier: 'hobbyist' | 'grinder' | 'semi_pro' | 'professional' | 'studio' | 'enterprise';
  estimatedMonthlyCost: number;
  recommendedPlan: string;
  projectedGrowthCost: number;
  valueDelivered: number;
}
```

### 8.3 Synthetic Persona Dataset Build

Sqwaadrun campaign to build LUC's pricing intelligence:

| Phase | Hawks | Target | Output |
|---|---|---|---|
| 1. Landscape scrape | Scrapp, Crawl, API, Feed, Schema | Top 500 sports podcasts | Raw channel data |
| 2. Verification | Diff, Extract, Clean | Cross-reference metrics | Verified data per creator |
| 3. PE enrichment | API, Parse, Clean, Schema, Store | Top 100 creators | DISC + Big Five per creator |
| 4. Tier classification | Chicken Hawk + General_Ang | All 500 | Tier-labeled dataset |
| 5. Synthetic personas | Full pipeline → Smelt Engine | 3-5 per tier | 18-30 personas |
| 6. LUC training data | Pipe → Store | Package for LUC | Pricing intelligence loaded |

This data substantiates pricing internally. It is never exposed to clients.

---

## 9. Infrastructure Architecture

### 9.1 What Runs Where

**Our infrastructure (Cloud Run Jobs + VPS):**
- The Producer — Cloud Run Jobs container per client (autonomous, scheduled)
- Sqwaadrun — 17-Hawk fleet on VPS via gateway at port 7700
- War Room data — Neon Postgres + GCS
- Live Ticker — Lil_Feed_Hawk continuous monitoring
- DMAIC gate — QA_Ang automated checks
- Storage — Puter (primary) + GCS (secondary)
- Dashboard — Next.js frontend (Per|Form app)

**NOT on third-party preview/beta services:**
- No Managed Agents for the Producer (Cloud Run Jobs instead)
- No proprietary IP in external containers
- All Hawk logic, verification pipeline, and pricing intelligence stays on our infrastructure

### 9.2 Producer ↔ Sqwaadrun Integration

```
Producer (Cloud Run Job)
  ↓ POST /scrape (intent + targets)
Sqwaadrun Gateway (port 7700)
  ↓ Dispatches Hawks
17-Hawk Fleet
  ↓ Returns verified data
Producer receives clean, graded data
  ↓ Formats into deliverables
DMAIC gate
  ↓ Grade >= B
Client receives delivery
```

The Producer never sees Hawk internals. It calls the gateway API and gets results. If Cloud Run Jobs is unavailable, the Producer falls back to direct VPS execution.

---

## 10. Correction Record

| Item | Rule |
|---|---|
| Nothing is free | $7 BMC is the floor. No free trials, no freebies |
| Monthly billing via Paperform | Built into Stepper flow, not separate Stripe checkout |
| No competitor mentions in client-facing materials | Market comparison is internal intelligence only |
| No competitor shade in pitch | Deliver quality, be reliable, help clients succeed. Period |
| DMAIC on every delivery | No exceptions |
| Zero hallucination | No News = "No News" notice. Never pad, never fabricate |
| Live ticker is always on | Monitoring doesn't stop after scheduled briefing |
| Instant notification on breaking news | Client gets direct alert, not just ticker update |
| Formatting zero tolerance | Template variables, broken rendering = automatic grade C |
| Ingot watermark is pressed-into-paper | Not thick 3D emboss. Subtle, flat, deboss aesthetic |
| White-label replaces watermark on LFG | Client's mark, not Per|Form's |
| Producer runs on Cloud Run Jobs | NOT Managed Agents. No IP exposure to preview services |
| Sqwaadrun stays on our iron | Never in third-party containers. Gateway API only |
| Enterprise is separate product line | Custom pricing, SLA, dedicated Producer. Not just a bigger tier |
| DMADV for new tier design | Test with synthetic personas before launching to real clients |

---

*Per|Form Podcasters Producer Design Spec v1.0*
*"Quality product. Reliable delivery. Help the client succeed."*
*Two product lines. Two sales channels. DMAIC on everything. Zero hallucination. Always monitoring.*
