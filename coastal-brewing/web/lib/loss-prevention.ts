// Loss-prevention heuristics. Cheap, deterministic, client-side.
// "Shrink" in this store is wasted LLM + TTS tokens, not pilfered
// inventory. Same retail principle: provide quality service, but if
// the customer is not on a path to purchase, exit politely so the
// floor team can serve other customers.
//
// All thresholds are conservative defaults; the chat panel can tune.

export const LP_DEFAULTS = {
  // Hard caps on a single anonymous session before the floor associate
  // politely excuses themselves. Counted from first agent reply.
  maxAgentReplies: 14,
  // Soft elapsed-time cap (ms). 12 minutes of conversation without
  // purchase intent is past the point a real associate would peel off.
  maxSessionMs: 12 * 60 * 1000,
  // Before either cap, if NO purchase intent has surfaced in N user
  // messages, treat as low-intent and shorten the leash.
  lowIntentMessageThreshold: 8,
  // Hard immediate close on any single nerf-attempt match.
  nerfClosesImmediately: true,
};

// Purchase-intent signals — short keyword set covers the common entry
// points without an LLM call. Catalog category words + common verbs +
// price/order/checkout cues.
const INTENT_PATTERNS: RegExp[] = [
  /\bbuy(?:ing)?\b/i,
  /\bpurchase(?:s|d|ing)?\b/i,
  /\border(?:s|ed|ing)?\b/i,
  /\b(?:add|put)[\s\w]{0,12}(?:cart|basket)\b/i,
  /\bcheck[\s-]?out\b/i,
  /\bship(?:ping|s|ped)?\b/i,
  /\bdelivery\b/i,
  /\bpay(?:ment|ing)?\b/i,
  /\bsubscri(?:be|ption|bing)\b/i,
  /\bbundle\b/i,
  /\b(?:1|one|2|two|3|three|4|five|six)\s+(?:bag|bags|lb|lbs|pound|ounce|oz)\b/i,
  /\b(?:coffee|tea|matcha|hojicha|chai|kcup|k-cup|decaf|espresso|blend|roast)\b/i,
  /\$\s*\d/,
  /\bprice\b/i,
  /\bcost\b/i,
  /\bgift\b/i,
  /\brecipe\b/i,
  /\bshop for me\b/i,
  /\bsurprise me\b/i,
];

// Nerf / jailbreak / prompt-injection signals. Conservative — false
// positives only cost a polite redirect, not a ban. False negatives
// also cost only tokens.
const NERF_PATTERNS: RegExp[] = [
  /\bignore (?:all |the |your |previous )?(?:instructions|rules|system|prompt)\b/i,
  /\bdisregard (?:all |the |your |previous )?(?:instructions|rules|system|prompt)\b/i,
  /\b(?:you are|you're) (?:now|actually|really)\b/i,
  /\bsystem prompt\b/i,
  /\bjailbreak\b/i,
  /\bDAN\b(?!\s*'s)/, // DAN-style jailbreaks but not "Dan's order"
  /\bact (?:as|like)\s+(?:a|an|the)?\s*(?:hacker|admin|root|developer|sysadmin)\b/i,
  /\bpretend (?:to be|you are|you're)\b/i,
  /\broleplay\b/i,
  /\b(?:reveal|show|print|leak|dump)\s+(?:your|the)\s+(?:prompt|instructions|rules|system|secrets|api[\s-]?key)\b/i,
  /\b(?:cost|wholesale|margin|supplier|vendor|tcr|temecula)\b/i, // sacred-separation probes
  /\bare you (?:a|an) (?:ai|bot|robot|llm|machine|computer|gpt|claude|chatgpt)\b/i,
  /\bwhat (?:llm|model|gpt|provider|api) (?:are you|do you use|powers)\b/i,
];

// Mild "off-topic chat" patterns — not nerf attempts but not buying
// either. Useful for the soft-close path.
const SMALL_TALK_PATTERNS: RegExp[] = [
  /\bhow are you\b/i,
  /\bwho made you\b/i,
  /\bwhat'?s your favorite\b/i,
  /\btell me a (?:joke|story|secret)\b/i,
  /\bwhat (?:do|did) you do (?:today|yesterday)\b/i,
];

export type LossSignal =
  | "none"
  | "intent_present"
  | "low_intent_warning"
  | "small_talk"
  | "nerf_attempt"
  | "session_too_long"
  | "session_too_chatty";

export interface LossEval {
  signal: LossSignal;
  matchedPattern?: string;
  shouldSoftClose: boolean;
  shouldHardClose: boolean;
  reason: string;
}

export interface SessionSnapshot {
  startedAt: number;
  agentRepliesSoFar: number;
  userMessagesSoFar: number;
  intentEverDetected: boolean;
}

function firstMatch(text: string, patterns: RegExp[]): RegExp | null {
  for (const p of patterns) {
    if (p.test(text)) return p;
  }
  return null;
}

/**
 * Evaluate the latest user message + the running session snapshot.
 * Returns a single signal with close recommendations the caller honors.
 * Pure function, no side effects.
 */
export function evaluateMessage(
  userText: string,
  session: SessionSnapshot,
  thresholds = LP_DEFAULTS,
): LossEval {
  const text = (userText || "").trim();
  if (!text) {
    return { signal: "none", shouldSoftClose: false, shouldHardClose: false, reason: "" };
  }

  // 1. Nerf attempt — immediate hard close.
  const nerfHit = firstMatch(text, NERF_PATTERNS);
  if (nerfHit && thresholds.nerfClosesImmediately) {
    return {
      signal: "nerf_attempt",
      matchedPattern: nerfHit.source,
      shouldSoftClose: false,
      shouldHardClose: true,
      reason: "nerf or sacred-separation probe detected in latest message",
    };
  }

  // 2. Strong purchase intent — clean signal, do nothing.
  if (firstMatch(text, INTENT_PATTERNS)) {
    return {
      signal: "intent_present",
      shouldSoftClose: false,
      shouldHardClose: false,
      reason: "purchase-intent keyword matched in latest message",
    };
  }

  // 3. Small talk + we already had a few exchanges without intent.
  if (firstMatch(text, SMALL_TALK_PATTERNS)) {
    if (session.userMessagesSoFar >= thresholds.lowIntentMessageThreshold && !session.intentEverDetected) {
      return {
        signal: "small_talk",
        shouldSoftClose: true,
        shouldHardClose: false,
        reason: "small-talk pattern AND no purchase-intent in recent history",
      };
    }
    return { signal: "small_talk", shouldSoftClose: false, shouldHardClose: false, reason: "small-talk pattern" };
  }

  // 4. Session caps.
  const elapsed = Date.now() - session.startedAt;
  if (elapsed > thresholds.maxSessionMs && !session.intentEverDetected) {
    return {
      signal: "session_too_long",
      shouldSoftClose: true,
      shouldHardClose: false,
      reason: "session past time cap with no purchase-intent surfaced",
    };
  }
  if (session.agentRepliesSoFar >= thresholds.maxAgentReplies && !session.intentEverDetected) {
    return {
      signal: "session_too_chatty",
      shouldSoftClose: true,
      shouldHardClose: false,
      reason: "agent-reply cap reached with no purchase-intent surfaced",
    };
  }

  // 5. Default — keep going, but flag if we're past the low-intent gate.
  if (session.userMessagesSoFar >= thresholds.lowIntentMessageThreshold && !session.intentEverDetected) {
    return {
      signal: "low_intent_warning",
      shouldSoftClose: false,
      shouldHardClose: false,
      reason: "low-intent watch — past threshold, no signal yet",
    };
  }
  return { signal: "none", shouldSoftClose: false, shouldHardClose: false, reason: "" };
}

// Brand-voiced exit lines. Owner directive 2026-05-06: graceful "I gotta
// circle back to other customers" — never accuse the visitor of waste,
// never confirm the heuristic that fired.
export const SOFT_CLOSE_LINE =
  "Hey — I gotta circle back to my other customers for a minute. If you wanna pick something up or you've got a question on the menu, ping me anytime and I'll set you up.";

// Same voice but firmer; used on nerf attempts. Sal still doesn't say
// "I caught you" — he just steps off the conversation.
export const HARD_CLOSE_LINE =
  "I'm gonna step off this one — I got customers waiting. If you wanna talk coffee, tea, or matcha, just ping me and I'll be right back.";
