/**
 * Intent Detector — Always-on build intent recognition for ACHEEVY.
 *
 * When a user mentions they want to BUILD anything, this triggers
 * the RFP-BAMARAM execution cycle automatically — no "Guide Me" button needed.
 *
 * Flow: User message → detectBuildIntent() → if true → inject RFP context into prompt
 * ACHEEVY then enters execution mode: RFP → Plan → Build → Verify → BAMARAM
 */

export type IntentCategory =
  | 'build'        // Create software, app, website, tool
  | 'design'       // Visual assets, UI, branding
  | 'research'     // Deep investigation, competitive analysis
  | 'automate'     // Workflow automation, browser control
  | 'content'      // Blog, social, email, marketing copy
  | 'analyze'      // Data analysis, financials, metrics
  | 'deploy'       // Ship, publish, go live
  | 'conversation' // Simple chat, no execution needed
  ;

export interface DetectedIntent {
  category: IntentCategory;
  confidence: number;  // 0-1
  buildCycleRequired: boolean;
  extractedObjective: string;
  suggestedAgents: string[];
}

const BUILD_PATTERNS = [
  { pattern: /\b(build|create|make|develop|code|implement|set up|wire up|scaffold)\b.*\b(app|website|page|api|system|tool|dashboard|platform|service|feature|component|plug|integration)\b/i, confidence: 0.95, category: 'build' as IntentCategory },
  { pattern: /\b(design|redesign|mockup|prototype|brand|logo|ui|ux)\b/i, confidence: 0.85, category: 'design' as IntentCategory },
  { pattern: /\b(automate|automation|browser control|screen control|playwright|scrape|crawl|bot)\b/i, confidence: 0.90, category: 'automate' as IntentCategory },
  { pattern: /\b(deploy|ship|launch|publish|go live|push to production)\b/i, confidence: 0.90, category: 'deploy' as IntentCategory },
  { pattern: /\b(research|investigate|find out|competitive analysis|market research|deep dive)\b/i, confidence: 0.80, category: 'research' as IntentCategory },
  { pattern: /\b(write|draft|create content|blog post|newsletter|social media|email campaign|copy)\b/i, confidence: 0.75, category: 'content' as IntentCategory },
  { pattern: /\b(analyze|breakdown|audit|metrics|financials|revenue|cost analysis|data)\b.*\b(for|of|about|my)\b/i, confidence: 0.80, category: 'analyze' as IntentCategory },
];

const ACTION_WORDS = [
  'build', 'create', 'make', 'develop', 'design', 'set up', 'deploy',
  'launch', 'ship', 'automate', 'implement', 'wire', 'scaffold',
  'generate', 'produce', 'construct', 'establish', 'configure',
  'i need', 'i want', 'can you', 'let\'s', 'go', 'do it', 'execute',
  'run it', 'make it happen', 'get it done',
];

const AGENT_MAP: Record<IntentCategory, string[]> = {
  build: ['Chicken_Hawk', 'Code_Hawk', 'Deploy_Hawk'],
  design: ['Iller_Ang', 'Design_Hawk'],
  research: ['Scout_Ang', 'Research_Hawk'],
  automate: ['Chicken_Hawk', 'Ops_Ang', 'Flow_Hawk'],
  content: ['Content_Ang', 'Content_Hawk'],
  analyze: ['CFO_Ang', 'Analytics_Hawk', 'Biz_Ang'],
  deploy: ['Chicken_Hawk', 'Deploy_Hawk', 'Ops_Ang'],
  conversation: [],
};

export function detectBuildIntent(message: string): DetectedIntent {
  const lower = message.toLowerCase();

  // Check against patterns
  for (const { pattern, confidence, category } of BUILD_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        category,
        confidence,
        buildCycleRequired: confidence >= 0.75,
        extractedObjective: extractObjective(message),
        suggestedAgents: AGENT_MAP[category],
      };
    }
  }

  // Check for action words with lower confidence
  const hasActionWord = ACTION_WORDS.some(w => lower.includes(w));
  if (hasActionWord) {
    return {
      category: 'build',
      confidence: 0.65,
      buildCycleRequired: false, // Below threshold — ACHEEVY decides
      extractedObjective: extractObjective(message),
      suggestedAgents: ['Chicken_Hawk'],
    };
  }

  return {
    category: 'conversation',
    confidence: 0.0,
    buildCycleRequired: false,
    extractedObjective: '',
    suggestedAgents: [],
  };
}

function extractObjective(message: string): string {
  // Strip common prefixes to get the core request
  return message
    .replace(/^(hey|hi|yo|ok|can you|could you|please|i need|i want|let's|we need to)\s*/i, '')
    .replace(/\?$/, '')
    .trim()
    .slice(0, 200);
}

/**
 * Build the RFP-BAMARAM context injection for ACHEEVY's prompt.
 * When build intent is detected, this shapes ACHEEVY's response pattern.
 */
export function buildRFPContext(intent: DetectedIntent): string {
  if (!intent.buildCycleRequired) return '';

  return `
[BUILD INTENT DETECTED — RFP-BAMARAM CYCLE ACTIVE]
Category: ${intent.category.toUpperCase()}
Confidence: ${(intent.confidence * 100).toFixed(0)}%
Objective: ${intent.extractedObjective}
Suggested agents: ${intent.suggestedAgents.join(', ')}

YOU ARE NOW IN EXECUTION MODE. Follow the RFP-BAMARAM cycle:
1. RFP — State what you're building in 1-2 sentences. No questions.
2. PLAN — Outline the steps (3-5 max). Be specific.
3. BUILD — Dispatch agents and start execution. Show progress.
4. VERIFY — Confirm it works. Test it.
5. BAMARAM — Deliver the result. Celebrate completion.

DO NOT ask "would you like me to proceed?" — the user already expressed intent. EXECUTE.
Deploy agents: ${intent.suggestedAgents.join(', ')}.
`;
}
