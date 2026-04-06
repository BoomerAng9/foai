# Output Specifications — Iller_Ang / PMO-PRISM

Detailed specs for all 16 output categories. Resolution, structure, delivery format, and image generation model routing per asset type.

---

## 1. Player Cards

Four distinct styles. Each card is 360×504px (standard 2.5:3.5 trading card ratio at 72 DPI). Print-ready exports at 300 DPI.

**Glass / Acrylic Card**
Transparent card body with corner mounting bolt graphics. Player photo with cinematic lighting and depth-of-field blur. Stats overlay in clean sans-serif. School logo and colors as accent. Surface reflection visible below card. Use for: NIL profiles, draft prospects, featured athletes. Image model: **Recraft V4 Pro** for the full card composition.

**Retro Trading Card**
Classic Topps/Bowman layout. Front: illustrated or photo player with school name, number, position banner. Back: full stat grid, personal details, barcode. Vintage paper texture. Image model: **Recraft V4 Pro** for photorealism; overlay any text in code to avoid garbling.

**Silver Border Collectible**
Metallic silver border with rounded corners and star accents. Full-bleed action shot in motion. Team logo watermark in corner. Player name in bold block type at bottom with number badge. Stadium or field background. Image model: **Ideogram 3.0** — player name and number must render correctly.

**Tech / Stat Card (NURD-compatible)**
Dark background, neon glow borders (cyan outer, orange inner). Character or avatar in dynamic pose. Stats layout: Name, Class, Level, Core Trait, Vibe Ability, Sync Status. Action buttons at bottom. Image model: **Ideogram 3.0** — stat labels must be legible.

---

## 2. Broadcast Graphics

ESPN / Fox Sports-quality production. 1920×1080px (16:9), 72 DPI for digital; 300 DPI for print. Bold 3D extruded typography with metallic finishes. Player cutout integrated with type. Stadium or field background with dramatic lighting. Network-style lower-third overlay area.

**Recreation mode**: Match the exact style of a reference broadcast segment. Study the reference colors, type treatment, and player positioning before generating.
**Original mode**: Design a new segment at the same production tier.

Image model: **Ideogram 3.0** — segment titles, team names, and player names must all render correctly. Generate player cutout separately with Recraft V4 Pro if photorealism is required; composite in post.

---

## 3. Recruiting Prediction Graphics

On3 RPM / 247Sports Crystal Ball style. Square 1:1 (1080×1080) for social; 16:9 for banners.

Structure: Player photo in branded frame. Star rating with position label. "NEW PREDICTION" callout in bold. School logo at bottom. Analyst avatar with confidence percentage. Source branding. Information-dense layout designed for social sharing.

Image model: **Ideogram 3.0** — player name, school name, analyst name, and confidence percentage must all render accurately. Route through Ideogram every time without exception.

---

## 4. Team Composites

Multi-player roster graphics. 1920×1080 or square 1080×1080. Dark or textured background. Players arranged in formation or lineup. School logo and year prominent. Conference / championship branding. Player names listed at bottom. Dramatic atmospheric lighting — rain, snow, or particle effects.

Image model: **Recraft V4 Pro** for the atmospheric composition; overlay player names and school branding in code (React component or CSS layer) to guarantee legibility.

---

## 5. Character Illustrations

Illustrated athletes on transparent backgrounds (PNG with alpha). Dimensions: 1000×1000px minimum for sticker / merchandise use. Comic / concept art style — not photorealistic, not cartoon. Clean linework, detailed uniform rendering. Dynamic pose.

Image model: **Recraft V4 Pro** — strong compositional control and illustration quality. Specify transparent background explicitly in prompt. Export as PNG.

---

## 6. Agent Character Art

Every Boomer_Ang and Lil_Hawk in the ACHIEVEMOR workforce. Two environment modes per agent.

**Corporate mode**: White-lit A.I.M.S. lab, glass partitions, clean overhead lighting, other agents visible at workstations.
**Ops mode**: Dark room, holographic UI panels floating with data visualizations, dramatic rim lighting.

Every agent wears the tactical hoodie with their department patch. Visor text shows their handle abbreviation. Footwear matches the brand (Jordan 1s, Dunks). Tablet or tool in hand appropriate to specialty.

ACHEEVY's separate character system: brown/rust leather jacket, camo pants, helmet with orange visor slit, glowing blue Plug Me In cube. Multiple poses for different interaction contexts.

Image model: **Recraft V4 Pro** — hyper-realistic figure rendering at 4MP. This is the designated model for all agent character art per ACHEEVY's directive.

Dimensions: 1080×1080 for agent cards; 1080×1920 (9:16) for full-body character sheets; 1920×1080 for environment scenes.

---

## 7. Podcast & Media Studio Visuals

Studio environment renders for audio / video content. Professional setup: two hosts in branded apparel (camo bombers with sport-specific patches), studio mics, mixing board, branded backdrop display, neon accent lighting.

Image model: **Recraft V4 Pro** for the studio environment render. Text overlays (show name, episode title) composited separately via Ideogram 3.0 or in code.

Dimensions: 1920×1080 for video thumbnail / episode art; 1080×1080 for social square.

---

## 8. Merchandise Concepts

Product mockups: T-shirts, hoodies, hats, accessories. Supports cause-marketing themes (rainbow stripe logos), team-branded merch, and ACHIEVEMOR platform merch. Multi-product compositions showing several items together.

Image model: **Recraft V4** (standard) for most mockups — clean product photography aesthetic, brand palette constraints. Use V4 Pro for hero campaign images.

Dimensions: 1080×1080 product square; 1920×1080 campaign banner; 800×1000 for e-commerce portrait.

---

## 9. NURD Profile / NFT Cards

Two base templates, both ERC-721 mintable. Content moderation scans all user-submitted text and image prompts before generation. One-warning policy, then permanent ban.

**Illustrated / Street template**: Character next to value wall (FOSTER, DEVELOP, HONE, S.M.A.R.T., P.A.C.T., S.T.E.A.M.). Brick wall or street art texture. Bold name overlay.
**Tech Card template**: Dark background, cyan / orange glow borders. Stats grid: Class, Level, Core Trait, Vibe Ability, NURD Sync Status. Description text block.

Avatar: generated via text-to-image prompt from user input. Model: **Ideogram 3.0** for avatar if the character has text in the design; **Recraft V4** for pure visual / stylized avatar.

Card dimensions: 400×560px (2.5:3.5 ratio). Final NFT image export: 1080×1512 at 300 DPI.

---

## 10. Digital / Mixed Media Art

Abstract and experimental visual art for limited-edition NFT drops, gallery pieces, brand ambient visuals, and loading screens. No templates — each piece is original. Layered textures, paint splatter, digital distortion, hidden imagery.

Image model: **Recraft V4 Pro** — the model's "design taste" training produces compositionally intentional abstract work, not random noise. Request specific color relationships, texture types, and compositional focus explicitly.

Dimensions: 1:1 (3000×3000) for gallery / NFT; 16:9 (3840×2160) for ambient / loading screen.

---

## 11. Cinematic Game Action

Photorealistic game-day imagery. Night game atmosphere: stadium lights cutting through fog or rain, dramatic low-angle player shots, motion blur on action, desaturated background crowd.

Image model: **Recraft V4 Pro** — photorealism at 4MP for maximum quality on hero images.

Dimensions: 1920×1080 for hero banners; 1080×1350 (4:5) for Instagram; 1080×1920 (9:16) for Stories.

---

## 12. Lifestyle & Location Photography Direction

Art direction briefs only — not generated images. Regional identity briefs: Coastal Carolina sunsets with palm trees and Southern commercial landscapes, urban DMV, desert / modern KSA expansion. Specify warm color grading, wide aspect ratio, golden hour timing.

Deliver as a written photography direction brief, not an AI image. Include: location description, time of day, color grading direction, composition notes, equipment suggestions (lens, focal length).

---

## 13. Motion Landing Pages

Seven vertical-specific Remotion / React + Framer Motion templates. Full prompt library in `references/motion-prompts.md`.

**Verticals**: Sports NFT (Gridiron Legends), Sneaker Drop (Sole Protocol), Podcast Hub (AIR P.O.D.), Recruiting Portal, Blockchain Domain (.byachievemor), Fintech (Digital Money 2.0), Team Merchandise.

Background video assets generated with Seedance 2.0. Static hero images generated with Recraft V4 Pro. Typography-critical overlays (section headers with custom text) composited in code.

Deployment: Firebase Hosting. See `references/firebase-integration.md`.

---

## 14. Video Generation (Seedance 2.0)

API Base: `https://seedanceapi.org/v1` | Bearer token from Secret Manager

Single clip max: 12 seconds. Multi-scene videos: storyboard → parallel generation → FFmpeg / Remotion / TopView assembly.

Resolutions: 480p (drafts), 720p (production). Aspect ratios: 1:1, 16:9, 9:16, 4:3, 3:4, 21:9, 9:21. Fixed lens option for product shots.

Image-to-video: Upload a static Iller_Ang output (player card, agent art, product mockup) as `image_urls` parameter with motion prompt to animate it.

---

## 15. All-22 Film Procurement

Priority chain: All-22 Coaches Film → Broadcast Game Film → Highlight Film → Combine / Pro Day Film.

YouTube Data API via existing GCP project (same project as Gemini API). Chicken Hawk searches YouTube programmatically. Results indexed by Twelve Labs. SAM 3.1 segments individual players. Gemini Flash analyzes plays and generates scouting report.

Output: scouting report text + player card with grade, stats, and scouting summary + Per|Form analyst debate.

---

## 16. Lip-Sync & Talking-Head Pipeline

Per|Form AI analyst characters for AIR P.O.D. episodes.

**SadTalker**: Static character image → full talking-head video with head motion, expressions, eye blinks, lip sync. Apache 2.0. 8GB VRAM minimum. Use for: initial character introductions, social clips.

**MuseTalk**: Existing video → precise lip sync at 30fps+. MIT license. 4GB VRAM minimum. Pair with GFPGAN for HD face output.

Production pipeline: Script → TTS audio (Gemini Flash or ElevenLabs) → SadTalker talking-head → MuseTalk lip-sync refine → Remotion composite (studio backdrop + lower-thirds + score ticker + player cards) → Video2X/SeedVR2 upscale to 4K → CDN + YouTube.
