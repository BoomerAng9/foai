/**
 * Embedding service — Gemini text-embedding-004 via Google AI API.
 * Used for semantic memory search and data source indexing.
 */

const GOOGLE_KEY = process.env.GOOGLE_KEY;

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!GOOGLE_KEY) throw new Error('GOOGLE_KEY not configured');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GOOGLE_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text: text.slice(0, 10000) }] },
      }),
    },
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Embedding generation failed');

  return data.embedding?.values || [];
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map(t => generateEmbedding(t)));
}
