import { createAuthService } from '../auth/authService.js';
import { createCommunityService } from '../community/communityService.js';
import { parseCookies, readJsonBody, routeError, sendJsonResponse } from './httpUtils.js';

const writeWindows = new Map();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function requireUuid(value) {
  if (!UUID_RE.test(String(value || ''))) throw Object.assign(new Error('资源标识无效'), { code: 'INVALID_ID', status: 400 });
  return value;
}
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const hits = (writeWindows.get(key) || []).filter(time => now - time < windowMs);
  if (hits.length >= max) throw Object.assign(new Error('操作过于频繁，请稍后再试'), { code: 'RATE_LIMITED', status: 429 });
  hits.push(now); writeWindows.set(key, hits);
}

async function viewer(req, auth, required = false) {
  const user = await auth.authenticate(parseCookies(req).meridian_session || '');
  if (required && !user) throw Object.assign(new Error('请先登录'), { code: 'UNAUTHORIZED', status: 401 });
  return user;
}

export async function handleCommunityRequest(req, res, { path = [], service, authService } = {}) {
  const method = String(req.method || 'GET').toUpperCase();
  const parts = Array.isArray(path) ? path.filter(Boolean) : String(path || '').split('/').filter(Boolean);
  try {
    const community = service || createCommunityService();
    const auth = authService || createAuthService();
    if (parts[0] === 'posts' && parts.length === 1) {
      const user = await viewer(req, auth);
      if (method === 'GET') {
        const url = new URL(req.url, 'http://localhost');
        const data = await community.listPosts({ viewerId: user?.id, cursor: url.searchParams.get('cursor'), limit: url.searchParams.get('limit') });
        return sendJsonResponse(res, 200, { ok: true, data });
      }
      if (method === 'POST') {
        const user = await viewer(req, auth, true); rateLimit(`post:${user.id}`, 10, 60 * 60 * 1000);
        return sendJsonResponse(res, 201, { ok: true, data: { post: await community.createPost({ userId: user.id, input: await readJsonBody(req) }) } });
      }
    }
    if (parts[0] === 'posts' && parts[1]) {
      const postId = requireUuid(parts[1]);
      const user = await viewer(req, auth, method !== 'GET');
      if (parts.length === 2) {
        if (method === 'GET') return sendJsonResponse(res, 200, { ok: true, data: { post: await community.getPost({ postId, viewerId: user?.id }) } });
        if (method === 'PATCH') return sendJsonResponse(res, 200, { ok: true, data: { post: await community.updatePost({ userId: user.id, postId, input: await readJsonBody(req) }) } });
        if (method === 'DELETE') { await community.deletePost({ userId: user.id, postId }); return sendJsonResponse(res, 200, { ok: true, data: {} }); }
      }
      if (parts[2] === 'comments') {
        if (method === 'GET') return sendJsonResponse(res, 200, { ok: true, data: { comments: await community.listComments({ postId, viewerId: user?.id }) } });
        if (method === 'POST') {
          rateLimit(`comment:${user.id}`, 30, 60 * 60 * 1000); const body = await readJsonBody(req);
          return sendJsonResponse(res, 201, { ok: true, data: { comment: await community.createComment({ userId: user.id, postId, body: body.body, parentId: body.parentId }) } });
        }
      }
      if ((parts[2] === 'like' || parts[2] === 'bookmark') && (method === 'PUT' || method === 'DELETE')) {
        const enabled = method === 'PUT';
        const post = parts[2] === 'like'
          ? await community.setLike({ userId: user.id, postId, enabled })
          : await community.setBookmark({ userId: user.id, postId, enabled });
        return sendJsonResponse(res, 200, { ok: true, data: { post } });
      }
    }
    if (parts[0] === 'users' && parts[1] && parts[2] === 'follow' && (method === 'PUT' || method === 'DELETE')) {
      const user = await viewer(req, auth, true);
      return sendJsonResponse(res, 200, { ok: true, data: await community.setFollow({ userId: user.id, followedId: requireUuid(parts[1]), enabled: method === 'PUT' }) });
    }
    return sendJsonResponse(res, 404, { ok: false, error: { code: 'COMMUNITY_ROUTE_NOT_FOUND', message: '社区接口不存在' } });
  } catch (error) {
    return routeError(res, error);
  }
}
