// Topic detection — pure heuristic, fed by recent chat content.
// Picks the dominant beverage topic so the animation can switch from
// the default coffee brewing to tea steeping or mushroom growing.
// Owner directive 2026-05-06.

export type ChatTopic = "coffee" | "tea" | "matcha" | "mushroom" | "unknown";

const TEA_PATTERNS: RegExp[] = [
  /\bteas?\b/i, /\bjasmine\b/i, /\bearl[\s-]?gr[ae]y\b/i, /\bchais?\b/i,
  /\bhojichas?\b/i, /\boolongs?\b/i, /\bherbals?\b/i, /\brooibos\b/i,
  /\bhibiscus\b/i, /\bsteep(?:ing|ed|s)?\b/i, /\binfusers?\b/i, /\bloose[\s-]?leaf\b/i,
  /\bblack tea\b/i, /\bgreen tea\b/i, /\bwhite tea\b/i, /\bmint tea\b/i,
  /\bbergamot\b/i, /\bcamomile|chamomile\b/i, /\btisane\b/i,
];

const MATCHA_PATTERNS: RegExp[] = [
  /\bmatchas?\b/i, /\bceremonial\b/i, /\bwhisk\b/i,
];

const MUSHROOM_PATTERNS: RegExp[] = [
  /\bmushroom\w*\b/i, /\blion'?s mane\b/i, /\bcordyceps?\b/i, /\breishi\b/i,
  /\bchaga\b/i, /\badaptogen\w*\b/i, /\bnootropic\w*\b/i, /\bfunctional\b/i,
  /\btrio[\w-]*\b/i,
];

const COFFEE_PATTERNS: RegExp[] = [
  /\bcoffees?\b/i, /\bespressos?\b/i, /\broast\w*\b/i, /\bblends?\b/i, /\bdecafs?\b/i,
  /\bk[\s-]?cups?\b/i, /\barabica\b/i, /\bsingle[\s-]?origin\b/i, /\bcold[\s-]?brew\w*\b/i,
  /\bbaristas?\b/i, /\bbrew\w*\b/i, /\bdrip\b/i, /\blattes?\b/i, /\bcappuccinos?\b/i,
  /\bbean\w*\b/i, /\bground\b/i, /\bgrind\w*\b/i, /\bmilk[\s-]?steam\w*\b/i,
  /\bturkish\b/i, /\bsaudi\b/i, /\barabic\b/i, /\bcardamom\b/i,
  /\bpour[\s-]?over\b/i, /\bfrench[\s-]?press\b/i, /\bmoka\b/i, /\baeropress\b/i,
  /\bportafilter\b/i, /\bbreve\b/i, /\bmacchiatos?\b/i, /\bamericanos?\b/i,
];

function score(text: string, patterns: RegExp[]): number {
  let n = 0;
  for (const p of patterns) {
    const m = text.match(new RegExp(p.source, p.flags.includes("g") ? p.flags : p.flags + "g"));
    if (m) n += m.length;
  }
  return n;
}

export interface TopicSnapshot {
  topic: ChatTopic;
  scores: Record<ChatTopic, number>;
}

/**
 * Score the most recent N user messages + the last agent reply against
 * each topic bank. Pick the highest-scoring one. Recency-weighted.
 *
 * @param recentMessages - newest-last list of {role, content}
 * @param windowSize - how many trailing messages to consider (default 6)
 */
export function detectTopic(
  recentMessages: { role: string; content: string }[],
  windowSize = 6,
): TopicSnapshot {
  // First pass: score the LATEST user message on its own. If it has an
  // unambiguous winner, use it. This prevents stale prior context (e.g.
  // a long tea-heavy thread) from drowning out a clear topic switch in
  // the user's newest turn.
  const latestUser = [...recentMessages].reverse().find((m) => m.role === "user");
  if (latestUser) {
    const luText = latestUser.content || "";
    const luScores: Record<ChatTopic, number> = {
      coffee: score(luText, COFFEE_PATTERNS),
      tea: score(luText, TEA_PATTERNS),
      matcha: score(luText, MATCHA_PATTERNS),
      mushroom: score(luText, MUSHROOM_PATTERNS),
      unknown: 0,
    };
    const luRanked = (Object.entries(luScores) as [ChatTopic, number][])
      .sort((a, b) => b[1] - a[1]);
    const [luWinner, luScore] = luRanked[0];
    const [, luSecond] = luRanked[1];
    // Unambiguous = new message has at least one match AND a clear leader.
    if (luScore > 0 && luScore > luSecond) {
      return { topic: luWinner, scores: luScores };
    }
    // Ambiguous user message (zero topic words like "fair-trade" /
    // "your best products" / "tell me more"). Default to COFFEE — brand
    // primary product. Don't drift to agent-reply history weights, which
    // would lock the animation into whatever was just discussed.
    const luTotal = luScores.coffee + luScores.tea + luScores.matcha + luScores.mushroom;
    if (luTotal === 0) {
      return { topic: "coffee", scores: luScores };
    }
  }
  // Fallback: weighted window across the last N messages.
  const window = recentMessages.slice(-windowSize);
  const scores: Record<ChatTopic, number> = {
    coffee: 0, tea: 0, matcha: 0, mushroom: 0, unknown: 0,
  };
  window.forEach((m, i) => {
    const weight = (i + 1) / window.length; // 0.16 → 1.0
    const text = m.content || "";
    scores.coffee   += score(text, COFFEE_PATTERNS) * weight;
    scores.tea      += score(text, TEA_PATTERNS) * weight;
    scores.matcha   += score(text, MATCHA_PATTERNS) * weight;
    scores.mushroom += score(text, MUSHROOM_PATTERNS) * weight;
  });
  const ranked = (Object.entries(scores) as [ChatTopic, number][])
    .sort((a, b) => b[1] - a[1]);
  const [winner, winnerScore] = ranked[0];
  if (winnerScore <= 0.001) return { topic: "unknown", scores };
  return { topic: winner, scores };
}

// Map detected topic → AnimationRouter animationType key. Coffee falls
// through to whatever the current employee animation is so the existing
// per-employee routing still works for non-product chat.
export function topicToAnimationType(topic: ChatTopic, fallback: string): string {
  if (topic === "tea") return "tea_infuser";
  if (topic === "mushroom") return "mushroom_growth";
  // Matcha currently rides the existing tea animation; future: dedicated
  // matcha whisk animation.
  if (topic === "matcha") return "tea_infuser";
  return fallback;
}
