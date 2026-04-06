# Per|Form Talent Intelligence Skill v2.0 — Final Production

**Skill ID:** perform-talent-intelligence
**Layer:** Layer 2 Skill (embeds into Smelter OS)
**Vertical:** Per|Form (Layer 3)
**Powered By:** InfinityLM (AVVA NOON)
**Orchestrator:** ACHEEVY (Master Smeltwarden)
**Branding:** TIE — Talent & Innovation Engine (gold/black shield badge)
**Status:** APPROVED — Final Production
**Date:** April 6, 2026
**Hard Deadline:** April 23, 2026 (NFL Draft Round 1, Pittsburgh, 8 PM ET)
**For:** Coding Editor (Claw-Code / Claude Code CLI)
**Supersedes:** v1.0 and v1.1

---

## REVISION RECORD

| Version | Change |
|---|---|
| v1.0 | Initial skill (three-pillar 60/25/15 weights) |
| v1.1 | Added research data, flag football, mock draft sim, 8-min R1 timer, implementation plan |
| v2.0 | CORRECTED formula to official ACHIEVEMOR weights (40/30/30), added 101+ Prime Player tier, grade scale with icons, Prime Player sub-tags, TRCC data pipeline, worked examples |

---

## FOR THE CODING EDITOR — READ THIS FIRST

The grading formula in v1.0 and v1.1 was WRONG. The correct ACHIEVEMOR formula is:

```
Player Grade Score = (Game Performance x 0.4) + (Athleticism x 0.3) + (Intangibles x 0.3)
```

NOT the 60/25/15 split from earlier versions. This document is the definitive, final, canonical grading system. All prior versions are superseded. If you see 60/25/15 in any other document, it is stale — use 40/30/30.

The grade scale now goes to 101+ (Prime Player / 🛸) — a player so far beyond the scale they are not from this planet. This is the ACHIEVEMOR signature.

Everything else from v1.1 (mock draft simulator, flag football, consensus comparison, content generation, data pipeline, implementation plan) is retained and extended. Only the formula, grade scale, and worked examples are corrected here.

---

## PART 1 — THE ACHIEVEMOR GRADING FORMULA

### The Core Equation (Proprietary — Never Revealed to End Users)

```
PLAYER GRADE SCORE =
  (Game Performance x 0.40) +
  (Athleticism x 0.30) +
  (Intangibles/Leadership x 0.30)
```

This formula is the intellectual property of ACHIEVEMOR. The public-facing Per|Form platform shows the GRADE and the BREAKDOWN but never shows the exact weights. Users see: "Game Performance: 92 | Athleticism: 90 | Intangibles: 88 | Per|Form Score: 90.2 → A+" but they do NOT see the 0.4/0.3/0.3 multipliers.

---

### Pillar 1: GAME PERFORMANCE (40% of total grade)

The heaviest weight. What the player did on the field. Evaluated across four categories:

**Offense:**
- Yards (total, per game, per attempt/carry/route)
- TD-to-INT ratio (QB), TD-to-fumble ratio (RB), TD-to-drop ratio (WR/TE)
- Efficiency metrics (completion %, yards per carry, catch rate)
- Red zone efficiency, 3rd down conversion rate
- Deep ball accuracy (QB), contested catch rate (WR/TE)

**Defense:**
- Tackles (total, solo, TFL)
- Sacks, pressures, hurries
- Interceptions, pass breakups, forced fumbles
- Coverage grade, run stop percentage
- Missed tackle rate

**Special Teams:**
- Return yards (kick and punt), return TDs
- Field goal percentage, touchback rate, inside-20 %
- Hang time, coverage unit tackles

**Advanced Metrics:**
- PFF grades (overall, passing, rushing, receiving, blocking, coverage, pass rush)
- EPA/play (Expected Points Added per play)
- Success rate (% of plays producing positive EPA)
- Win probability added
- CPOE (Completion Percentage Over Expected) for QBs

**Recency Weighting (applied within Game Performance):**
- Most recent season: 50% of this pillar
- Second most recent: 25%
- Third most recent: 15%
- Earlier: 10%

**Context Variables (adjust raw stats):**
- Coaching/scheme change: ±5%
- Injury (partial season): pro-rate to full season
- Conference strength: ±3% (SEC/Big Ten > Group of 5)
- Opponent quality: ±2%
- Supporting cast: ±2%

---

### Pillar 2: ATHLETICISM (30% of total grade)

**Speed:**
- 40-yard dash time
- 10-yard split (burst/acceleration)
- Top speed (if GPS data available)

**Agility:**
- 3-cone drill time
- 5-10-5 shuttle (lateral quickness)
- Change of direction score

**Strength & Power:**
- Bench press reps at 225 lbs
- Block shedding ability (DL/LB)
- Run-after-contact metrics (RB)

**Size & Frame:**
- Height (position-adjusted ideal ranges)
- Weight (position-adjusted ideal ranges)
- Wingspan / arm length
- Hand size

**Explosiveness:**
- Vertical jump
- Broad jump
- Power-to-weight ratio

**Injury History (deductions within Athleticism):**
- Minor (1-2 games missed): -1 to -2 points
- Moderate (3-5 games): -3 to -5
- Significant (6+ games): -6 to -10
- Chronic/recurring: -8 to -15
- Career-threatening: -15 to -25

---

### Pillar 3: INTANGIBLES / LEADERSHIP (30% of total grade)

**Football IQ:**
- Film study habits (documented by coaches)
- Processing speed (pre-snap reads, audible frequency)
- Scheme versatility (can they learn multiple systems)

**Work Ethic:**
- Practice habits (coaches' testimony, documented reports)
- Offseason improvement trajectory
- First-in/last-out reputation

**Competitiveness:**
- Clutch performance (4th quarter, overtime, championship games)
- Effort grade on film (does motor run hot on every play)
- Performance in biggest games vs. average games

**Coachability & Leadership:**
- Team captain designation
- Player-voted awards
- Coaches' public and private testimony on leadership

**Off-Field Character:**
- Community service / philanthropy
- Academic achievement (GPA, degree completion)
- NIL presence and brand value (On3 NIL valuation feeds this)
- Media presence (positive vs. negative press)
- Discipline issues (see Negative Severity Scale below)

**Negative Severity Scale:**
- Level 1 Minor: -1 to -3 (traffic violation, minor team infraction)
- Level 2 Moderate: -3 to -8 (misdemeanor, bar altercation)
- Level 3 Serious: -8 to -15 (DUI, repeated offenses, weapons)
- Level 4 Severe: -15 to -20 (conviction, jail time, league action)
- Level 5 Career-impacting: -20 to -25 (pattern making teams avoid the player)

**Positive Severity Scale:**
- Level 1 Standard: +0 to +1
- Level 2 Notable: +1 to +3 (captain, community volunteer)
- Level 3 Exceptional: +3 to +5 (Academic All-American + captain + charity)
- Level 4 Generational: +5 to +7 (Walter Payton Man of Year caliber)

---

### Multi-Position Versatility Bonus (added to final score)

- Situational flex: +3 (second position in packages)
- True two-way (college): +5 (Charles Woodson, Champ Bailey, Chris Gamble, Ted Ginn)
- Unicorn (NFL-viable both ways): +7 (generational rarity)

---

## PART 2 — THE ACHIEVEMOR GRADE SCALE

### Grade Scale with Icons and Draft Projections

| Final Score | Grade | Icon | Projection |
|---|---|---|---|
| **101+** | **Prime Player** | 🛸 | Generational Talent, Franchise Player |
| 90-100 | A+ | 🚀 | Elite Prospect, Top 5 Pick |
| 85-89 | A | 🔥 | First-Round Lock, Potential Pro Bowler |
| 80-84 | A- | ⭐ | Late First-Round, High Upside Starter |
| 75-79 | B+ | ⏳ | Day 2 Pick, High Ceiling, Some Concerns |
| 70-74 | B | 🏈 | Day 2 Pick, Solid Contributor but Not a Star |
| 65-69 | B- | ⚡ | Mid-Round Pick, Needs Development |
| 60-64 | C+ | 🔧 | Depth Player, Role Player at Best |
| Below 60 | C or Below | ❌ | Practice Squad / Undrafted |

The 🛸 is the alien — a player so far beyond the scale they are not from this planet. This is ACHIEVEMOR's signature designation.

### Prime Player Sub-Tags (101+ 🛸 Only)

When a player breaks the 101 ceiling, one or more of these sub-tags qualify their elite profile:

| Sub-Tag | Icon | Meaning |
|---|---|---|
| Franchise Cornerstone | 🏗️ | Cornerstone of a franchise build — you build the team around this player |
| Talent w/ Character Concerns | ⚠️ | Elite ceiling, but off-field flags reduce certainty |
| NIL Ready | 🎤 | Brand value and market readiness exceed pure football projection |
| Quiet but Elite | 🔒 | Under-the-radar generational talent — the draft's hidden gem |
| Ultra-Competitive | 🤯 | Elite motor and competitive drive that elevates everyone around them |

A player can carry multiple sub-tags. A 🛸 🏗️ 🤯 player is a Franchise Cornerstone with Ultra-Competitive drive — the rarest designation in the system.

---

## PART 3 — WORKED EXAMPLES

### Example 1: Emeka Egbuka (WR, Ohio State) — 2025 Draft Class

```
Game Performance: 92   x 0.40 = 36.80
Athleticism:      90   x 0.30 = 27.00
Intangibles:      88   x 0.30 = 26.40
                                ──────
FINAL SCORE:                    90.20

GRADE: A+ 🚀
PROJECTION: Elite Prospect, Top-10 Pick
```

### Example 2: TreVeyon Henderson (RB, Ohio State) — 2025 Draft Class

```
Game Performance: 88   x 0.40 = 35.20
Athleticism:      87   x 0.30 = 26.10
Intangibles:      82   x 0.30 = 24.60
                                ──────
FINAL SCORE:                    85.90

GRADE: A 🔥
PROJECTION: First-Round Lock, Late First-Round
```

### Example 3: Jack Sawyer (DE, Ohio State) — 2025 Draft Class

```
Game Performance: 90   x 0.40 = 36.00
Athleticism:      85   x 0.30 = 25.50
Intangibles:      86   x 0.30 = 25.80
                                ──────
FINAL SCORE:                    87.30

GRADE: A 🔥
PROJECTION: First-Round Lock
```

### Example 4: Fernando Mendoza (QB, Indiana) — 2026 Draft Class

```
Game Performance: 94   x 0.40 = 37.60  (16-0, 41 TD/6 INT, 71.5%, Heisman)
Athleticism:      82   x 0.30 = 24.60  (6-5, 236 lbs, solid but not elite mobility)
Intangibles:      91   x 0.30 = 27.30  (team captain, natl champ, great interviews)
                                ──────
FINAL SCORE:                    89.50

GRADE: A 🔥
PROJECTION: First-Round Lock, Potential Pro Bowler

NOTE: ESPN grades Mendoza 92. Per|Form grades 89.5. Why? Our Athleticism
pillar (30% weight) reflects that Mendoza is a pocket passer with limited
mobility — elite arm, elite processing, but not a dual-threat. His Game
Performance is the highest in the class (94), and his Intangibles are elite
(91), but the formula correctly weights athleticism at 30%, which tempers
the final score. This is opinion-agnostic grading.

Mendoza will be drafted #1 overall. Our grade says he's an A 🔥 First-Round
Lock, not an A+ 🚀 Top-5 Pick. Teams draft for need — the Raiders need a
franchise QB and Mendoza is the best available. Our grade reflects talent
evaluation independent of team need.
```

### Example 5: Hypothetical Prime Player (101+ 🛸)

```
Game Performance: 99   x 0.40 = 39.60
Athleticism:      98   x 0.30 = 29.40
Intangibles:      97   x 0.30 = 29.10
                                ──────
FINAL SCORE:                    98.10
+ Multi-Position Bonus:         + 5.00 (true two-way player)
                                ──────
ADJUSTED FINAL:                103.10

GRADE: PRIME PLAYER 🛸
SUB-TAGS: 🏗️ Franchise Cornerstone | 🤯 Ultra-Competitive
PROJECTION: Generational Talent — #1 Overall, Build the Franchise

This is the alien. This player breaks the scale. In recent memory,
only Travis Hunter (2025 draft) and a handful of others in history
would qualify for 🛸 status.
```

---

## PART 4 — TRCC DATA PIPELINE

### Transfer, Recruitment, Coaching Carousel Intelligence Layer

TRCC is the real-time data pipeline that feeds the grading engine with live inputs. Four agents power it (all under Chicken Hawk coordination):

**1. Scraping Agent (Data_Hawk + Web Prowl)**
- Pulls raw data from 247Sports, On3, ESPN, PFF, MAXPREPS
- Brave API for news, injury reports, character research
- Playwright for structured data extraction from web dashboards
- CFBD API for current college stats
- nflverse for NFL draft history and combine data

**2. Analysis Agent (Analytics_Hawk)**
- Applies the 40/30/30 formula to raw data
- Surfaces trends (improving/declining trajectory)
- Runs recency weighting (50/25/15/10)
- Applies context variables (coaching, scheme, conference, etc.)
- Calculates multi-position versatility bonus
- Assigns grade tier and icon

**3. Content Agent (Content_Hawk)**
- Packages grade outputs in ACHEEVY tone
- Writes 500-800 word articles per player
- Generates 2-4 minute podcast scripts
- Produces consensus comparison analysis
- All content calibrated through Grammar Language Skill

**4. Chatbot Agent (ACHEEVY via Grammar)**
- Delivers results to end users live
- Handles natural language queries: "What's Mendoza's grade?"
- Triggers Scenarios tiles for custom grading
- Explains methodology when asked (without revealing exact weights)

---

## PART 5 — RECRUITING SCOPE / RANKING TIERS

For high school prospects (Domain 3), the grading engine scopes by tier:

**National Tiers:**
- National Top 5 (the elite of the elite)
- National Top 100
- National Top 300

**State-Specific by Star Rating:**
- "5-stars in Georgia" / "4-stars in Texas" / "3-stars in Florida"
- Star ratings sourced from 247Sports Composite (blends 247, On3/Rivals, ESPN at 33% each)
- 247Sports uses 75-110 scale with exactly 32 five-stars per class
- On3/Rivals (merged 2025) uses 80-100 scale
- ESPN uses 50-100 absolute scale

**Per|Form applies its OWN grade** independently of star ratings. A 3-star recruit with elite athleticism and intangibles may grade higher on Per|Form than a 4-star with better stats but lower motor. The star rating is a comparison data point, not an input to the formula.

---

## PART 6 — DATA SOURCES

| Source | What It Feeds | Cost |
|---|---|---|
| PFF College Football | Advanced metrics, EPA/play, pass-rush grades → Game Performance | Subscription |
| Sports Reference / nflverse | Game stats, historical data, combine → Game Performance + Athleticism | FREE (CC-BY 4.0) |
| 247Sports | Recruiting profiles, combine data → Athleticism + Recruiting scope | FREE (web) |
| On3 NIL | NIL valuation → Intangibles (off-field character / brand value) | FREE (web) |
| MAXPREPS | High school game performance → Game Performance (HS level) | FREE (web) |
| NFL Mock Draft Database | Draft projection calibration → consensus comparison | FREE (web) |
| ESPN / CBS Sports | Intangibles context, leadership, off-field character | FREE (hidden API) |
| CFBD API | Current season college stats, rosters, portal → Game Performance | $5/mo |
| Brave API | News, injury reports, character research → Intangibles | $5/mo credits |

**Model Policy (unchanged from v1.1):**
- Articles: latest free model on OpenRouter (Llama 3.3 70B or Qwen 3.6 Plus)
- Fallback: Gemini Flash (< $0.20/M tokens)
- Hard ceiling: NEVER exceed $0.50/M tokens
- Grade calculation: pure Python computation, no LLM cost
- Player cards: Imagen 4 ($0.02/image) or Ideogram 3.0 (free, best text rendering)
- Podcasts: Gemini 2.5 Flash TTS (multi-speaker, free tier)

---

## PART 7 — FOUR GRADING DOMAINS (Updated from v1.1)

### Domain 1: NFL Draft Prospects
- 2026 draft class ONLY
- Full 40/30/30 formula
- Content: bio + article + podcast + player card + listen button + grade icon

### Domain 2: College (NIL / Transfer Portal)
- Currently enrolled ONLY
- Same 40/30/30 formula + NIL factors feed Intangibles via On3 valuation
- Transfer portal single 15-day January window (new 2026 rules)
- House v. NCAA settlement: $20.5M revenue sharing cap per school

### Domain 3: High School Recruits
- Current HS students ONLY
- Modified: Game Performance 35% / Athleticism 35% / Intangibles 20% / Projection 10%
- Projection Bonus (0-10): multi-position optionality, athletic ceiling, offer quality
- Recruiting scope tiers: National Top 5/100/300, state-specific by star rating

### Domain 4: Flag Football (Olympic / Professional)
- LA 2028 Olympics: 5v5, 70x25-yard field, no contact
- Men's and women's divisions
- Modified 40/30/30 with speed/agility weighted higher in Athleticism pillar
- Same grade scale with icons applies

---

## PART 8 — MOCK DRAFT SIMULATOR (Retained from v1.1)

Full interactive experience with:
- 257 picks across 7 rounds (224 standard + 33 compensatory)
- 8-MINUTE first-round timer (NEW 2026 rule, reduced from 10)
- Trade simulator (Jimmy Johnson chart + modern analytics)
- User-created custom drafts
- Live draft day tracking (April 23-25, Pittsburgh)
- Countdown with real calendar sync
- Draft education index for new fans
- Draft pick tracker for all 32 teams

---

## PART 9 — CONSENSUS COMPARISON (Retained from v1.1)

Side-by-side display with cross-system normalization:
- Per|Form Score (40/30/30 with icons)
- PFF (0-100, play-by-play production)
- ESPN/Scouts Inc. (0-100, projected NFL value)
- NFL.com/Zierlein (6.0-8.0, career arc projection)

Article discusses WHERE we agree, WHERE we differ, and WHY our methodology produces different numbers.

---

## PART 10 — CONTENT GENERATION (Retained from v1.1)

Per player: bio page + article (500-800 words, 8-section structure) + podcast (2-4 min, 8-section flow) + player card (AI-generated, front + back, TIE badge) + listen button

Article structure: Hook → Recent Season → Career Arc → Talent Evaluation → Measurables → Intangibles (gloss over negatives, highlight positives) → Consensus Comparison → The Grade

---

## PART 11 — GRAMMAR + SCENARIOS + WHITE-LABEL (Retained from v1.1)

Scenario tiles: NFL Draft Grading, College NIL/Portal, HS Recruits, Mock Draft Simulator, Player Report (Custom), Podcast Generator, Compare Consensus, Flag Football, Trade Simulator, Draft Education

White-label tiers (all PRELIMINARY): Creator $19 / Podcaster $49 / Analyst $99 / Enterprise $499

---

## PART 12 — IMPLEMENTATION PLAN (Updated Day-by-Day)

### Week 1 (April 6-12): Data + Grading Engine

```
Day 1-2: Data Pipeline
[ ] CFBD API v2 ($5/mo), nfl_data_py, Brave API
[ ] Build data ingestion for all sources in Part 6
[ ] Build data filter layer (current year, correct domain, no fabrication)
[ ] Test: pull 2026 draft class data for top 50 prospects

Day 3-4: Grading Engine
[ ] Implement CORRECT formula: (Game Performance x 0.40) + (Athleticism x 0.30) + (Intangibles x 0.30)
[ ] Implement recency weighting (50/25/15/10 within Game Performance)
[ ] Implement context variables (coaching, scheme, injury, conference, opponent, cast)
[ ] Implement position-specific stats across all 4 categories (offense, defense, special teams, advanced)
[ ] Implement athleticism scoring (speed, agility, strength, size, explosiveness)
[ ] Implement injury severity deductions
[ ] Implement intangibles scoring with positive AND negative severity scales
[ ] Implement multi-position versatility bonus (+3/+5/+7)
[ ] Implement grade scale with icons (🛸🚀🔥⭐⏳🏈⚡🔧❌)
[ ] Implement Prime Player sub-tags for 101+ scores
[ ] Test: grade Mendoza (should produce ~89.5, A 🔥)

Day 5-7: Content Generation
[ ] Configure OpenRouter with Llama 3.3 70B (free)
[ ] Build article template with grade icon in output
[ ] Build podcast script template
[ ] Configure Gemini 2.5 Flash TTS (multi-speaker)
[ ] Test: full content suite for Mendoza
```

### Week 2 (April 13-19): UI + Cards + Simulator

```
Day 8-9: Player Cards with Icons
[ ] Configure Imagen 4 / Ideogram 3.0
[ ] Build card template: front shows grade icon (🛸🚀🔥 etc.), Per|Form Score, TIE badge
[ ] Back shows full breakdown: Game Performance / Athleticism / Intangibles scores
[ ] Generate cards for top 50 prospects

Day 10-11: Mock Draft Simulator
[ ] Draft board, countdown, 8-min R1 timer, trade sim, user drafts
[ ] Draft education index for new fans
[ ] Draft pick tracker for all 32 teams

Day 12-14: Consensus + Polish
[ ] Consensus comparison engine with cross-system normalization
[ ] Player bio pages with all components
[ ] Generate content for top 50 prospects
[ ] QA pass — deploy to production
```

### Week 3 (April 20-25): Launch + Live Draft

```
Day 15-17: Pre-draft content review, simulator live, marketing push
Day 18 (April 23): DRAFT DAY — live tracking, real-time picks, trade analysis
```

### Post-Draft: College, HS, Flag Football modules expand

---

## PART 13 — SUCCESS CRITERIA

1. Formula is 40/30/30 (Game Performance / Athleticism / Intangibles) — NOT 60/25/15
2. Grade scale includes 101+ Prime Player 🛸 tier with sub-tags
3. Every grade displays its tier icon (🛸🚀🔥⭐⏳🏈⚡🔧❌)
4. Prime Player sub-tags (🏗️⚠️🎤🔒🤯) assigned when score exceeds 101
5. Exact weights (0.4/0.3/0.3) are NEVER shown to end users
6. Grading is opinion-agnostic: draft position and consensus do not influence score
7. Mendoza test case produces ~89.5 (A 🔥) — not inflated to match consensus
8. Recency weighting correct (50/25/15/10 within Game Performance pillar)
9. Context variables applied (coaching, scheme, injury, conference, opponent, cast)
10. TRCC pipeline operational (Scraping → Analysis → Content → Chatbot agents)
11. Top 50 NFL Draft prospects graded with full content suites by April 22
12. Mock draft simulator functional with 8-min R1 timer, 257 picks, trade sim
13. Consensus comparison displays Per|Form vs PFF vs ESPN vs NFL.com side-by-side
14. Articles generated (500-800 words) per player with grade icon in header
15. Podcast scripts generated (2-4 min) per player
16. Player cards show grade icon prominently with TIE badge
17. Listen button plays podcast on bio page
18. Flag football module uses same scale and icons
19. High school module uses modified weights (35/35/20/10)
20. All data sources from Part 6 integrated
21. Model cost < $0.50/M tokens enforced
22. Grammar + Scenarios integration working
23. White-label ready (4 tiers, prices PRELIMINARY)
24. Calendar countdown syncs to user timezone for April 23
25. Draft education index complete for new fans
26. CFBD API + nflverse + Brave API = total data cost under $15/month
27. Player cards at $0.02/image via Imagen 4 = under $5 for 250 players
28. All content includes TIE branding

---

*Can I feel the vibe? We used to be number ten, now we're permanent as one.*

*End of Skill — v2.0 Final Production*
