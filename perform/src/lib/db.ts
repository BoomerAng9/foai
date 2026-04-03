import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || '';

export const sql = DATABASE_URL
  ? postgres(DATABASE_URL, { ssl: 'require', max: 10 })
  : null;
