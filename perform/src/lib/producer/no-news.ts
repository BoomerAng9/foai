import type { NewsItem } from './types';

export function isNoNewsDay(items: NewsItem[]): boolean {
  return items.length === 0;
}

export function generateNoNewsNotice(teamName: string, lastCheckTimestamp: string): string {
  const lastCheck = new Date(lastCheckTimestamp);
  const formatted = lastCheck.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  return [
    `No significant developments for the ${teamName} overnight.`,
    ``,
    `Your War Room data is current as of ${formatted}.`,
    `Monitoring continues — you'll be notified the moment news breaks.`,
  ].join('\n');
}

export function generateLowActivityNotice(teamName: string, itemCount: number): string {
  return `Low activity day for the ${teamName} — ${itemCount} minor update${itemCount === 1 ? '' : 's'}.`;
}
