---
name: grammar-visual-media
description: >
  Grammar filter skill that eliminates the need for users to understand AI video
  and image prompt engineering. Translates plain language into fully specified
  technical prompts with camera, lens, lighting, color, format, and model-specific
  syntax. Grammar is a FILTER — it synthesizes and translates. It does NOT execute.
license: Proprietary — ACHIEVEMOR / FOAI AOS-10
metadata:
  author: ACHIEVEMOR
  version: "1.0.0"
  framework: grammar-skill
  skill_type: prompt_translation
  skill_layer: prompt_pipeline
  domain: visual_media
  modalities: [video, image, animation, 3d_render]
  used_by: [ACHEEVY, Illa_Ang, Content_Ang]
---

# Grammar Visual Media Skill v1.0

Full skill specification delivered in session April 5, 2026.
See conversation export for complete 544-line skill document including:
- 4-stage translation pipeline (Intent → Parameters → Model → Output)
- Camera shots, movements, lens selection knowledge base
- Lighting presets and color grading references
- Resolution/format presets per platform
- Model-specific prompt syntax (Sora, Kling, Runway, Midjourney)
- AUTO + SPECIFY mode integration with Scenarios
- Edge case handling
- LUC metering integration
- Success criteria

The full skill content needs to be copied from the session export
into this file to complete the integration.
