import pg from 'pg';

let pool;

function sslConfig() {
  if (process.env.DATABASE_SSL === 'true') return { rejectUnauthorized: false };
  if (process.env.DATABASE_SSL === 'false') return false;
  return process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false;
}

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw Object.assign(new Error('DATABASE_URL is required'), { code: 'DATABASE_UNAVAILABLE' });
  }
  if (!pool) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig(),
      max: 8,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export async function withTransaction(work) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool() {
  if (!pool) return;
  await pool.end();
  pool = undefined;
}
