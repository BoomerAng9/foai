/**
 * AutoResearch — internal continuous improvement engine.
 *
 * Wired into the Harness 2.0 evaluator loop:
 *   After significant tasks, AutoResearch analyzes output quality,
 *   compares against best practices, and feeds improvement directives
 *   back to the fleet. Users never see this — it runs invisibly.
 *
 * Triggers:
 *   - After every 10th conversation turn
 *   - After video generation completes
 *   - After data pipeline exports
 *   - On manual trigger from owner dashboard
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;
const LUC_URL = process.env.LUC_URL || 'http://localhost:8081';

interface EvaluationResult {
  score: number;         // 0-100
  grade: string;         // A, B+, B, C, F
  findings: string[];
  improvements: string[];
  auto_applied: boolean;
}

export async function evaluateOutput(
  taskType: string,
  input: string,
  output: string,
  context?: string,
): Promise<EvaluationResult> {
  if (!OPENROUTER_API_KEY) {
    return { score: 0, grade: 'N/A', findings: ['No LLM key'], improvements: [], auto_applied: false };
  }

  // Use cheapest model for evaluation
  let model = 'openai/gpt-5.4-nano';
  try {
    const res = await fetch(`${LUC_URL}/pick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'evaluation', quality: 'fast' }),
    });
    if (res.ok) model = (await res.json()).model;
  } catch {}

  const prompt = `You are a quality evaluator for an AI operations platform. Evaluate this output.

TASK TYPE: ${taskType}
INPUT: ${input.slice(0, 1000)}
OUTPUT: ${output.slice(0, 2000)}
${context ? `CONTEXT: ${context}` : ''}

Score 0-100 and grade (A/B+/B/C/F). List specific findings and improvements.
Return JSON: { "score": number, "grade": string, "findings": string[], "improvements": string[] }`;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });

    const completion = await res.json();
    let raw = completion.choices?.[0]?.message?.content || '';
    if (raw.includes('```json')) raw = raw.split('```json')[1].split('```')[0];
    else if (raw.includes('```')) raw = raw.split('```')[1].split('```')[0];

    const parsed = JSON.parse(raw.trim());
    return {
      score: parsed.score || 0,
      grade: parsed.grade || 'N/A',
      findings: parsed.findings || [],
      improvements: parsed.improvements || [],
      auto_applied: false,
    };
  } catch {
    return { score: 0, grade: 'N/A', findings: ['Evaluation failed'], improvements: [], auto_applied: false };
  }
}

// Counter for auto-triggering evaluation
let _turnCounter = 0;

export function shouldAutoEvaluate(): boolean {
  _turnCounter++;
  return _turnCounter % 10 === 0; // Every 10th turn
}

export function resetCounter() {
  _turnCounter = 0;
}
