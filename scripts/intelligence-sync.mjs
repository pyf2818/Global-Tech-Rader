import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncIntelligenceSnapshot } from '../server/intelligence/services/intelligenceService.js';
import { closePool } from '../server/db/client.js';

async function loadDotEnv() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const envPath = path.join(root, '.env');
  let content = '';
  try {
    content = await readFile(envPath, 'utf8');
  } catch {
    return;
  }
  content.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const index = trimmed.indexOf('=');
    if (index <= 0) return;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^"|"$/g, '');
    if (!process.env[key]) process.env[key] = value;
  });
}

function parseArgs(argv) {
  const params = {};
  argv.forEach(arg => {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) params[match[1]] = match[2];
  });
  return params;
}

await loadDotEnv();

try {
  const params = parseArgs(process.argv.slice(2));
  const result = await syncIntelligenceSnapshot({
    providers: params.providers || 'all',
    take: params.take || 60,
    perSource: params.perSource || 4,
    sources: params.sources || '',
  });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  const dbUnavailable = ['DATABASE_UNAVAILABLE', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(error?.code);
  console.error(JSON.stringify({
    ok: false,
    code: dbUnavailable ? 'DATABASE_UNAVAILABLE' : (error?.code || 'SYNC_FAILED'),
    message: dbUnavailable ? 'Database is unavailable; start Postgres and run npm run db:migrate.' : (error?.message || 'Intelligence sync failed'),
  }, null, 2));
  process.exitCode = 1;
} finally {
  await closePool();
}
