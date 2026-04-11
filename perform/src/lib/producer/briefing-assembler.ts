import type { NewsItem, BriefingResult } from './types';
import { generateNoNewsNotice, isNoNewsDay } from './no-news';

export function assembleBriefing(
  userId: number,
  teamName: string,
  items: NewsItem[],
): BriefingResult {
  const now = new Date().toISOString();
  const date = now.split('T')[0];

  if (isNoNewsDay(items)) {
    return {
      userId,
      team: teamName,
      date,
      hasNews: false,
      items: [],
      studyContent: generateNoNewsNotice(teamName, now),
      commercialContent: generateNoNewsNotice(teamName, now),
      sourcesUsed: 0,
      verifiedClaims: 0,
      unverifiedClaims: 0,
      noNewsNotice: generateNoNewsNotice(teamName, now),
    };
  }

  const verified = items.filter(i => i.verified).length;
  const unverified = items.filter(i => !i.verified).length;
  const sources = new Set(items.map(i => i.sourceName));

  const studyContent = buildStudyFormat(teamName, date, items);
  const commercialContent = buildCommercialFormat(teamName, date, items);

  return {
    userId,
    team: teamName,
    date,
    hasNews: true,
    items,
    studyContent,
    commercialContent,
    sourcesUsed: sources.size,
    verifiedClaims: verified,
    unverifiedClaims: unverified,
  };
}

function buildStudyFormat(team: string, date: string, items: NewsItem[]): string {
  const lines: string[] = [
    `# ${team} — Daily Briefing (Study)`,
    `**Date:** ${date}`,
    `**Items:** ${items.length}`,
    ``,
  ];

  for (const item of items) {
    const verifiedTag = item.verified ? '[VERIFIED]' : '[UNVERIFIED]';
    lines.push(`## ${item.headline} ${verifiedTag}`);
    lines.push(``);
    lines.push(item.summary);
    lines.push(``);
    lines.push(`**Source:** ${item.sourceName} — ${item.sourceUrl}`);
    lines.push(`**Published:** ${item.publishedAt}`);
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
  }

  return lines.join('\n');
}

function buildCommercialFormat(team: string, date: string, items: NewsItem[]): string {
  const lines: string[] = [
    `# ${team} Daily Intelligence`,
    `*${date}*`,
    ``,
  ];

  for (const item of items) {
    lines.push(`### ${item.headline}`);
    lines.push(``);
    lines.push(item.summary);
    lines.push(``);
  }

  lines.push(`---`);
  const verifiedCount = items.filter(i => i.verified).length;
  const sourceCount = new Set(items.map(i => i.sourceName)).size;
  const verificationNote = verifiedCount === items.length
    ? 'All claims verified.'
    : `${verifiedCount} of ${items.length} claims verified.`;
  lines.push(`*${items.length} items from ${sourceCount} sources. ${verificationNote}*`);

  return lines.join('\n');
}
