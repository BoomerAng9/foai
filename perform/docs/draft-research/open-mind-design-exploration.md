# Open Mind Design Exploration: Per|Form Draft Experience

**Skill**: Open Mind v1.0 (Smelter OS Layer 2 Innovation Harness)
**Subject**: Per|Form Draft Experience — differentiation for April 23, 2026 NFL Draft
**Date**: 2026-04-10
**Cycle**: 1 of 3 max

---

## Phase 1: Pre-Mortem — What Could Go Wrong

Seven failure modes identified for the current Draft Experience:

### FM-1: Commodity UI (No "Wow")
The current landing page, simulation view, and Big Board are polished but structurally identical to every mock draft tool on the market (PFF, ESPN, The Athletic, Tankathon). Four mode cards, a ticker strip, and a table of prospects with grades is the default shape of this category. Nothing about the UX says "this is something I have never seen before." Users will screenshot-compare and conclude we are another mock draft tool — just newer.

### FM-2: Simulations Feel Unrealistic
The simulation engine uses a mock-engine fallback with randomized trade injection (`Math.random() < tradeFrequency`). Trades are generated without real team-need logic beyond the basic Jimmy Johnson chart. Sophisticated users will run 3-4 sims, notice patterns feel synthetic, and stop trusting the tool. The ML service endpoint (`ML_SERVICE_URL`) is not yet wired.

### FM-3: Mobile Experience Breaks Down
The simulate page uses a 60/40 desktop split with `md:hidden` tabs for mobile. The War Room has `hidden md:block` sections. During the actual draft (April 23), most users will be on phones, second-screening. The current mobile tab-switching UX (board/picks/prospects/trades) loses context on every tap. The Big Board's 7-column grid is unreadable below 768px even with the mobile card fallback.

### FM-4: Token Pricing Misalignment
Token checkout routes exist (`/api/draft/tokens/checkout`, `/api/draft/tokens/webhook`) but pricing is not yet defined. The landing page says "free preview includes Big Board and Round 1 simulation" with "upgrade for unlimited access." Without competitive benchmarking (PFF $35/yr, Tankathon free, ESPN+ $10/mo), we risk either: too expensive and zero users adopt, or too cheap and we leave money on the table during the highest-traffic 2-week window.

### FM-5: No Viral/Sharing Mechanism
The results page (`/draft/results/[id]`) has a "Copy Share Link" button that copies the URL. That is the entire sharing system. No OG images, no shareable draft cards, no "my draft grade" social images, no Twitter/X integration. During draft week, the virality loop IS the growth engine. Without it, users consume but do not amplify.

### FM-6: Load Time / Real-Time Feel
The simulation flow is: POST to create simulation -> GET simulation state -> stream picks client-side with setTimeout delays. The entire draft is generated server-side in one batch, then "streamed" with artificial delays. This means the user waits for the full generation before seeing anything. For 7 rounds (258 picks), this could be 10-30 seconds of blank loading spinner. Users will bounce.

### FM-7: Missing Competitive Features
Key features competitors have that we lack:
- **Multiplayer draft rooms** (Sleeper, PFF Mock Draft Simulator)
- **Historical draft comparison** ("Last 5 QBs taken #1 overall...")
- **Community consensus** (aggregate of all user mocks)
- **Expert mock aggregation** (showing where PFF/ESPN/NFL.com rank each prospect)
- **Live draft tracker** (updating as the real draft happens on April 23-25)

---

## Phase 2: Divergent Planning — 10 Creative Ideas

Using SCAMPER, TRIZ, and Oblique Strategies frameworks:

### Idea 1: Live Analyst Commentary Track (SCAMPER: Combine)
**Combine** the draft simulation with Per|Form's analyst personas (The Colonel, Bun-E, Void-Caster). As each pick streams in, a text commentary card appears with the persona's reaction — The Colonel ranting about a reach, Bun-E dropping cosmic wisdom about a sleeper, Void-Caster's cold analytical breakdown. Audio optional (via voice pipeline), text always. Each persona has a distinct opinion style. Users can pick which analyst "desk" they sit at.

### Idea 2: Draft Report Card Social Images (TRIZ: Segmentation)
**Segment** the results into individual shareable assets. After simulation, auto-generate a branded image card per team showing: team logo colors, draft grade (A+ through F), best pick, biggest reach, and a one-line analyst quote. Optimized for Twitter/X and Instagram Stories dimensions. One-tap share with pre-filled text. OG meta tags on the results URL so link previews look broadcast-grade.

### Idea 3: Hindsight Draft Mode (SCAMPER: Reverse)
**Reverse** the timeline. Let users re-draft historical years (2020, 2018, 2016) knowing how careers turned out. Justin Herbert over Joe Burrow? Lamar Jackson at #1? The TIE engine re-grades every prospect with actual career data. Shows the "What Should Have Happened" board vs. what actually happened. Endlessly replayable and highly shareable ("I built a better 2018 draft than every NFL GM").

### Idea 4: Pick-by-Pick Confidence Meter (TRIZ: Prior Counteraction)
**Counteract** the "feels random" problem by showing prediction confidence on every pick. A visible meter: "87% likely this team takes a CB here based on 6,644 historical picks" that shifts in real-time as the draft state changes. When the engine makes a surprise pick, the confidence meter shows it was a 12% outcome — making the chaos feel earned, not random.

### Idea 5: Draft War Room Ambiance (Oblique: Use an old idea)
**Borrow from gaming**: add environmental sound design. War room murmur, clock ticking, crowd reactions on trades. A subtle ambient layer that makes the simulation feel like an event rather than a spreadsheet. The simulate page already has a broadcast aesthetic — this adds the broadcast audio layer.

### Idea 6: Head-to-Head Draft Challenge (SCAMPER: Adapt)
**Adapt** chess-style challenges. User A and User B each pick a team, then alternate making picks in real-time. AI fills the other 30 teams. After the draft, both get graded. Shareable comparison card: "Your Broncos draft: A-. Friend's Chiefs draft: B+." Perfect for draft parties and group chats.

### Idea 7: The Butterfly Effect Visualizer (TRIZ: Dynamization)
**Dynamize** the what-if analysis. When a user clicks any pick, show a branching tree of how the rest of the draft changes if that pick were different. "If the Giants take Cam Ward instead of Abdul Carter, here is what cascades." Animated flow showing 5-10 downstream effects. Makes the interconnected nature of the draft tangible.

### Idea 8: Draft Day Podcast Recap (SCAMPER: Put to other use)
**Repurpose** the simulation results as a generated podcast episode. After a sim completes, offer a 2-3 minute audio recap featuring The Colonel and Bun-E debating the best and worst picks. Uses the existing voice pipeline (PersonaPlex / ElevenLabs). The user gets a unique podcast episode of THEIR draft that they can share.

### Idea 9: Prospect Comparison Spotlight (SCAMPER: Modify)
**Modify** the pick reveal moment. Instead of just showing "Pick #3: Abdul Carter, EDGE" — show a 3-second animated card with: NFL comparison player highlight reel thumbnail, TIE grade with sparkline trend, and a "scouts say" pull quote. Turn every pick into a mini-event, not a table row update.

### Idea 10: Community Draft Consensus Heatmap (TRIZ: Merging)
**Merge** individual simulations into aggregate intelligence. Track every simulation run on Per|Form and build a live consensus board showing: "73% of Per|Form simulations have Shedeur Sanders going #1" with a heatmap of where each prospect lands across all sims. Updates in real-time as more users run simulations. Becomes its own content piece ("Per|Form Community Mock Draft").

---

## Phase 3: Constrained Generation — Filter to Top 3

### Constraints Applied:
1. **Buildable in 2-3 days** (before April 15) — eliminates multiplayer (Idea 6), full podcast generation (Idea 8), butterfly visualizer (Idea 7), and Hindsight Mode (Idea 3, needs historical career data ingestion)
2. **Uses existing infrastructure** — Neon DB, Next.js, existing voice pipeline, existing draft components. Eliminates ambient sound (Idea 5, needs audio assets), and community consensus (Idea 10, needs analytics pipeline + enough users first)
3. **Creates a "wow" moment competitors lack** — eliminates Idea 9 (enhanced pick cards are nice but not differentiated) and Idea 4 (confidence meters are analytical, not "wow")
4. **Works on mobile** — all remaining ideas must render well at 375px width

### Survivors:

**TOP 1: Live Analyst Commentary Track (Idea 1)**
- Existing persona definitions (The Colonel, Bun-E, Void-Caster) are fully specified in memory
- Text commentary is zero-cost (template-based with personality rules)
- Audio optional — text-first ships fast, audio upgrades later
- No competitor has persona-driven draft commentary integrated into simulations
- Mobile: commentary cards stack naturally below pick cards

**TOP 2: Draft Report Card Social Images (Idea 2)**
- Next.js OG image generation (`next/og` or `@vercel/og`) is a known, fast implementation
- Results page already computes team grades — just need to render them as images
- OG meta tags give instant link preview virality for zero user effort
- One-tap share to X/Twitter with pre-filled draft grade text
- Mobile: share button is inherently mobile-native

**TOP 3: Pick-by-Pick Confidence Meter (Idea 4)**
- The simulation engine already has `surprise_score` per pick — confidence is just the inverse
- Can be computed from existing historical pick data and team-needs arrays
- Adds credibility to every pick ("this is not random, here is why")
- Transforms the simulation from "watch mode" to "learn mode"
- Mobile: thin horizontal bar under each pick, minimal space

---

## Phase 4: Novelty Evaluation — Score and Recommend

### Scoring: Novelty (1-10) + Feasibility (1-10) + Impact (1-10) = Total

---

### #1: Live Analyst Commentary Track

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Novelty | 9 | No mock draft tool has integrated persona-driven commentary. ESPN has talking heads on TV, not in the sim tool. This bridges the gap between "tool" and "broadcast." |
| Feasibility | 8 | Text commentary = template strings with persona voice rules. 50-80 templates per persona covering pick types (reach, value, trade, position run, QB taken). No LLM call needed for v1 — pattern matching on pick attributes. 1-2 days to build. |
| Impact | 9 | This is the feature users will screenshot and share. "The Colonel just roasted my team's pick" is inherently viral. It transforms a utility into entertainment. Retention increases because users want to see what each persona says about each pick. |
| **Total** | **26** | |

**Implementation Plan (2 days):**
- Day 1:
  - Create `src/lib/draft/analyst-commentary.ts` — template engine with 3 personas
  - Each persona has: name, avatar, style rules, 60+ commentary templates keyed to pick attributes (position, surprise_score, team_needs_match, is_trade, round)
  - The Colonel: hot takes, Jersey slang, football IQ flexing, occasional pizza references
  - Bun-E: cosmic metaphors, sleeper love, women's sports crossover references, rhymes
  - Void-Caster: cold analytics, NFL comparison deep cuts, statistical backing
  - Function: `getCommentary(pick: DraftPick, persona: Persona): CommentaryCard`
- Day 2:
  - Create `src/components/draft/AnalystCommentary.tsx` — slide-in card component
  - Wire into SimulatePage and WarRoomPage: after each pick streams in, commentary card appears with 0.3s delay
  - Add persona selector to pre-sim setup (pick your analyst desk, or "All Analysts" rotating view)
  - Mobile: commentary appears below each pick in the picks tab, collapsible
  - Add persona avatar + name badge with personality-colored accent border

---

### #2: Draft Report Card Social Images

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Novelty | 7 | Some tools show draft grades, but none auto-generate branded shareable image cards. The PFF draft grade reveal is a manual editorial product. Automated per-user-simulation image generation is new. |
| Feasibility | 9 | `next/og` (ImageResponse API) or `@vercel/og` with satori handles server-side image generation in Next.js natively. The results page already computes `TeamGrade` objects. Rendering them as 1200x630 OG images and 1080x1920 story images is 1 day of work. OG meta tags on `/draft/results/[id]` are trivial. |
| Impact | 8 | Direct virality multiplier. Every shared link auto-previews with a branded draft grade card. One-tap X/Twitter share with text like "My Per|Form draft sim gave the Broncos an A-. Run yours:" + link. During draft week, this is pure growth. |
| **Total** | **24** | |

**Implementation Plan (1.5 days):**
- Day 1:
  - Create `src/app/api/draft/results/[id]/og/route.tsx` — OG image endpoint using `ImageResponse`
  - Design: dark background, team primary color accent, large letter grade, 3 best picks listed, Per|Form branding, "Run your own draft" CTA
  - Two sizes: 1200x630 (link preview) and 1080x1920 (IG story)
  - Add OG meta tags to results page `<head>` via Next.js metadata API
  - Add share buttons: "Share to X", "Copy Link", "Download Image"
- Day 1.5:
  - Add individual team grade cards (user taps a team grade -> gets a shareable image for THAT team)
  - Pre-fill share text with grade + link
  - Test OG previews on Twitter Card Validator and Facebook Debugger

---

### #3: Pick-by-Pick Confidence Meter

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Novelty | 6 | FiveThirtyEight-style confidence indicators exist in sports, but not integrated into mock draft simulations. It is novel in context but not a paradigm shift. |
| Feasibility | 8 | `surprise_score` already exists on `DraftPick`. Confidence = `100 - surprise_score`. Historical position frequency by pick slot can be pre-computed from the 6,644 historical picks dataset. Display is a thin progress bar + percentage label per pick. 1 day of work. |
| Impact | 7 | Increases credibility and "learn" engagement. Users who care about draft intelligence (the paying segment) will value this. Less viral than commentary or share images, but deepens trust. |
| **Total** | **21** | |

**Implementation Plan (1 day):**
- Create `src/components/draft/ConfidenceMeter.tsx` — horizontal bar with percentage, color-coded (green >70%, yellow 40-70%, red <40%)
- Add to `PickCard` and `DraftBoard` components: confidence bar appears under each pick
- Compute confidence from: `surprise_score` inverse + historical position-by-slot frequency
- Add tooltip: "Based on 6,644 historical picks, teams in this position take [POSITION] [X]% of the time"
- Wire into streaming: confidence shows BEFORE pick is revealed ("87% chance of CB here...") then resolves

---

## Final Recommendation

| Rank | Idea | Novelty | Feasibility | Impact | Total |
|------|------|---------|-------------|--------|-------|
| 1 | Live Analyst Commentary Track | 9 | 8 | 9 | **26** |
| 2 | Draft Report Card Social Images | 7 | 9 | 8 | **24** |
| 3 | Pick-by-Pick Confidence Meter | 6 | 8 | 7 | **21** |

**Primary recommendation**: Build all three. Total estimated effort is 4.5 days, but the commentary track and social images are the highest-leverage and should ship first (3.5 days combined). The confidence meter can ship as a fast-follow or parallel track.

**Sequencing**:
1. Draft Report Card Social Images (Day 1) — fastest to build, immediate virality unlock
2. Live Analyst Commentary Track (Days 2-3) — the "wow" differentiator, transforms the product category
3. Confidence Meter (Day 4) — credibility layer, deepens trust for paying users

**The thesis**: Per|Form Draft Experience is currently a well-built tool. These three features transform it from "tool" into "entertainment + tool" — which is where the real moat lives. No one will out-feature PFF on raw data. But PFF does not have The Colonel roasting your draft picks, auto-generated share cards, or confidence meters that make every pick feel earned. That is the lane.

---

*Open Mind Skill v1.0 — Cycle 1 complete. Recommend proceeding to implementation. No additional cycles needed; ideas are sufficiently constrained and scored.*
