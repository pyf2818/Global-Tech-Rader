import { createAuthService } from '../auth/authService.js';
import { createCreativeService } from '../creative/creativeService.js';
import { parseCookies, readJsonBody, routeError, sendJsonResponse } from './httpUtils.js';

async function requireViewer(req, auth) {
  const user = await auth.authenticate(parseCookies(req).meridian_session || '');
  if (!user) throw Object.assign(new Error('Please sign in first'), { code: 'UNAUTHORIZED', status: 401 });
  return user;
}

export async function handleCreativeRequest(req, res, { path = [], service, authService } = {}) {
  const method = String(req.method || 'GET').toUpperCase();
  const parts = Array.isArray(path) ? path.filter(Boolean) : String(path || '').split('/').filter(Boolean);
  try {
    const auth = authService || createAuthService();
    const creative = service || createCreativeService();
    const user = await requireViewer(req, auth);

    if (parts[0] === 'state' && parts.length === 1 && method === 'GET') {
      return sendJsonResponse(res, 200, { ok: true, data: await creative.getState(user.id) });
    }

    if (parts[0] === 'sync' && parts.length === 1 && method === 'POST') {
      return sendJsonResponse(res, 200, { ok: true, data: await creative.syncState(user.id, await readJsonBody(req)) });
    }

    if (parts[0] === 'assets' && parts.length === 1 && method === 'POST') {
      return sendJsonResponse(res, 201, { ok: true, data: { asset: await creative.saveAsset(user.id, await readJsonBody(req)) } });
    }

    if (parts[0] === 'assets' && parts.length === 1 && method === 'GET') {
      return sendJsonResponse(res, 200, { ok: true, data: { assets: await creative.listAssets(user.id) } });
    }

    if (parts[0] === 'documents' && parts.length === 1 && method === 'POST') {
      return sendJsonResponse(res, 201, { ok: true, data: { document: await creative.saveDocument(user.id, await readJsonBody(req)) } });
    }

    if (parts[0] === 'documents' && parts.length === 1 && method === 'GET') {
      return sendJsonResponse(res, 200, { ok: true, data: { documents: await creative.listDocuments(user.id) } });
    }

    if (parts[0] === 'documents' && parts[1] && parts.length === 2 && (method === 'PUT' || method === 'PATCH')) {
      return sendJsonResponse(res, 200, { ok: true, data: { document: await creative.saveDocument(user.id, { ...(await readJsonBody(req)), id: parts[1] }) } });
    }

    if (parts[0] === 'documents' && parts[1] && parts[2] === 'versions' && parts.length === 3 && method === 'POST') {
      return sendJsonResponse(res, 201, { ok: true, data: { version: await creative.saveVersion(user.id, parts[1], await readJsonBody(req)) } });
    }

    if (parts[0] === 'documents' && parts[1] && parts[2] === 'versions' && parts.length === 3 && method === 'GET') {
      return sendJsonResponse(res, 200, { ok: true, data: { versions: await creative.listVersions(user.id, parts[1]) } });
    }

    return sendJsonResponse(res, 404, { ok: false, error: { code: 'CREATIVE_ROUTE_NOT_FOUND', message: 'Creative API route not found' } });
  } catch (error) {
    return routeError(res, error);
  }
}
