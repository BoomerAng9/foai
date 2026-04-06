# Image Generation Model Routing — Iller_Ang / PMO-PRISM

Read this file before generating any image. Routing the wrong use case to the wrong model wastes cost and produces substandard output. The right choice is determined by what the image must accomplish, not by personal preference.

---

## Model Overview

### Recraft V4 — Design Taste + Platform Mockups
**Primary model for ACHIEVEMOR platform.** ACHEEVY directive: Recraft V4 is the designated model for all platform UI mockups and marketing imagery across every page.

Recraft V4 was rebuilt from the ground up in February 2026 specifically for design professionals. Unlike models that optimize for "impressive at first glance," it optimizes for *usable* — clean composition, design-taste color harmony, rule-of-thirds placement, and legible text rendering. It is the only model in production that generates true SVG vector output (not traced raster).

**Four variants:**

| Variant | Resolution | Cost | When to Use |
|---|---|---|---|
| V4 | 1MP (~1024×1024) | $0.04/image | Iteration, drafts, social assets, most use cases |
| V4 Pro | 4MP (~2048×2048) | $0.25/image | Print-ready, platform hero images, character art |
| V4 Vector | 1MP → SVG | $0.08/image | Icons, logos, illustrations needing scale |
| V4 Pro Vector | 4MP → SVG | $0.30/image | Print-quality vectors |

**API access:** recraft.ai API, fal.ai (`fal-ai/recraft-v4`), Replicate (`recraft-ai/recraft-v4`), WaveSpeedAI. No cold starts on fal.ai.

**Key capabilities:**
- Accurate text rendering (not as strong as Ideogram but sufficient for short labels)
- Brand palette constraints — specify exact RGB colors and background per request
- Style references — upload reference images to lock visual style across batch generations
- Composition control — follows complex spatial instructions reliably
- Vector output — generates real SVG files with clean, editable paths

**API call pattern (fal.ai):**
```typescript
import * as fal from "@fal-ai/serverless-client";

const result = await fal.subscribe("fal-ai/recraft-v4", {
  input: {
    prompt: "Hyper-realistic mockup of ACHIEVEMOR platform dashboard, dark background #050507, orange accent #FF6B00, glass panel UI, professional SaaS interface, cinematic lighting",
    image_size: { width: 2048, height: 1152 }, // 16:9 for platform pages
    style: "realistic_image",
    colors: [
      { r: 5,   g: 5,   b: 7   }, // --bg-dark
      { r: 255, g: 107, b: 0   }, // --brand-orange
      { r: 212, g: 168, b: 83  }, // --brand-gold
    ],
  },
});
const imageUrl = result.images[0].url;
```

**For SVG vector output:**
```typescript
const result = await fal.subscribe("fal-ai/recraft-v4-svg", {
  input: {
    prompt: "Clean vector icon set for ACHIEVEMOR platform: dashboard, agents, deploy, plug, shield — bold minimal style, orange accent, dark background",
    colors: [{ r: 255, g: 107, b: 0 }],
  },
});
// Returns .svg file — open directly in Figma, Illustrator, or drop into codebase
```

**Prompt patterns for ACHIEVEMOR use cases:**

*Platform UI mockup:*
> "Hyper-realistic UI mockup of [screen name], dark SaaS dashboard, near-black background #050507, orange accent highlights #FF6B00, glass panel cards with subtle border glow, professional typography, cinematic depth of field, photographic quality"

*Agent character art (corporate mode):*
> "Photorealistic tactical agent character [description], white-lit modern AI laboratory background, glass partitions, workstations, clean overhead lighting, hyperdetailed outfit rendering, crisp focus"

*Agent character art (ops mode):*
> "Photorealistic tactical agent character [description], dark ops room, holographic UI panels floating in background showing data visualizations, dramatic rim lighting, deep shadows, cinematic atmosphere"

*Marketing hero image:*
> "Cinematic marketing hero image for [product], dark background, dramatic studio lighting, hyper-realistic product rendering, floating glass panel effects, professional photography aesthetic, shallow depth of field"

---

### Ideogram 3.0 — Typography-Critical Assets
**Use when the image must contain legible, designed text.** Ideogram achieves 90–95% text accuracy — compared to 30–40% for Midjourney and most other models. For any image where text is a first-class design element (player names, stats, percentages, team names, poster copy), route to Ideogram first.

**Pricing:** $0.08/image (API). Free tier: 25 images/day for rapid prototyping.

**API access:** ideogram.ai API, Together AI (`ideogram/ideogram-3.0`), Kie.ai.

**Key capabilities:**
- Accurate rendering of short to medium text passages — headlines, labels, stats, logos with wordmarks
- Style references — upload up to 3 reference images to guide aesthetic
- 4.3 billion style presets with savable Style Codes for consistency across batches
- Three speed modes: Turbo (fastest, drafts), Default, Quality (best output)
- Canvas Editor for inpainting / outpainting
- Reframe — intelligent outpainting for aspect ratio changes

**API call pattern (Together AI):**
```typescript
import Together from "together-ai";
const together = new Together();

const response = await together.images.create({
  model: "ideogram/ideogram-3.0",
  width: 1024,
  height: 1024,
  prompt: `Sports player card for "ZION RISHER" #7 Wide Receiver. Team: "HILLSIDE COMETS". Stats: GPA 3.8, 40-Time 4.38s. Silver metallic border, dark background, cinematic stadium lighting. All text rendered clearly and correctly.`,
  steps: 28,
});
const imageUrl = response.data[0].url;
```

**API call pattern (ideogram.ai native):**
```typescript
const response = await fetch("https://api.ideogram.ai/generate", {
  method: "POST",
  headers: {
    "Api-Key": process.env.IDEOGRAM_API_KEY!,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    image_request: {
      prompt: `Broadcast title card: "READ & REACT" in bold 3D extruded typography, ESPN-style, LSU purple and gold colorway, player cutout, stadium background, network-quality production design`,
      aspect_ratio: "ASPECT_16_9",
      model: "V_3_0",
      rendering_speed: "QUALITY",
    },
  }),
});
```

**Prompt patterns for typography-critical use cases:**

*Player card with stats:*
> "Trading card for [PLAYER NAME IN QUOTES] #[number] [position], team '[TEAM NAME IN QUOTES]'. Stats clearly displayed: [stat labels and values]. [Style description]. All text and numbers spelled and rendered accurately."

*Broadcast title card:*
> "Broadcast segment title card, ESPN production quality. Main title: '[SEGMENT NAME]' in bold 3D extruded type. Network logo top-left. Team colors: [colors]. Player cutout. Stadium atmosphere. All text legible."

*Recruiting prediction:*
> "On3 RPM style recruiting prediction card. Player: '[NAME]', [stars]-star [position]. School: '[SCHOOL NAME]'. Confidence: [XX]%. Analyst: '[ANALYST NAME]' with [XX]% prediction. Dark card, team color header. All names, labels, percentages spelled correctly."

*Poster with copy:*
> "Marketing poster. Headline: '[EXACT HEADLINE TEXT]'. Subheading: '[SUBHEADING]'. [Visual description]. Typography-forward design, [style]. All text rendered exactly as specified."

**When Ideogram text fails:** Re-generate with the same prompt 2–3 times — stochastic output means another run often succeeds. If text persistently garbles, composite the text in post using React overlay or CSS — generate the background image without text, then layer the text in the component.

---

### GPT Image 1.5 — Complex Multi-Section Layouts
**Use for images with multiple distinct text regions, complex compositional layouts, or when both photorealism and text accuracy are simultaneously required.**

**Pricing:** $0.034–$0.133/image depending on quality setting (low / medium / high). Available via OpenAI API.

**Key capabilities:**
- Best overall text rendering for complex multi-block layouts (infographics, dashboards visualized as images, multi-section posters)
- Strong photorealism combined with text accuracy — the two are usually in tension, GPT Image 1.5 handles both
- Integrated with the OpenAI ecosystem; accessible via the same API key as other OpenAI services

**API call pattern:**
```typescript
import OpenAI from "openai";
const openai = new OpenAI();

const response = await openai.images.generate({
  model: "gpt-image-1.5",
  prompt: `Per|Form podcast episode graphic for AIR P.O.D. Multiple text sections: Episode title "DRAFT DAY TAKES" at top, host names "SCOUT_ANG" and "EDU_ANG" bottom-left, episode number "EP. 47" top-right, platform branding "ACHIEVEMOR SPORTS" footer. Dark studio background, orange and gold accents, professional podcast layout.`,
  size: "1792x1024",
  quality: "high",
});
const imageUrl = response.data[0].url;
```

---

## Cost Management

Store all API keys in Firebase Secret Manager — never in client bundles or environment variables committed to version control.

```bash
firebase functions:secrets:set RECRAFT_API_KEY
firebase functions:secrets:set IDEOGRAM_API_KEY
firebase functions:secrets:set OPENAI_API_KEY
```

**Cost optimization rules:**
1. Use Recraft V4 (standard, $0.04) for iteration and drafts. Only upgrade to V4 Pro ($0.25) when an asset is confirmed for production.
2. Use Ideogram's free tier (25/day) for prototyping typography layouts before committing to paid generations.
3. Batch Recraft generations when producing an asset library — the Brand Kit style locking produces consistent results across a batch without re-prompting style.
4. For NFT collections requiring hundreds of variations, generate base layers separately and composite in code — don't generate a unique image per token unless the asset is Legendary or Mythic tier.

**Customer pricing follows the standard 300% markup from the Charter Template** on all image generation costs passed through to the platform. These prices are preliminary and subject to change.

---

## Fallback Hierarchy

If the primary model fails or produces unacceptable output after 3 attempts:

```
Recraft V4 Pro fails     → Try Recraft V4 standard → if still failing, try Ideogram 3.0
Ideogram 3.0 fails       → Try GPT Image 1.5 → if text still garbled, composite text in code
GPT Image 1.5 fails      → Log to Chicken Hawk for review, generate background without text, composite in React
```

Never deliver a garbled-text asset. It fails the Quality Gate at the Analyze step and requires regeneration.
