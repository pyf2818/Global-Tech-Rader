import { readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const MIGRATIONS = [
  '001_platform.sql',
  '002_runtime_indexes.sql',
  '003_intelligence.sql',
];

function databaseName(url) {
  try {
    return new URL(url).pathname.replace(/^\//, '');
  } catch {
    return '';
  }
}

export function requireE2eDatabase() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL is required for database-backed E2E tests');
  if (!databaseName(url).toLowerCase().includes('test')) {
    throw new Error('Refusing to run database-backed E2E tests against a non-test database');
  }
  return url;
}

export async function ensureE2eDatabase() {
  const url = requireE2eDatabase();
  const pool = new pg.Pool({ connectionString: url, max: 2 });
  try {
    const existing = await pool.query("select to_regclass('public.users') as users");
    if (!existing.rows[0]?.users) {
      for (const migration of MIGRATIONS) {
        const sql = await readFile(path.resolve('server/db/migrations', migration), 'utf8');
        await pool.query(sql);
      }
    }
  } finally {
    await pool.end();
  }
}
