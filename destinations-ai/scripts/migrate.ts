/**
 * Destinations AI — migration runner.
 *
 * Applies every *.sql file in /migrations in lexicographic order.
 * Tracks applied migrations in a _migrations bookkeeping table.
 * Idempotent: re-running only applies un-applied migrations.
 *
 * Usage:
 *   DATABASE_URL=... tsx scripts/migrate.ts
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('[migrate] DATABASE_URL is not set — aborting.');
  process.exit(1);
}

const HERE = fileURLToPath(new URL('.', import.meta.url));
const MIGRATIONS_DIR = join(HERE, '..', 'migrations');

const sql = postgres(DATABASE_URL, { ssl: 'require', max: 2 });

async function main() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS _migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('[migrate] no migration files found');
      return;
    }

    const applied = await sql<Array<{ filename: string }>>`
      SELECT filename FROM _migrations
    `;
    const appliedSet = new Set(applied.map((r) => r.filename));

    let applied_this_run = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`[migrate] skip   ${file} (already applied)`);
        continue;
      }

      const path = join(MIGRATIONS_DIR, file);
      const body = readFileSync(path, 'utf8');

      console.log(`[migrate] apply  ${file}`);
      await sql.begin(async (tx) => {
        await tx.unsafe(body);
        await tx`INSERT INTO _migrations (filename) VALUES (${file})`;
      });
      applied_this_run += 1;
    }

    console.log(`[migrate] done. applied ${applied_this_run} new migration(s)`);
  } catch (err) {
    console.error('[migrate] failed', err);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

main();
