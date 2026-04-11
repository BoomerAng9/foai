---
name: warn-provider-name-leaks
enabled: true
event: file
conditions:
  - field: file_path
    operator: regex_match
    pattern: \.(tsx|jsx|html)$
  - field: new_text
    operator: regex_match
    pattern: (gemini|openai|anthropic|claude|vertex|elevenlabs|deepgram|grok|openrouter|firecrawl|fal\.ai|kie\.ai|heygen|recraft|ideogram)
action: warn
---

**Provider name detected in user-facing code.**

Internal model names, API providers, and tool names must NEVER appear in user-facing UI. Users see agent names, quality scores, and costs — never infrastructure.

Check: Is this file rendered to end users? If yes, remove the provider reference. If it's a server-side lib/config file, this is fine.
