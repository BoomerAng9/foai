/**
 * Data source management — user creates context that ACHEEVY can reference.
 * Upload documents, paste URLs, add text — all embedded for semantic search.
 */

import { sql } from '@/lib/insforge';
import { generateEmbedding } from './embeddings';

export async function createSource(
  userId: string,
  name: string,
  sourceType: string,
  content?: string,
  url?: string,
  filePath?: string,
  metadata?: Record<string, unknown>,
) {
  if (!sql) return null;

  const rows = await sql`
    INSERT INTO data_sources (user_id, name, source_type, content, url, file_path, metadata, status)
    VALUES (${userId}, ${name}, ${sourceType}, ${content ?? null}, ${url ?? null}, ${filePath ?? null}, ${JSON.stringify(metadata || {})}, 'processing')
    RETURNING *
  `;

  const source = rows[0];
  if (!source) return null;

  // Embed in background
  if (content) {
    try {
      const embedding = await generateEmbedding(content.slice(0, 10000));
      const vectorStr = `[${embedding.join(',')}]`;
      await sql`
        UPDATE data_sources SET embedding = ${vectorStr}::vector, status = 'ready', updated_at = NOW()
        WHERE id = ${source.id}
      `;
      source.status = 'ready';
    } catch {
      await sql`UPDATE data_sources SET status = 'failed', updated_at = NOW() WHERE id = ${source.id}`;
      source.status = 'failed';
    }
  }

  return source;
}

export async function getSources(userId: string, limit: number = 50) {
  if (!sql) return [];
  return sql`
    SELECT id, user_id, name, source_type, url, status, metadata, created_at
    FROM data_sources
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}

export async function deleteSource(sourceId: string, userId: string) {
  if (!sql) return;
  await sql`DELETE FROM data_sources WHERE id = ${sourceId} AND user_id = ${userId}`;
}

export async function getSourceContent(sourceId: string, userId: string) {
  if (!sql) return null;
  const rows = await sql`
    SELECT * FROM data_sources WHERE id = ${sourceId} AND user_id = ${userId}
  `;
  return rows[0] ?? null;
}
