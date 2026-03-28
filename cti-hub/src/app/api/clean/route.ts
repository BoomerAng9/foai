import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const LUC_URL = process.env.LUC_URL || 'http://localhost:8081';

interface CleanRequest {
  raw_data: string;
  columns: string[];
  context?: string;
  quality?: string;  // "best" | "good" | "fast" | "cheapest"
}

async function pickModel(quality?: string): Promise<string> {
  try {
    const res = await fetch(`${LUC_URL}/pick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'scrape_clean', quality: quality || 'fast' }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.model;
    }
  } catch {
    // LUC unavailable — use default
  }
  return 'deepseek/deepseek-v3.2';
}

async function recordUsage(model: string, tokensIn: number, tokensOut: number) {
  try {
    await fetch(`${LUC_URL}/record/llm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: 'deploy-clean',
        model,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
      }),
    });
  } catch {
    // LUC unavailable — skip metering
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 503 });
    }

    const { raw_data, columns, context, quality } = (await request.json()) as CleanRequest;

    if (!raw_data || !columns || columns.length === 0) {
      return NextResponse.json({ error: 'raw_data and columns[] required' }, { status: 400 });
    }

    // LUC picks the optimal model for this task
    const model = await pickModel(quality);

    const prompt = `You are a data extraction and cleaning agent. Extract structured data from the raw text below.

OUTPUT FORMAT: Return ONLY a valid JSON array of objects. Each object must have exactly these keys: ${columns.map(c => `"${c}"`).join(', ')}.
If a value is not found, use null. Do not add extra keys. Do not wrap in markdown code fences.

${context ? `CONTEXT: ${context}\n` : ''}
COLUMNS: ${columns.join(', ')}

RAW DATA:
${raw_data.slice(0, 30000)}`;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'X-OpenRouter-Title': 'The Deploy Platform',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });

    const completion = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: completion.error?.message || 'OpenRouter failed' }, { status: 502 });
    }

    // Record usage in LUC
    const usage = completion.usage;
    if (usage) {
      await recordUsage(model, usage.prompt_tokens || 0, usage.completion_tokens || 0);
    }

    let rawText = completion.choices?.[0]?.message?.content || '';

    if (rawText.includes('```json')) rawText = rawText.split('```json')[1].split('```')[0];
    else if (rawText.includes('```')) rawText = rawText.split('```')[1].split('```')[0];

    let rows: Record<string, unknown>[];
    try {
      const parsed = JSON.parse(rawText.trim());
      rows = Array.isArray(parsed) ? parsed : parsed.data || parsed.rows || [parsed];
    } catch {
      return NextResponse.json({ error: 'LLM returned invalid JSON', raw: rawText }, { status: 422 });
    }

    return NextResponse.json({
      rows,
      columns,
      total: rows.length,
      model: completion.model || model,
      cost: usage ? {
        tokens_in: usage.prompt_tokens,
        tokens_out: usage.completion_tokens,
      } : null,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Clean API error' },
      { status: 500 },
    );
  }
}
