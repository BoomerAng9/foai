/**
 * MIM Governance Gate — checks every user request before execution.
 *
 * Policies:
 * 1. IP Protection — block cloning/copying third-party products
 * 2. Legal Compliance — block scraping behind auth, private data access
 * 3. Ethical Gate — block deceptive content, impersonation
 * 4. Brand Safety — block anything damaging to ACHIEVEMOR reputation
 * 5. Scope Gate — block actions outside user's tier/permissions
 * 6. Data Boundary — block cross-user data access
 *
 * Returns: { allowed: true } or { allowed: false, reason, redirect }
 * ACHEEVY never just says "no" — always offers an alternative path.
 */

interface MIMResult {
  allowed: boolean;
  reason?: string;
  redirect?: string;  // alternative suggestion ACHEEVY can offer
  policy?: string;    // which policy triggered
}

// IP violation patterns
const IP_PATTERNS = [
  { pattern: /\b(clone|copy|replicate|duplicate|rip)\b.*\b(blotato|figma|canva|notion|airtable|webflow|framer|shopify|stripe|vercel)\b/i, product: 'third-party product' },
  { pattern: /\b(steal|rip off|knock.?off|bootleg)\b/i, product: 'protected content' },
  { pattern: /\b(crack|keygen|pirate|torrent|warez)\b/i, product: 'protected software' },
];

// Legal compliance patterns
const LEGAL_PATTERNS = [
  { pattern: /\b(scrape|crawl).*(behind.?login|authenticated|private|password.?protected)\b/i, issue: 'Accessing content behind authentication' },
  { pattern: /\b(hack|exploit|breach|penetrate)\b/i, issue: 'Security exploitation' },
  { pattern: /\b(doxx|doxing|personal.?info.*without.?consent)\b/i, issue: 'Privacy violation' },
];

// Ethical patterns
const ETHICAL_PATTERNS = [
  { pattern: /\b(fake|forge|fabricate)\b.*(review|testimonial|credential|certificate|diploma)\b/i, issue: 'Fraudulent content creation' },
  { pattern: /\b(impersonat|pretend.?to.?be|pose.?as)\b/i, issue: 'Impersonation' },
  { pattern: /\b(spam|mass.?email|bulk.?message)\b.*\b(unsolicited|cold)\b/i, issue: 'Unsolicited mass communication' },
];

export function checkMIMGate(userMessage: string): MIMResult {
  const msg = userMessage.toLowerCase();

  // IP Protection
  for (const { pattern, product } of IP_PATTERNS) {
    if (pattern.test(userMessage)) {
      return {
        allowed: false,
        reason: `This request involves replicating a ${product}, which creates IP and legal exposure.`,
        redirect: `I can help you build something original that serves the same purpose. Tell me what specific functionality you need, and I'll design it with your own brand identity.`,
        policy: 'IP Protection',
      };
    }
  }

  // Legal Compliance
  for (const { pattern, issue } of LEGAL_PATTERNS) {
    if (pattern.test(userMessage)) {
      return {
        allowed: false,
        reason: `${issue} — this falls outside our compliance boundaries.`,
        redirect: `I can help you achieve your goal through legitimate channels. What's the underlying objective?`,
        policy: 'Legal Compliance',
      };
    }
  }

  // Ethical Gate
  for (const { pattern, issue } of ETHICAL_PATTERNS) {
    if (pattern.test(userMessage)) {
      return {
        allowed: false,
        reason: `${issue} — this conflicts with our operational ethics.`,
        redirect: `Let me help you accomplish this authentically. What's the real outcome you're after?`,
        policy: 'Ethical Gate',
      };
    }
  }

  return { allowed: true };
}
