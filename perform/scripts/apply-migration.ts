/**
 * scripts/apply-migration.ts
 * ===========================
 * Simple migration runner. Runs a single .sql file against DATABASE_URL.
 *
 * Usage:
 *   DATABASE_URL=postgres://... npx tsx scripts/apply-migration.ts 008_tie_partition_and_analysts.sql
 *
 * Intentionally thin — no migration history table yet. Every SQL file
 * in migrations/ is idempotent (uses IF NOT EXISTS / BEGIN…COMMIT) so
 * re-running is safe. If a full migration framework is introduced later,
 * this script becomes the bootstrap for the migration table itself.
 */

import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('[apply-migration] DATABASE_URL is not set');
  process.exit(1);
}

const fileArg = process.argv[2];
if (!fileArg) {
  console.error('[apply-migration] Usage: apply-migration.ts <filename.sql>');
  process.exit(1);
}

const migrationPath = path.isAbsolute(fileArg)
  ? fileArg
  : path.join(process.cwd(), 'migrations', fileArg);

if (!fs.existsSync(migrationPath)) {
  console.error(`[apply-migration] File not found: ${migrationPath}`);
  process.exit(1);
}

const sqlText = fs.readFileSync(migrationPath, 'utf8');

async function run() {
  const sql = postgres(DATABASE_URL!, { ssl: 'require', max: 1 });
  try {
    console.log(`[apply-migration] Running ${path.basename(migrationPath)}...`);
    await sql.unsafe(sqlText);
    console.log('[apply-migration] OK');
  } catch (err) {
    console.error('[apply-migration] FAILED:', err);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

run();
