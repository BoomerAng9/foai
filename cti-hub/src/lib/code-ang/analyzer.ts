/**
 * Code_Ang — Code Analysis Engine
 *
 * Uses OpenRouter (free-tier model) to analyze code for:
 * - Security vulnerabilities
 * - Code quality issues
 * - Performance concerns
 * - Best practice violations
 */

import { createOpenRouterChatCompletion } from '@/lib/ai/openrouter';

const CODE_ANG_MODEL = 'google/gemini-3.1-flash';

export interface CodeIssue {
  severity: 'critical' | 'warning' | 'info';
  message: string;
  line?: number;
  suggestion: string;
}

export interface AnalysisResult {
  score: number;
  issues: CodeIssue[];
  summary: string;
}

function buildAnalysisPrompt(code: string, language: string, mode: 'analyze' | 'security'): string {
  const focusArea =
    mode === 'security'
      ? 'Focus EXCLUSIVELY on security vulnerabilities: injection attacks, XSS, CSRF, auth bypass, secrets exposure, unsafe deserialization, path traversal, SSRF, and insecure dependencies.'
      : 'Check for: security vulnerabilities, code quality issues, performance concerns, and best practice violations.';

  return `You are Code_Ang, a senior code review specialist. Analyze the following ${language} code.

${focusArea}

Return ONLY valid JSON (no markdown fences, no explanation outside the JSON) in this exact format:
{
  "score": <number 0-100, where 100 is perfect>,
  "issues": [
    {
      "severity": "critical" | "warning" | "info",
      "message": "<what is wrong>",
      "line": <line number or null>,
      "suggestion": "<how to fix>"
    }
  ],
  "summary": "<2-3 sentence overview>"
}

If the code is clean, return a high score with an empty issues array.

CODE:
\`\`\`${language}
${code}
\`\`\``;
}

function parseAnalysisResponse(raw: string): AnalysisResult {
  // Strip markdown fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  // Strip any leading/trailing non-JSON text
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart >= 0 && jsonEnd > jsonStart) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  }

  try {
    const parsed = JSON.parse(cleaned);
    return {
      score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
      issues: Array.isArray(parsed.issues)
        ? parsed.issues.map((i: Record<string, unknown>) => ({
            severity: ['critical', 'warning', 'info'].includes(i.severity as string)
              ? (i.severity as CodeIssue['severity'])
              : 'info',
            message: String(i.message || ''),
            line: typeof i.line === 'number' ? i.line : undefined,
            suggestion: String(i.suggestion || ''),
          }))
        : [],
      summary: String(parsed.summary || 'Analysis complete.'),
    };
  } catch {
    return {
      score: 0,
      issues: [
        {
          severity: 'warning',
          message: 'Could not parse analysis response',
          suggestion: 'Try again or simplify the code input',
        },
      ],
      summary: raw.slice(0, 300),
    };
  }
}

export async function analyzeCode(
  code: string,
  language: string,
  mode: 'analyze' | 'security' = 'analyze',
): Promise<AnalysisResult> {
  if (!code.trim()) {
    return { score: 0, issues: [], summary: 'No code provided.' };
  }

  const prompt = buildAnalysisPrompt(code, language, mode);

  const result = await createOpenRouterChatCompletion({
    messages: [
      { role: 'system', content: 'You are Code_Ang, a code quality and security analysis specialist. Respond only with valid JSON.' },
      { role: 'user', content: prompt },
    ],
    model: CODE_ANG_MODEL,
    service: 'code-ang',
  });

  return parseAnalysisResponse(result.content);
}
