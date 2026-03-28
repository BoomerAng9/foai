# AGENTIC Design System — Typography

Typography system based on the AGENTIC DESIGN SYSTEM BETA specifications.

## Font Families

- **Headings**: New York Large (serif, editorial) — for page titles, section headers
- **Body**: Geist (sans-serif, clean) — for primary content, messages, descriptions  
- **Labels**: Departure Mono (monospace, technical) — for labels, buttons, UI chrome

> **Note**: Currently using system font fallbacks. To add the actual fonts:
> - Download **Geist** from [vercel.com/font](https://vercel.com/font)
> - Download **Departure Mono** from [departuremono.com](https://www.departuremono.com/)
> - Add font files to `/public/fonts/` directory
> - Update `@font-face` declarations in `typography.css`

---

## Typography Classes

### Headings (New York Large)

| Class | Size | Use Case |
|-------|------|----------|
| `type-h1` | 40px | Top-level page titles — one per view |
| `type-h2` | 32px | Section-level headings |
| `type-h3` | 24px | Subsection titles and card headings |

**Example**:
```tsx
<h1 className="type-h1">Agent Setup</h1>
<h2 className="type-h2">Workflows</h2>
<h3 className="type-h3">Active Agents</h3>
```

---

### Body Text (Geist)

| Class | Size | Weight | Use Case |
|-------|------|--------|----------|
| `type-body` | 16px | 400 | Primary body text, messages |
| `type-body-bold` | 16px | 600 | Inline emphasis, status confirmations |
| `type-body-sm` | 14px | 400 | Helper text, secondary descriptions |
| `type-body-sm-bold` | 14px | 600 | Emphasized helper text, metadata labels |
| `type-body-xs` | 12px | 400 | Timestamps, footnotes, fine print |
| `type-body-xs-bold` | 12px | 600 | Badge counts, critical micro-copy |

**Example**:
```tsx
<p className="type-body">
  When an agent encounters an ambiguous instruction...
</p>

<div className="type-body-bold">
  Task completed — 3 files updated
</div>

<span className="type-body-sm">
  The agent will review changes before applying
</span>

<span className="type-body-xs">Last synced 4 minutes ago</span>
```

---

### Labels (Departure Mono)

| Class | Size | Transform | Use Case |
|-------|------|-----------|----------|
| `type-label-md` | 14px | UPPERCASE | Primary input labels, form fields |
| `type-label-md-underline` | 14px | UPPERCASE | Inline text links, breadcrumbs |
| `type-label-sm` | 12px | UPPERCASE | Badges, tags, feature flags |

**Example**:
```tsx
<label className="type-label-md">Agent Status</label>

<a href="#logs" className="type-label-md-underline">
  View Execution Log
</a>

<span className="type-label-sm">Beta</span>
```

---

### Button Labels (Departure Mono)

| Class | Size | Transform | Use Case |
|-------|------|-----------|----------|
| `type-btn-md` | 14px | UPPERCASE | Standard action buttons |
| `type-btn-sm` | 12px | UPPERCASE | Compact buttons, toolbar actions |

**Example**:
```tsx
<button className="type-btn-md bg-acheevy-gold-400 px-6 py-3">
  Deploy Agent
</button>

<button className="type-btn-sm">
  Retry
</button>
```

---

## Semantic Aliases

For better developer experience, use these semantic names:

| Alias | Maps to | Use Case |
|-------|---------|----------|
| `type-page-title` | `type-h1` | Page-level titles |
| `type-section-title` | `type-h2` | Section headers |
| `type-card-title` | `type-h3` | Card/panel titles |
| `type-message` | `type-body` | Chat messages |
| `type-helper` | `type-body-sm` | Helper text |
| `type-timestamp` | `type-body-xs` | Time displays |
| `type-field-label` | `type-label-md` | Form labels |
| `type-badge` | `type-label-sm` | Status badges |
| `type-button-primary` | `type-btn-md` | Primary buttons |
| `type-button-compact` | `type-btn-sm` | Compact buttons |

**Example**:
```tsx
<div className="type-page-title">Welcome</div>
<div className="type-message">Hello, how can I help?</div>
<div className="type-timestamp">2 minutes ago</div>
```

---

## Design Tokens

Access typography tokens directly in custom CSS:

```css
.my-custom-heading {
  font-family: var(--font-heading);
  font-size: var(--type-h2-size);
  line-height: var(--type-h2-height);
  font-weight: var(--type-h2-weight);
  letter-spacing: var(--type-h2-tracking);
}
```

### Available Token Variables

**Font Families**:
- `--font-heading` — Serif for headings
- `--font-body` — Sans-serif for body
- `--font-mono` — Monospace for labels

**Heading Tokens**:
- `--type-h1-size`, `--type-h1-height`, `--type-h1-weight`, `--type-h1-tracking`
- `--type-h2-size`, `--type-h2-height`, `--type-h2-weight`, `--type-h2-tracking`
- `--type-h3-size`, `--type-h3-height`, `--type-h3-weight`, `--type-h3-tracking`

**Body Tokens**:
- `--type-body-size`, `--type-body-height`, `--type-body-weight`, `--type-body-tracking`
- `--type-body-sm-size`, `--type-body-sm-height`, `--type-body-sm-weight`, `--type-body-sm-tracking`
- `--type-body-xs-size`, `--type-body-xs-height`, `--type-body-xs-weight`, `--type-body-xs-tracking`

**Label/Button Tokens**:
- `--type-label-md-size`, `--type-label-md-height`, `--type-label-md-weight`, `--type-label-md-tracking`
- `--type-label-sm-size`, `--type-label-sm-height`, `--type-label-sm-weight`, `--type-label-sm-tracking`
- `--type-btn-md-size`, `--type-btn-md-height`, `--type-btn-md-weight`, `--type-btn-md-tracking`
- `--type-btn-sm-size`, `--type-btn-sm-height`, `--type-btn-sm-weight`, `--type-btn-sm-tracking`

---

## Combining with Tailwind

Typography classes work seamlessly with Tailwind utilities:

```tsx
<h1 className="type-h1 text-acheevy-gold-400 mb-6">
  ACHEEVY Agent Platform
</h1>

<p className="type-body text-neutral-300 max-w-2xl">
  Build intelligent agents with natural language interfaces.
</p>

<button className="type-btn-md bg-acheevy-gold-400 text-neutral-900 px-6 py-3 rounded-lg hover:bg-acheevy-gold-500">
  Get Started
</button>

<span className="type-badge bg-acheevy-gold-400/10 text-acheevy-gold-400 px-2 py-1 rounded">
  Active
</span>
```

---

## Typography Hierarchy

Follow this hierarchy for clear information architecture:

```
Page Title (H1)
  └─ Section Title (H2)
       ├─ Card Title (H3)
       │    ├─ Body Text
       │    ├─ Body Text (Bold)
       │    └─ Body Small (helper)
       │         └─ Body XS (timestamp)
       │
       └─ Label MD (form field)
            └─ Label SM (badge)
```

---

## Accessibility

All typography classes include:

- ✅ Proper font sizes (minimum 12px)
- ✅ Sufficient line height (1.2–1.5)
- ✅ Appropriate letter spacing
- ✅ Color mapped to semantic tokens (`--text-primary`, `--text-secondary`, etc.)
- ✅ Contrast ratios that meet WCAG AA standards (when using design token colors)

---

## File Structure

```
frontend/src/app/
├── global.css              # Imports all design system files
├── design-tokens.css       # Color, spacing, shadows, etc.
├── typography.css          # Typography system (this)
├── typography-examples.tsx # Usage examples
└── satoshi.css            # Satoshi font (body fallback)
```

---

## Quick Reference Card

| **Element** | **Class** | **Font** | **Size** |
|-------------|-----------|----------|----------|
| Page Title | `type-h1` | Serif | 40px |
| Section | `type-h2` | Serif | 32px |
| Card Title | `type-h3` | Serif | 24px |
| Message | `type-body` | Sans | 16px |
| Helper | `type-body-sm` | Sans | 14px |
| Timestamp | `type-body-xs` | Sans | 12px |
| Form Label | `type-label-md` | Mono | 14px |
| Badge | `type-label-sm` | Mono | 12px |
| Button | `type-btn-md` | Mono | 14px |
| Mini Button | `type-btn-sm` | Mono | 12px |

---

## Implementation Checklist

- [x] Import typography.css in global.css
- [x] Create typography utility classes
- [x] Map design tokens to CSS variables
- [x] Add semantic aliases
- [x] Enable Satoshi as body fallback
- [ ] Add Geist font files
- [ ] Add Departure Mono font files
- [ ] Apply classes to ACHEEVY components
- [ ] Test font loading performance
- [ ] Verify accessibility contrast ratios

---

**Last Updated**: March 6, 2026
