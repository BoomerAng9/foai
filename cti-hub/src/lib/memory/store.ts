/**
 * Memory store — write conversations, messages, and memories to Neon.
 * Automatically embeds important content for future semantic recall.
 */

import { sql } from '@/lib/insforge';
import { generateEmbedding } from './embeddings';

// ─── Conversations ──────────────────────────────────────────

export async function createConversation(userId: string, title?: string) {
  if (!sql) return null;
  const rows = await sql`
    INSERT INTO conversations (user_id, title)
    VALUES (${userId}, ${title || 'New Conversation'})
    RETURNING *
  `;
  return rows[0] ?? null;
}

export async function getConversations(userId: string, limit: number = 50) {
  if (!sql) return [];
  return sql`
    SELECT * FROM conversations
    WHERE user_id = ${userId} AND status = 'active'
    ORDER BY updated_at DESC
    LIMIT ${limit}
  `;
}

export async function getConversation(conversationId: string, userId: string) {
  if (!sql) return null;
  const rows = await sql`
    SELECT * FROM conversations WHERE id = ${conversationId} AND user_id = ${userId}
  `;
  return rows[0] ?? null;
}

export async function updateConversationTitle(conversationId: string, title: string) {
  if (!sql) return;
  await sql`
    UPDATE conversations SET title = ${title}, updated_at = NOW()
    WHERE id = ${conversationId}
  `;
}

export async function archiveConversation(conversationId: string, userId: string) {
  if (!sql) return;
  await sql`
    UPDATE conversations SET status = 'archived', updated_at = NOW()
    WHERE id = ${conversationId} AND user_id = ${userId}
  `;
}

// ─── Messages ───────────────────────────────────────────────

export async function addMessage(
  conversationId: string,
  userId: string,
  role: string,
  content: string,
  agentName?: string,
  metadata?: Record<string, unknown>,
) {
  if (!sql) return null;

  const rows = await sql`
    INSERT INTO messages (conversation_id, user_id, role, agent_name, content, metadata)
    VALUES (${conversationId}, ${userId}, ${role}, ${agentName ?? null}, ${content}, ${JSON.stringify(metadata || {})})
    RETURNING *
  `;

  // Touch conversation updated_at
  await sql`UPDATE conversations SET updated_at = NOW() WHERE id = ${conversationId}`;

  return rows[0] ?? null;
}

export async function getMessages(conversationId: string, limit: number = 100) {
  if (!sql) return [];
  return sql`
    SELECT * FROM messages
    WHERE conversation_id = ${conversationId}
    ORDER BY created_at ASC
    LIMIT ${limit}
  `;
}

// ─── Semantic Memory ────────────────────────────────────────

export async function storeMemory(
  userId: string,
  content: string,
  summary?: string,
  sourceType: string = 'conversation',
  sourceId?: string,
) {
  if (!sql) return null;

  let embedding: number[] | null = null;
  try {
    embedding = await generateEmbedding(content);
  } catch {
    // Embedding failed — store without vector (won't be searchable)
  }

  const vectorStr = embedding ? `[${embedding.join(',')}]` : null;

  const rows = await sql`
    INSERT INTO memory (user_id, content, summary, embedding, source_type, source_id)
    VALUES (${userId}, ${content}, ${summary ?? null}, ${vectorStr}::vector, ${sourceType}, ${sourceId ?? null})
    RETURNING id, user_id, content, summary, source_type, created_at
  `;

  return rows[0] ?? null;
}

// ─── Auto-summarize + memorize ──────────────────────────────

export async function memorizeConversationTurn(
  userId: string,
  conversationId: string,
  userMessage: string,
  acheevyResponse: string,
) {
  // Store a condensed memory of this exchange for future recall
  const combined = `User asked: ${userMessage.slice(0, 500)}\nACHEEVY responded: ${acheevyResponse.slice(0, 500)}`;
  const summary = `${userMessage.slice(0, 100)}...`;

  await storeMemory(userId, combined, summary, 'conversation', conversationId);
}
