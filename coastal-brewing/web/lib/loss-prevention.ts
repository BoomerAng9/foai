// Loss-prevention state machine. Scripted interceptor — once a
// non-purchase signal trips, the chat steps OUT of LLM routing into
// a fixed dialog tree so we stop spending tokens on unproductive
// turns. Owner directive 2026-05-06: same retail floor logic — quality
// service offered, then politely peel off if not converting, escalate
// to LP team, escalate again to ACHEEVY for formal exit.
//
// State graph:
//   normal → negotiating → (intent? back to normal : looking)
//   looking → terse (on re-engage) → lp_active (3+ terse OR another nerf)
//   lp_active → acheevy_warning (if LP team can't convert)
//   acheevy_warning → exit (after cooldown; account creation required)
//
// Voice playback works for every state — each scripted message carries
// the appropriate employee key (sal_ang / lp_ang / acheevy) so the
// frontend's PlayVoiceButton routes it through the right Inworld voice.

export type LPState =
  | "normal"
  | "negotiating"
  | "looking"
  | "terse"
  | "lp_active"
  | "acheevy_warning"
  | "exit";

export interface LPSession {
  state: LPState;
  startedAt: number;
  agentRepliesSoFar: number;
  userMessagesSoFar: number;
  intentEverDetected: boolean;
  terseCount: number;
  lpAssistStep: 0 | 1 | 2 | 3; // 0=intro, 1=family ask, 2=specifics, 3=close
  cooldownUntil: number;
}

export const LP_DEFAULTS = {
  maxAgentReplies: 14,
  maxSessionMs: 12 * 60 * 1000,
  lowIntentMessageThreshold: 8,
  terseEscalateAt: 3, // # of terse exchanges before LP_Ang takes over
  acheevyCooldownMs: 10 * 60 * 1000,
  exitCooldownMs: 30 * 60 * 1000,
};

// ─── Pattern banks ──────────────────────────────────────────────────

const INTENT_PATTERNS: RegExp[] = [
  /\bbuy(?:ing)?\b/i, /\bpurchase(?:s|d|ing)?\b/i, /\border(?:s|ed|ing)?\b/i,
  /\b(?:add|put)[\s\w]{0,12}(?:cart|basket)\b/i, /\bcheck[\s-]?out\b/i,
  /\bship(?:ping|s|ped)?\b/i, /\bdelivery\b/i, /\bpay(?:ment|ing)?\b/i,
  /\bsubscri(?:be|ption|bing)\b/i, /\bbundle\b/i,
  /\b(?:1|one|2|two|3|three|4|five|six)\s+(?:bag|bags|lb|lbs|pound|ounce|oz)\b/i,
  /\b(?:coffee|tea|matcha|hojicha|chai|kcup|k-cup|decaf|espresso|blend|roast)\b/i,
  /\$\s*\d/, /\bprice\b/i, /\bcost\b/i, /\bgift\b/i, /\brecipe\b/i,
  /\bshop for me\b/i, /\bsurprise me\b/i, /\bi'?ll take\b/i, /\bgive me\b/i,
];

const NERF_PATTERNS: RegExp[] = [
  /\bignore (?:all |the |your |previous )?(?:instructions|rules|system|prompt)\b/i,
  /\bdisregard (?:all |the |your |previous )?(?:instructions|rules|system|prompt)\b/i,
  /\b(?:you are|you're) (?:now|actually|really)\b/i,
  /\bsystem prompt\b/i, /\bjailbreak\b/i,
  /\bDAN\b(?!\s*'s)/,
  /\bact (?:as|like)\s+(?:a|an|the)?\s*(?:hacker|admin|root|developer|sysadmin)\b/i,
  /\bpretend (?:to be|you are|you're)\b/i, /\broleplay\b/i,
  /\b(?:reveal|show|print|leak|dump)\s+(?:your|the)\s+(?:prompt|instructions|rules|system|secrets|api[\s-]?key)\b/i,
  /\b(?:cost|wholesale|margin|supplier|vendor|tcr|temecula)\b/i,
  /\bare you (?:a|an) (?:ai|bot|robot|llm|machine|computer|gpt|claude|chatgpt)\b/i,
  /\bwhat (?:llm|model|gpt|provider|api) (?:are you|do you use|powers)\b/i,
];

const SMALL_TALK_PATTERNS: RegExp[] = [
  /\bhow are you\b/i, /\bwho made you\b/i, /\bwhat'?s your favorite\b/i,
  /\btell me a (?:joke|story|secret)\b/i,
  /\bwhat (?:do|did) you do (?:today|yesterday)\b/i,
];

const AFFIRMATIVE_PATTERNS: RegExp[] = [
  /^\s*(?:yes|yeah|yup|sure|ok(?:ay)?|sounds good|let'?s do it|i'?m in)\b/i,
];

const NEGATIVE_LOOKING_PATTERNS: RegExp[] = [
  /^\s*(?:no|nope|not yet|just looking|browsing|just browsing|not now|nah|maybe later)\b/i,
];

function firstMatch(text: string, patterns: RegExp[]): RegExp | null {
  for (const p of patterns) if (p.test(text)) return p;
  return null;
}

// ─── Public predicates ──────────────────────────────────────────────

export function hasIntent(text: string): boolean {
  return firstMatch(text, INTENT_PATTERNS) !== null;
}

export function isNerfAttempt(text: string): boolean {
  return firstMatch(text, NERF_PATTERNS) !== null;
}

export function isSmallTalk(text: string): boolean {
  return firstMatch(text, SMALL_TALK_PATTERNS) !== null;
}

export function isAffirmative(text: string): boolean {
  return firstMatch(text, AFFIRMATIVE_PATTERNS) !== null;
}

export function isNegativeLooking(text: string): boolean {
  return firstMatch(text, NEGATIVE_LOOKING_PATTERNS) !== null;
}

// ─── State machine — pure transition function ──────────────────────

export interface LPDecision {
  nextState: LPState;
  emit?: { employee: string; content: string };
  blockUpstream: boolean; // if true, do NOT send the user message to LLM
  resetCounters?: boolean;
  cooldownMs?: number;
  recordAuditSignal?: string;
}

export function evaluateUserMessage(
  text: string,
  session: LPSession,
  thresholds = LP_DEFAULTS,
): LPDecision {
  const t = (text || "").trim();

  // ── EXIT — input should already be locked, nothing to do.
  if (session.state === "exit") {
    return { nextState: "exit", blockUpstream: true };
  }

  // ── ACHEEVY_WARNING — any message during cooldown re-shows warning.
  if (session.state === "acheevy_warning") {
    if (Date.now() >= session.cooldownUntil) {
      return {
        nextState: "exit",
        blockUpstream: true,
        emit: { employee: "acheevy", content: EXIT_LINE },
      };
    }
    return {
      nextState: "acheevy_warning",
      blockUpstream: true,
      emit: { employee: "acheevy", content: ACHEEVY_REMINDER },
    };
  }

  // ── Strong nerf — escalate by tier (worse if already in lp_active).
  if (isNerfAttempt(t)) {
    if (session.state === "lp_active" || session.state === "terse") {
      return {
        nextState: "acheevy_warning",
        blockUpstream: true,
        cooldownMs: thresholds.acheevyCooldownMs,
        emit: { employee: "acheevy", content: ACHEEVY_WARNING },
        recordAuditSignal: "acheevy_intervention_after_nerf",
      };
    }
    // First nerf — straight to LP team, skip negotiation.
    return {
      nextState: "lp_active",
      blockUpstream: true,
      emit: { employee: "lp_ang", content: LP_INTRO_NERF },
      recordAuditSignal: "nerf_attempt",
    };
  }

  // ── Strong intent — back to normal flow regardless of where we were.
  // blockUpstream MUST be false here so the caller forwards the message
  // to the LLM. Setting it to true silently dropped intent-bearing
  // messages like "what coffees do you have?" with no reply.
  if (hasIntent(t)) {
    return {
      nextState: "normal",
      blockUpstream: false,
      resetCounters: true,
    };
  }

  // ── Per-state transitions for non-intent, non-nerf messages.
  switch (session.state) {
    case "normal": {
      const elapsed = Date.now() - session.startedAt;
      const overTime = elapsed > thresholds.maxSessionMs;
      const overReplies = session.agentRepliesSoFar >= thresholds.maxAgentReplies;
      const lowIntent =
        session.userMessagesSoFar >= thresholds.lowIntentMessageThreshold &&
        !session.intentEverDetected;
      // Only fall to negotiation on hard signals (over-time, over-replies,
      // accumulated low-intent). Small-talk on a fresh session goes to Sal —
      // gate-keeping every "hi" with a scripted reply was killing first-turn
      // engagement.
      if (overTime || overReplies || lowIntent) {
        return {
          nextState: "negotiating",
          blockUpstream: true,
          emit: { employee: "sal_ang", content: NEGOTIATION_PROMPT },
          recordAuditSignal: "negotiation_opened",
        };
      }
      return { nextState: "normal", blockUpstream: false };
    }

    case "negotiating": {
      if (isAffirmative(t)) {
        return { nextState: "normal", blockUpstream: false, resetCounters: true };
      }
      // Either explicit "no/just looking" or any other non-intent reply.
      return {
        nextState: "looking",
        blockUpstream: true,
        emit: { employee: "sal_ang", content: LOOKING_REPLY },
        recordAuditSignal: "user_browsing",
      };
    }

    case "looking": {
      // Any re-engagement post-looking flips to terse.
      return {
        nextState: "terse",
        blockUpstream: true,
        emit: { employee: "sal_ang", content: TERSE_REPLY },
        recordAuditSignal: "terse_mode_engaged",
      };
    }

    case "terse": {
      const nextTerseCount = session.terseCount + 1;
      if (nextTerseCount >= thresholds.terseEscalateAt) {
        return {
          nextState: "lp_active",
          blockUpstream: true,
          emit: { employee: "lp_ang", content: LP_INTRO },
          recordAuditSignal: "lp_team_engaged",
        };
      }
      return {
        nextState: "terse",
        blockUpstream: true,
        emit: { employee: "sal_ang", content: TERSE_REPLY },
      };
    }

    case "lp_active": {
      const nextStep = (session.lpAssistStep + 1) as 0 | 1 | 2 | 3;
      if (nextStep > 3) {
        return {
          nextState: "acheevy_warning",
          blockUpstream: true,
          cooldownMs: thresholds.acheevyCooldownMs,
          emit: { employee: "acheevy", content: ACHEEVY_WARNING },
          recordAuditSignal: "acheevy_intervention_after_lp",
        };
      }
      const lines = [LP_STEP_FAMILY, LP_STEP_SPECIFICS, LP_STEP_CLOSE];
      return {
        nextState: "lp_active",
        blockUpstream: true,
        emit: { employee: "lp_ang", content: lines[nextStep - 1] },
      };
    }
  }

  return { nextState: session.state, blockUpstream: false };
}

// ─── Scripted lines — voiced by the right team member ──────────────
// Sal voice — first, polite, retail-floor pattern.
export const NEGOTIATION_PROMPT =
  "Hey — you looking to grab something today, or just looking around? Either's good with me, just want to know how to set you up.";
export const LOOKING_REPLY =
  "All good. Take your time browsing. When you're ready to talk shop, ping me — I'll be at the counter.";
export const TERSE_REPLY =
  "What's the question?";

// LP_Ang (Marcus) — clean, structured, professional. Three-step assist.
export const LP_INTRO =
  "Hey — Marcus from the floor team. Sal's tied up with a customer. I can help you find what you need quickly. Coffee, tea, matcha, or functional — what are we landing on?";
export const LP_INTRO_NERF =
  "Hi — Marcus, floor team. Let's keep this on the menu. Coffee, tea, matcha, or functional — which way are you headed?";
export const LP_STEP_FAMILY =
  "Got it. Anything specific — flavor profile, brewing method, gift versus daily?";
export const LP_STEP_SPECIFICS =
  "Solid. Want me to set you up at checkout, or hand you back to the counter to keep browsing?";
export const LP_STEP_CLOSE =
  "Alright. If you change your mind, the menu's right there. I'll close this loop out for now.";

// ACHEEVY — final-authority intervention. Brief, declarative, not negotiating.
export const ACHEEVY_WARNING =
  "We've spent a few cycles together without a path to a sale. Going to ask you to step away for now. If you'd like to come back to shop, please create an account — registered customers get the full counter.";
export const ACHEEVY_REMINDER =
  "Step away for now, please. Account creation is the door back in.";
export const EXIT_LINE =
  "Conversation closed. Visit /auth/signup to register and rejoin the counter.";

// Default initial session.
export function freshSession(): LPSession {
  return {
    state: "normal",
    startedAt: Date.now(),
    agentRepliesSoFar: 0,
    userMessagesSoFar: 0,
    intentEverDetected: false,
    terseCount: 0,
    lpAssistStep: 0,
    cooldownUntil: 0,
  };
}

// Apply a decision to a session (returns new session — pure).
export function applyDecision(s: LPSession, d: LPDecision): LPSession {
  let next: LPSession = { ...s, state: d.nextState };
  if (d.resetCounters) {
    next = {
      ...next,
      startedAt: Date.now(),
      agentRepliesSoFar: 0,
      userMessagesSoFar: 0,
      terseCount: 0,
      lpAssistStep: 0,
    };
  } else {
    next.userMessagesSoFar = s.userMessagesSoFar + 1;
    if (d.nextState === "terse") next.terseCount = s.terseCount + 1;
    if (d.nextState === "lp_active") next.lpAssistStep = (s.lpAssistStep + 1) as 0 | 1 | 2 | 3;
  }
  if (d.cooldownMs) next.cooldownUntil = Date.now() + d.cooldownMs;
  if (d.nextState === "normal" && hasIntent("")) next.intentEverDetected = true;
  return next;
}
