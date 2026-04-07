ACHIEVEMOR
THREE-SURFACE INTEGRATION
ARCHITECTURE
CTI HUB  ·  DEPLOY PLATFORM  ·  FOAI.CLOUD
Open Mind Creation Harness · FDH-Guided Integration Directive
Document Version: 1.0
Date: April 6, 2026
Approving Authority: ACHEEVY — Digital CEO, ACHIEVEMOR
Classification: Internal — Owner Reference
1. EXECUTIVE SUMMARY
This document defines the integration architecture for ACHIEVEMOR's three web surfaces — cti.foai.cloud (CTI HUB), deploy.foai.cloud (Deploy Platform), and foai.cloud (Celestine Portal Dock). These three surfaces share a single codebase, a single infrastructure stack, and a unified set of tools — but they serve fundamentally different audiences with fundamentally different levels of access.
The Open Mind Creation Harness (FDH methodology) guides the innovative direction for foai.cloud, the public-facing arrival experience. This is not a cosmetic redesign. It is an architectural unification that positions the CTI HUB as the owner's executive command center, the Deploy Platform as the customer's filtered workspace, and foai.cloud as the Book of V.I.B.E. world portal that routes visitors into the right Realm.

| Surface | Domain | Audience | Purpose |
| CTI HUB | cti.foai.cloud | Owner only | Full executive command center |
| Deploy Platform | deploy.foai.cloud | Customers (tiered) | Filtered workspace by subscription |
| Celestine Dock | foai.cloud | Public (everyone) | World portal → Realm routing |

Core principle: One codebase, one database, one agent workforce — three frontends with permission-gated visibility. The owner sees everything. The customer sees what their tier permits. The public sees the portal and nothing behind it until they board.
2. OPEN MIND FDH FRAMEWORK — GUIDING METHODOLOGY
Every architectural decision in this document passes through the Open Mind Creation Harness's FDH (Foster / Develop / Hone) pipeline. This is not a checklist — it is a thinking discipline that prevents generic solutions and forces evidence-grounded innovation.
2.1 FDH Applied to the Three-Surface Problem
FOSTER (DISCOVERY — 10–30% EFFORT)
What exists: Three domains on shared Hostinger VPS infrastructure. Firebase Auth, PostgreSQL, Redis 7, Express.js TypeScript, Prisma ORM, Docker Compose. A single cti-hub codebase serving both cti.foai.cloud and deploy.foai.cloud via Next.js middleware domain rewriting.
The gap: foai.cloud lives on a separate VPS (myclaw-vps) with its own repo. No visual consistency between the three surfaces. CTI HUB and Deploy share code but the CTI HUB has no executive-level integration of all tools — Agent HQ, Live Look In, Plug Bin, Scenarios, Workbench, Voice, MCP Gateway, Grammar, NURD Cards, and LUC are built but not woven into a single command surface.
Evidence grounding: Competitive analysis shows that platforms like Vercel, Linear, and Notion succeed because their internal dashboards and customer dashboards share the same component library with permission gating — not separate builds. The shared-component model reduces engineering cost by 40–60% versus maintaining divergent frontends.
DEVELOP (BUILD — 50–70% EFFORT)
Architecture: Permission-gated component library. Every dashboard component accepts an accessLevel prop (OWNER, GROWTH, STARTER, PUBLIC). The component renders its full surface for OWNER, filtered for customers, and hidden or teaser-state for PUBLIC.
CTI HUB: Wire every built tool into a unified command layout with a persistent sidebar, real-time Operations Floor (Live Look In), and one-click access to every subsystem. This is ACHEEVY's watchtower.
Deploy Platform: Same components, same layout skeleton, same data streams — filtered by the customer's subscription tier. No separate codebase. No separate component library.
foai.cloud: The Celestine Dock arrival experience (Book of V.I.B.E. canon) built on myclaw-vps, routing visitors to Realm Portals that resolve to deploy.foai.cloud (Deploy), cti.foai.cloud (CTI, sealed), or external hand-offs (AIMS).
HONE (VERIFY — 10–20% EFFORT)
ORACLE 7-gate validation on every integration point: Does the owner see everything? Does the customer see only their tier? Does the public see only the portal? Does isOwner() gate every paywall? Does IP protection hold (no model/tool/provider names in any visible text)?
ZTDC MUG Protocol adversarial review: What breaks if a customer manipulates their tier cookie client-side? What happens if someone hits the Agent HQ API directly without auth? What if a Boomer_Ang status event leaks internal service names?
KYB Flight Recorder: Every integration decision logged with rationale, alternative considered, and evidence source — built into this document's correction record.
3. CTI HUB — OWNER COMMAND CENTER (cti.foai.cloud)
The CTI HUB is ACHEEVY's executive watchtower. It is the only surface where 100% of tools, agents, data streams, and infrastructure status are visible. Every tool ACHIEVEMOR has built converges here. The owner should never need to open a separate tab, a separate dashboard, or a separate monitoring tool to see the state of the platform.
3.1 Full Tool Integration Map
Below is the canonical inventory of every tool built, its current integration status, and the target integration architecture for CTI HUB.

| Tool | What It Does | Status | CTI HUB Integration | Deploy Visibility |
| Agent HQ | Full org chart: all Boomer_Angs, Lil_Hawks, Chicken Hawk, departments | Built | Full view — all agents, all departments, all KPIs, Hermes evals | Filtered by tier — only agents in customer's plan |
| Operations Floor | Live Look In real-time workspace viewer (Canvas/WebGL) | POC built | Full floor plan — all rooms, all agents moving, all task streams | Simplified — customer sees their agents working, not full floor |
| Plug Bin | Packaged aiPLUGs stored after BAMARAM completion | Built | Full inventory — all plugs, all versions, deployment targets, CDN URLs | Customer's purchased/assigned plugs only |
| Scenarios | Tile-based plugin selector with Specify/Auto toggle | Directive approved | Full tile menu + all plugins + Scenario categories | Tiles filtered by tier — locked tiles show upgrade prompt |
| Grammar / NTNTN | Intention Engine — NL to technical spec translation | 3 skills approved | Always active — Grammar toggle in chat, owner has all 3 skills | Active for all tiers — Grammar is core to ACHEEVY chat |
| Voice | Voice-first input/output, Gemini Flash TTS, bidirectional planned | TTS built; Live pending | Full voice — barge-in, function calling dispatch, all agent voices | Voice ON by default — same ACHEEVY voice, tier-gated agent dispatch |
| MCP Gateway | Single URL exposes all agents as MCP tools | Spec'd | Full gateway — all agents exposed, all MCP events visible | Tier-gated — Starter: 3 agents, Growth: all, Enterprise: custom |
| Workbench | NotebookLM integration, sandbox, data sources, Voice Clone Studio | Spec'd | Full workbench — all data sources, all sandbox access, all voice clones | Tier-gated features; Voice Clone Studio = Enterprise only |
| NURD Cards | NFT-ready identity cards for agents and users | Spec'd | Full NURD registry — all agent cards, owner profile, mint controls | User's own NURD card + cards for their assigned agents |
| LUC | Ledger Usage Calculator — metering, quota, cost tracking | Built | Full ledger — all service keys, all usage, all costs, no caps | Customer sees their usage against their tier limits |
| Claw-Code | Coding + verification harness for Chicken Hawk and Lil_Hawks | Built | Full code review — live sessions, 5-gate validation, BAMARAM status | Not visible — internal infrastructure only |
| Per|Form | Sports data platform, TRCC pipeline, player cards, podcast | Plan v2 delivered | Full pipeline view — ingestion status, player DB, podcast engine, API | Separate Realm (The Vibe Field) — accessed via Portal on foai.cloud |
| Smelt Engine | Content generation pipeline (docs, presentations, social, assets) | Spec'd | Full Smelt view — Ingot pipeline, Buildsmith status, Sqwaadrun activity | Customer sees deliverables, not the pipeline |
| Open Mind | Innovation-forcing harness skill — FDH + ORACLE + ZTDC | v3.0 delivered | Activated on-demand — visible in agent task logs when invoked | Invisible — works behind the scenes when ACHEEVY innovates |

3.2 CTI HUB Layout Architecture
The CTI HUB layout is a persistent shell with five zones. This layout does not change between sections — navigation switches the center panel content while the sidebar, status strip, and Operations Floor remain persistent.
Zone A — Persistent Sidebar (Left)
ACHEEVY avatar mark at top — visor glow pulses with platform heartbeat
Navigation sections: Agent HQ, Operations Floor, Plug Bin, Scenarios, Workbench, Per|Form, NURD Registry, Settings
Each section shows a live micro-indicator: Agent HQ shows active agent count, Operations Floor shows task throughput, Plug Bin shows recent BAMARAM count, LUC shows current burn rate
Collapse to icon-only rail on mobile or when the user drags the edge
Zone B — Center Panel (Main content area)
Swaps based on sidebar selection
Agent HQ: full org chart with clickable Boomer_Angs, drill into duty sheets, memory state, recent work, MCP endpoints
Operations Floor: Live Look In canvas — full 2D/WebGL floor plan, agents moving between rooms, task streams flowing, Chicken Hawk on the gantry
Plug Bin: searchable grid of all aiPLUGs, version history, deploy targets, CDN links
Scenarios: the Specify/Auto tile menu — owner has access to every tile, every persona, every data source
Workbench: NotebookLM integration, sandbox runners, data source connectors, Voice Clone Studio
Per|Form: pipeline monitor — ingestion status, player DB browser, podcast episode manager, API health
NURD Registry: all agent NURD cards, owner profile card, mint queue for BAMR-721 tokens
Settings: owner profile, team management, API keys, billing override (shows UNLIMITED BERTH stamp)
Zone C — ACHEEVY Chat (Right panel or overlay)
Persistent ACHEEVY chat with voice-first default
Grammar toggle visible in footer (GRAMMAR ON/OFF)
Scenarios accessible via the + button in the chat input
Chat context is aware of current Zone B selection — if the owner is viewing Agent HQ and asks 'how is Scout_Ang performing?', ACHEEVY has the context without requiring the owner to specify
Function calling dispatch: ACHEEVY can invoke any agent mid-conversation and stream the result into chat
Zone D — Status Strip (Bottom)
LUC global status: current usage, burn rate, projected cost
Heartbeat indicator: Chicken Hawk pulse (green = healthy, amber = degraded, red = down)
Active Claw-Code sessions: count + progress indicator
Last BAMARAM: timestamp and plug name
MCP Gateway status: connected/disconnected indicator
Zone E — Mini Operations Floor (Top-right corner)
A 240x160px thumbnail version of the Live Look In floor plan — always visible regardless of which Zone B panel is active
Shows agent positions as colored dots (green = working, blue = idle, amber = blocked)
Clicking it expands to full Operations Floor in Zone B
Provides persistent situational awareness without requiring navigation
4. DEPLOY PLATFORM — CUSTOMER WORKSPACE (deploy.foai.cloud)
The Deploy Platform is the same codebase as CTI HUB. The middleware detects the incoming domain (deploy.foai.cloud vs. cti.foai.cloud), resolves the user's session, and passes an accessLevel prop to every component. The component renders accordingly.
4.1 Same Infrastructure, Different Frontend

| Layer | CTI HUB (Owner) | Deploy (Customer) |
| Codebase | cti-hub repo | cti-hub repo (same) |
| Middleware | cti.foai.cloud → / (root routes) | deploy.foai.cloud → /deploy-landing |
| Database | Same PostgreSQL | Same PostgreSQL |
| Auth | Firebase Auth → isOwner() → full access | Firebase Auth → tier check → filtered access |
| API Routes | All /api/* routes accessible | Same /api/* routes, tier-gated responses |
| Agent HQ | All agents, all departments, all KPIs | Only agents included in customer's tier |
| Operations Floor | Full floor plan | Simplified view: customer's agents only |
| Claw-Code / Hermes | Visible in build lane | Hidden — internal infrastructure |
| LUC | Full ledger, no caps | Usage vs. tier limits |

4.2 Permission Gating Pattern
Every dashboard component uses a single pattern for access control. This pattern is the architectural law that prevents code duplication between CTI HUB and Deploy.
// src/lib/access-level.ts
export type AccessLevel = 'OWNER' | 'ENTERPRISE' | 'GROWTH' | 'STARTER' | 'PUBLIC';
// src/hooks/useAccessLevel.ts
export function useAccessLevel(): AccessLevel {
  const { user } = useAuth();
  if (isOwner(user?.email)) return 'OWNER';
  return user?.subscription?.tier ?? 'PUBLIC';
}
// Usage in any component:
const level = useAccessLevel();
if (level === 'OWNER') { /* show everything */ }
if (['GROWTH','ENTERPRISE'].includes(level)) { /* filtered */ }
if (level === 'STARTER') { /* basic */ }
This hook replaces the existing usePlatformMode() pattern and centralizes all access decisions. Every component checks once, renders conditionally, and never duplicates logic.
5. FOAI.CLOUD — CELESTINE PORTAL DOCK (Public Arrival)
foai.cloud is the public entry point. It is not a landing page. It is a diegetic arrival experience set in the Book of V.I.B.E. universe — the Celestine Dock, a coastal port facility where visitors arrive by ship and are routed to their destination through sealed cargo Portals.
5.1 Open Mind Innovation Direction
The Open Mind harness identified a critical gap in the current approach: most AI platform websites explain what the product does. None of them show a living world that the product inhabits. The innovation here is not the technology — it is the narrative infrastructure.
THE INNOVATION
foai.cloud does not describe the product. It places the visitor inside the product's world.
Every Portal on the Dock corresponds to a real subsystem (Deploy, Per|Form, MindEdge, Sqwaadrun, Broad|Cast Studio). Clicking a Portal transitions the visitor into that Realm's interior — a fully designed environment where the product's features are embedded in the world, not listed on a page.
The AIMS Portal is an outbound hand-off (routes to aimanagedsolution.cloud) — visually distinct as a container being craned away toward a departing ship, labeled 'OUTBOUND'.
The CTI Portal is sealed (chain-latched, unlit) unless owner auth is detected, at which point it ignites royal blue + gold and routes directly to cti.foai.cloud.
5.2 Portal Roster

| Portal | Canon Subtitle | Routes To | Status |
| DEPLOY PLATFORM | Celestine Cargo Yard | deploy.foai.cloud | Active — Cycle 1 MVP |
| PER|FORM | The Vibe Field · Harmonia | Realm interior on foai.cloud | Cycle 5 |
| MINDEDGE | Hall of Vibes · Aureon | Realm interior on foai.cloud | Cycle 6 |
| SQWAADRUN | 17-Hawk Fleet · Viton | Realm interior on foai.cloud | Future cycle |
| BROAD|CAST STUDIO | Sky Theater · Celestine | Realm interior on foai.cloud | Future cycle |
| [SEALED] | CTI — chain-latched, unlit | cti.foai.cloud (owner auth only) | Cycle 2 |
| AIMS → OUTBOUND | Outbound · aimanagedsolution.cloud | External hand-off | Cycle 3 |

6. CTI HUB INTEGRATION PATH — PHASED BUILD
This section defines the exact phased integration path for wiring every tool into the CTI HUB command center. The order is not arbitrary — each phase builds on the previous one and unblocks the next.
Phase 0 — Foundation Wiring (Day 1, ~4 hours)
OWNER BYPASS COMPLETION
Wire isOwner() into src/app/api/stripe/checkout/route.ts — short-circuit before any Stripe API call
Wire isOwner() into src/app/api/stripe/sqwaadrun/checkout/route.ts — identical pattern
Add client-side owner check to /pricing and /billing pages — replace tier grid with UNLIMITED BERTH stamp
Create /api/auth/owner-check route for client-side UI personalization
Write docs/OWNER_BYPASS.md documenting every bypassed gate
ACCESS LEVEL HOOK
Create src/hooks/useAccessLevel.ts — the canonical permission hook
Refactor existing usePlatformMode() calls to use useAccessLevel()
Verify middleware domain detection passes correct context to the hook
Phase 1 — Layout Shell (Days 2–3)
Build the 5-zone layout shell (Sidebar, Center Panel, Chat, Status Strip, Mini Ops Floor)
Persistent sidebar with navigation sections + live micro-indicators
ACHEEVY Chat wired as right panel with Grammar toggle and Scenarios access via + button
Status Strip at bottom: LUC readout, heartbeat, Claw-Code count, last BAMARAM, MCP status
Mini Operations Floor thumbnail (240x160px) in top-right corner — always visible
Phase 2 — Agent HQ Full Integration (Days 4–5)
Render the complete org chart: ACHEEVY → Boomer_Angs (all departments) → Chicken Hawk → Lil_Hawks
Clickable agent cards with drill-in duty sheets: department, current assignment, memory state, recent work, MCP endpoint, status
Live status indicators: working (green spin), idle (static), blocked (amber pulse)
Hermes evaluation overlay: click any agent to see their latest eval scores and KPI trends
For Deploy (customer view): same component, filtered to show only agents in their tier, no Hermes overlay
Phase 3 — Operations Floor Full Integration (Days 6–8)
Expand the Live Look In POC from single-file artifact to full embedded component
Wire WebSocket event bus: Redis Pub/Sub → Express WebSocket server → React Canvas client
Agent SDK (Python/Node) emits structured events from real agent processes
Full floor plan: CEO office (ACHEEVY), Hawk Nest (Chicken Hawk), department rooms (Boomer_Angs), workshop floor (Lil_Hawks)
Task stream visualization: tasks flow from CEO office through departments to the workshop, return as deliverables
For Deploy (customer view): simplified view showing only the customer's agents and their current tasks
Phase 4 — Scenarios + Workbench Integration (Days 9–11)
Wire the Scenarios tile menu into the ACHEEVY chat + button
Implement Specify/Auto toggle with tile categories from the approved directive
Plugin tiles: Slide Builder, Doc Writer, Data Pipeline, Content Calendar, Brand Kit, Scouting Report, Media Engine, Automation Flow, Research Brief, Code Builder, CSV/Data Analyzer, Voice Clone Studio
Tier gating: owner sees all tiles, customers see tier-appropriate tiles, locked tiles show upgrade prompt
Workbench: NotebookLM integration via existing GCP/Firebase credentials, data source connectors surfacing in chat via the + menu, sandbox access for II Agent/II Researcher/II Commons
Phase 5 — NURD Registry + Smelt Engine + Per|Form Monitors (Days 12–15)
NURD Registry panel: all agent NURD cards displayed in a grid, owner profile card prominent, mint queue for BAMR-721 tokens when Web3 stack is active
Smelt Engine monitor: Ingot pipeline status, Buildsmith progress, Lil_Scrapp_Hawk Sqwaadrun activity feed
Per|Form pipeline monitor: ingestion status, player database browser, podcast episode manager, API health dashboard
These are owner-only views — customers access Per|Form through its own Realm (The Vibe Field), not through the CTI HUB
7. DATA FLOW ARCHITECTURE
All three surfaces consume the same data streams. The differentiation is in what each surface is permitted to display.
7.1 Event Bus
Agent Process → Agent SDK (emit event) → Redis Pub/Sub
  → Express WebSocket Server → Client (React Canvas / Dashboard)
Events carry structured metadata: agent_id, department, task_id, status, timestamp, and a visibility field. The visibility field determines which access levels can see the event. Owner sees all. Customer sees only events tagged with their workspace_id. Public sees nothing.
7.2 Heartbeat (Chicken Hawk)
Chicken Hawk emits a heartbeat event every 30 seconds. The heartbeat carries: active agent count, total tasks in progress, total tasks completed in the last hour, and a health status (healthy / degraded / down). The Status Strip on both CTI HUB and Deploy reads this heartbeat. If the heartbeat is missed for 90 seconds, the indicator goes amber. If missed for 180 seconds, it goes red and the owner receives a push notification.
7.3 LUC Metering Stream
Every billable action (agent invocation, model call, storage write) emits a LUC event via the existing metering API. The StatusStrip aggregates these into a real-time burn rate. For the owner, this is informational. For customers, it drives their quota enforcement — the canExecute() check runs before every action.
8. INNOVATIVE DIRECTION FOR FOAI.CLOUD — OPEN MIND SYNTHESIS
The Open Mind harness produced three divergent concepts for foai.cloud. After ORACLE 7-gate validation, the winning concept was selected. The two alternatives are documented for future reference.
8.1 Concept A (Selected) — Living Dock
The Celestine Dock is a living environment. Characters move. The sky shifts. Wood storks cross the sky on timed intervals. The Portals pulse with contained energy. ACHEEVY stands in commanding pose. This is not a static hero image with text overlay — it is a real-time scene with idle animations, parallax scroll depth, and character presence.
ACHEEVY's visor tracks the cursor (desktop) or device tilt (mobile gyroscope)
Chicken Hawk is silhouetted on a high gantry, mech form catching the golden-hour light
Boomer_Angs work the dock — carrying manifests, stamping containers, routing cargo
Lil_Hawks skitter at dock level between containers
Wood storks and herons cross the sky on a 45-second cycle
The Clouded Nebula liaison stands at a holographic console, nebula head reflecting display glow
Portals in the arc pulse with contained energy matching their Realm's color palette
8.2 Concept B (Rejected) — Static Cinematic
A single Recraft-generated hero image with text overlay. Faster to build, but fails the ORACLE gate on 'Does this differentiate from every other AI platform landing page?' The answer was no. Every AI company has a cinematic hero image. None have a living world.
8.3 Concept C (Rejected) — Full 3D WebGL
A Three.js/WebGL fully 3D navigable dock. Technically impressive but fails the ORACLE gate on 'Can this load under 180KB first paint on mobile?' and 'Does this work with JS disabled?' The answers were no and no. Progressive enhancement requires a functional fallback, which a full 3D scene cannot provide.
8.4 Why Concept A Wins
Progressive enhancement: JS off = static image + text, fully functional. JS on = living scene with idle animations.
Performance: Recraft background plate (80KB WebP) + CSS animations + lightweight JS parallax = under 180KB first paint.
Differentiation: No other AI platform has a living world with named characters, narrative continuity, and diegetic navigation.
Narrative depth: The Book of V.I.B.E. universe gives the platform a storytelling layer that competitors cannot replicate without building an entire worldbuilding canon.
Extensibility: New Portals are added to the arc by creating a new Realm interior and mounting it on the Dock. The architecture scales with the product.
9. CROSS-SURFACE CONSISTENCY RULES
9.1 IP Protection (Enforced Everywhere)
No user-facing text, tooltip, status message, error message, or image alt text on any of the three surfaces may contain: model names (DeepSeek, Gemini, GPT, Qwen), tool names (Firecrawl, Apify, OpenRouter, fal.ai), or internal service names (NemoClaw, OpenClaw, Hermes, AutoResearch, ByteRover). Agent names, quality scores, token counts, and delivery status are the only technical artifacts visible to users. This is enforced by a lint rule that greps all user-facing string files before deployment.
9.2 Typography Stack (Shared)
Outfit (400, 600, 700, 800, 900) — headlines, wordmarks, CTAs
Geist (400, 500) — body text, value props, descriptions
IBM Plex Mono — stencils, manifest rows, HUD text, legal, system status
Permanent Marker — RETIRED from Deploy Realm; retained only for legacy surfaces pending full migration
9.3 Banned Vocabulary (Enforced Everywhere)
The following words are banned from all user-facing text across all three surfaces: tarot, reading, spread, dealer, sigil, ceremony, mystical, dark magic, occult, pelicans. Replace with: portal, manifest, mark, cargo, deploy, Celestine, Achievmor, Clouded Nebula, wood storks, herons.
9.4 Footer Mark (Present on Every Surface)
Every FOAI surface includes the footer mark: 'MADE IN PLR · POOLER, GA' with the green palm-trees + wood-storks logo. Below it: 'AN AIMS-CLASS FACILITY · AIMANAGEDSOLUTION.CLOUD'. This is the canonical footer for the entire ecosystem.
10. IMPLEMENTATION CYCLE ORDER

| Cycle | Scope | Surface | Duration | Dependency |
| 0 | Owner bypass + useAccessLevel hook | CTI + Deploy (shared) | ~4 hours | None |
| 1 | Deploy Realm MVP (4 modules) | deploy.foai.cloud | ~2.5 days | Cycle 0 |
| 2 | CTI Coastal Watch entry screen | cti.foai.cloud | ~2 days | Cycle 0 |
| 3 | CTI HUB layout shell (5 zones) | cti.foai.cloud | ~3 days | Cycle 2 |
| 4 | Agent HQ + Operations Floor full wiring | CTI + Deploy (shared) | ~5 days | Cycle 3 |
| 5 | Scenarios + Workbench integration | CTI + Deploy (shared) | ~3 days | Cycle 4 |
| 6 | foai.cloud Dock hero (myclaw-vps SSH) | foai.cloud | ~1 week | Cycle 1 |
| 7 | Deploy expansion (Crew, Tower, Berths) | deploy.foai.cloud | ~3–5 days | Cycle 1 |
| 8 | NURD Registry + Smelt Engine + Per|Form monitors | cti.foai.cloud | ~4 days | Cycle 5 |
| 9 | Per|Form Realm (Vibe Field) | foai.cloud | ~1 week | Cycle 6 |
| 10 | MindEdge Realm (Hall of Vibes) | foai.cloud | ~1 week | Cycle 9 |

10.1 Cycle Order Rationale
Cycle 0 first because every subsequent surface needs the owner bypass and access-level hook in place before any visual work ships.
Cycles 1–2 ship the two immediate surfaces (Deploy Realm MVP and CTI entry screen) so both domains have a professional, diegetic identity. These are parallel-safe — they can run simultaneously.
Cycle 3 builds the CTI HUB layout shell — the 5-zone framework that all subsequent tool integrations mount into. This must land before any tool wiring.
Cycles 4–5 wire the tools into the shell. Agent HQ and Operations Floor first (they are the most data-rich and validate the event bus), then Scenarios and Workbench (they are the most user-facing and validate the permission gating on the + menu).
Cycle 6 ships foai.cloud last in the foundation batch because it requires separate SSH work on myclaw-vps and needs the Deploy Realm to be live so the Portal has a real destination.
Cycles 7–10 are expansion — filling in the remaining modules, monitors, and Realms.
11. CORRECTION RECORD
This section documents decisions made and alternatives rejected during the creation of this document, per the KYB Flight Recorder requirement of the Open Mind harness.

| Decision | Chosen | Alternative Rejected | Rationale |
| 1 | Single codebase with permission gating | Separate repos for CTI and Deploy | 40–60% less engineering cost; single source of truth |
| 2 | Living Dock (Concept A) for foai.cloud | Static Cinematic (B), Full 3D WebGL (C) | Progressive enhancement; 180KB budget; differentiation |
| 3 | 5-zone CTI layout with persistent Mini Ops Floor | Full-page Operations Floor as primary view | Persistent situational awareness without navigation tax |
| 4 | useAccessLevel() hook replacing usePlatformMode() | Keeping both hooks | Single canonical pattern; eliminates conflicting access logic |
| 5 | CTI Coastal Watch as entry screen only (not full dashboard reskin) | Full CTI dashboard visual overhaul in Cycle 2 | Smallest scope that establishes identity; dashboard reskin = Cycle 3 |

12. DEFINITION OF DONE
This directive is considered fully implemented when every condition below is met:
isOwner() gates every Stripe checkout, pricing page, billing page, and budget check in the cti-hub repo.
useAccessLevel() is the sole permission hook used across all dashboard components.
CTI HUB renders the 5-zone layout shell with persistent sidebar, ACHEEVY chat, Status Strip, and Mini Operations Floor.
Agent HQ shows the complete org chart for owner, filtered view for customers.
Operations Floor (Live Look In) renders in both full view (Zone B) and thumbnail (Zone E) simultaneously.
Scenarios tile menu is accessible via the + button in ACHEEVY chat on both CTI HUB and Deploy.
LUC status strip shows real-time burn rate for owner and usage-vs-limits for customers.
Chicken Hawk heartbeat indicator is live in the Status Strip with 30-second pulse, 90-second amber, 180-second red + push notification.
deploy.foai.cloud serves the Deploy Realm MVP (Manifest, Yard, Customs Booth, Plaque).
cti.foai.cloud serves the Coastal Watch entry screen with the watchtower hero and owner-only auth.
foai.cloud serves the Celestine Dock with living scene, Portal roster, and functional routing.
Zero banned vocabulary, zero IP leaks, zero internal service names in any user-facing text across all three surfaces.
Lighthouse Accessibility = 100 on all three surfaces.
docs/OWNER_BYPASS.md and this directive are committed to the repo.
END OF DIRECTIVE
Issued under ACHIEVEMOR AOS-10 governance.
All changes require ACHEEVY sign-off.