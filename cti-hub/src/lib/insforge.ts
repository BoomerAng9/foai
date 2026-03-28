/**
 * Database client — postgres.js connecting to Neon via DATABASE_URL.
 *
 * SERVER-SIDE ONLY. Do not import this from client components.
 * Client components should call API routes instead.
 */
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;

function createSql() {
  if (!DATABASE_URL) {
    console.warn('[DB] Missing DATABASE_URL. Database client will not be available.');
    return null;
  }
  return postgres(DATABASE_URL, { ssl: 'require' });
}

export const sql = createSql();
