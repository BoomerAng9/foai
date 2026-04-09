#!/usr/bin/env node
/**
 * SME_Ang n8n catalog builder
 * ==============================
 * Reads every *.json n8n workflow file from a source directory,
 * extracts structured metadata (name, node types, trigger type,
 * tags, categories), and writes a single index file at:
 *
 *   cti-hub/public/sme-ang/n8n-catalog.json
 *
 * This index is:
 *   - Read at runtime by GET /api/sme-ang/n8n/search
 *   - Committed to git so it's available without re-parsing
 *   - Rebuilt on demand when Rish adds new training workflows
 *
 * Raw source files are NOT committed to git — they stay in Rish's
 * iCloudDrive or the Smelter OS filesystem.
 *
 * Usage:
 *   node cti-hub/scripts/build-sme-ang-catalog.mjs [source_dir]
 *
 *   source_dir defaults to:
 *     C:/Users/rishj/iCloudDrive/ACHIEVEMOR_/n8n docs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_SOURCE = 'C:/Users/rishj/iCloudDrive/ACHIEVEMOR_/n8n docs';
const sourceDir = process.argv[2] || DEFAULT_SOURCE;
const outDir = path.resolve(__dirname, '..', 'public', 'sme-ang');
const outFile = path.join(outDir, 'n8n-catalog.json');

function categorizeNodeType(type) {
  if (!type) return 'unknown';
  const t = type.toLowerCase();
  if (t.includes('langchain') || t.includes('lmchat') || t.includes('agent')) return 'ai';
  if (t.includes('openai') || t.includes('gemini') || t.includes('anthropic')) return 'ai';
  if (t.includes('vectorstore') || t.includes('pinecone') || t.includes('qdrant')) return 'rag';
  if (t.includes('gmail') || t.includes('email') || t.includes('imap') || t.includes('smtp')) return 'email';
  if (t.includes('webhook') || t.includes('http') || t.includes('api')) return 'integration';
  if (t.includes('slack') || t.includes('discord') || t.includes('telegram')) return 'messaging';
  if (t.includes('postgres') || t.includes('mysql') || t.includes('mongodb')) return 'database';
  if (t.includes('google') || t.includes('drive') || t.includes('sheets')) return 'google';
  if (t.includes('twitter') || t.includes('youtube') || t.includes('social')) return 'social';
  if (t.includes('trigger') || t.includes('cron') || t.includes('schedule')) return 'trigger';
  if (t.includes('if') || t.includes('switch') || t.includes('merge') || t.includes('split')) return 'flow-control';
  if (t.includes('set') || t.includes('code') || t.includes('function') || t.includes('execute')) return 'transform';
  if (t.includes('file') || t.includes('read') || t.includes('write')) return 'file-io';
  return 'utility';
}

function detectTriggerType(nodes) {
  const trigger = nodes.find(n =>
    (n.type || '').toLowerCase().includes('trigger') ||
    (n.type || '').toLowerCase().includes('webhook') ||
    (n.type || '').toLowerCase().includes('cron') ||
    (n.type || '').toLowerCase().includes('schedule'),
  );
  if (!trigger) return 'manual';
  const t = (trigger.type || '').toLowerCase();
  if (t.includes('webhook')) return 'webhook';
  if (t.includes('cron') || t.includes('schedule')) return 'scheduled';
  if (t.includes('email') || t.includes('imap')) return 'email-trigger';
  return 'event';
}

function parseWorkflow(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (raw.length < 50) return null; // iCloud placeholder
    const wf = JSON.parse(raw);
    if (!wf.nodes || !Array.isArray(wf.nodes)) return null;

    const nodes = wf.nodes.map(n => ({
      name: n.name || '',
      type: n.type || '',
      typeVersion: n.typeVersion ?? null,
    }));

    const uniqueTypes = [...new Set(nodes.map(n => n.type).filter(Boolean))];
    const categories = [...new Set(uniqueTypes.map(categorizeNodeType))].sort();

    return {
      slug: path.basename(filePath, '.json').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase(),
      name: wf.name || path.basename(filePath, '.json'),
      description: wf.description || '',
      filename: path.basename(filePath),
      node_count: nodes.length,
      trigger_type: detectTriggerType(nodes),
      unique_node_types: uniqueTypes,
      categories,
      tags: Array.isArray(wf.tags) ? wf.tags.map(t => t.name || t).filter(Boolean) : [],
      active: !!wf.active,
    };
  } catch (err) {
    console.warn(`skip ${path.basename(filePath)}: ${err.message}`);
    return null;
  }
}

// Main
if (!fs.existsSync(sourceDir)) {
  console.error(`Source dir not found: ${sourceDir}`);
  process.exit(1);
}

const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.json'));
console.log(`Scanning ${files.length} JSON files in ${sourceDir}`);

const catalog = [];
for (const file of files) {
  const entry = parseWorkflow(path.join(sourceDir, file));
  if (entry) {
    catalog.push(entry);
    console.log(`  ok  ${entry.slug}  (${entry.node_count} nodes, ${entry.categories.join('+')})`);
  }
}

// Sort by name
catalog.sort((a, b) => a.name.localeCompare(b.name));

// Write
fs.mkdirSync(outDir, { recursive: true });
const output = {
  generated_at: new Date().toISOString(),
  source_dir: sourceDir,
  total: catalog.length,
  entries: catalog,
};
fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
console.log(`\nCatalog written: ${outFile} (${catalog.length} entries)`);
