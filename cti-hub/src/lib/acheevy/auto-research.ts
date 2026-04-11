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

// ── Hermes Integration (LearnAng) ──────────────────────────────────────────

const HERMES_URL = process.env.HERMES_URL || '';

interface HermesEvaluation {
  evaluation_id: string;
  ecosystem_score: number;
  agents_evaluated: number;
  directives_posted: number;
  tenant_id: string;
  timestamp: string;
}

/**
 * Trigger a Hermes Deep Think evaluation cycle.
 * Hermes evaluates all Boomer_Angs, scores them, and posts improvement directives.
 */
export async function triggerHermesEvaluation(
  tenantId: string = 'cti',
  evalType: string = 'auto',
  multiModel: boolean = false,
): Promise<HermesEvaluation | null> {
  try {
    const res = await fetch(
      `${HERMES_URL}/evaluate/trigger?tenant_id=${tenantId}&eval_type=${evalType}&multi_model=${multiModel}`,
      {
        method: 'POST',
        headers: { 'Content-Length': '0' },
        signal: AbortSignal.timeout(90000), // 90s — evaluations can be slow
      }
    );
    if (!res.ok) {
      console.error(`[AutoResearch] Hermes returned ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error('[AutoResearch] Hermes evaluation failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Get recent Hermes evaluations for trend analysis.
 */
export async function getHermesHistory(limit: number = 5): Promise<HermesEvaluation[]> {
  try {
    const res = await fetch(`${HERMES_URL}/history/recent?limit=${limit}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/**
 * Full evaluation cycle: local evaluation + Hermes Deep Think.
 * Called automatically every 10th turn or on manual trigger.
 */
export async function runFullEvaluation(
  taskType: string,
  input: string,
  output: string,
  context?: string,
): Promise<{ local: EvaluationResult; hermes: HermesEvaluation | null }> {
  // Run local evaluation and Hermes in parallel
  const [local, hermes] = await Promise.all([
    evaluateOutput(taskType, input, output, context),
    triggerHermesEvaluation('cti', 'auto', false),
  ]);

  return { local, hermes };
}
