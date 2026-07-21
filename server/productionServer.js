import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closePool } from './db/client.js';
import { createNewsApiMiddleware } from './newsPlugin.js';

const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const DIST_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const MAX_PROXY_BODY = 2 * 1024 * 1024;
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const apiMiddleware = createNewsApiMiddleware();

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_PROXY_BODY) throw Object.assign(new Error('Request body is too large'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function proxyScrapling(req, res, requestUrl) {
  const baseUrl = String(process.env.SCRAPLING_URL || '').replace(/\/+$/, '');
  if (!baseUrl) return sendJson(res, 503, { ok: false, error: 'Scrapling service is not configured' });
  const body = ['GET', 'HEAD'].includes(req.method || 'GET') ? undefined : await readBody(req);
  const response = await fetch(`${baseUrl}/api/scrape${requestUrl.search}`, {
    method: req.method,
    headers: {
      accept: req.headers.accept || 'application/json',
      'content-type': req.headers['content-type'] || 'application/json',
    },
    body,
    signal: AbortSignal.timeout(120_000),
    redirect: 'manual',
  });
  const payload = Buffer.from(await response.arrayBuffer());
  res.writeHead(response.status, {
    'Content-Type': response.headers.get('content-type') || 'application/json; charset=utf-8',
    'Content-Length': payload.length,
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

async function serveFile(req, res, filename) {
  const info = await stat(filename);
  if (!info.isFile()) throw Object.assign(new Error('Not found'), { code: 'ENOENT' });
  const extension = path.extname(filename).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
    'Content-Length': info.size,
    'Cache-Control': filename.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  if (req.method === 'HEAD') return res.end();
  createReadStream(filename).pipe(res);
}

async function serveFrontend(req, res, requestUrl) {
  if (!['GET', 'HEAD'].includes(req.method || 'GET')) return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  let pathname;
  try { pathname = decodeURIComponent(requestUrl.pathname); } catch { return sendJson(res, 400, { ok: false, error: 'Invalid path' }); }
  const candidate = path.resolve(DIST_DIR, `.${pathname}`);
  if (candidate !== DIST_DIR && !candidate.startsWith(`${DIST_DIR}${path.sep}`)) return sendJson(res, 403, { ok: false, error: 'Forbidden path' });
  try {
    return await serveFile(req, res, pathname === '/' ? path.join(DIST_DIR, 'index.html') : candidate);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    return serveFile(req, res, path.join(DIST_DIR, 'index.html'));
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || '/', 'http://localhost');
    if (requestUrl.pathname === '/health') return sendJson(res, 200, { ok: true, service: 'siliconstream' });
    if (requestUrl.pathname === '/api/scrape') return await proxyScrapling(req, res, requestUrl);
    if (requestUrl.pathname.startsWith('/api/')) {
      return await apiMiddleware(req, res, () => sendJson(res, 404, { ok: false, error: 'API route not found' }));
    }
    return await serveFrontend(req, res, requestUrl);
  } catch (error) {
    console.error('[productionServer]', error);
    if (!res.headersSent) sendJson(res, error?.status || 500, { ok: false, error: error?.message || 'Internal server error' });
    else res.end();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`SiliconStream listening on http://0.0.0.0:${PORT}`);
});

async function shutdown() {
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
