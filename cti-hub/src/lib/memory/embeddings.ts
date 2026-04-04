/**
 * Embedding service — Gemini text-embedding via Google AI API.
 * Used for semantic memory search and data source indexing.
 */

const GOOGLE_KEY = process.env.GOOGLE_KEY;

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!GOOGLE_KEY) return [];

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-exp-03-07:embedContent?key=${GOOGLE_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text: text.slice(0, 10000) }] },
        }),
        signal: AbortSignal.timeout(5000),
      },
    );

    const data = await res.json();
    if (!res.ok) {
      console.warn('[Embeddings] API error:', data.error?.message);
      return [];
    }

    return data.embedding?.values || [];
  } catch (err) {
    console.warn('[Embeddings] Failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map(t => generateEmbedding(t)));
}
