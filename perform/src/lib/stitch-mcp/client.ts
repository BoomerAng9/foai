/**
 * Stitch MCP Client
 * ====================
 * Wraps the Google Stitch MCP server for AI-driven UI generation.
 * Phase 1 is a stub — real calls go through the Pipedream MCP bridge
 * once credentials land per the Paperform pattern.
 *
 * Env:
 *   STITCH_API_KEY        — direct Stitch API key (if exposed)
 *   PIPEDREAM_API_KEY     — for the MCP bridge path
 *   PIPEDREAM_STITCH_APP  — Pipedream app ID for Stitch
 *   STITCH_MCP_URL        — MCP endpoint (default Google's)
 */

import type { DesignBrief, DesignVariant, StitchGenerationResult } from './types';

const getApiKey = () => process.env.STITCH_API_KEY || '';
const getMcpUrl = () => process.env.STITCH_MCP_URL || 'https://stitch.withgoogle.com/api/mcp/v1';

export function stitchAvailable(): boolean {
  return getApiKey().length > 0;
}

/* ── Low-level MCP tool invocation ── */
async function callTool<T>(tool: string, params: Record<string, unknown>): Promise<T | null> {
  const key = getApiKey();
  if (!key) {
    console.warn(`[stitch-mcp] STITCH_API_KEY not set — ${tool} returned stub`);
    return null;
  }

  try {
    const res = await fetch(`${getMcpUrl()}/tools/${tool}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`[stitch-mcp] ${tool} ${res.status}: ${body.slice(0, 300)}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[stitch-mcp] ${tool} failed:`, err);
    return null;
  }
}

/* ── Public API ── */

export async function generateDesign(
  brief: DesignBrief,
  approach: DesignVariant['approach'] = 'conventional',
): Promise<StitchGenerationResult> {
  const prompt = buildPrompt(brief, approach);
  const result = await callTool<{ design_id: string; preview_url: string }>(
    'stitch_generate_design',
    {
      prompt,
      screen_type: brief.screenType,
      theme: brief.theme,
      sections: brief.sections,
    },
  );

  if (!result) {
    return {
      designId: `stub-${Date.now()}-${approach}`,
      previewUrl: null,
      error: 'Stitch API not configured (Phase 1 stub)',
    };
  }

  return {
    designId: result.design_id,
    previewUrl: result.preview_url,
  };
}

export async function refineDesign(
  designId: string,
  refinementBrief: string,
): Promise<StitchGenerationResult> {
  const result = await callTool<{ design_id: string; preview_url: string }>(
    'stitch_refine',
    { design_id: designId, refinement_prompt: refinementBrief },
  );
  if (!result) {
    return { designId, previewUrl: null, error: 'Stitch refine stub' };
  }
  return { designId: result.design_id, previewUrl: result.preview_url };
}

export async function exportReact(designId: string): Promise<string | null> {
  const result = await callTool<{ code: string }>('stitch_export_react', {
    design_id: designId,
  });
  return result?.code ?? null;
}

export async function exportHtml(designId: string): Promise<string | null> {
  const result = await callTool<{ html: string }>('stitch_export_html', {
    design_id: designId,
  });
  return result?.html ?? null;
}

/* ── Prompt builder: turns a DesignBrief into a Stitch-ready string ── */
function buildPrompt(brief: DesignBrief, approach: DesignVariant['approach']): string {
  const approachNote = {
    conventional: 'Follow industry best practice (PFF / ESPN / On3 inspired). Broadcast-grade, clean hierarchy.',
    contrarian: 'Reject the dominant pattern in this category. Invert the usual layout. Prove the common wisdom is wrong.',
    unexpected: 'Use a cross-domain analogy. Treat this page like it belongs to a completely different industry (e.g. Bloomberg Terminal meets ESPN GameDay).',
  }[approach];

  return [
    `Screen: ${brief.screenType}`,
    `Theme: ${brief.theme}`,
    `Sections: ${brief.sections.join(', ')}`,
    brief.constraints.mustInclude?.length
      ? `Must include: ${brief.constraints.mustInclude.join(', ')}`
      : '',
    brief.constraints.mustAvoid?.length
      ? `Must avoid: ${brief.constraints.mustAvoid.join(', ')}`
      : '',
    brief.vertical ? `Vertical: ${brief.vertical}` : '',
    '',
    'Design approach:',
    approachNote,
    '',
    'Intent:',
    brief.intent,
  ]
    .filter(Boolean)
    .join('\n');
}
