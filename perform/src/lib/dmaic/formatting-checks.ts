/**
 * Zero-tolerance formatting scanner for deliverables.
 * A single failure = automatic grade reduction to C.
 * No template variables, no placeholders, no broken links, no Lorem ipsum.
 */

export interface FormattingResult {
  passed: boolean;
  issues: string[];
}

const TEMPLATE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\{\{(\w+)\}\}/g, label: 'Template variable found: {{$1}}' },
  { pattern: /\[INSERT[^\]]*\]/gi, label: 'Bracket placeholder found: $&' },
  { pattern: /\$\{(\w+)\}/g, label: 'String interpolation found: ${$1}' },
  { pattern: /<%[^%]*%>/g, label: 'EJS/ERB template tag found: $&' },
];

const SUSPICIOUS_PARENS = /\((?:name|team|player|date|time|platform|company|user|client|insert|placeholder|value|amount|number|email|url|link)\)/gi;

const PLACEHOLDER_WORDS = /\b(?:TBD|TODO|FIXME|PLACEHOLDER|UNDEFINED|NULL|N\/A|LOREM|IPSUM)\b/g;

const BROKEN_MARKDOWN_LINK = /\[[^\]]+\]\(\s*\)/g;

const LOREM_IPSUM = /lorem\s+ipsum/gi;

export function scanFormatting(content: string): FormattingResult {
  const issues: string[] = [];

  for (const { pattern, label } of TEMPLATE_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      issues.push(label.replace('$1', match[1] || '').replace('$&', match[0]));
    }
  }

  const parenRegex = new RegExp(SUSPICIOUS_PARENS.source, SUSPICIOUS_PARENS.flags);
  let parenMatch: RegExpExecArray | null;
  while ((parenMatch = parenRegex.exec(content)) !== null) {
    issues.push(`Suspicious placeholder found: ${parenMatch[0]}`);
  }

  const wordRegex = new RegExp(PLACEHOLDER_WORDS.source, PLACEHOLDER_WORDS.flags);
  let wordMatch: RegExpExecArray | null;
  while ((wordMatch = wordRegex.exec(content)) !== null) {
    issues.push(`Placeholder word found: ${wordMatch[0]}`);
  }

  const linkRegex = new RegExp(BROKEN_MARKDOWN_LINK.source, BROKEN_MARKDOWN_LINK.flags);
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = linkRegex.exec(content)) !== null) {
    issues.push(`Empty markdown link found: ${linkMatch[0]}`);
  }

  if (LOREM_IPSUM.test(content)) {
    issues.push('Lorem ipsum detected — placeholder text in deliverable');
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}
