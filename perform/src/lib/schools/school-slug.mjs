/**
 * schoolSlug — ESM mirror of school-slug.ts for .mjs scripts.
 *
 * WARNING: Canonical source is school-slug.ts. Mirror this file byte-for-byte
 * when the TS version changes. CI drift detector is a post-draft follow-up.
 */
export function schoolSlug(input) {
  if (!input) return '';
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, '-and-')
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}
