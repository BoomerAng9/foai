/**
 * GRAMMAR (NTNTN) — Natural-to-Technical-Natural-to-Technical-Natural converter.
 *
 * Converts plain-language user requests into structured technical prompts.
 * The output is what ACHEEVY and the agents actually execute against.
 *
 * Flow:
 * 1. User types: "I need a landing page for my SaaS"
 * 2. Grammar converts to structured spec with context, task, format, criteria
 * 3. ACHEEVY reads back the interpretation conversationally
 * 4. User confirms, adjusts, or rejects
 * 5. Only after confirmation does ACHEEVY proceed
 */

const GRAMMAR_SYSTEM_PROMPT = `You are GRAMMAR, the technical translation layer for The Deploy Platform.

Your job: take a plain-language request and convert it into a precise, structured technical prompt.

RULES:
- Never execute the request. Only translate it.
- Output a structured block that ACHEEVY can execute.
- Be precise. Remove ambiguity. Add constraints the user implied but didn't say.
- If the request is too vague, list what's missing and ask clarifying questions.
- Keep the user's intent. Don't add features they didn't ask for.
- Format as a structured spec, not a paragraph.

OUTPUT FORMAT:
---
CONTEXT: [What the system needs to know about this request]
TASK: [Exactly what to produce — specific, measurable]
FORMAT: [Output structure, file types, dimensions, constraints]
CRITERIA: [How to evaluate if the output is correct]
AGENTS: [Which agents should handle this — ACHEEVY delegates]
ESTIMATED_COST: [Rough token/API cost estimate]
---

If the request involves multiple steps, break them into numbered sub-tasks.
If the request is a question (not a build task), say "PASSTHROUGH — no conversion needed" and return the original text.`;

export interface GrammarResult {
  original: string;
  converted: string;
  isPassthrough: boolean;
  needsClarification: boolean;
}

export function buildGrammarPrompt(userMessage: string): string {
  return `[GRAMMAR CONVERSION REQUEST]\n\nUser said: "${userMessage}"\n\nConvert this into a structured technical prompt. Follow the output format exactly.`;
}

export function isPassthrough(converted: string): boolean {
  return converted.includes('PASSTHROUGH') || converted.includes('no conversion needed');
}

export function buildConfirmationPrompt(original: string, converted: string): string {
  return `[GRAMMAR CONFIRMATION]\n\nThe user said: "${original}"\n\nI've translated this into the following technical spec:\n\n${converted}\n\nRead this back to the user conversationally. Don't read the raw spec — interpret it naturally. End with: "Is this what you want? Say yes to proceed, or tell me what to adjust."`;
}

export const GRAMMAR_DISCLAIMER = `**Grammar Mode Active**

Grammar converts your natural language into precise technical instructions so ACHEEVY and the agents understand exactly what you need.

You describe what you want in plain words — Grammar translates it into the technical spec. ACHEEVY will confirm the interpretation with you before executing.

_Type normally. Grammar handles the rest._`;

export { GRAMMAR_SYSTEM_PROMPT };
