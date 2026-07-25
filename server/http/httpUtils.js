const MAX_BODY_BYTES = 2 * 1024 * 1024;

export function sendJsonResponse(res, status, payload, headers = {}) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    Object.entries(headers).forEach(([name, value]) => res.setHeader(name, value));
    return res.status(status).json(payload);
  }
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  Object.entries(headers).forEach(([name, value]) => res.setHeader(name, value));
  res.end(JSON.stringify(payload));
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    if (Buffer.byteLength(JSON.stringify(req.body), 'utf8') > MAX_BODY_BYTES) throw Object.assign(new Error('Request body too large'), { code: 'BODY_TOO_LARGE', status: 413 });
    return req.body;
  }
  if (typeof req.body === 'string') {
    if (Buffer.byteLength(req.body, 'utf8') > MAX_BODY_BYTES) throw Object.assign(new Error('Request body too large'), { code: 'BODY_TOO_LARGE', status: 413 });
    try { return JSON.parse(req.body); } catch { throw Object.assign(new Error('Invalid JSON body'), { code: 'INVALID_JSON', status: 400 }); }
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('Request body too large'), { code: 'BODY_TOO_LARGE', status: 413 });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Invalid JSON body'), { code: 'INVALID_JSON', status: 400 });
  }
}

export function parseCookies(req) {
  return String(req.headers?.cookie || '').split(';').reduce((cookies, part) => {
    const index = part.indexOf('=');
    if (index < 0) return cookies;
    const key = part.slice(0, index).trim();
    try { cookies[key] = decodeURIComponent(part.slice(index + 1).trim()); } catch { cookies[key] = ''; }
    return cookies;
  }, {});
}

export function sessionCookie(token, { clear = false } = {}) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const value = clear ? '' : encodeURIComponent(token);
  const maxAge = clear ? 0 : 2592000;
  return `meridian_session=${value}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function routeError(res, error) {
  const code = error?.code === 'DATABASE_UNAVAILABLE' ? 'DATABASE_UNAVAILABLE' : (error?.code || 'INTERNAL_ERROR');
  const status = error?.code === 'DATABASE_UNAVAILABLE' ? 503 : (error?.status || 500);
  const message = code === 'DATABASE_UNAVAILABLE'
    ? '持久化数据库尚未配置，账户与社区暂不可用'
    : (status >= 500 && code === 'INTERNAL_ERROR' ? '服务暂时不可用' : (error?.message || '请求失败'));
  return sendJsonResponse(res, status, { ok: false, error: { code, message } });
}
