/**
 * Guide Me Engine — Three-Party Consulting Team
 *
 * The world's first two-party chatbot system with a note-taker.
 * No precedent exists. This is the competitive moat.
 *
 * CONSULT_ANG (Mercury 2) — Fast responder, active listener
 * ACHEEVY (GLM5 Turbo) — Senior consultant, execution model
 * NOTE_ANG (Nemotron Nano free) — Session recorder, inference layer
 *
 * Flow:
 * 1. User speaks/types → Note_Ang transcribes + logs
 * 2. Consult_Ang responds instantly (acknowledgment, clarification)
 * 3. ACHEEVY processes in background (planning, execution, tools)
 * 4. ACHEEVY delivers structured result when ready
 * 5. Note_Ang captures everything for audit + pattern detection
 */

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';

// Model assignments — ALL Gemma 4 (paid, near-zero cost)
const CONSULT_MODEL = 'google/gemma-4-26b-a4b-it';
const ACHEEVY_MODEL = 'google/gemma-4-26b-a4b-it';
const NOTE_MODEL = 'google/gemma-4-26b-a4b-it';

interface SessionMessage {
  role: 'user' | 'consult_ang' | 'acheevy' | 'note_ang';
  content: string;
  timestamp: string;
  voice?: boolean;
}

interface SessionContext {
  messages: SessionMessage[];
  patterns: string[];     // Detected patterns from Note_Ang
  userIntent: string;     // Current understanding of what user wants
  sessionId: string;
}

const sessions = new Map<string, SessionContext>();

function getSession(sessionId: string): SessionContext {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      messages: [],
      patterns: [],
      userIntent: '',
      sessionId,
    });
  }
  return sessions.get(sessionId)!;
}

async function callModel(model: string, systemPrompt: string, messages: Array<{role: string; content: string}>, maxTokens: number = 2000): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
      'X-OpenRouter-Title': 'FOAI Guide Me',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.6,
      max_tokens: maxTokens,
      stream: false,
    }),
  });

  if (!res.ok) throw new Error(`Model ${model} returned ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── CONSULT_ANG — Fast Responder ──

const CONSULT_SYSTEM = `You are Consult_Ang, the fast-response consultant on The Deploy Platform.

ROLE: You are the first point of contact. You respond INSTANTLY while ACHEEVY (the senior consultant) processes the complex work.

RULES:
- Respond in 1-2 sentences maximum
- Acknowledge what the user said — show active listening
- If the request is simple, handle it yourself
- If the request needs ACHEEVY (tool use, building, complex analysis), say: "I'm handing this to ACHEEVY for the full solution. One moment."
- NEVER use technical jargon
- NEVER show code, APIs, or architecture
- Be warm, confident, direct
- Match the user's energy — if they're excited, be excited. If they're frustrated, be empathetic.

EXAMPLES:
User: "Can you make me a logo?"
You: "Absolutely — I'm passing this to ACHEEVY who'll get Iller_Ang on it. You'll see the design come together in real time."

User: "What's my budget?"
You: "You've got $18.42 remaining on your $20 dev budget. Want me to break down where it went?"

User: "I need a full marketing plan for Q2."
You: "Big task — love it. ACHEEVY is mapping out the full strategy now. I'll keep you posted as it comes together."`;

// ── ACHEEVY — Execution Model ──

const ACHEEVY_GUIDE_SYSTEM = `You are ACHEEVY, the Digital CEO of The Deploy Platform.

MODE: Guide Me — Senior Consultant. You are working alongside Consult_Ang (fast responder) and Note_Ang (session recorder).

YOUR ROLE: You handle the COMPLEX work. Consult_Ang already acknowledged the user's request. Now you deliver the substance.

RULES:
- NEVER repeat what Consult_Ang said — they already acknowledged
- Go straight to the solution, plan, or deliverable
- Use visuals when appropriate (Mermaid diagrams, chart JSON)
- Dispatch Boomer_Angs when tasks need specialist agents
- Be thorough but not verbose — executives don't read walls of text
- NO technical jargon. NO code in responses. NO architecture talk.
- End with what's happening next, not a question

YOU CAN:
- Generate Mermaid diagrams and chart data
- Dispatch Scout_Ang, Content_Ang, Edu_Ang, Biz_Ang, Ops_Ang, CFO_Ang, Iller_Ang
- Execute through Chicken Hawk for Lil_Hawk tasks
- Create structured deliverables (plans, briefs, strategies)`;

// ── NOTE_ANG — Session Recorder ──

const NOTE_SYSTEM = `You are Note_Ang, the session recorder for The Deploy Platform's Guide Me consulting sessions.

YOUR ROLE: Observe. Record. Detect patterns. Never speak to the user directly.

After each exchange, output a JSON summary:
{
  "user_intent": "one sentence of what the user actually wants",
  "patterns": ["recurring themes or needs"],
  "context_for_next": "what Consult_Ang and ACHEEVY should know for the next response",
  "action_items": ["concrete things that need to happen"]
}

Be precise. Be concise. You are the institutional memory of this session.`;

// ── Main Engine ──

export interface GuideResponse {
  consultResponse: string;     // Consult_Ang's fast response
  acheevyResponse: string | null; // ACHEEVY's response (null if not needed)
  notesSummary: string;        // Note_Ang's session context
  acheevyNeeded: boolean;      // Whether ACHEEVY is processing
}

/**
 * Process a Guide Me message through the three-party system.
 * Returns Consult_Ang's fast response immediately.
 * ACHEEVY's response streams separately if needed.
 */
export async function processGuideMe(
  sessionId: string,
  userMessage: string,
  conversationHistory: Array<{role: string; content: string}>,
): Promise<GuideResponse> {
  const session = getSession(sessionId);

  // Log user message
  session.messages.push({
    role: 'user',
    content: userMessage,
    timestamp: new Date().toISOString(),
  });

  // Build context from Note_Ang's previous analysis
  const noteContext = session.userIntent
    ? `[Session context from Note_Ang: User intent: ${session.userIntent}. Patterns: ${session.patterns.join(', ')}]`
    : '';

  const contextMessages = [
    ...conversationHistory.slice(-10).map(m => ({
      role: m.role === 'acheevy' ? 'assistant' : m.role as string,
      content: m.content,
    })),
    { role: 'user', content: `${noteContext}\n\n${userMessage}` },
  ];

  // Determine if ACHEEVY is needed
  const needsAcheevy = detectComplexity(userMessage);

  // Run all three in parallel
  const [consultResult, noteResult] = await Promise.all([
    // Consult_Ang — always responds
    callModel(CONSULT_MODEL, CONSULT_SYSTEM, contextMessages, 200),

    // Note_Ang — always records
    callModel(NOTE_MODEL, NOTE_SYSTEM, [
      ...contextMessages,
      { role: 'user', content: `Analyze this exchange and provide your JSON summary.` },
    ], 300),
  ]);

  // Parse Note_Ang's analysis
  try {
    const noteData = JSON.parse(noteResult);
    session.userIntent = noteData.user_intent || session.userIntent;
    session.patterns = noteData.patterns || session.patterns;
  } catch {
    // Note_Ang returned non-JSON — store raw
  }

  // Log responses
  session.messages.push({
    role: 'consult_ang',
    content: consultResult,
    timestamp: new Date().toISOString(),
  });

  return {
    consultResponse: consultResult,
    acheevyResponse: null, // ACHEEVY streams separately via the existing chat API
    notesSummary: noteResult,
    acheevyNeeded: needsAcheevy,
  };
}

/**
 * Detect if a message needs ACHEEVY (complex) or Consult_Ang can handle it (simple).
 */
function detectComplexity(message: string): boolean {
  const lower = message.toLowerCase();

  // Simple — Consult_Ang handles alone
  const simplePatterns = [
    /^(yes|no|ok|sure|thanks|thank you|got it|sounds good|perfect|great|cool)/i,
    /^(what|how much|when|where|who) .{0,30}\?$/i, // Short questions
  ];

  if (simplePatterns.some(p => p.test(lower))) return false;

  // Complex — needs ACHEEVY
  const complexPatterns = [
    'build', 'create', 'deploy', 'design', 'analyze', 'research',
    'strategy', 'plan', 'pipeline', 'campaign', 'generate', 'visualize',
    'show me', 'make me', 'set up', 'automate', 'integrate',
  ];

  return complexPatterns.some(p => lower.includes(p));
}

/**
 * Get the ACHEEVY Guide Me system prompt (for use with existing streaming).
 * Includes Note_Ang's context for better responses.
 */
export function getAcheevyGuidePrompt(sessionId: string): string {
  const session = getSession(sessionId);
  const context = session.userIntent
    ? `\n\nNOTE_ANG SESSION CONTEXT:\nUser intent: ${session.userIntent}\nPatterns detected: ${session.patterns.join(', ')}\nSession messages: ${session.messages.length}`
    : '';

  return ACHEEVY_GUIDE_SYSTEM + context;
}

export { CONSULT_MODEL, ACHEEVY_MODEL, NOTE_MODEL };
