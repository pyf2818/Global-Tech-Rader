import { createAuthService } from '../auth/authService.js';
import { parseCookies, readJsonBody, routeError, sendJsonResponse, sessionCookie } from './httpUtils.js';

const USERNAME_RE = /^[a-zA-Z0-9_\u4e00-\u9fff]{3,40}$/;
const loginWindows = new Map();

function limitLogin(req) {
  const key = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const hits = (loginWindows.get(key) || []).filter(time => now - time < 60000);
  if (hits.length >= 10) throw Object.assign(new Error('登录尝试过于频繁，请稍后再试'), { code: 'RATE_LIMITED', status: 429 });
  hits.push(now);
  loginWindows.set(key, hits);
}

function validateCredentials(body, { registration = false } = {}) {
  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  const email = String(body.email || '').trim();
  if (!USERNAME_RE.test(username)) throw Object.assign(new Error('用户名需为 3-40 位中文、字母、数字或下划线'), { code: 'INVALID_USERNAME', status: 400 });
  if (password.length < (registration ? 10 : 1) || password.length > 128) throw Object.assign(new Error(registration ? '密码长度需为 10-128 位' : '用户名或密码错误'), { code: registration ? 'INVALID_PASSWORD' : 'INVALID_CREDENTIALS', status: registration ? 400 : 401 });
  if (email.length > 254) throw Object.assign(new Error('邮箱过长'), { code: 'INVALID_EMAIL', status: 400 });
  return { username, password, email };
}

export async function handleAuthRequest(req, res, { action, service } = {}) {
  const method = String(req.method || 'GET').toUpperCase();
  const token = parseCookies(req).meridian_session || '';
  try {
    const auth = service || createAuthService();
    if (action === 'register' && method === 'POST') {
      const result = await auth.register(validateCredentials(await readJsonBody(req), { registration: true }));
      return sendJsonResponse(res, 201, { ok: true, data: { user: result.user } }, { 'Set-Cookie': sessionCookie(result.rawToken) });
    }
    if (action === 'login' && method === 'POST') {
      limitLogin(req);
      const result = await auth.login(validateCredentials(await readJsonBody(req)));
      return sendJsonResponse(res, 200, { ok: true, data: { user: result.user } }, { 'Set-Cookie': sessionCookie(result.rawToken) });
    }
    if (action === 'logout' && method === 'POST') {
      await auth.logout(token);
      return sendJsonResponse(res, 200, { ok: true, data: {} }, { 'Set-Cookie': sessionCookie('', { clear: true }) });
    }
    if (action === 'me' && method === 'GET') {
      const user = await auth.authenticate(token);
      if (!user) return sendJsonResponse(res, 401, { ok: false, error: { code: 'UNAUTHORIZED', message: '未登录' } });
      return sendJsonResponse(res, 200, { ok: true, data: { user } });
    }
    if ((action === 'profile' || action === 'interests') && method === 'POST') {
      const body = await readJsonBody(req);
      const updates = action === 'interests'
        ? { interests: Array.isArray(body.interests) ? body.interests.slice(0, 30) : [] }
        : { displayName: String(body.displayName || '').trim().slice(0, 80) || undefined, avatar: String(body.avatar || '').trim().slice(0, 2000), signature: String(body.signature || '').trim().slice(0, 280) };
      const user = await auth.updateProfile(token, updates);
      return sendJsonResponse(res, 200, { ok: true, data: { user } });
    }
    return sendJsonResponse(res, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: '请求方法不支持' } });
  } catch (error) {
    return routeError(res, error);
  }
}
