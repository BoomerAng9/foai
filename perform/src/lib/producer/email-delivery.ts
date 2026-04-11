/**
 * Email delivery for scheduled briefings via Resend.
 */

import type { BriefingResult } from './types';
import type { DocumentFormat } from '@/lib/podcasters/delivery-preferences';

interface EmailResult {
  sent: boolean;
  messageId?: string;
  error?: string;
}

export async function deliverBriefingEmail(
  to: string,
  briefing: BriefingResult,
  format: DocumentFormat,
): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, error: 'RESEND_API_KEY not configured' };
  }

  const content = format === 'study'
    ? briefing.studyContent
    : format === 'commercial'
      ? briefing.commercialContent
      : briefing.studyContent;

  const subject = briefing.hasNews
    ? `${briefing.team} — Daily Briefing (${briefing.items.length} items)`
    : `${briefing.team} — No News Today`;

  const html = markdownToHtml(content);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.PRODUCER_FROM_EMAIL || 'producer@perform.foai.cloud',
        to: [to],
        subject,
        html,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return { sent: false, error: `Resend ${res.status}: ${err.slice(0, 200)}` };
    }

    const json = await res.json();
    return { sent: true, messageId: json.id };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : 'email delivery failed' };
  }
}

function markdownToHtml(markdown: string): string {
  return markdown
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">')
    .replace(/$/, '</div>');
}
