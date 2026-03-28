# User-Centered Design (UCD) Manual — ACHEEVY

**Version:** 1.0.0  
**Date:** 2026-03-02  
**Applies to:** All frontend components, agent interactions, and sandbox experiences  
**North Star:** "Most people don't need AI as a concept; they need a softer, more human way to get unstuck, create, and connect."

---

## 0. UCD in 30 Seconds

User-Centered Design means every decision — layout, copy, animation, feature — starts with the question: **"What does the person in front of us actually need right now?"**

For ACHEEVY, UCD isn't optional polish. It's the core product thesis: AI companions that make real life feel lighter, not weirder.

---

## 1. Core UCD Principles

### 1.1 Know Your User Before You Code

| Persona | Archetype | Primary Need | Anxiety |
|---------|-----------|-------------|---------|
| **Casual Creator** | "I have an idea but no team" | Turn vague vision into structured plan | "Will AI replace me or help me?" |
| **Solo Founder** | "Wearing all the hats" | Delegate tasks to reliable agents | "Can I trust this to do it right?" |
| **Knowledge Worker** | "Drowning in tabs" | Research + synthesis in one place | "Am I missing something important?" |
| **Non-Technical Builder** | "I can't code but I need software" | Build apps through conversation | "I don't understand the jargon" |

**Rule:** When torn between two design approaches, pick the one that serves the **least technical** user.

### 1.2 The Five UCD Pillars

| # | Pillar | ACHEEVY Application |
|---|--------|---------------------|
| 1 | **Empathy** | Voice-first entry — no blank text boxes. Always provide conversation starters. |
| 2 | **Clarity** | One primary action per view. Gold = the thing to do. Everything else recedes. |
| 3 | **Feedback** | Every agent action shows progress: thinking → executing → complete. No silent waits. |
| 4 | **Forgiveness** | Undo is always available. Sandboxes are isolated. Mistakes don't break the system. |
| 5 | **Efficiency** | Reduce clicks to value. Voice input → agent action → artifact output in 3 steps max. |

---

## 2. Cognitive Load Management

### 2.1 Hick's Law — Fewer Choices, Faster Decisions

- Maximum **5 conversation starters** per view
- Maximum **3 primary navigation items** visible at once
- Maximum **1 gold CTA** per screen (Hick's: `RT = a + b × log₂(n)`)
- Sandbox project cards: show **3 key metrics**, not 10

### 2.2 Miller's Law — Chunk Information

- Group related information into **4±1 chunks**
- Pipeline stages: show as **discrete named phases**, not raw percentages
- Agent tool calls: collapse by default, expand on click (progressive disclosure)
- Dashboard categories: max **4 category groups** with color coding

### 2.3 Jakob's Law — Leverage Existing Mental Models

- Chat interface → looks like familiar messaging apps (bubble alignment, timestamps)
- Sidebar → mirrors VS Code / Slack (collapsible, hierarchical)
- Tool execution → looks like CI/CD pipeline (status → running → complete)
- Search → ⌘K command palette pattern (universal expectation)

---

## 3. Interaction Design Patterns

### 3.1 Progressive Disclosure

| Level | What's Visible | Interaction |
|-------|---------------|-------------|
| **L1 — Glance** | Status dot + one-line label | No interaction needed |
| **L2 — Scan** | Card with title + 2-3 metrics | Hover shows tooltip / preview |
| **L3 — Engage** | Expanded view with full details | Click to expand / navigate |
| **L4 — Expert** | Raw data, logs, configuration | Toggle "advanced" or use keyboard shortcut |

**Example — Tool execution:**
- L1: `✓ web_search` (status dot + name)
- L2: `✓ web_search — 3 results, 1.2s` (expand shows input/output)
- L3: Full JSON input, full response, timing breakdown
- L4: Raw HTTP request/response, model token counts

### 3.2 Feedback Patterns

| User Action | Immediate Feedback (<100ms) | Progress Feedback | Resolution |
|-------------|---------------------------|-------------------|------------|
| Send message | Message appears in chat | Thinking indicator | Agent response streams in |
| Start tool | Tool card appears | Shimmer progress bar | Result appears, duration shown |
| Create sandbox | "Creating..." toast | Pipeline progress | Redirect to sandbox |
| Voice input | Waveform animation | Transcription preview | Confirmed text in input |

**Rule:** No user action should go without visible feedback for more than 100ms.

### 3.3 Error Recovery

| Error Type | Pattern | Example |
|------------|---------|---------|
| **Preventive** | Disable invalid actions, show constraints | Grayed-out button + tooltip |
| **Inline** | Red border + helper text near the field | "API key required for E2B provider" |
| **Toast** | Non-blocking notification for background errors | "Tool execution timed out — retrying" |
| **Dialog** | Blocking modal for destructive/critical errors | "Delete this sandbox? This cannot be undone." |

**Rule:** Error messages must answer three questions: (1) What happened? (2) Why? (3) What can I do?

---

## 4. Information Architecture

### 4.1 Navigation Hierarchy

```
Primary (always visible):      Chat · Dashboard · Sandbox
Secondary (sidebar):           Sessions · Settings · Docs
Tertiary (contextual):         Tool details · Pipeline stages · Agent config
Utility (keyboard):            ⌘K search · Esc close · Tab focus
```

### 4.2 Content Priority Matrix

| Element | Visual Weight | Position | Token |
|---------|-------------|----------|-------|
| Agent response | Highest | Main content area | `--text-primary` |
| User message | High | Right-aligned bubble | `--chat-user-bg` |
| Tool execution | Medium | Inline collapsed card | `--text-secondary` |
| Thinking indicator | Medium-low | Compact bar | `--agent-thinking` |
| Metadata (time, model) | Low | Small, dimmed | `--text-tertiary` |
| System messages | Lowest | Centered, bordered | `--chat-system-bg` |

### 4.3 Wayfinding

- **Breadcrumbs** for nested views (Dashboard > Session > Tool Call)
- **Active state** on sidebar items using `var(--border-brand)`
- **Session titles** auto-generated from first user message
- **URL reflects state** — deep-linkable to any view

---

## 5. Accessibility (WCAG 2.1 AA)

### 5.1 Visual

| Requirement | Standard | ACHEEVY Implementation |
|-------------|----------|----------------------|
| Color contrast (text) | 4.5:1 minimum | Token system enforces — test with `--text-*` on `--bg-*` |
| Color contrast (large) | 3:1 minimum | Gold on dark passes (8.2:1) |
| Non-text contrast | 3:1 for UI components | Border tokens meet this |
| Color independence | No color-only meaning | Status = color + icon + text label |

### 5.2 Interaction

| Requirement | Implementation |
|-------------|---------------|
| Keyboard navigation | All interactive elements focusable via Tab |
| Focus visible | `focus-ring-brand` utility class = gold ring |
| Skip links | "Skip to main content" on page load |
| ARIA landmarks | `<main>`, `<nav>`, `<aside>`, `role="status"` |
| Live regions | `aria-live="polite"` on agent status, thinking bar |
| Screen reader text | `sr-only` class for icon-only buttons |

### 5.3 Motion

| Preference | Behavior |
|------------|----------|
| `prefers-reduced-motion: reduce` | Disable all animations, transitions instant |
| `prefers-contrast: more` | Increase border opacity, disable glass blur |
| `prefers-color-scheme: light` | Switch to light theme token set |

---

## 6. Emotional Design

### 6.1 Tone Mapping (from Brand Bible)

| Context | Tone | Visual Cue |
|---------|------|------------|
| Onboarding | Warm, encouraging | Conversation starters, no blank forms |
| Working | Confident, transparent | Progress bars, status indicators |
| Success | Celebratory but subtle | Gold accent flash, brief confetti |
| Error | Calm, solution-focused | "Here's what happened and what to try" |
| Waiting | Reassuring | Shimmer animation, estimated time |

### 6.2 Companion Framing

- ACHEEVY = "calm senior partner you trust to delegate"
- Boomer_Angs = "colleagues with clear roles"
- **Never** frame agents as tools, bots, or replacements
- **Always** use collaborative language: "Let's..." not "I will..."
- Users can **name** and **customize** their companion

### 6.3 Delight Moments (Use Sparingly)

| Moment | Trigger | Animation |
|--------|---------|-----------|
| First message sent | User sends first chat | Subtle gold pulse on ACHEEVY avatar |
| Sandbox created | Sandbox finishes provisioning | Container icon materialize effect |
| Task complete | Full pipeline completes | Status dot morphs from spinner to check |
| Streak | 3+ consecutive sessions | Small gold streak badge on sidebar |

---

## 7. Performance as UX

### 7.1 Perceived Performance Targets

| Metric | Target | Why |
|--------|--------|-----|
| First Contentful Paint | < 1.5s | Users abandon at 3s |
| Time to Interactive | < 3.5s | Keyboard/voice must work fast |
| Agent first token | < 2s | Longer = anxiety about "is it working?" |
| Tool card render | < 100ms | Must feel instant |
| Page transition | < 300ms | Matches human attention switch |

### 7.2 Loading States

| Duration | UX Treatment |
|----------|-------------|
| 0–200ms | No loading indicator (perceived instant) |
| 200ms–2s | Skeleton/shimmer placeholder |
| 2s–10s | Progress bar + status text |
| 10s+ | Progress bar + estimated time + cancel option |

---

## 8. Testing & Validation

### 8.1 Heuristic Evaluation Checklist

Before shipping any new component, verify:

- [ ] **Visibility of system status** — Does the UI show what's happening?
- [ ] **Match with real world** — Does it use language the user understands?
- [ ] **User control & freedom** — Can they undo, go back, cancel?
- [ ] **Consistency** — Does it match existing patterns in the system?
- [ ] **Error prevention** — Does it prevent mistakes before they happen?
- [ ] **Recognition over recall** — Are options visible, not memorized?
- [ ] **Flexibility** — Does it work for novice AND expert users?
- [ ] **Aesthetic minimalism** — Is every element necessary?
- [ ] **Help users recover** — Are error messages helpful?
- [ ] **Documentation** — Is help available if needed?

### 8.2 Responsive Testing Matrix

| Breakpoint | Test |
|------------|------|
| 375px (Mobile S) | Chat composer fully visible, no horizontal scroll |
| 768px (Tablet) | Sidebar collapses, grid adapts to 2 columns |
| 1440px (Desktop) | Full layout, sidebar visible, 4-column grid |
| 1920px+ (Wide) | Content doesn't stretch beyond max-width |

---

## 9. UCD Decision Framework

When making any design decision, run through this flowchart:

```
1. WHO is the user? (persona)
       ↓
2. WHAT task are they doing? (goal)
       ↓
3. WHERE in the flow are they? (context)
       ↓
4. WHAT could go wrong? (edge cases)
       ↓
5. HOW do we help them succeed? (design choice)
       ↓
6. HOW do we know it works? (validation)
```

**Example:**
1. Solo founder, non-technical
2. Deploying their first sandbox
3. Just finished building, never deployed before
4. Wrong config, deploy fails, no idea what happened
5. Pre-fill defaults, validate config, show progress, explain errors in plain language
6. Success rate > 90% for first-time deploys

---

## 10. Integration with ACHEEVY Agent Prompts

When the agent generates UI or modifies components, it must:

1. **Reference this manual** for UCD principles (progressive disclosure, feedback)
2. **Reference DESIGN_SYSTEM_RULES.md** for token usage and component patterns
3. **Reference OPUS_4_6_BRAND_DESIGN_BIBLE.md** for brand identity and visual direction
4. **Check existing components** in `ui/`, `agentic/`, `acheevy/` before creating new ones
5. **Test against heuristics** (Section 8.1) before marking work complete

---

*This manual is the UCD companion to the Design System Rules and Brand Bible. Together, these three documents define how ACHEEVY looks, feels, and behaves from the user's perspective.*
