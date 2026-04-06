/**
 * C1 Thesys — Generative UI client (direct API, no broken SDK)
 * ===============================================================
 * OpenAI-compatible chat completions API. Returns content wrapped
 * in `<content thesys="true">{ ... HTML-entity-encoded JSON tree ... }</content>`
 *
 * The JSON tree uses Crayon UI primitives (Card, Header, MiniCard,
 * DataTile, Tag, Icon, List, SectionBlock, BarChartV2, CalloutV2,
 * etc.) — we render them ourselves with our own broadcast theme
 * via components/c1/C1Renderer.tsx.
 *
 * Env (runtime-safe):
 *   C1_API_KEY  — Thesys API key (in openclaw secrets)
 *   C1_MODEL    — override model (default sonnet-4.5/v-20251230)
 *   C1_BASE_URL — override base url
 */

const getApiKey = () => process.env.C1_API_KEY || '';
const getModel = () => process.env.C1_MODEL || 'c1/anthropic/claude-sonnet-4.5/v-20251230';
const getBaseUrl = () => process.env.C1_BASE_URL || 'https://api.thesys.dev/v1/embed';

export interface C1Request {
  systemPrompt: string;
  userPrompt: string;
  contextData?: Record<string, unknown>;
  temperature?: number;
}

export interface C1Spec {
  /** The decoded JSON component tree (root has shape { component: {...} }) */
  spec: unknown;
  /** Raw response for debug */
  raw?: unknown;
}

/* ── Decode the C1 wrapper into a JSON spec object ── */
function decodeC1Content(content: string): unknown | null {
  try {
    const inner = content
      .replace(/<content[^>]*>/g, '')
      .replace(/<\/content>/g, '')
      .trim();
    // Decode HTML entities
    const decoded = inner
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");
    return JSON.parse(decoded);
  } catch (err) {
    console.warn('[c1-thesys] decode failed:', err);
    return null;
  }
}

/* ── Low-level call ── */
export async function callC1(req: C1Request): Promise<C1Spec | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[c1-thesys] C1_API_KEY not set');
    return null;
  }

  try {
    const userMessage = req.contextData
      ? `${req.userPrompt}\n\nDATA:\n${JSON.stringify(req.contextData, null, 2)}`
      : req.userPrompt;

    const res = await fetch(`${getBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: getModel(),
        messages: [
          { role: 'system', content: req.systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: req.temperature ?? 0.4,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.warn(`[c1-thesys] ${res.status}: ${err.slice(0, 300)}`);
      return null;
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      console.warn('[c1-thesys] empty content');
      return null;
    }
    const spec = decodeC1Content(content);
    if (!spec) return null;
    return { spec, raw: json };
  } catch (err) {
    console.warn('[c1-thesys] fetch failed:', err);
    return null;
  }
}

/* ── High-level helpers ── */

const PERFORM_BROADCAST_SYSTEM = `You are the visual layer for Per|Form, a premium sports data intelligence platform competing with PFF, ESPN, On3, and 247Sports. You generate broadcast-grade UI specs using Crayon UI components.

Visual sensibility:
- Premium gaming-card energy meets ESPN broadcast graphics
- Bold typography, large tabular numbers, clear hierarchy
- Use Tag with variant="success" for positive grades, "warning" for cautions, "danger" for risk
- Use BarChartV2 for pillar comparisons
- Use SectionBlock to group dense info
- Use CalloutV2 for medical risk callouts
- DataTile for big-number metrics
- Always include icons from gaming/sports/medical categories where appropriate

NEVER use placeholder data or invent stats — use only what's provided.`;

export async function generatePlayerCardSpec(payload: {
  name: string;
  position: string;
  school: string;
  performRank: number;
  consensusRank: number;
  projectedRound: number;
  trend: string;
  gradeActual: number;
  gradeLetter: string;
  gradeClean: number;
  medicalDelta: number;
  pillars: { gp: number; ath: number; int: number };
  pillarsClean: { gp: number; ath: number; int: number };
  medical: { severity: string; currentStatus: string; notes: string; comps?: string[] } | null;
  longevity: {
    expectedYears: number;
    peakWindow: [number, number];
    declineRisk: string;
    outlook: string;
    upside?: { name: string; careerYears: number; proBowls: number; outcome: string; note: string } | null;
    baseline?: { name: string; careerYears: number; proBowls: number; outcome: string; note: string } | null;
    downside?: { name: string; careerYears: number; proBowls: number; outcome: string; note: string } | null;
  };
}): Promise<C1Spec | null> {
  return callC1({
    systemPrompt: PERFORM_BROADCAST_SYSTEM,
    userPrompt: `Generate a complete forecast deep-dive UI for ${payload.name}. Include in this order:

1. Header: name, position + school subtitle
2. MiniCardBlock with stat tiles: TIE Grade ${payload.gradeActual} (${payload.gradeLetter}), Per|Form Rank #${payload.performRank}, Projected Round R${payload.projectedRound}
3. SectionBlock "Performance Pillars" with a BarChartV2 showing the three pillar values vs the clean (no medical) values
4. ${payload.medical ? `CalloutV2 with variant="danger" titled "Medical Flag — ${payload.medical.severity}" describing the injury and listing historical comps as TagBlock` : ''}
5. SectionBlock "Longevity Forecast" with DataTiles for expected career years, peak window, decline risk
6. SectionBlock "Historical Comps" with three MiniCards for upside/baseline/downside with name, career years, pro bowls, outcome tag, scout note as TextContent

Use the data verbatim. Make it broadcast quality.`,
    contextData: payload,
  });
}

export function c1Available(): boolean {
  return getApiKey().length > 0;
}
