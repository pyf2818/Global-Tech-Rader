// ========== 安全工具：URL 白名单验证（防 SSRF）==========
export const BLOCKED_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^localhost$/i,
  /^::1$/,
  /^\[::1\]$/,
  /^169\.254\./,
];

export function isSafeUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const hostname = url.hostname.toLowerCase();
    if (BLOCKED_IP_PATTERNS.some(p => p.test(hostname))) return false;
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) return false;
    return true;
  } catch {
    return false;
  }
}

export function sendJson(res, payload, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export function parseBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
