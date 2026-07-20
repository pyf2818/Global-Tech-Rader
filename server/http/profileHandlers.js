import { createAuthService } from '../auth/authService.js';
import { createProfileService } from '../profile/profileService.js';
import { parseCookies, readJsonBody, routeError, sendJsonResponse } from './httpUtils.js';

export async function handleProfileRequest(req, res, { action = 'state', service, authService } = {}) {
  try {
    const auth = authService || createAuthService();
    const user = await auth.authenticate(parseCookies(req).meridian_session || '');
    if (!user) return sendJsonResponse(res, 401, { ok: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } });
    const profile = service || createProfileService();
    if (action === 'state' && req.method === 'GET') return sendJsonResponse(res, 200, { ok: true, data: await profile.getState(user.id) });
    if (action === 'state' && req.method === 'PUT') return sendJsonResponse(res, 200, { ok: true, data: { version: await profile.saveState(user.id, await readJsonBody(req)) } });
    return sendJsonResponse(res, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: '请求方法不支持' } });
  } catch (error) { return routeError(res, error); }
}
