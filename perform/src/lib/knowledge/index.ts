/**
 * TIE Knowledge Library
 * ========================
 * Universal knowledge base that feeds the TIE engine across every
 * vertical (Per|Form sports, OpenKlassAI workforce, Deploy Platform
 * agents). Each source has a tag + searchable text + metadata.
 *
 * Current sources:
 *   - mastering-nil — "Mastering the NIL: Essential Guide for
 *     Student-Athletes and Parents" (106 pages, 124k chars). The
 *     user's own book. Authoritative source for NIL, Transfer
 *     Portal, revenue sharing, financial literacy.
 *   - openklassai-courses — ~700 courses across IT Accredited,
 *     Career Development, HR, Internet Marketing, Sales, Small
 *     Business, Supervisors, Training, Workplace Essentials,
 *     Computer Fundamentals, MS Office variants.
 *
 * Expected to grow — user is adding more sources.
 */

import fs from 'fs';
import path from 'path';

export type KnowledgeSourceId = 'mastering-nil' | 'openklassai-courses';
export type KnowledgeVertical = 'athletics' | 'workforce' | 'agents' | 'universal';

export interface KnowledgeSource {
  id: KnowledgeSourceId;
  title: string;
  vertical: KnowledgeVertical;
  description: string;
  filePath: string;
  format: 'text' | 'json';
}

export const KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  {
    id: 'mastering-nil',
    title: 'Mastering the NIL: Essential Guide for Student-Athletes and Parents',
    vertical: 'athletics',
    description:
      'Full 106-page canonical guide by ACHIEVEMOR. Covers state-by-state NIL regulations, the Mikey Williams case, contract basics, evaluating offers, income potential, earnings limits, high school NIL, contract guarantees and risks, NCAA + Title IX compliance, staying informed on developments, and testing-your-knowledge modules for athletes, parents, and managers.',
    filePath: path.join(process.cwd(), 'src/lib/knowledge/mastering-nil-raw.txt'),
    format: 'text',
  },
  {
    id: 'openklassai-courses',
    title: 'OpenKlassAI Course Catalog (Cyber, IT, Soft Skills)',
    vertical: 'workforce',
    description:
      '16-sheet catalog covering IT Accredited (CND, CEH, CEH-Master), Career Development, Human Resources, Internet Marketing, Sales & Marketing, Small Business Training, Supervisors & Managers, Train the Trainers, Workplace Essentials, Computer Fundamentals, Core Essentials, Corel Office X3, MS Office, Office 365, MS Office Transition, and Practical Apps & Modern Topics.',
    filePath: path.join(process.cwd(), 'src/lib/knowledge/courses-catalog-raw.json'),
    format: 'json',
  },
];

/* ── Lazy-load + cache source content ── */
const cache = new Map<KnowledgeSourceId, string>();

export function loadSource(id: KnowledgeSourceId): string {
  const cached = cache.get(id);
  if (cached) return cached;
  const source = KNOWLEDGE_SOURCES.find(s => s.id === id);
  if (!source) return '';
  try {
    const content = fs.readFileSync(source.filePath, 'utf-8');
    cache.set(id, content);
    return content;
  } catch {
    return '';
  }
}

/* ── Simple keyword search — returns top N snippets ── */
export interface SearchHit {
  sourceId: KnowledgeSourceId;
  title: string;
  snippet: string;
  score: number;
}

export function searchKnowledge(
  query: string,
  options: { verticals?: KnowledgeVertical[]; limit?: number; windowChars?: number } = {},
): SearchHit[] {
  const limit = options.limit ?? 5;
  const window = options.windowChars ?? 400;
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(t => t.length > 2);
  if (terms.length === 0) return [];

  const hits: SearchHit[] = [];

  for (const source of KNOWLEDGE_SOURCES) {
    if (options.verticals && !options.verticals.includes(source.vertical)) continue;

    const raw = loadSource(source.id);
    if (!raw) continue;

    const lower = raw.toLowerCase();
    // Find the best region — location where the most terms cluster
    const termPositions: number[] = [];
    for (const term of terms) {
      let pos = lower.indexOf(term);
      while (pos !== -1) {
        termPositions.push(pos);
        pos = lower.indexOf(term, pos + 1);
      }
    }

    if (termPositions.length === 0) continue;

    // Simple clustering: find the position with the most neighbors within `window`
    termPositions.sort((a, b) => a - b);
    let bestCenter = termPositions[0];
    let bestScore = 0;
    for (const p of termPositions) {
      const near = termPositions.filter(q => Math.abs(q - p) < window).length;
      if (near > bestScore) {
        bestScore = near;
        bestCenter = p;
      }
    }

    const start = Math.max(0, bestCenter - Math.floor(window / 2));
    const end = Math.min(raw.length, bestCenter + Math.floor(window / 2));
    const snippet = raw.slice(start, end).replace(/\s+/g, ' ').trim();

    hits.push({
      sourceId: source.id,
      title: source.title,
      snippet,
      score: bestScore,
    });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

/* ── Get high-level summary of what's in the library (for UI/prompts) ── */
export function getLibrarySummary(): string {
  return KNOWLEDGE_SOURCES.map(
    s => `[${s.vertical}] ${s.title} — ${s.description.slice(0, 150)}`,
  ).join('\n');
}
