/**
 * Tutorial Generator — Powered by Xtrac_Ang
 * Takes extracted content and generates step-by-step tutorials
 * via OpenRouter (Qwen 3.6 Plus free model).
 * visual_description fields guide Iller_Ang image generation.
 */

export interface TutorialStep {
  step_number: number;
  instruction: string;
  visual_description: string;
}

export interface Tutorial {
  title: string;
  steps: TutorialStep[];
  summary: string;
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const MODEL = 'qwen/qwen-2.5-72b-instruct:free';

/**
 * Generate a step-by-step tutorial from extracted content.
 */
export async function generateTutorial(
  content: string,
  topic: string,
): Promise<Tutorial> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  // Truncate content to avoid token limits
  const trimmedContent = content.slice(0, 12000);

  const systemPrompt = `You are Xtrac_Ang, a tutorial generation specialist for The Deploy Platform.
Your job is to create clear, actionable step-by-step tutorials from source material.
Each step must include a visual_description that tells an image generation AI exactly what to create for that step.

RULES:
- Keep steps concise and actionable (2-3 sentences max per instruction)
- visual_description should describe a specific image scene (dark theme, gold accents, professional)
- Generate 5-10 steps depending on complexity
- Title should be bold and direct
- Summary should be 1-2 sentences

Respond ONLY with valid JSON in this exact format:
{
  "title": "How to ...",
  "steps": [
    {
      "step_number": 1,
      "instruction": "Clear action instruction",
      "visual_description": "Dark-themed illustration showing..."
    }
  ],
  "summary": "Brief summary of what was covered"
}`;

  const userMessage = `Create a tutorial about: ${topic}\n\nSource material:\n${trimmedContent}`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://deploy.foai.cloud',
      'X-Title': 'Deploy Platform — Xtrac_Ang',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 2000,
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'Unknown error');
    throw new Error(`OpenRouter API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || '';

  // Parse the JSON response — handle markdown code blocks
  const jsonStr = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(jsonStr);

    // Validate structure
    if (!parsed.title || !Array.isArray(parsed.steps) || !parsed.summary) {
      throw new Error('Invalid tutorial structure');
    }

    return {
      title: String(parsed.title),
      steps: parsed.steps.map((s: Record<string, unknown>, i: number) => ({
        step_number: Number(s.step_number) || i + 1,
        instruction: String(s.instruction || ''),
        visual_description: String(s.visual_description || ''),
      })),
      summary: String(parsed.summary),
    };
  } catch {
    // If JSON parsing fails, create a basic tutorial from the raw text
    return {
      title: `How to: ${topic}`,
      steps: [
        {
          step_number: 1,
          instruction: raw.slice(0, 500) || 'Tutorial generation produced non-standard output. Review the extracted content directly.',
          visual_description: 'Dark-themed document layout with gold highlighted text sections',
        },
      ],
      summary: `Tutorial generated from extracted content about ${topic}.`,
    };
  }
}
