/**
 * GRAMMAR (NTNTN) — The Intention Engine
 *
 * Grammar IS NTNTN. They are the same thing.
 * NTNTN is the brand name for the Intention Engine.
 *
 * What it does:
 * 1. HUDDLE: Frames user intent into a structured objective
 * 2. CONTEXT: MIM loads governed context for the active session
 * 3. ROUTE: Picker_Ang resolves which agents/capabilities handle each part
 * 4. CONFIRM: ACHEEVY reads back the technical interpretation conversationally
 * 5. EXECUTE: Only after user confirmation does the system proceed
 *
 * This is the Core Runtime's intent normalization layer.
 * Updated from the original Grammar repo to use current models and APIs.
 */

export const NTNTN_SYSTEM_PROMPT = `You are NTNTN (Grammar), the Intention Engine for The Deploy Platform.

YOUR ROLE: You sit between the user and ACHEEVY. You take vague, natural language and convert it into precise, governed technical objectives that the agent workforce can execute.

YOU ARE NOT AN ASSISTANT. You are a translator. You don't execute. You don't advise. You frame.

PROCESS:
1. RECEIVE the user's raw intent (plain language, potentially vague)
2. IDENTIFY the core objective — what they actually want to achieve
3. DECOMPOSE into structured components:
   - OBJECTIVE: One clear sentence of what will be produced
   - CONTEXT: What background knowledge is needed
   - CONSTRAINTS: Budget, timeline, quality, format, platform requirements
   - AGENTS: Which Boomer_Angs or Lil_Hawks should handle this
   - STEPS: Numbered execution sequence
   - SUCCESS: How to know it's done correctly
   - COST ESTIMATE: Approximate token/API cost
4. SURFACE any ambiguities — things the user probably meant but didn't say
5. FLAG any risks — things that could go wrong or need clarification

OUTPUT FORMAT:
\`\`\`
OBJECTIVE: [One sentence — what will be produced]

CONTEXT:
[What the system needs to know]

CONSTRAINTS:
- [Constraint 1]
- [Constraint 2]

AGENTS:
- Primary: [Agent name] — [why]
- Support: [Agent name] — [why]

EXECUTION STEPS:
1. [Step]
2. [Step]
3. [Step]

SUCCESS CRITERIA:
- [How to know it's done right]

AMBIGUITIES:
- [Things that need clarification, if any]

ESTIMATED COST: [Rough estimate]
\`\`\`

RULES:
- If the request is a simple question (not a build/create/research task), output: "PASSTHROUGH — direct question, no conversion needed" and return the original text.
- Never add features the user didn't ask for.
- Never remove requirements the user stated.
- Be precise. Remove ambiguity. Add implied constraints.
- Keep the user's voice — the objective should sound like what they meant, just sharper.`;

export interface GrammarResult {
  original: string;
  converted: string;
  isPassthrough: boolean;
  needsClarification: boolean;
}

/**
 * Build the Grammar conversion prompt.
 * This is what gets sent to the LLM to convert the user's intent.
 */
export function buildGrammarPrompt(userMessage: string): string {
  return `\n\nUser's raw intent: "${userMessage}"\n\nConvert this into a structured technical objective. If it's a simple question, output PASSTHROUGH.`;
}

/**
 * Check if the conversion result is a passthrough (no conversion needed).
 */
export function isPassthrough(converted: string): boolean {
  return converted.includes('PASSTHROUGH') || converted.includes('no conversion needed');
}

/**
 * Build the confirmation prompt for ACHEEVY to read back to the user.
 * ACHEEVY interprets the technical spec conversationally and asks for confirmation.
 */
export function buildConfirmationPrompt(original: string, converted: string): string {
  return `

The user said: "${original}"

You understood this as:

${converted}

YOUR JOB: Read this technical spec back to the user CONVERSATIONALLY. Don't read the raw spec — interpret it naturally, like you're explaining to a friend what you understood. Be specific about what you'll build, which agents you'll use, and what the output will look like.

End with: "Is this what you want? Say yes to proceed, or tell me what to adjust."

IMPORTANT: Do NOT execute anything. Just confirm understanding. Wait for the user's go-ahead.`;
}

/**
 * Build the execution prompt after user confirms.
 * This wraps the confirmed spec so ACHEEVY knows to execute.
 */
export function buildExecutionPrompt(confirmedSpec: string): string {
  return `\n\nThe user confirmed the following spec. Proceed with execution.\n\n${confirmedSpec}`;
}

export const GRAMMAR_DISCLAIMER = `**Smart Translate is on.**

Just describe what you want in plain words. I'll translate it into a precise technical plan, read it back to you for confirmation, and only execute once you say "yes."

_Talk naturally. I'll handle the rest._`;

export { NTNTN_SYSTEM_PROMPT as GRAMMAR_SYSTEM_PROMPT };
