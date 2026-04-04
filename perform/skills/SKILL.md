---
name: synthetic-persona-generator
description: generate synthetic user data sources, digital-twin style personas, analyst characters, and multimodal persona profiles from user input and public web information. use when chatgpt needs to create or refine a persona for testing, content creation, research, media talent concepts, audience simulation, agent training, or image and voice handoff workflows. supports public-figure-inspired personas, private-person personas, regional and international dialect profiling, tone and style modeling, source-grounded attribute scoring, and structured markdown/json outputs for downstream tools such as tts, image generation, storage, or other agents.
---

# Synthetic Persona Generator

Build a structured synthetic persona that can be used as a data source, analyst character, testing profile, or digital-twin style operating profile.

Treat this as a research-plus-synthesis workflow. Separate three things clearly:
1. verified facts from user input or cited public sources,
2. reasoned inferences that are plausible but not directly verified,
3. generated traits added only to make the persona operational.

## Workflow

Follow this sequence:

1. Classify the persona request.
2. Gather source inputs.
3. Build the core identity profile.
4. Build the voice, tone, dialect, and language profile.
5. Build the visual profile and image handoff prompt.
6. Build the behavior, expertise, and professionalism profile.
7. Score confidence by attribute.
8. Deliver the persona in both human-readable and machine-ready formats.

## 1) Classify the request

Start by deciding which mode applies:

### A. Private-person mode
Use when the subject is not widely known.

Source priority:
1. user-provided details,
2. user-provided files or images,
3. public web information if available,
4. clearly labeled synthesis to fill gaps.

Do not overstate certainty. If the person is obscure or lightly documented online, say so and keep low-confidence fields narrow and practical.

### B. Public-figure mode
Use when the subject is notable enough to have meaningful public coverage.

Source priority:
1. official bios, interviews, reputable profiles, major press,
2. well-supported public observations across multiple sources,
3. clearly labeled synthesis.

Do not invent biographical facts that conflict with public record. Where exact traits like voice cadence, private habits, or off-camera behavior are uncertain, mark them as inferred rather than known.

### C. Original-character mode
Use when the user wants a brand-new persona or analyst archetype.

Build from the requested role, audience, industry, geography, tone, and appearance. Make the output internally consistent and ready for downstream use.

## 2) Gather source inputs

Collect the strongest available signals before drafting.

### Minimum useful input set
When the user did not provide much detail, infer only what is necessary to produce a usable result. Prefer these fields:
- subject name or working alias
- age or age range
- geography or cultural base
- profession or role
- language and dialect context
- education or expertise level if relevant
- style cues, tone cues, or personality cues
- appearance notes or reference images if visual output is expected

### Use the web when needed
For current or niche details, use web search and cite reputable sources.

For public figures, look for:
- official bio pages
- interviews or speeches
- reputable media coverage
- professional profiles
- public imagery for style cues

For private people, search only when the user asks for public-web enrichment or when public information is likely relevant. Keep the result grounded in what is actually discoverable.

## 3) Build the core identity profile

Create these fields:
- persona name
- role or archetype
- age band
- geography
- cultural and language context
- education profile
- professional background
- expertise map
- professionalism profile
- signature traits
- public presence summary

### Identity-writing rules
- Keep identity internally consistent.
- Use concrete details instead of vague adjectives.
- Prefer observable descriptors over empty labels.
- Do not assume ethnicity, nationality, religion, or income unless provided or well-supported by sources.
- When information is missing, use bounded synthesis rather than pretending certainty.

## 4) Build the voice, tone, dialect, and language profile

This is a required section for this skill.

Model how the persona sounds in real use, not just what accent label applies.

### Required voice fields
- primary language
- secondary languages if relevant
- english fluency style if english is not the native language
- accent or dialect region
- speaking pace
- formality level
- sentence length tendency
- slang usage level
- cadence notes
- emotional temperature
- rhetorical habits
- catchphrase or signature phrasing if appropriate
- broadcast or conversational mode

### Regional and cultural modeling rules
When the user asks for regional variation, reflect likely differences in:
- rhythm
- directness
- vocabulary
- idioms
- filler-word tendency
- warmth vs restraint
- professional polish vs casual style

Examples of useful contrast dimensions:
- new york city vs rural georgia
- new jersey sports media voice vs california creator voice
- saudi english-speaking executive vs us southern english-speaking coach
- maine reserve vs texas outward warmth

Do not reduce a region or culture to a caricature. Use light but recognizable signals. Favor plausibility and restraint.

### Voice handoff requirement
Always produce a downstream-ready voice handoff block that another voice system can use. Include:
- target accent/dialect
- tone descriptors
- delivery pace
- vocal texture descriptors
- prohibited traits to avoid
- 3 short sample lines in-character

## 5) Build the visual profile and image handoff prompt

If the user requests or would benefit from image generation support, create a visual profile even if no image is generated in this step.

### Required visual fields
- estimated age presentation
- skin tone or complexion if supported
- face shape
- hair style and color
- grooming details
- body build or silhouette
- posture and expression
- wardrobe style
- accessories
- environmental fit
- camera framing suggestions
- realism level

### Visual-writing rules
- Base the visual profile on user-provided details first.
- For public figures, use public image and style cues without claiming precision beyond what sources support.
- For private people, if no image references exist, keep details broad enough to remain plausible.
- If the user wants an image later, generate a prompt package for the image system rather than describing loosely.

### Image handoff requirement
Always provide:
- a short identity prompt,
- a full production prompt,
- a negative prompt or avoid-list,
- 3 visual variants.

Tailor the prompt package for downstream tools such as Nano Banana Pro 2 or Iller_Ang.

## 6) Build the behavior, expertise, and professionalism profile

Make the persona usable in live scenarios.

### Required behavior fields
- decision-making style
- conflict style
- curiosity level
- risk tolerance
- preparation habits
- communication preference
- audience sensitivity
- collaboration style
- work ethic cues
- likely biases or blind spots
- personal brand posture

### Required expertise fields
- domain specialties
- topic confidence by area
- vocabulary level
- analytical depth
- teaching style
- debate style
- likely strengths on camera or in conversation
- likely weak points

For analyst or media personas, include:
- on-air energy
- panel behavior
- headline-writing tendency
- hot-take risk level
- evidence discipline
- humor style
- signature segment ideas

## 7) Score confidence by attribute

Every final persona must show confidence per attribute or section.

Use this scale:
- high: directly provided by user or well-supported by multiple sources
- medium: supported indirectly or inferred from strong signals
- low: generated to complete the profile with limited evidence

Flag any sensitive or uncertain attribute that could mislead a downstream workflow.

## 8) Deliver the persona in both readable and machine-ready formats

Always return the final result in this order unless the user asks for something else:

### A. Persona summary
A concise profile that explains who this persona is, what role they serve, and how they come across.

### B. Source provenance
Separate:
- user-provided facts
- public-source facts
- inferred traits
- generated traits

Cite public-source facts.

### C. Full persona profile
Use the markdown template from `references/persona-output-template.md`.

### D. Voice handoff block
Use the template from `references/voice-handoff-template.md`.

### E. Image handoff block
Use the template from `references/image-handoff-template.md`.

### F. JSON object
Use the schema guidance in `references/persona-json-schema.md`.

When useful, generate both markdown and json so the persona can be stored in GCP Storage or passed to downstream agents.

## Output rules

- Label uncertainty clearly.
- Cite all web-derived facts.
- Do not hide synthesis behind factual wording.
- Do not use placeholder text in the final answer.
- Keep the voice and image sections aligned with the same persona.
- Ensure geography, education, profession, wardrobe, and speaking style do not contradict one another.

## Quality checks before finalizing

Before delivering the persona, verify:
- the voice matches the geography and role,
- the visual style matches the profession and tone,
- the expertise map matches the claimed background,
- the behavior profile fits the on-air or business use case,
- confidence labels are present,
- web facts are cited,
- inferred and generated traits are explicitly marked.

## Examples of good use cases

- create a digital-twin style persona from a user's detailed description and public footprint
- build an original sports color analyst inspired by major broadcast personalities
- generate a synthetic executive persona for product testing and messaging review
- produce a multilingual persona with region-specific english delivery and cultural style cues
- create an image-ready and voice-ready persona package for downstream tools
