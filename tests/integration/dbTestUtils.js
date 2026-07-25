import { randomBytes } from 'node:crypto';
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
    const parsed = new URL(url);
    return parsed.pathname.replace(/^\//, '');
  } catch {
    return '';
  }
}

function assertTestDatabase(url) {
  if (!url) throw new Error('TEST_DATABASE_URL is required for integration tests');
  if (!databaseName(url).toLowerCase().includes('test')) {
    throw new Error('Refusing to run integration tests against a non-test database');
  }
}

export function hasTestDatabase() {
  return Boolean(process.env.TEST_DATABASE_URL);
}

export async function withTestDatabase(work) {
  const url = process.env.TEST_DATABASE_URL;
  assertTestDatabase(url);
  const schema = `test_${randomBytes(6).toString('hex')}`;
  const pool = new pg.Pool({ connectionString: url, max: 4 });
  try {
    await pool.query(`create schema ${schema}`);
    await pool.query(`set search_path to ${schema}, public`);
    for (const migration of MIGRATIONS) {
      const sql = await readFile(path.resolve('server/db/migrations', migration), 'utf8');
      await pool.query(sql);
    }
    return await work({
      async query(sql, params) {
        const client = await pool.connect();
        try {
          await client.query(`set search_path to ${schema}, public`);
          return await client.query(sql, params);
        } finally {
          client.release();
        }
      },
      async connect() {
        const client = await pool.connect();
        await client.query(`set search_path to ${schema}, public`);
        return client;
      },
      schema,
    });
  } finally {
    await pool.query(`drop schema if exists ${schema} cascade`).catch(() => {});
    await pool.end();
  }
}
