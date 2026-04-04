/**
 * Memory recall — semantic search across conversations, memory, and data sources.
 * Uses pgvector cosine similarity against Gemini embeddings.
 * Gracefully returns empty if embeddings or DB fail.
 */

import { sql } from '@/lib/insforge';
import { generateEmbedding } from './embeddings';

interface RecallResult {
  id: string;
  content: string;
  summary: string | null;
  source_type: string;
  similarity: number;
  created_at: string;
}

export async function recallMemory(
  userId: string,
  query: string,
  limit: number = 5,
): Promise<RecallResult[]> {
  if (!sql) return [];
  try {
    const embedding = await generateEmbedding(query);
    if (embedding.length === 0) return [];
    const vectorStr = `[${embedding.join(',')}]`;
    const rows = await sql`
      SELECT id, content, summary, source_type, created_at,
             1 - (embedding <=> ${vectorStr}::vector) as similarity
      FROM memory
      WHERE user_id = ${userId}
      ORDER BY embedding <=> ${vectorStr}::vector
      LIMIT ${limit}
    `;
    return rows as unknown as RecallResult[];
  } catch {
    return [];
  }
}

export async function recallSources(
  userId: string,
  query: string,
  limit: number = 5,
): Promise<RecallResult[]> {
  if (!sql) return [];
  try {
    const embedding = await generateEmbedding(query);
    if (embedding.length === 0) return [];
    const vectorStr = `[${embedding.join(',')}]`;
    const rows = await sql`
      SELECT id, content, name as summary, source_type, created_at,
             1 - (embedding <=> ${vectorStr}::vector) as similarity
      FROM data_sources
      WHERE user_id = ${userId} AND status = 'ready'
      ORDER BY embedding <=> ${vectorStr}::vector
      LIMIT ${limit}
    `;
    return rows as unknown as RecallResult[];
  } catch {
    return [];
  }
}

export async function recallAll(
  userId: string,
  query: string,
  limit: number = 10,
): Promise<RecallResult[]> {
  try {
    const [memories, sources] = await Promise.all([
      recallMemory(userId, query, limit),
      recallSources(userId, query, limit),
    ]);
    return [...memories, ...sources]
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  } catch {
    return [];
  }
}
