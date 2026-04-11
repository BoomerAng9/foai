/**
 * Code_Ang — Autoresearch Engine
 *
 * Researches code/tech topics via Brave Search, then uses
 * the research context to suggest improvements on existing code.
 */

import { createOpenRouterChatCompletion } from '@/lib/ai/openrouter';

const CODE_ANG_MODEL = 'google/gemini-3.1-flash';
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

export interface ResearchFinding {
  title: string;
  snippet: string;
  url: string;
}

export interface ResearchResult {
  findings: ResearchFinding[];
  synthesis: string;
}

export interface ImprovementResult {
  research: ResearchResult;
  improvements: string;
  improvedCode: string;
}

/**
 * Search Brave for a code/tech topic and synthesize the findings.
 */
export async function researchTopic(topic: string): Promise<ResearchResult> {
  const findings: ResearchFinding[] = [];

  if (BRAVE_API_KEY) {
    try {
      const res = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(topic + ' best practices')}&count=5`,
        {
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': BRAVE_API_KEY,
          },
        },
      );

      if (res.ok) {
        const data = await res.json();
        const webResults = data.web?.results || [];
        for (const r of webResults) {
          findings.push({
            title: r.title || '',
            snippet: r.description || '',
            url: r.url || '',
          });
        }
      }
    } catch {
      // Brave unavailable — proceed without web results
    }
  }

  // Synthesize findings with LLM
  const findingsText = findings.length > 0
    ? findings.map((f, i) => `[${i + 1}] ${f.title}\n${f.snippet}\n${f.url}`).join('\n\n')
    : 'No web results available. Provide general best-practice guidance.';

  const synthesis = await createOpenRouterChatCompletion({
    messages: [
      {
        role: 'system',
        content: 'You are Code_Ang, a code research specialist. Synthesize the research into actionable recommendations.',
      },
      {
        role: 'user',
        content: `Topic: "${topic}"\n\nResearch findings:\n${findingsText}\n\nProvide a concise synthesis of the key recommendations and best practices found. Focus on practical, actionable advice.`,
      },
    ],
    model: CODE_ANG_MODEL,
    service: 'code-ang',
  });

  return {
    findings,
    synthesis: synthesis.content,
  };
}

/**
 * Take existing code + research context and suggest improvements.
 * Runs autoresearch first, then generates an improved version.
 */
export async function improveSolution(
  code: string,
  language: string,
  context?: string,
): Promise<ImprovementResult> {
  // Detect what to research based on code content
  const researchQuery = context || `${language} code improvement security performance best practices`;
  const research = await researchTopic(researchQuery);

  const result = await createOpenRouterChatCompletion({
    messages: [
      {
        role: 'system',
        content: 'You are Code_Ang, a senior code improvement specialist. You have researched the latest best practices and will apply them.',
      },
      {
        role: 'user',
        content: `Improve this ${language} code based on the following research context.

RESEARCH CONTEXT:
${research.synthesis}

ORIGINAL CODE:
\`\`\`${language}
${code}
\`\`\`

Return ONLY valid JSON (no markdown fences) in this format:
{
  "improvements": "<bullet list of what was improved and why>",
  "improvedCode": "<the full improved code>"
}`,
      },
    ],
    model: CODE_ANG_MODEL,
    service: 'code-ang',
  });

  let improvements = '';
  let improvedCode = code;

  try {
    let cleaned = result.content.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
    }
    const parsed = JSON.parse(cleaned);
    improvements = String(parsed.improvements || '');
    improvedCode = String(parsed.improvedCode || code);
  } catch {
    improvements = result.content;
  }

  return {
    research,
    improvements,
    improvedCode,
  };
}
