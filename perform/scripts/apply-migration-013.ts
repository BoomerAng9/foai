/**
 * scripts/apply-migration-013.ts
 * ================================
 * Applies migration 013 (school alias normalization) to the connected DB.
 * Splits the SQL file into statements and runs each in sequence so the
 * trailing SELECT verification queries print their results.
 *
 * Idempotent — re-running is safe (CREATE INDEX IF NOT EXISTS, etc.).
 */

import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 2 });

(async () => {
  const sqlText = fs.readFileSync(path.join(__dirname, '..', 'migrations', '013_school_alias_normalization.sql'), 'utf8');
  // Strip line comments, then split on `;` outside of string literals (the SQL
  // here has no embedded semicolons inside strings, so a simple split is OK).
  const stripped = sqlText.replace(/^--.*$/gm, '').trim();
  const statements = stripped.split(/;\s*\n/).map(s => s.trim()).filter(s => s.length > 0);

  console.log(`[migrate-013] ${statements.length} statements`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const head = stmt.split('\n')[0].slice(0, 80);
    console.log(`\n[migrate-013] [${i + 1}/${statements.length}] ${head}…`);
    try {
      const result = await sql.unsafe(stmt);
      // Print SELECT results when present
      if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'object') {
        console.table(result);
      } else if (typeof (result as { count?: number }).count === 'number') {
        console.log(`   rows: ${(result as { count: number }).count}`);
      }
    } catch (err) {
      console.error(`   FAILED: ${err instanceof Error ? err.message : err}`);
      throw err;
    }
  }

  console.log('\n[migrate-013] done.');
  await sql.end();
})();
