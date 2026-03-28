---
name: "Frontend and Design Rules"
description: "Use when working on chat UI, customer-facing shells, component behavior, or visual placement rules in the AIMS frontend."
applyTo: "frontend/**/*.{ts,tsx,css,scss}"
---

# Frontend rules

- Preserve the approved chat shell and its control order.
- Never relocate the Model Selector or Data Source Picker to the top app bar.
- Use the Bottom Composer Bezel pattern for chat.
- Implement responsive layouts without changing the semantic structure.
- Prefer reusable UI primitives over ad hoc markup.
- Do not introduce a new style family unless explicitly requested.
- Respect accessibility: focus states, labels, keyboard access, contrast, and screen-reader support.
- For agentic chat, prefer a clean business-product shell over novelty UI.
