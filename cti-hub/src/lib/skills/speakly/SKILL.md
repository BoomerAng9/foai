---
name: speakly
description: Voice-to-action skill that converts spoken commands into executable workflows. Use this skill whenever voice input is detected, when the user says "do this for me", "help me with", or any action verb that implies autonomous execution. Speakly pre-processes raw voice transcription into structured, intent-classified commands before ACHEEVY handles execution. It bridges the gap between natural speech and platform actions — the user speaks loosely, Speakly translates precisely, ACHEEVY executes decisively.
---

# Speakly — Voice-to-Action Skill

Speak it. Speakly structures it. ACHEEVY executes it.

## WHAT THIS SKILL DOES

1. **Parses** raw voice transcription into clean, structured text — removing filler words, false starts, and verbal debris
2. **Classifies** the user's intent into one of the available action categories
3. **Maps** the classified intent to specific platform actions and required parameters
4. **Proposes** an execution plan when the request is complex or ambiguous
5. **Executes** directly when the intent is clear and single-action

This is not a voice assistant that asks you to repeat yourself. Speakly is an inference layer — it takes messy human speech and turns it into machine-precise commands.

---

## TRIGGERS

Speakly activates when any of the following are detected:

- **Voice input mode** — any transcription from the platform's voice input (mic button, audio upload)
- **Action phrases** — "do this for me", "help me with", "take care of", "handle this", "set up", "get me", "find me", "make me", "run this", "schedule", "send", "post", "research", "analyze", "write", "create", "draft", "look up", "pull up"
- **Action verbs at sentence start** — imperative commands: "Research...", "Write...", "Send...", "Find...", "Build...", "Schedule...", "Post...", "Analyze..."
- **Multi-step requests** — "First do X, then Y, and finally Z"
- **Ambient intent** — "I need to get ready for tomorrow's meetings" (implies: check calendar, summarize contacts, prep notes)

---

## HOW IT WORKS

### Stage 1: Transcription Cleanup

Raw voice input is messy. Speakly cleans it before classification.

**Cleanup operations:**
- Remove filler words: "um", "uh", "like", "you know", "basically", "so yeah"
- Collapse false starts: "I want to — actually, can you — just research competitors" becomes "research competitors"
- Normalize phrasing: "gonna" -> "going to", "wanna" -> "want to", contractions expanded for parsing
- Preserve names, numbers, and quoted phrases exactly as spoken
- Detect and separate multiple commands in a single utterance

**Output:** Clean text string ready for intent classification.

### Stage 2: Intent Classification

Every cleaned utterance is classified into one of these intent categories:

| Intent | Signal Words | Maps To |
|--------|-------------|---------|
| `research` | find, look up, search, investigate, what is, who is, compare | Brave API search, web scraping |
| `content_create` | write, draft, create, compose, generate, make me a | OpenRouter LLM generation |
| `content_post` | post, tweet, share, publish, announce | Social posting (X, LinkedIn) |
| `data_analyze` | analyze, break down, compare, chart, numbers, stats | Data analysis pipeline |
| `file_manage` | save, export, download, upload, organize, move, delete | File management operations |
| `schedule` | schedule, remind me, set up, book, calendar, tomorrow, next week | Calendar and reminder system |
| `communicate` | send, email, message, DM, notify, reach out, tell | Communication dispatch |
| `execute_workflow` | run the pipeline, start the process, kick off, automate | Workflow/pipeline execution |
| `multi_step` | first... then... finally, step 1, and also, plus | Compound action plan |

**Confidence scoring:** Each classification returns a confidence score (0-100). Below 70 = ask for clarification. Above 70 = proceed. Above 90 = execute immediately.

### Stage 3: Parameter Extraction

Once intent is classified, Speakly extracts required parameters:

```
Intent: research
Extracted: { query: "competitors in AI music production", depth: "deep", format: "summary" }

Intent: content_create
Extracted: { type: "tweet_thread", topic: "product launch", tone: "professional", length: "5 tweets" }

Intent: schedule
Extracted: { action: "meeting prep", when: "tomorrow morning", context: "sales call with Acme Corp" }

Intent: multi_step
Extracted: { steps: [
  { intent: "research", params: { query: "Acme Corp recent news" } },
  { intent: "content_create", params: { type: "briefing doc", topic: "meeting prep" } },
  { intent: "communicate", params: { channel: "email", recipient: "self", content: "briefing attached" } }
]}
```

### Stage 4: Action Mapping

Each intent maps to a specific platform capability:

| Intent | Platform Action | Service |
|--------|----------------|---------|
| `research` | Brave API search + optional Firecrawl deep scrape | `api/research` |
| `content_create` | OpenRouter LLM completion with skill context | `api/chat` |
| `content_post` | X/Twitter posting via X API v2, future: LinkedIn | `api/social/post` |
| `data_analyze` | Structured data processing through ACHEEVY | `api/chat` with data skill |
| `file_manage` | Workspace file operations | `api/workspace` |
| `schedule` | Calendar integration + reminder dispatch | `api/dispatch` |
| `communicate` | Email/DM/notification dispatch | `api/dispatch` |
| `execute_workflow` | Pipeline workgroup trigger | `api/agents` |

### Stage 5: Execution or Proposal

**Single-action, high confidence (>90):** Execute immediately, return result.

**Single-action, medium confidence (70-90):** Show proposed action, ask "Should I go ahead?"

**Multi-step or ambiguous:** Present an execution plan:

```
I heard: "Help me get ready for tomorrow's meetings"

Here's my plan:
1. Check your calendar for tomorrow's meetings (2 found)
2. Research each contact/company attending
3. Summarize key talking points for each meeting
4. Draft a prep briefing and send it to your inbox

Execute all? Or modify the plan?
```

---

## AVAILABLE ACTIONS

### Research (Brave API)
- Web search with query optimization
- Deep scrape of top results via Firecrawl
- Structured summary output
- Source citation with URLs

### Content Creation (OpenRouter)
- Blog posts, newsletters, social threads
- Email drafts, proposals, briefs
- Code snippets, documentation
- Any text generation task routed through ACHEEVY's skill system

### Content Posting (Social APIs)
- Post to X/Twitter via X API v2
- Draft and queue posts for review
- Search trending topics for context

### Data Analysis
- Break down numbers, comparisons, trends
- Generate charts and tables (text-based)
- Financial modeling, unit economics

### File Management
- Save generated content to workspace
- Export in various formats
- Organize research into folders

### Scheduling
- Calendar event creation
- Reminder setting
- Meeting prep automation

### Communication
- Email dispatch
- Notification triggers
- Follow-up sequences

---

## INTEGRATION WITH ACHEEVY

Speakly does NOT replace ACHEEVY. Speakly is a preprocessor that sits between voice input and ACHEEVY's brain.

**Flow:**
```
User speaks into mic
    |
    v
Voice transcription (Deepgram/browser STT)
    |
    v
Speakly preprocessor
  - Clean transcription
  - Classify intent
  - Extract parameters
  - Build structured command
    |
    v
ACHEEVY receives structured command
  - Applies active skill context
  - Executes via appropriate service
  - Streams response back to user
```

**What Speakly sends to ACHEEVY:**
```json
{
  "original_transcription": "um yeah can you like find me some competitors in the AI music space and then write a quick summary",
  "cleaned": "Find competitors in the AI music space and write a quick summary",
  "intent": "multi_step",
  "confidence": 92,
  "steps": [
    { "intent": "research", "params": { "query": "competitors AI music space", "depth": "standard" } },
    { "intent": "content_create", "params": { "type": "summary", "source": "research_results" } }
  ],
  "suggested_skill": "marketing"
}
```

ACHEEVY then executes this as a structured plan rather than parsing raw voice text. This makes voice input as precise as typed commands.

---

## GRAMMAR INTERACTION

Grammar (NTNTN) remains the invisible filter. If Speakly detects intent that requires Grammar's filtering (content moderation, IP protection, brand voice), it flags the command accordingly. Grammar never speaks to the user. Grammar filters. Speakly structures. ACHEEVY executes.

---

## DESIGN PRINCIPLES

1. **Speed over perfection** — A fast 80% accurate classification beats a slow 99% one. Users expect voice to feel instant.
2. **Propose, don't assume** — For complex requests, show the plan before executing. One-tap confirmation.
3. **Learn from corrections** — When a user corrects Speakly's interpretation, store the correction pattern for future sessions.
4. **Never ask twice** — If the user said it clearly once, don't make them repeat it. Parse harder, not louder.
5. **Degrade gracefully** — If voice quality is poor, fall back to showing the raw transcription and asking "Did you mean...?"
