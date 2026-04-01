---
name: creative-ops
description: Iller_Ang creative direction, visual asset production, NFT pipeline, and design token system for PMO-PRISM.
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

# Creative Ops — PMO-PRISM / Iller_Ang

Use this skill when building or modifying visual asset production, the design
token system, NFT minting pipeline, or any feature that Iller_Ang owns.

## Agent Identity

**Handle**: Iller_Ang
**Department**: PMO-PRISM (Creative Ops)
**Chain of Command**: Reports to ACHEEVY. Deployed by ACHEEVY only. Does not report to Chicken Hawk. Can request Lil_Viz_Hawk and Lil_Blend_Hawk from Chicken Hawk for execution support.

## Output Categories

Iller_Ang produces 13 distinct visual asset types:

| # | Category | Use Case |
|---|----------|----------|
| 1 | **Player Cards** | Glass/Acrylic, Retro Trading, Silver Border, Tech/Stat — athlete showcase and collectibles |
| 2 | **Broadcast Graphics** | ESPN/Fox-quality title cards, segment graphics, lower-thirds |
| 3 | **Recruiting Predictions** | On3 RPM / 247Sports Crystal Ball-style prediction cards |
| 4 | **Team Composites** | Multi-player roster graphics with atmospheric effects |
| 5 | **Character Illustrations** | Comic/concept art athletes on transparent backgrounds |
| 6 | **Agent Character Art** | Visual identity for every Boomer_Ang and Lil_Hawk (corporate + ops modes) |
| 7 | **Podcast & Media Visuals** | Studio environment renders for AIR P.O.D. and media verticals |
| 8 | **Merchandise Concepts** | Product mockups — tees, hoodies, hats, cause-marketing |
| 9 | **Profile / NFT Cards** | NURD system identity cards — illustrated + tech card templates |
| 10 | **Digital / Mixed Media Art** | Abstract experimental art for NFT drops, gallery, ambient visuals |
| 11 | **Cinematic Game Action** | Photorealistic game-day hero images with dramatic lighting |
| 12 | **Lifestyle & Location Direction** | Art direction briefs for real-world brand photography |
| 13 | **Motion Landing Pages** | Animated web experiences (GSAP + Three.js / Remotion) — 7 vertical templates |

## Design Token System

Base brand palette applied to all outputs unless a vertical override is specified.

```yaml
brand:
  bg_primary: "#0A0A0F"
  bg_surface: "rgba(255,255,255,0.03)"
  accent_cyan: "#00E5CC"
  accent_orange: "#FF6B00"       # ACHEEVY / Iller_Ang visor
  accent_gold: "#D4A853"         # ACHIEVEMOR wordmark
  text_primary: "#FFFFFF"
  text_secondary: "rgba(255,255,255,0.6)"
  success: "#22C55E"
  warning: "#F59E0B"
  error: "#EF4444"

typography:
  display: "Outfit, sans-serif"    # 800 weight for headlines
  body: "Inter, sans-serif"        # 400/600 for body text
  mono: "IBM Plex Mono, monospace" # Status text, code, labels

vertical_overrides:
  sports_nft:    { primary: "#6B21A8", accent: "#FACC15" }
  sneaker_drops: { primary: "#DC2626", accent: "#000000" }
  podcast:       { primary: "#4338CA", accent: "#818CF8" }
  recruiting:    { primary: "#1E3A5F", accent: "#F97316" }
  blockchain:    { primary: "#0EA5E9", accent: "#14B8A6" }
  fintech:       { primary: "#059669", accent: "#D4A853" }
```

## NFT Pipeline

When any visual asset is designated for NFT minting, generate the full metadata package:

```yaml
metadata_schema:
  name: "[Asset Name]"
  description: "[Description]"
  image: "ipfs://[CID]"
  external_url: "https://plugmein.cloud/nft/[token_id]"
  attributes:
    - trait_type: "Category"
      value: "[player_card | broadcast | recruiting | composite | character | profile | art]"
    - trait_type: "Rarity"
      value: "[Common | Uncommon | Rare | Epic | Legendary | Mythic]"
    - trait_type: "Sport"
      value: "[football | basketball | baseball | general]"
    - trait_type: "School"
      value: "[School Name]"
    - trait_type: "Season"
      value: "[Year]"
    - trait_type: "Created By"
      value: "Iller_Ang / ACHIEVEMOR"

storage: IPFS via Pinata
contract: ERC-721
chain: Polygon (low gas)
mint_cost: 300% markup on generation cost
```

## Quality Gate

Every visual asset must pass before delivery:

- **Resolution**: Min 1080px short edge. Print at 300 DPI. Social at 72 DPI with platform aspect ratios (1:1 IG, 16:9 Twitter/YT, 9:16 Stories/Reels/TikTok)
- **Typography**: No AI-garbled text. Every word spelled correctly and legible. Re-generate or composite if garbled.
- **Brand consistency**: ACHEEVY visor = orange. Iller_Ang visor = "ILLA". Agent patches match department. Jordans in approved colorways (Bred, Panda, Chicago, Royal). ACHIEVEMOR wordmark never distorted.
- **Content moderation**: Zero-tolerance. All imagery scanned. No offensive/explicit/harmful content. One warning, permanent ban.

## Integration Points

| System | Integration |
|--------|------------|
| **Per\|Form** | Player cards, broadcast graphics, recruiting predictions, composites, game action |
| **Plug Gallery / Marketplace** | Gallery thumbnails, preview images, embed-ready versions |
| **Live Look In / hawk3d** | Agent character art library for 3D floor plan rendering |
| **NFT Mint Pipeline** | IPFS upload, ERC-721 metadata, wallet-connect (wagmi + viem + RainbowKit) |
| **NURD System** | Profile card templates, text-to-image avatar generation |
| **Remotion** | Motion landing page compositions — Iller_Ang defines direction, Lil_Viz/Blend_Hawk renders |

## MCP Tool

```json
{
  "name": "iller_ang_create",
  "arguments": {
    "instruction": "Creative brief describing the asset",
    "asset_type": "player_card | broadcast_graphic | recruiting_prediction | team_composite | character_illustration | agent_character_art | podcast_visual | merchandise_concept | profile_nft_card | digital_art | cinematic_game_shot | lifestyle_direction | motion_landing_page",
    "nft_mint": false
  }
}
```

## Requesting Work

- **Through ACHEEVY**: "ACHEEVY, I need a player card for our quarterback — Comets #7, silver border style."
- **Through MCP**: Call `iller_ang_create` with asset_type and instruction
- **Through Agent HQ**: Click Iller_Ang card > Request Asset > fill brief > PCP generated > execute > deliver to Plug Bin
