// Topic detection — pure heuristic, fed by recent chat content.
// Picks the dominant beverage topic so the animation can switch from
// the default coffee brewing to tea steeping or mushroom growing.
// Owner directive 2026-05-06.

export type ChatTopic = "coffee" | "tea" | "matcha" | "mushroom" | "unknown";

const TEA_PATTERNS: RegExp[] = [
  /\btea\b/i, /\bjasmine\b/i, /\bearl[\s-]?gr[ae]y\b/i, /\bchai\b/i,
  /\bhojicha\b/i, /\boolong\b/i, /\bherbal\b/i, /\brooibos\b/i,
  /\bhibiscus\b/i, /\bsteep(?:ing)?\b/i, /\binfuser?\b/i, /\bloose[\s-]?leaf\b/i,
  /\bmint tea\b/i, /\bblack tea\b/i, /\bgreen tea\b/i,
];

const MATCHA_PATTERNS: RegExp[] = [
  /\bmatcha\b/i, /\bceremonial\b/i, /\bwhisk\b/i,
];

const MUSHROOM_PATTERNS: RegExp[] = [
  /\bmushroom\w*\b/i, /\blion'?s mane\b/i, /\bcordyceps?\b/i, /\breishi\b/i,
  /\bchaga\b/i, /\badaptogen\w*\b/i, /\bnootropic\w*\b/i, /\bfunctional\b/i,
  /\btrio[\w-]*\b/i,
];

const COFFEE_PATTERNS: RegExp[] = [
  /\bcoffee\b/i, /\bespresso\b/i, /\broast\w*\b/i, /\bblend\b/i, /\bdecaf\b/i,
  /\bk[\s-]?cup\b/i, /\barabica\b/i, /\bsingle[\s-]?origin\b/i, /\bcold[\s-]?brew\b/i,
  /\bbarista\b/i, /\bbrewing\b/i, /\bdrip\b/i,
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
  const window = recentMessages.slice(-windowSize);
  // Recency weighting — newest message counts the most.
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
  // Pick the leader.
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
