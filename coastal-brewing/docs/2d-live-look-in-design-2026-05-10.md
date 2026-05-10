# 2D Live Look In — design

**Date:** 2026-05-10
**Status:** DESIGN — ratify before implementation work begins
**Parent canon:** `project_live_look_in.md` (memory) + `app/live_look_in/main.py` (v0.1) + `app/live_look_in_v2/main.py` (v0.2 floor plan + room geometry)
**Author:** ACHEEVY × Iller_Ang (visual SME) × Code_Ang (frontend wiring)

---

## 1. Why this exists

Live Look In is the canonical real-time observability surface where users watch the agent fleet execute on a stylized rendering of the workspace. The parent spec mandates **NVIDIA Omniverse + Cosmos** for 3D character animation. That stack hasn't shipped yet, and even when it does, it carries GPU cost + IP-exposure tradeoffs that don't fit every surface.

The **2D variant** is a parallel renderer. Same state engine. Same data flow. Same KPI / room / agent-status semantics. Different rendering layer: HTML Canvas + sprite sheets / SVG floor plan instead of Omniverse 3D scenes.

Coastal Brewing Co. needs the 2D variant **now** because:

1. It's the marquee benefit of the new Standard Membership ($199/yr) — members can pull up `coastalbrewing.co/live` and watch the Pooler storefront in real time
2. Mobile-friendly (Omniverse won't be)
3. Ships before the 3D stack stabilizes
4. Proves the renderer-flag architecture for future verticals

## 2. What stays the same (reuse, don't rebuild)

The state engine at `app/live_look_in_v2/main.py` is the **system of truth** and does not change:

- Firestore polling for agent status / current task / room location every 10s
- WebSocket diff stream to all connected clients
- KPI grading (score + letter grade per agent per role)
- Room occupancy logic (which agent is in which department)
- Service health (healthy / unhealthy / unreachable)
- Job log tail
- Owner-scope vs user-scope projection (admins see all agents; members see customer-relevant subset)

The renderer is the only swappable piece.

## 3. What's new (the 2D layer)

### 3.1 Renderer flag

```ts
// In live_look_in_v2/frontend/src/config.ts
export const RENDERER = (process.env.NEXT_PUBLIC_LIVE_LOOK_RENDERER || '2d') as '2d' | '3d';
```

- `2d` (default): HTML Canvas + sprite sheets, this design
- `3d`: NVIDIA Omniverse + Cosmos, parent spec

Routes:
- `coastalbrewing.co/live` — member-facing 2D look-in
- `coastalbrewing.co/admin/live` — owner-facing 2D look-in with KPI overlays + service-health markers
- `coastalbrewing.co/live?renderer=3d` — opt-in 3D path once Omniverse ships (gated on `RENDERER=3d` build flag too)

### 3.2 Floor plan

The 2D floor plan mirrors the v0.2 room geometry. Top-down isometric for first ship; pure top-down for mobile fallback.

```
+------------------------------------------------------------------+
|  FRONT-OF-HOUSE (Pooler storefront)                              |
|  +------------+  +-------------+  +-------------+                |
|  | Sal's bar  |  | Host stand  |  | Tasting bar |                |
|  | (sal_ang)  |  | (hos_ang)   |  | (tas_ang +) |                |
|  +------------+  +-------------+  +-------------+                |
|  +-------------+  +---------+  +-----------+  +---------------+  |
|  | Pour-over   |  | Tea bar |  | Counter   |  | Harbor view   |  |
|  | (bar_ang +) |  | (tea +) |  | (cou +    |  | (har_ang)     |  |
|  +-------------+  +---------+  | gre_ang)  |  +---------------+  |
|                                +-----------+                     |
+------------------------------------------------------------------+
|  BACK-OF-HOUSE                                                   |
|  +-----------------+  +------------------+  +------------------+ |
|  | Melli's office  |  | Accounting (LUC) |  | Sett tunnel     | |
|  | (melli_capensi) |  | (luc_ang)        |  | (12 mustelids)  | |
|  +-----------------+  +------------------+  +------------------+ |
|  +------------------------------+  +-----------------------------+
|  | Warehouse (LP team + Roos)  |  | Operations Floor (Port_Ang) |
|  | (Marquis, Joey, Sky, Boomer) |  |                             |
|  +------------------------------+  +-----------------------------+
+------------------------------------------------------------------+
```

Each room is a `<div class="room">` with a stable grid coordinate. Sprites move between rooms via Canvas tweens.

### 3.3 Sprite vocabulary

Each named Cast member has a small sprite-sheet — 5 frames covering animation states. Source artwork = the existing canonical portrait at `web/public/team/<slug>.png`, downsampled + flattened to 96×96 sprite tiles by Iller_Ang.

| Animation state | Frame count | Used when |
|---|---|---|
| `idle` | 1 | Agent is at station, no active task |
| `walking` | 4 (left/right loop) | Agent is moving between rooms |
| `typing` | 2 (alternating) | Agent is executing a tool call |
| `consulting` | 2 (paired with second sprite) | Agent is in dispatch / handoff |
| `dispatched` | 1 (with gold ring overlay) | ACHEEVY just handed this agent a Mission Brief |

Total sprite-pack budget: **30 characters × 5 states = 150 sprite frames + 30 gold-ring overlays**. Iller_Ang batch run estimated at ~75 Higgsfield credits (5 frames per char × 30 chars × 0.5 credit avg). Owner approval gates the batch fire.

For the first ship, fall back to **flat icon glyphs** (department-colored circles with the slug initial) for any agent whose sprite isn't ready. The renderer uses sprites where available, glyphs as default — graceful degradation.

### 3.4 Animation event vocabulary

The state engine emits events on the WebSocket; the 2D renderer translates each to a sprite animation:

| Event | Sprite action |
|---|---|
| `agent.status_changed: idle → busy` | Switch to `typing` at current room |
| `agent.room_changed: A → B` | Pop sprite at A, animate `walking` along path, settle `idle` at B |
| `agent.dispatched_by: ACHEEVY` | `dispatched` (gold ring) for 3s, then `walking` to next room |
| `agent.consulting_with: <other_slug>` | Both sprites face each other, `consulting` for duration |
| `kpi.score_changed` (admin only) | Letter grade badge above sprite head fades in/out |
| `service.health_changed: unhealthy` (admin only) | Sprite tints red until healthy |

### 3.5 Member projection vs admin projection

Per Sacred Separation, members see a **curated** subset of activity:

- **Member view (`/live`):** Cast positions + walking + typing animations + room occupancy. NO KPI grades, NO service-health red tint, NO internal Mission Brief content. The visible feeling: "the shop is alive — Sal is at the bar, Wren just walked over to the tea bar, Marquis is at the counter."
- **Admin view (`/admin/live`):** Everything members see PLUS KPI badges, service-health tint, dispatch arrows, queue depths, revenue ticker.

The state engine emits both projections; the renderer flag plus the auth scope determine which one each client subscribes to.

## 4. Coastal-specific scope

The 2D Live Look In ships **first** for the Pooler floor plan and the Coastal Cast roster. Other verticals (Per|Form, CTI Hub, Acheevy chat) keep their generic 3D-renderer-when-ready path.

This means the Coastal 2D Live Look In ships with:

- Hardcoded Pooler floor plan SVG / coordinate map
- Sprite pack scoped to the Coastal Cast (~30 named slugs)
- Member-projection wired through the existing membership middleware
- Mobile-responsive layout (the Pooler floor plan condenses into a single column on narrow viewports)

When the second vertical needs its own 2D look-in, the floor plan + sprite-pack become per-vertical config — the renderer code stays shared.

## 5. Membership tie-in

The Standard Membership spec (`coastal-standard-membership-spec-2026-05-10.md` §1) lists the 6th member benefit:

> Live 2D look-in to the Pooler storefront and back-of-house — watch Sal at the bar, the Sett in their tunnel, the Roos in the Warehouse, all moving in real time on a 2D floor plan; members-only

Implementation surface for membership-gating:

- Middleware at `web/middleware.ts` checks `coastalbrewing.co/live` requests for an authenticated session AND an active Standard or Lifetime membership flag on the user record
- Non-members hitting `/live` get a paywall card pitching Standard Membership ($199/yr) with a screenshot teaser of the 2D view
- Lifetime Concierge members get the admin overlay (KPI badges + service-health markers) as a tier perk

## 6. Implementation surfaces (INTERNAL)

> **INTERNAL SECTION — not for customer-facing surfaces.**

| Surface | What it needs | Owner |
|---|---|---|
| `app/live_look_in_v2/frontend/2d/` (new dir) | Canvas renderer, sprite loader, room layout component | Code_Ang + Iller_Ang |
| `app/live_look_in_v2/frontend/src/projections.ts` (new) | Member-vs-admin projection filter applied client-side post-WebSocket | Code_Ang |
| `web/app/live/page.tsx` (new) | Mounts the 2D renderer; pulls state via WebSocket from existing v0.2 backend | Code_Ang |
| `web/app/admin/live/page.tsx` (new) | Same but with admin overlay enabled | Code_Ang |
| `web/middleware.ts` (modify) | Member-gate `/live`, owner-gate `/admin/live` | Code_Ang |
| `web/public/sprites/coastal/` (new dir) | 30 sprite-sheets, 96×96 per frame, packed | Iller_Ang batch |
| `web/public/floor-plans/pooler.svg` (new) | Top-down isometric floor plan, room rectangles tagged with `data-room-id` | Iller_Ang |
| `app/live_look_in_v2/main.py` | Add `member_projection()` function alongside existing `owner_projection()` | Code_Ang |
| `coastalbrewing.co/live` route | Per above | Code_Ang |
| Mobile breakpoints | CSS at narrow viewports stacks rooms vertically; sprite size shrinks to 64×64 | Code_Ang |

## 7. Phased rollout

1. **Phase 1 (1 week)** — Static floor plan + glyph-only agents (no sprite pack yet). Admin view only. Proves the WebSocket → Canvas pipeline.
2. **Phase 2 (1 week)** — Iller_Ang sprite-pack batch (~75 Higgsfield credits, owner approval needed). Member projection filter. Member route + middleware. Member paywall card.
3. **Phase 3 (1 week)** — Mobile responsive, KPI badge overlay (admin-only), service-health tint (admin-only).
4. **Phase 4 (when Omniverse ready)** — Add `RENDERER=3d` path; 2D stays as default for member route, 3D becomes opt-in for admin + premium tiers.

## 8. Risks

- **Sprite pack cost:** 75 credits for the first batch. Rebuild on every persona refresh. Mitigation: sprites only need re-gen when the canonical portrait changes; otherwise they're stable assets.
- **Mobile Canvas perf:** 30 sprites × 60fps may strain low-end mobile. Mitigation: throttle to 30fps on `prefers-reduced-motion`, drop walking animation to 2 frames on mobile.
- **WebSocket scale:** the v0.2 engine wasn't designed for thousands of concurrent member viewers. Mitigation: edge-cache the member projection (5-second TTL is fine for "the shop is alive" feel) so we're not opening a Firestore subscription per viewer.
- **Member paywall conversion:** if the screenshot teaser doesn't sell the experience, the 2D Live Look In becomes a sunk cost. Mitigation: ship the paywall card with a 30-second auto-loop video preview captured from the live render.
- **Sacred Separation drift:** member projection is the security boundary. If a future change accidentally surfaces an internal Mission Brief or vendor name into the member-projected stream, it's a brand-trust failure. Mitigation: the projection function must have a unit test that asserts the redaction set on every emit.

## 9. What this design doc is NOT

- **Not the implementation** — code lands in a separate PR per the §6 surface table
- **Not a sprite pack request** — the 75-credit Iller_Ang batch is a separate owner-confirm step
- **Not the 3D spec** — that's `project_live_look_in.md`, unchanged by this design
- **Not multi-vertical** — Coastal-first; other verticals get their own floor plans + sprite packs when they need them

## 10. Verification (proof of operationalization)

1. `coastalbrewing.co/live` (when implemented) shows the Pooler floor plan with at least one Cast member sprite moving in real time
2. Non-members hitting `/live` get the paywall card, not the look-in
3. `coastalbrewing.co/admin/live` shows the same floor plan with KPI badges + service-health markers
4. WebSocket connection survives a router rebuild + reconnects within 5s
5. State engine `app/live_look_in_v2/main.py` is unmodified except for the new `member_projection()` function
6. Renderer flag `LIVE_LOOK_RENDERER=2d` is the default and serves traffic; `=3d` returns 503 until Omniverse ships
7. Sprite pack is loaded lazily — the page is interactive in <2s on a 4G connection even before sprites finish loading (glyphs fill in first)

---

*Made in PLR · Coastal Brewing Co.*
