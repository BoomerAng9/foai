# BROAD|CAST STUDIO — FULL BUILD DIRECTIVE
## For Opus 4.6 Agent Execution
## Repo: github.com/BoomerAng9/foai
## Route: cti.foai.cloud/broadcast

---

## EXECUTIVE SUMMARY

You are building **Broad|Cast Studio** — a full video production platform inside the Deploy platform. This is not a simple page addition. This is an entire creative suite: a video editor, a generation engine, a sports analytics workstation, a podcast production studio, and a content publishing platform — all driven by AI agents through a chat interface.

The user talks to ACHEEVY through the standard platform chat. ACHEEVY's three-party engagement works the same as everywhere else on the platform, except in Broad|Cast Studio, **Iller_Ang** (the Creative Director) is always present as the specialist. Grammar (NTNTN) is always active — it converts plain language into cinematic specs that auto-populate every field. The user never needs to know camera terminology. They describe what they want. The system handles the rest.

**Read the Broadcast Studio Directive v3.0 (OFFICIAL) first.** It contains the complete model roster, sports analytics stack, video source procurement chain, rendering pipeline, upscaling options, and licensing table. This build directive tells you HOW to implement what that document specifies.

---

## HOW MULTIPLE TOOLS CHAIN TOGETHER (READ THIS FIRST)

This is the most important section. You need to understand how 10+ tools combine to produce a single video, because each tool does ONE thing. No single tool does everything. The pipeline is:

```
USER INPUT (plain language)
    ↓
GRAMMAR (NTNTN) — Intention Engine
    Converts "dramatic shot of a QB throwing at night" into:
    {camera: "tracking", lens: "85mm", aperture: "f/2.0", 
     profile: "ARRI Alexa 35", lighting: "stadium rim", ...}
    ↓
VISUAL CAMERA MENU (from Open-Higgsfield fork)
    Shows Grammar's choices as clickable icons.
    User can override any field by clicking a different icon.
    User can also ignore and let Grammar handle everything.
    ↓
VIDEO GENERATION MODEL (one of several)
    Grammar's spec becomes the prompt sent to the generation model.
    The user chose which model in the studio settings.
    Default for pay-per-use/demo: Qwen 3.6 Plus routes to cheapest model.
    
    Models available:
    - Seedance 2.0 (API, highest quality, native audio, $0.14-0.28/clip)
    - LTX-2.3 (self-hosted, character consistency via IC-LoRA)
    - Wan 2.6 (self-hosted, best motion, free, 8GB VRAM minimum)
    - HunyuanVideo 1.5 (self-hosted, best quality-per-VRAM, built-in SR)
    
    OUTPUT: A 720p or 1080p video clip, 5-20 seconds long.
    ↓
TIMELINE EDITOR (from LTX Desktop fork)
    User arranges multiple generated clips on a timeline.
    Adds transitions between clips.
    Adds text overlays, lower-thirds, logos.
    Adds audio tracks (background music, voiceover).
    This is a VISUAL editor — drag and drop, not code.
    ↓
COMPOSITING ENGINE (Remotion)
    Takes the timeline arrangement and renders it into a single video.
    Remotion is React-based — each clip, overlay, and transition is
    a React component. The timeline editor's state becomes Remotion props.
    
    Remotion handles: crossfade, wipe, slide, flip transitions.
    Remotion handles: text overlays, data graphics, picture-in-picture.
    Remotion handles: audio mixing (background + voiceover + clip audio).
    
    For simple clip-A-then-clip-B with basic fades, FFmpeg handles it
    instead (faster, zero cost). The system decides automatically.
    
    OUTPUT: A single 720p or 1080p MP4 file.
    ↓
4K UPSCALING (Video2X or SeedVR2 on Cloud Run L4 GPU)
    The composited video is sent to the upscaling service.
    Video2X or SeedVR2 enhances detail and scales to 3840x2160.
    This is NOT just stretching pixels — it's AI-enhanced detail generation.
    SeedVR2 is best for AI-generated content (no face swimming).
    
    User can skip this step for 1080p output (faster, cheaper).
    User can also choose "preview quality" (FFmpeg lanczos, instant).
    
    OUTPUT: A 4K MP4 file.
    ↓
CDN DELIVERY
    The final video is stored on the CDN.
    User gets a shareable URL.
    User can download the MP4.
    User can publish directly to YouTube (via YouTube Data API).
    User can export segments for external NLE editing.
```

**For sports analytics (film breakdown), a different pipeline runs:**

```
VIDEO SOURCE (All-22 film, YouTube, or user upload)
    ↓
TWELVE LABS — Indexes the video ($0.042/min, one-time)
    Creates persistent searchable index. "Show me all deep passes."
    ↓
SAM 3.1 — Segments individual players in the video
    Text-prompted: "player in white #7" → tracks that player
    across every frame, through occlusions and camera cuts.
    ↓
GEMINI 2.5 FLASH — Analyzes the segmented clips ($0.0025/min)
    Generates scouting reports, play breakdowns, grade assignments.
    ↓
ILLER_ANG — Creates visual deliverables
    Player cards, broadcast graphics, scouting report layouts.
    These visuals can be composited into Per|Form podcast episodes.
```

**For the Per|Form podcast (talking-head pipeline):**

```
SCRIPT — Generated by Per|Form analyst Boomer_Ang personas
    ↓
TTS AUDIO — Gemini 3.1 Flash Live or ElevenLabs
    ↓
SADTALKER — Generates talking-head video from character photo + audio
    Full head motion, expressions, eye blinks, lip sync.
    ↓
MUSETALK — Refines lip-sync precision on the generated video
    30fps+ real-time. Higher accuracy mouth movements.
    ↓
REMOTION — Composites: studio backdrop + talking head + 
    lower-thirds + score ticker + player cards
    ↓
UPSCALE → CDN → PUBLISH
```

---

## UI LAYOUT SPECIFICATION

Reference the UI mockup image provided (dark theme, three-panel layout). Build this layout:

### Top Header Bar
- Left: "+ New Project" dropdown button (gold/amber outline on dark bg)
- Center: Broad|Cast "X" logo mark + "BROAD|CAST" wordmark + "VIDEO CREATION STUDIO" subtitle
  - The wordmark is "BROAD|CAST" — note the pipe character between BROAD and Cast, capital C
  - Use the silver/gold on black colorway from the brand assets
- Right: User avatar (Iller_Ang agent icon for the studio context) + username + tier badge (Elite, Pro, Starter)

### Left Sidebar (Project Panel)
- Dashboard (collapsible)
- Projects
- Media Library
- Templates
- Settings
- Divider
- "Project Details" section:
  - Tags input
  - Resolution dropdown (default: 4K UHD, options: 720p, 1080p, 4K UHD)
- Collapsible sections with "+" buttons:
  - **+ Media** — Upload or import video/image files (BYOV path)
  - **+ Scenes** — Add new scenes to the project (each scene = one generation)
  - **+ Scripts** — Write or import scripts for auto-generation
  - **+ AI Assistants** — List available agents: Iller_Ang (always present), ACHEEVY, Chicken Hawk
  - **+ Camera** — The Open-Higgsfield visual camera menu:
    - Camera body presets (6 options with icons)
    - Lens selector (11 options: Creative Tilt, Compact Anamorphic, Extreme Macro, etc.)
    - Aperture control (f/1.4, f/2.8, f/4, f/8, f/11)
    - Focal length presets (8mm ultra-wide to 85mm portrait)
    - Camera movement presets (20+ types as clickable icons)
    - Film style / color profile selector (ARRI, RED, Sony, Panavision, 16mm, VHS)

### Center Panel (Canvas + Timeline)
- **Video Preview Canvas** — Large preview area showing the selected clip or composite preview
  - Play/pause controls
  - Timecode display (00:00:00:00)
  - Transport controls: stop, rewind, frame-back, play, frame-forward, fast-forward
  - Loop, speed, and fullscreen toggles
- **Timeline Editor** — Below the canvas
  - Multiple tracks: V1 (primary video), V2 (overlay), A1 (primary audio), A2 (secondary audio)
  - Each track shows clip thumbnails with drag handles
  - Transition indicators between clips (click to change transition type)
  - Zoom in/out on timeline
  - Playhead with scrub capability
  - Snap-to-grid toggle

### Right Sidebar (Properties + Chat)
- **Collapsible panels:**
  - Scenes — List of all scenes in the project, click to select
  - Layers — Z-order of visual elements in the current scene
  - Effects — Available effects (blur, color grade, glow, film grain)
  - Audio — Audio tracks, volume levels, fade in/out
  - Adjustments — Brightness, contrast, saturation, exposure
  - Task List — Active generation tasks with progress bars (No Tasks → "Create Task")
- **Team Chat** — The ACHEEVY chat interface
  - Standard "Chat with ACHEEVY" interface, same as the rest of the platform
  - Iller_Ang is always present as the specialist agent in this context
  - Grammar (NTNTN) is always active — every user message goes through the Intention Engine
  - The three-party engagement: Consult_Ang (Mercury 2, instant) + ACHEEVY (Qwen 3.6 Plus for pay-per-use, GLM5 Turbo for premium) + Note_Ang (Nemotron Nano, background session recording)
  - In Broad|Cast Studio context, Iller_Ang is the domain specialist. When the user describes a scene, Iller_Ang interprets the cinematic intent and Grammar converts it to technical specs
  - Quick-action buttons at bottom of chat: Media, Task, Request, Note

### Grammar Integration (Always Active)

Grammar is NOT a toggle in Broad|Cast Studio. It is always on. Every message the user sends in the studio chat runs through the Intention Engine before reaching the agents.

When the user types "dramatic shot of a quarterback throwing at night," Grammar:
1. Parses the intent
2. Maps to cinematic specs from the Cinematography Knowledge Base
3. Auto-populates the camera menu selectors (lens, aperture, movement, profile)
4. Sends the technical spec to the generation model
5. ACHEEVY reads back the interpretation: "I'm setting up a tracking shot with 85mm telephoto at f/2.0, ARRI Alexa 35 profile, stadium rim lighting. Sound good?"
6. User confirms or adjusts
7. Generation begins

The user can also bypass Grammar by directly clicking the camera menu selectors. Power users who know their camera settings can set everything manually. Grammar is for everyone else.

---

## WHAT TO BUILD

### Phase 1: Studio Shell + Chat + Basic Generation (Ship Fast)
1. Create the `/broadcast` route in the platform
2. Build the three-panel UI layout (left sidebar, center canvas+timeline, right sidebar+chat)
3. Apply Broad|Cast branding (silver/gold logo, dark UI, Outfit/Inter typography)
4. Integrate the standard ACHEEVY chat interface in the right sidebar
5. Wire Grammar as always-active in this route context
6. Wire Iller_Ang as the specialist agent for this route
7. Build the "+ Scenes" section — user clicks, types a description, Grammar converts, model generates
8. Integrate Seedance 2.0 API for video generation (simplest to wire first)
9. Show generated clips in the Video Preview Canvas
10. Basic project save/load to Neon Postgres

### Phase 2: Camera Menu + Timeline + Rendering
11. Port the Open-Higgsfield visual camera menu into the left sidebar "+ Camera" section
12. Wire Grammar output to auto-select camera menu options (bidirectional — Grammar sets them, user can override)
13. Build the timeline editor (V1, V2, A1, A2 tracks)
14. Wire Remotion as the compositing engine — timeline state → Remotion composition → MP4 output
15. Wire FFmpeg as the fallback for simple concatenation
16. Build the export UI: "Render as one video" and "Export as segments"
17. Add transition selector between clips (crossfade, wipe, dissolve, slide)
18. Add text overlay capability (lower-thirds, titles, watermarks)

### Phase 3: Full Model Roster + 4K Upscaling + Sports
19. Add LTX-2.3 as a self-hosted model option (requires Cloud Run GPU service)
20. Add Wan 2.6 as the free/demo default generation model
21. Add HunyuanVideo 1.5 as the consumer-GPU option
22. Deploy Video2X Docker container on Cloud Run L4 for 4K upscaling
23. Integrate SeedVR2 as the premium upscaling option
24. Build the resolution dropdown behavior: user selects 4K → upscaling service auto-engages after render
25. Add MuseTalk lip-sync integration for talking-head content
26. Add SadTalker for photo-to-talking-head generation
27. Integrate Twelve Labs API for video indexing and search
28. Integrate SAM 3.1 for player segmentation
29. Integrate YouTube Data API v3 for video source procurement
30. Build the All-22 film procurement pipeline (priority chain: All-22 → broadcast film → highlights → combine)

### Phase 4: Publishing + Distribution
31. YouTube upload via YouTube Data API (OAuth 2.0)
32. CDN storage with shareable URLs
33. RSS feed generation for podcast distribution (Apple, Spotify)
34. Social media export presets (9:16 for TikTok/Reels, 1:1 for Instagram, 16:9 for YouTube)
35. Plug Bin integration — videos saved as plug assets

---

## WHAT NOT TO BUILD

- Do NOT build a custom video generation model. Use the existing models via API or self-hosted inference.
- Do NOT build a custom upscaling model. Use Video2X or SeedVR2.
- Do NOT build a custom lip-sync engine. Use MuseTalk and SadTalker.
- Do NOT build a custom NLE (non-linear editor) from scratch. Fork the LTX Desktop timeline editor.
- Do NOT build collaboration features (real-time multi-user editing). Single-user per project for now.
- Do NOT build the storyboard generator (LTX's is SaaS-only). The chat with Grammar replaces this — user describes scenes sequentially, Grammar converts each one.
- Do NOT use TopView for anything. It is a paid service. Remotion + FFmpeg replaces it entirely.
- Do NOT use Muapi.ai for model routing. Replace with OpenRouter for LLMs and direct API calls for generation models.
- Do NOT build mobile-first. Desktop-first. Responsive later.

---

## MODEL DEFAULTS

| Context | Default Model | Why |
|---------|--------------|-----|
| Chat (ACHEEVY in studio) | `qwen/qwen3.6-plus:free` | Free, 78.8 SWE-bench, native tool calling |
| Chat (Consult_Ang instant) | `inception/mercury-2` | Sub-200ms response for fast acknowledgments |
| Chat (Note_Ang background) | `nvidia/nemotron-nano-9b-v2:free` | Free background session recording |
| Iller_Ang creative direction | `qwen/qwen3.6-plus:free` | Free, strong reasoning for cinematic decisions |
| Video generation (default) | Seedance 2.0 API | Highest quality, native audio |
| Video generation (free/demo) | Wan 2.6 (1.3B self-hosted) | Zero cost, 8GB VRAM, decent quality |
| Character consistency | LTX-2.3 IC-LoRA | Only model with open-source character LoRAs |
| Film analysis | Gemini 2.5 Flash | $0.0025/min, cheapest first-pass |
| Video indexing | Twelve Labs Marengo | Persistent index, proven sports use |
| Player segmentation | SAM 3.1 | Text-prompted, open source, free |
| Lip-sync (video) | MuseTalk 1.5 | Real-time, highest precision |
| Lip-sync (photo → video) | SadTalker | Full head motion from single image |
| Compositing | Remotion | React-based, full transition API |
| Simple concatenation | FFmpeg | Zero cost, 59 xfade transitions |
| 4K upscaling (quality) | SeedVR2 | Best for AI-generated content |
| 4K upscaling (pipeline) | Video2X | Docker-ready, handles full video |
| Orchestration backbone | Qwen 3.6 Plus (free) | All pay-per-use, demo, and free plugs |

For premium commitment-tier users (6-month, 9-month), models escalate: ACHEEVY gets GLM5 Turbo, Iller_Ang gets Gemini 3.1 Flash, video generation defaults to Seedance 2.0 with larger clip budgets.

---

## BRAND SPECIFICATION

**Logo:** The Broad|Cast "X" mark — two overlapping diagonal strokes with dot accent. Silver/gold on black (primary). Reference image: `IMG_0781.jpeg` in uploads.

**Wordmark:** "BROAD|CAST" — geometric futuristic typeface. The pipe character (|) is a thin vertical divider. The C in Cast is capitalized. Below the wordmark: "VIDEO CREATION STUDIO" in smaller text.

**Color Palette:**
```
bg_primary: "#0A0A0F"       # Near-black (matches platform)
bg_surface: "rgba(255,255,255,0.03)"
accent_gold: "#D4A853"      # Primary accent (logo, highlights, buttons)
accent_silver: "#C0C0C0"    # Logo mark, secondary elements
accent_amber: "#FFB300"     # Iller_Ang visor, active states
text_primary: "#FFFFFF"
text_secondary: "rgba(255,255,255,0.6)"
timeline_track: "rgba(255,255,255,0.08)"
playhead: "#D4A853"         # Gold playhead on timeline
```

**Typography:**
```
display: "Outfit", 800 weight (headlines, Broad|Cast wordmark)
body: "Inter", 400/600 (UI text, sidebar labels)
mono: "IBM Plex Mono" (timecodes, technical readouts)
```

**UI Style:** Dark theme matching the existing Deploy platform. No white backgrounds. Panels have subtle borders at `rgba(255,255,255,0.08)`. Hover states glow gold. Active elements use amber. The studio should feel like a professional production environment — think DaVinci Resolve meets Figma, not iMovie.

---

## SECURITY REMINDER (STEP ZERO)

Before writing any feature code, when working with the LTX-2.3 and Open-Higgsfield forks:

1. Strip ALL tracking, telemetry, analytics from both codebases
2. Remove ALL API calls to Lightricks, Higgsfield, or Muapi.ai servers
3. Remove ALL license-enforcement mechanisms
4. Audit every network request — zero outbound to unauthorized domains
5. Verify with network monitoring during test session
6. The forked code talks to foai.cloud infrastructure ONLY

This is non-negotiable and must be completed before any feature development begins.

---

## SUCCESS CRITERIA

1. User opens Broad|Cast Studio, types "dramatic shot of a quarterback at night," Grammar auto-fills camera, lens, aperture, profile, lighting, shot type, aspect ratio, duration, and style — all visible in the camera menu selectors.
2. User can override any Grammar choice by clicking a different selector icon.
3. User generates multiple scenes, arranges them on the timeline, adds transitions and text overlays, and renders as one MP4.
4. The rendering pipeline (Remotion → FFmpeg → Video2X/SeedVR2 → CDN) completes without manual intervention.
5. The ACHEEVY chat interface works identically to the rest of the platform, with Iller_Ang as the domain specialist and Grammar always active.
6. All video generation models (Seedance 2.0, LTX-2.3, Wan 2.6, HunyuanVideo 1.5) are selectable.
7. MuseTalk and SadTalker produce working lip-synced talking-head content for Per|Form.
8. Twelve Labs indexes uploaded game film, SAM 3.1 segments players, Gemini Flash generates analysis.
9. YouTube Data API integration enables video source procurement and publishing.
10. 4K upscaling produces genuine AI-enhanced detail at ~$0.04-0.09 per minute of video.
11. The studio is branded as Broad|Cast with the silver/gold logo on dark theme.
12. Pay-per-use and demo users default to Qwen 3.6 Plus (free) for all LLM operations.
13. Zero outbound connections to unauthorized domains from forked codebases.

---

*ACHEEVY × FOAI — Broad|Cast Studio Full Build Directive*
*April 2, 2026*
