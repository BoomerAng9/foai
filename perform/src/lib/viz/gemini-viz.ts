/**
 * Per|Form Generative Visualization — Gemini + Vega-Lite
 * =========================================================
 * Keeps the entire viz stack inside the GCP / Vertex AI ecosystem.
 * Gemini 3 emits Vega-Lite JSON specs for any data payload; client
 * renders with react-vega. No vendor lock-in: Vega-Lite is the
 * industry-standard declarative viz grammar (Olocip-style dashboards,
 * Observable, Apple, Uber, etc. all use it).
 *
 * Why Vega-Lite instead of a closed generative-UI product:
 *   - Open JSON schema, no proprietary format
 *   - Renders deterministically from the spec (no AI at render time)
 *   - Composable: one Gemini call per viz, spec cached per player
 *   - Gemini 3 is excellent at structured JSON output
 *
 * Env (runtime-safe getters):
 *   GEMINI_API_KEY      — AI Studio key
 *   GEMINI_VIZ_MODEL    — override model (default gemini-3-pro)
 *   VERTEX_PROJECT_ID   — optional, if switching to true Vertex SDK
 */

const getApiKey = () => process.env.GEMINI_API_KEY || '';
const getModel = () => process.env.GEMINI_VIZ_MODEL || 'gemini-3-pro-preview';

export interface VegaLiteSpec {
  $schema?: string;
  title?: string | Record<string, unknown>;
  width?: number | string;
  height?: number | string;
  data: { values: Record<string, unknown>[] } | { url: string };
  mark?: string | Record<string, unknown>;
  encoding?: Record<string, unknown>;
  layer?: unknown[];
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

interface GenerateVizInput {
  intent: string;
  data: Record<string, unknown>;
  vizType: 'career_arc' | 'pillar_radar' | 'medical_timeline' | 'comp_overlay' | 'dashboard';
}

/* ── Per|Form default theme (dark, gold accent) ── */
const PERFORM_THEME = {
  background: '#0A0A0C',
  title: { color: '#FFFFFF', font: 'Outfit', fontSize: 16, fontWeight: 700 },
  axis: {
    labelColor: '#B8B8C0',
    titleColor: '#E8D4A0',
    domainColor: '#333340',
    gridColor: '#1A1A22',
    labelFont: 'JetBrains Mono',
    titleFont: 'Outfit',
  },
  legend: { labelColor: '#B8B8C0', titleColor: '#E8D4A0' },
  view: { stroke: 'transparent' },
  range: {
    category: ['#D4A853', '#8B6914', '#C89BFF', '#3FD3FF', '#FF6B2B'],
    ramp: ['#8B6914', '#D4A853', '#FFD700', '#FFF4B8'],
  },
};

/* ── Low-level Gemini call ── */
async function callGemini(prompt: string): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[gemini-viz] GEMINI_API_KEY not set');
    return null;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${getModel()}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          maxOutputTokens: 4096,
        },
      }),
    });

    if (!res.ok) {
      console.warn(`[gemini-viz] ${res.status}: ${await res.text().catch(() => '')}`);
      return null;
    }

    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || null;
  } catch (err) {
    console.warn('[gemini-viz] fetch failed:', err);
    return null;
  }
}

/* ── Generate a Vega-Lite spec for a visualization ── */
export async function generateVegaLiteSpec(
  input: GenerateVizInput,
): Promise<VegaLiteSpec | null> {
  const systemContext = `You are a data visualization expert generating Vega-Lite v5 JSON specs for a premium sports analytics platform called Per|Form. Produce ONLY valid Vega-Lite JSON — no markdown, no explanation. The spec must be self-contained with inline data.values. Use the Per|Form dark theme: background #0A0A0C, gold accent #D4A853, silver #B8B8C0, white text. Axes use JetBrains Mono labels and Outfit titles. Make it broadcast-quality.`;

  const prompt = `${systemContext}

INTENT: ${input.intent}

VISUALIZATION TYPE: ${input.vizType}

DATA:
${JSON.stringify(input.data, null, 2)}

Return ONLY the Vega-Lite v5 JSON spec. Include the data inline in data.values. Apply the Per|Form dark theme via the config block.`;

  const raw = await callGemini(prompt);
  if (!raw) return null;

  try {
    const spec = JSON.parse(raw) as VegaLiteSpec;
    // Merge default theme if not already set
    spec.config = { ...PERFORM_THEME, ...(spec.config || {}) };
    if (!spec.$schema) spec.$schema = 'https://vega.github.io/schema/vega-lite/v5.json';
    return spec;
  } catch (err) {
    console.warn('[gemini-viz] Gemini returned non-JSON:', err);
    return null;
  }
}

/* ── High-level helpers per Per|Form use case ── */

export async function renderCareerArcChart(payload: {
  playerName: string;
  position: string;
  expectedCareerYears: number;
  peakWindow: [number, number];
  comps: Array<{ name: string; careerYears: number; peakYears: number; outcome: string }>;
}): Promise<VegaLiteSpec | null> {
  return generateVegaLiteSpec({
    intent: `A career arc line chart for ${payload.playerName} (${payload.position}) showing projected production (y-axis, 0-100) across career years (x-axis, 0 to ${payload.expectedCareerYears + 2}). Overlay each historical comp as a separate line with different color. Highlight the peak window (years ${payload.peakWindow[0]}-${payload.peakWindow[1]}) with a shaded band. Add a dashed vertical line at year ${payload.expectedCareerYears} labeled "projected exit".`,
    data: payload,
    vizType: 'career_arc',
  });
}

export async function renderPillarRadarChart(payload: {
  playerName: string;
  actualPillars: { gamePerformance: number; athleticism: number; intangibles: number };
  cleanPillars: { gamePerformance: number; athleticism: number; intangibles: number };
}): Promise<VegaLiteSpec | null> {
  return generateVegaLiteSpec({
    intent: `A three-pillar radar/polar chart for ${payload.playerName} showing two overlapping shapes: actual (filled gold) and clean/hypothetical (dotted silver outline). Three axes: Game Performance, Athleticism, Intangibles, all scaled 0-100. Shows where the medical flag carved into the actual vs what it could have been.`,
    data: payload,
    vizType: 'pillar_radar',
  });
}

export async function renderMedicalTimelineChart(payload: {
  playerName: string;
  events: Array<{ year: number; event: string; severity: string; recovered: boolean }>;
  currentStatus: string;
}): Promise<VegaLiteSpec | null> {
  return generateVegaLiteSpec({
    intent: `A horizontal timeline for ${payload.playerName} medical events. X-axis is year. Each event is a colored dot sized by severity (minor/moderate/major/severe). Recovery is shown as a green tick bracket after each dot. Current status "${payload.currentStatus}" labeled at the right end.`,
    data: payload,
    vizType: 'medical_timeline',
  });
}

export async function renderCompOverlayChart(payload: {
  playerName: string;
  playerGrade: number;
  comps: Array<{ name: string; peakGrade: number; careerYears: number; outcome: string }>;
}): Promise<VegaLiteSpec | null> {
  return generateVegaLiteSpec({
    intent: `A scatter/bubble chart comparing ${payload.playerName} (gold star marker) to historical comps (bubbles). X-axis: peak grade. Y-axis: career years. Bubble size: pro bowls. Color: outcome tier. Shows where the player lands in the historical landscape.`,
    data: payload,
    vizType: 'comp_overlay',
  });
}

/* ── Availability check ── */
export function vizAvailable(): boolean {
  return getApiKey().length > 0;
}
