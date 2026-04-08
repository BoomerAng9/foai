# Page 2 — The Lab

> Tile grid for every tool/model the user has access to.
> Renamed from "Model Garden" per Rish 2026-04-08 (avoid copying Gemini's naming).

## What The Lab is

The Lab is the user's **catalog of tools**. Every model, MCP, service, and aiPLUG that the user can summon — visualized as a filterable, sortable grid of tiles. Sourced from `@aims/pricing-matrix`. Latest-only enforcement applies (no superseded models render).

## Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ THE LAB                              [Search]  [Filters ▾]  [Sort ▾]│
├────────────────────────────────────────────────────────────────────┤
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐        │
│ │ C1 Thesys  │ │ Stitch MCP │ │ Recraft V4 │ │ Ideogram V3│        │
│ │ ★ #1 design│ │ ★ #2 design│ │ ★ #3 design│ │ ★ #4 design│        │
│ │ Cost: 2 LUC│ │ Cost: 5 LUC│ │ Cost: 1 LUC│ │ Cost: 1 LUC│        │
│ │ [Try]      │ │ [Try]      │ │ [Try]      │ │ [Try]      │        │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘        │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐        │
│ │ Gamma      │ │ Napkin     │ │ Imagen 4   │ │ Veo 3.1    │        │
│ │ deck/doc/  │ │ diagrams   │ │ Vertex     │ │ Vertex     │        │
│ │ web/social │ │ from text  │ │ image gen  │ │ video gen  │        │
│ │ Cost: 3 LUC│ │ Cost: 1 LUC│ │ Cost: 2 LUC│ │ Cost: 8 LUC│        │
│ │ [Try]      │ │ [Try]      │ │ [Try]      │ │ [Try]      │        │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘        │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐                        │
│ │ Claude 4.6 │ │ GPT-5.2    │ │ GLM-5.1    │                        │
│ │ Opus       │ │ flagship   │ │ open source│                        │
│ │ Cost: 9 LUC│ │ Cost: 8 LUC│ │ Cost: 1 LUC│                        │
│ │ [Try]      │ │ [Try]      │ │ [Try]      │                        │
│ └────────────┘ └────────────┘ └────────────┘                        │
└────────────────────────────────────────────────────────────────────┘
```

Filters drawer:
- Sector (llm / image / video / audio / tts / stt / embed / mcp / service)
- Tier (open-source / fast / standard / premium / flagship)
- Capability (coding / vision / reasoning / design / long-horizon / etc.)
- Vendor rank (Vertex first / direct vendor / OpenRouter / fal/Kie aggregator)
- Price ceiling
- Latest-only (always on, can't disable)

Sort options:
- Default — by routing priority for current task context
- Price ascending
- Price descending
- Most popular
- Newest

## Tile metadata (REQUIRED on every tile)

Per `project_reasoning_stream_ui.md`:

| Field | Description |
|---|---|
| **Title** | Topic name (e.g. "GLM-5.1") |
| **Provider** | Provider name + logo |
| **Tier badge** | Open-source / Fast / Standard / Premium / Flagship — color-coded |
| **Cost per LUC** | Live calculated for the user's current plan + pillar uplifts |
| **Overview** | 1-2 sentences on what it does |
| **Use cases** | Bullet list of best-fit scenarios |
| **Best case** | The one scenario it absolutely shines at |
| **Suggested alternatives** | "If doing X, consider Y instead" |
| **Pillar modifiers** | How Confidence/Convenience/Security uplifts change the rate |
| **Latest flag** | Subtle "LATEST" indicator if `isLatest=true` |
| **Try button** | Opens The Chamber with this tool pre-loaded |
| **Pin/favorite** | User can pin to top of grid |

## Design routing override

Per `project_design_routing.md`: when the user is in a design context (filter `capability: 'design'` active, or task type is design-flavored), the grid sorts by **routingPriority** in this order:

1. C1 Thesys
2. Stitch MCP (currently stub, shown with "Beta — coming soon" badge)
3. Recraft V4
4. Ideogram V3
5. Gamma (multi-surface — decks, docs, webpages, social, brochures, NOT just PPTs)
6. Napkin
7. Imagen 4
8. Nano Banana Pro 2
9. GLM Image
10. GPT Image

For general (non-design) tasks, sort by **vendorRank** then routingPriority — Vertex first, direct vendors second, OpenRouter third, aggregators fourth.

## Tier-gated visibility

| Tier | Tiles visible |
|---|---|
| BMC entry | Open-source LLMs only (GLM-5.1, DeepSeek, Qwen) — read-only chat |
| 3-month | Open-source + Fast tier |
| 6-month | + Standard tier |
| 9-month | + Premium tier |
| Enterprise | + Flagship + custom self-deploy |
| PPU | All tiles, full access at upcharge |

A tile that's locked for the user shows greyed-out with "Upgrade to unlock" overlay (links to TPS_Report_Ang's plan-page flow).

## Pinned + favorites

Each user can pin tiles to the top of the grid. Pin order persists per user. ACHEEVY can suggest pins based on usage patterns ("You used Recraft V4 5x this week — pin it?").

## Empty state

When the grid is filtered down to zero tiles:

> "No tools match your filters. Try widening your search OR ask TPS_Report_Ang to recommend a tool for what you're trying to do."

(With a "Chat with TPS_Report_Ang" button that hands off to the prompt-to-plan flow.)

## Theme

Same dark navy/graphite + gold/orange. Tiles use the NURD card style (per `project_perform_brand_assets.md`) — corner highlights, slight 3D bevel, glow on hover. See `04-shared-design-system.md`.
