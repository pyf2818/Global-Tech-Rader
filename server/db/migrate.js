import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getPool, closePool } from './client.js';

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

export async function migrate() {
  const pool = getPool();
  await pool.query(`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `);
  const filenames = (await readdir(migrationsDir)).filter(name => name.endsWith('.sql')).sort();
  const applied = new Set((await pool.query('select filename from schema_migrations')).rows.map(row => row.filename));
  let count = 0;
  for (const filename of filenames) {
    if (applied.has(filename)) continue;
    const sql = await readFile(path.join(migrationsDir, filename), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('insert into schema_migrations(filename) values ($1)', [filename]);
      await client.query('COMMIT');
      count += 1;
      console.log(`Applied ${filename}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  console.log(`Migration complete: ${count} applied, ${filenames.length - count} already present`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  migrate().catch(error => {
    console.error(error);
    process.exitCode = 1;
  }).finally(closePool);
}
