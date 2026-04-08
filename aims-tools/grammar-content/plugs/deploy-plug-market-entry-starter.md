# Deploy Plug — Market Entry Starter

> **Sample plug** for users to clone when launching a new product, service, or vertical into a new market.
>
> Renamed from "HIDT Planning" per Rish 2026-04-08. Agnostic of any specific market — user fills in their target.

## What this is

The Deploy Plug Market Entry Starter is a ready-to-clone aiPLUG that walks a user from "I want to enter a new market" to a complete launch plan with branding, marketing strategy, content, and measurement loops.

It draws from:
- The 24 Psychological Frameworks (`prompts/psychology/`)
- The 21 Content Creation Frameworks (`prompts/content/`)
- High-Ticket Sales prompts (`prompts/sales/`)
- The Sigma Terms glossary (`glossary/sigma-terms.md`)
- Cross-industry translation layers (`glossary/translations/`)
- A.I.M.S. KPI/OKR Metric framework

## Plug structure (5 phases)

### I. Define Your Target Market
- Identify potential customers, segments, partners
- Understand their needs, challenges, and motivations
- **Availability heuristic bias check** — what assumptions might you be making because they're easy to recall? Pause and consider what's NOT easy to recall.
- LLL (Look-Listen-Learn) discovery cycle before committing
- Sector-by-demographic demand mapping

### II. Develop Your Branding
- Create a strong brand image and messaging that resonates with your target audience
- Utilize social media, websites, and other digital platforms to promote your brand
- Use Recraft V4 / Ideogram V3 / Gamma for asset generation (per `project_design_routing.md`)

### III. Plan Your Marketing Strategy
- Targeted advertising to reach potential customers + professionals in transition
- Leverage social media platforms to engage with your audience
- Offer discounts and promotions to incentivize sign-ups + increase attendance
- Develop partnerships with local businesses, universities, organizations to increase reach + credibility
- Host informational webinars, workshops, open houses
- **Apply 2-3 Psychological Frameworks** (e.g. Reciprocity Bias, Scarcity Principle, Social Proof)
- **Blue Ocean strategy prompts** — what uncontested market space could we create?

### IV. Create Engaging Content
- Develop educational and informative content that showcases your expertise + offerings
- Utilize digital platforms to deliver content: webinars, podcasts, social media posts
- Encourage engagement through comments, likes, shares to increase visibility + reach
- **Apply Content Creation Frameworks** (Situation-Complication-Resolution, Storyboard, Hero's Journey, etc.)

### V. Measure and Optimize Your Campaigns
- Use analytics tools to measure effectiveness of marketing campaigns
- Adjust strategies as needed
- Identify areas of improvement + opportunities for growth
- Utilize customer feedback + reviews to improve experience and drive word-of-mouth
- **Apply A.I.M.S. KPI/OKR Metric** for performance scoring (Quality, Timeliness, Creativity, Teamwork, Communication, Professionalism)

## How users clone this plug

In the user's plan page (TPS_Report_Ang's flow), they pick "Deploy Plug Market Entry Starter" from the list of starter plugs. ACHEEVY commissions a Mission with this plug as the template. The Boomer_Ang departments execute each phase in sequence:

| Phase | Lead agent |
|---|---|
| I. Define Target Market | Boomer_CMO + Sqwaadrun (web research) |
| II. Develop Branding | Boomer_CDO + design tool chain (C1 Thesys → Stitch → Recraft → Gamma) |
| III. Plan Marketing Strategy | Boomer_CMO + 24 Psychological Frameworks |
| IV. Create Engaging Content | Boomer_CMO + 21 Content Creation Frameworks |
| V. Measure & Optimize | Boomer_COO + Betty-Anne_Ang scoring |

User stays on Guide Me OR Manage path (their choice). Either way, Mission Brief commissioned via `pmo.commission()` and evaluated by Betty-Anne_Ang on completion.

## Customization

Users can fork this plug into their own variant via the SmelterOS UI. Each fork keeps a reference to the parent plug for upgrade propagation when the canonical Starter is updated.
