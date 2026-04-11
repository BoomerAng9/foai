/**
 * Self-hosted Gemma client — Vertex AI endpoint integration.
 *
 * Connects to a Gemma model deployed on Vertex AI Model Garden
 * in the ai-managed-services GCP project. Bypasses OpenRouter
 * entirely — no third-party reliability issues.
 *
 * Requires GEMMA_ENDPOINT env var (Vertex AI prediction endpoint URL).
 * Falls back gracefully if not configured.
 */

const GEMMA_ENDPOINT = process.env.GEMMA_ENDPOINT || '';
const GCP_PROJECT = 'ai-managed-services';
const GCP_REGION = 'us-central1';

// Internal model identifier — never expose in user-facing text.
const GEMMA_MODEL_ID = 'gemma-4-26b-a4b-it';

interface GemmaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface GemmaChatResult {
  content: string;
  model: string;
}

/**
 * Get a Google Cloud access token using application default credentials.
 * On Cloud Run / GCE this uses the metadata server; locally requires
 * `gcloud auth application-default login` or GOOGLE_APPLICATION_CREDENTIALS.
 */
async function getAccessToken(): Promise<string> {
  // 1. Try GOOGLE_APPLICATION_CREDENTIALS / ADC via metadata server
  //    Cloud Run and GCE instances have this available automatically.
  try {
    const metadataRes = await fetch(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
      { headers: { 'Metadata-Flavor': 'Google' } }
    );
    if (metadataRes.ok) {
      const data = await metadataRes.json();
      return data.access_token;
    }
  } catch {
    // Not on GCE/Cloud Run — fall through
  }

  // 2. Fall back to gcloud CLI token (dev environments)
  try {
    const { execSync } = await import('child_process');
    const token = execSync('gcloud auth print-access-token', {
      encoding: 'utf-8',
      timeout: 10_000,
    }).trim();
    if (token) return token;
  } catch {
    // gcloud not available
  }

  throw new Error(
    'Cannot obtain GCP access token. Ensure Application Default Credentials ' +
    'are configured or run `gcloud auth application-default login`.'
  );
}

/**
 * Build the Vertex AI prompt from a messages array.
 * Gemma uses a simple <start_of_turn>role\ncontent<end_of_turn> format.
 */
function buildPrompt(messages: GemmaMessage[]): string {
  const parts: string[] = [];

  for (const msg of messages) {
    const role = msg.role === 'assistant' ? 'model' : msg.role === 'system' ? 'user' : 'user';
    parts.push(`<start_of_turn>${role}\n${msg.content}<end_of_turn>`);
  }

  // Open the model turn so Gemma generates the response
  parts.push('<start_of_turn>model\n');
  return parts.join('\n');
}

/**
 * Single-turn chat completion via self-hosted Gemma on Vertex AI.
 *
 * Matches the same interface as geminiChatCompletion() so callers
 * can swap providers without changing shape.
 */
export async function gemmaChatCompletion(input: {
  messages: GemmaMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<GemmaChatResult> {
  // ── Guard: endpoint not configured ──────────────────────────────
  if (!GEMMA_ENDPOINT) {
    return {
      content: '[Gemma endpoint not configured — GEMMA_ENDPOINT env var is missing]',
      model: 'unavailable',
    };
  }

  const accessToken = await getAccessToken();
  const prompt = buildPrompt(input.messages);

  // Vertex AI rawPredict / predict payload for text generation models
  const payload = {
    instances: [
      {
        prompt,
      },
    ],
    parameters: {
      maxOutputTokens: input.maxTokens || 2000,
      temperature: input.temperature ?? 0.4,
      topP: 0.95,
      topK: 40,
    },
  };

  const response = await fetch(GEMMA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown');
    throw new Error(
      `Gemma endpoint returned ${response.status}: ${errorBody}`
    );
  }

  const data = await response.json();

  // Vertex AI prediction response shape:
  // { predictions: [{ content: "..." }] }  or  { predictions: ["..."] }
  const predictions = data.predictions;
  if (!predictions || predictions.length === 0) {
    throw new Error('Gemma returned no predictions');
  }

  const raw = typeof predictions[0] === 'string'
    ? predictions[0]
    : predictions[0].content || predictions[0].output || '';

  const content = raw.trim();
  if (!content) {
    throw new Error('Gemma returned an empty response');
  }

  // Strip any trailing <end_of_turn> token the model may emit
  const cleaned = content.replace(/<end_of_turn>\s*$/, '').trim();

  return {
    content: cleaned,
    model: GEMMA_MODEL_ID,
  };
}
