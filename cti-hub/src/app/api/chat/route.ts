import { NextRequest, NextResponse } from 'next/server';
import { tliService } from '@/lib/research/tli-service';
import type { ChatAttachment } from '@/lib/research/source-records';
import { createOpenRouterChatCompletion, getOpenRouterModel } from '@/lib/ai/openrouter';
import {
  type AuthenticatedRequestContext,
  getRequestAuthToken,
  requireAuthenticatedRequest,
} from '@/lib/server-auth';
import { applyRateLimit } from '@/lib/rate-limit';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface GroundingResult {
  contextSections: string[];
  citations: Array<{
    sourceId: string;
    sourceTitle: string;
    excerpt: string;
    pageNumber?: number;
  }>;
}

function getLastUserMessage(messages: ChatMessage[]) {
  const reversed = [...messages].reverse();
  return reversed.find((message) => message.role === 'user')?.content || '';
}

function normalizeMessages(payload: unknown) {
  if (!Array.isArray(payload)) {
    return null;
  }

  const messages = payload.filter((item): item is ChatMessage => {
    if (!item || typeof item !== 'object') {
      return false;
    }

    const candidate = item as Record<string, unknown>;
    return (
      (candidate.role === 'user' || candidate.role === 'assistant' || candidate.role === 'system')
      && typeof candidate.content === 'string'
      && candidate.content.trim().length > 0
    );
  });

  return messages.length > 0 ? messages : null;
}

function normalizeAttachments(payload: unknown) {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.filter((item): item is ChatAttachment => {
    if (!item || typeof item !== 'object') {
      return false;
    }

    const candidate = item as Record<string, unknown>;
    return typeof candidate.id === 'string' && typeof candidate.title === 'string' && typeof candidate.kind === 'string';
  }).slice(0, 10);
}

async function buildGrounding(attachments: ChatAttachment[], userPrompt: string): Promise<GroundingResult> {
  const contextSections: string[] = [];
  const citations: GroundingResult['citations'] = [];

  const uploadedAttachments = attachments.filter((attachment) => attachment.kind === 'upload');
  if (uploadedAttachments.length > 0) {
    const uploadContext = uploadedAttachments
      .map((attachment) => {
        const content = attachment.content?.trim() || '';
        return `Attachment: ${attachment.title}\n${content.slice(0, 12000)}`;
      })
      .join('\n\n');

    contextSections.push(`User attached files:\n${uploadContext}`);
  }

  const notebookGroups = attachments
    .filter((attachment) => attachment.kind === 'notebook-source' && attachment.notebookId)
    .reduce<Record<string, ChatAttachment[]>>((groups, attachment) => {
      const notebookId = attachment.notebookId as string;
      groups[notebookId] = [...(groups[notebookId] || []), attachment];
      return groups;
    }, {});

  for (const [notebookId, sourceAttachments] of Object.entries(notebookGroups)) {
    const titles = sourceAttachments.map((attachment) => attachment.title).join(', ');
    const groundingPrompt = [
      'Answer using only the attached NotebookLM sources listed below.',
      `Attached source titles: ${titles}`,
      `User request: ${userPrompt}`,
      'Return a concise synthesis that can be used as grounding context for another AI assistant.',
    ].join('\n');

    try {
      const notebookResponse = await tliService.research(notebookId, groundingPrompt, 'deep');
      contextSections.push(`NotebookLM grounding from attached sources (${titles}):\n${notebookResponse.answer}`);
      citations.push(...notebookResponse.citations.filter((citation) => {
        return sourceAttachments.some((attachment) => {
          return citation.sourceId === attachment.notebookSourceId || citation.sourceTitle === attachment.title;
        });
      }));
    } catch (error) {
      const fallbackContext = sourceAttachments
        .map((attachment) => {
          const metadataContext = attachment.content || attachment.url || 'Attached NotebookLM source.';
          return `${attachment.title}: ${metadataContext}`;
        })
        .join('\n');
      contextSections.push(`NotebookLM sources attached (fallback metadata):\n${fallbackContext}`);
      console.error('[Chat API] NotebookLM grounding failed:', error);
    }
  }

  return { contextSections, citations };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messages = normalizeMessages(body.messages);
    const attachments = normalizeAttachments(body.attachments);
    const inputMode = body.inputMode === 'voice' ? 'voice' : 'text';
    const authToken = getRequestAuthToken(request);
    const requiresWorkspaceAccess = attachments.some((attachment) => attachment.kind === 'notebook-source');
    let authenticatedContext: AuthenticatedRequestContext | null = null;

    if (requiresWorkspaceAccess || authToken) {
      const authResult = await requireAuthenticatedRequest(request);
      if (!authResult.ok) {
        return authResult.response;
      }

      authenticatedContext = authResult.context;
    }

    const rateLimitResponse = applyRateLimit(request, 'chat', {
      maxRequests: authenticatedContext ? 30 : 10,
      windowMs: 5 * 60 * 1000,
      subject: authenticatedContext?.user.uid || authToken || undefined,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    if (!messages) {
      return NextResponse.json({ error: 'messages is required' }, { status: 400 });
    }

    const userPrompt = getLastUserMessage(messages);
    const grounding = attachments.length > 0 ? await buildGrounding(attachments, userPrompt) : { contextSections: [], citations: [] };

    const finalMessages = grounding.contextSections.length > 0
      ? [
          ...messages,
          {
            role: 'system' as const,
            content: `Use the following attached context when responding. Prefer it over general assumptions.\n\n${grounding.contextSections.join('\n\n')}`,
          },
        ]
      : messages;

    const requestedModel = typeof body.model === 'string' && body.model.trim() ? body.model : getOpenRouterModel(inputMode);

    if (process.env.OPENROUTER_KEY || process.env.OPENAI_API_KEY) {
      const completion = await createOpenRouterChatCompletion({
        messages: finalMessages,
        model: requestedModel,
        inputMode,
        userId: authenticatedContext?.user.uid,
      });

      return NextResponse.json({
        reply: completion.content,
        raw: completion.raw,
        citations: grounding.citations,
        model: completion.model,
        provider: 'OpenRouter',
      });
    }

    // No InsForge AI fallback — OpenRouter or direct API keys are required
    return NextResponse.json({ error: 'No LLM API key configured. Set OPENROUTER_KEY or OPENAI_API_KEY.' }, { status: 503 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal chat API error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
