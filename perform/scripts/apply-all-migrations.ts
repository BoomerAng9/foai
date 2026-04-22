/**
 * scripts/apply-all-migrations.ts
 * =================================
 * Single-command migration runner (SHIP-CHECKLIST G1.4).
 *
 * Runs every `*.sql` file in `migrations/` against $DATABASE_URL, in
 * lexical order, inside one connection. Every migration in this repo is
 * idempotent (verified: 13/13 use IF NOT EXISTS / ON CONFLICT / guarded
 * ALTERs at time of writing), so re-running the full set is a no-op.
 *
 * Invocation: `npm run db:migrate`
 *
 * Exits non-zero if:
 *   - $DATABASE_URL is unset
 *   - any migration file fails SQL execution
 *
 * For G1.4 "re-migration is a no-op": re-run the command; each migration
 * should produce `CREATE TABLE IF NOT EXISTS ...` style messages with
 * zero rows affected. If a migration fails on re-run, that migration is
 * non-idempotent and must be rewritten.
 */

import postgres from 'postgres';
import * as fs from 'node:fs';
import * as path from 'node:path';

async function loadEnv(): Promise<void> {
  const envFile = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envFile)) return;
  const text = fs.readFileSync(envFile, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
  }
}

async function main(): Promise<void> {
  await loadEnv();

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('[db:migrate] DATABASE_URL is not set');
    process.exit(1);
  }

  const dir = path.resolve(process.cwd(), 'migrations');
  if (!fs.existsSync(dir)) {
    console.error(`[db:migrate] migrations directory not found at ${dir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.warn('[db:migrate] no .sql migrations to run');
    return;
  }

  console.log(`[db:migrate] target: ${url.replace(/:[^@/]+@/, ':***@')}`);
  console.log(`[db:migrate] ${files.length} migration(s) queued`);

  const sql = postgres(url, { ssl: 'require', max: 1, onnotice: () => {} });

  const start = Date.now();
  let applied = 0;
  try {
    for (const f of files) {
      const t0 = Date.now();
      const body = fs.readFileSync(path.join(dir, f), 'utf8');
      process.stdout.write(`[db:migrate]   → ${f} ... `);
      try {
        await sql.unsafe(body);
        const ms = Date.now() - t0;
        console.log(`ok (${ms}ms)`);
        applied++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`FAIL`);
        console.error(`[db:migrate] FAILED on ${f}: ${msg}`);
        process.exit(1);
      }
    }
  } finally {
    await sql.end();
  }

  console.log(`[db:migrate] applied=${applied}/${files.length} elapsed=${((Date.now() - start) / 1000).toFixed(1)}s`);
}

main().catch(err => {
  console.error('[db:migrate] unhandled error:', err);
  process.exit(1);
});
