import {
  getAgentIntelligenceContext,
  getDailyIntelligenceBriefing,
  getIntelligenceEvents,
  getIntelligenceItems,
  getStoredIntelligenceArticles,
  getStoredIntelligenceEvents,
  syncIntelligenceSnapshot,
} from '../intelligence/services/intelligenceService.js';
import { sendJsonResponse } from './httpUtils.js';

function queryValue(req, key) {
  const value = req.query?.[key];
  if (Array.isArray(value)) return value[0];
  if (value != null) return value;

  try {
    const url = new URL(req.url || '/', 'http://localhost');
    return url.searchParams.get(key) || '';
  } catch {
    return '';
  }
}

function buildParams(req) {
  return {
    mode: queryValue(req, 'mode'),
    take: queryValue(req, 'take'),
    category: queryValue(req, 'category'),
    since: queryValue(req, 'since'),
    q: queryValue(req, 'q'),
    query: queryValue(req, 'query'),
    cursor: queryValue(req, 'cursor'),
    providers: queryValue(req, 'providers'),
    perSource: queryValue(req, 'perSource'),
    sources: queryValue(req, 'sources'),
  };
}

function isDatabaseUnavailable(error) {
  return error?.code === 'DATABASE_UNAVAILABLE'
    || error?.code === 'ECONNREFUSED'
    || error?.code === 'ENOTFOUND'
    || error?.code === 'ETIMEDOUT';
}

export async function handleIntelligenceRequest(req, res, { path = [] } = {}) {
  const [action = 'items'] = path.filter(Boolean);
  const method = req.method || 'GET';

  if (action === 'sync') {
    if (method !== 'POST') {
      return sendJsonResponse(res, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED' } });
    }
  } else if (method !== 'GET') {
    return sendJsonResponse(res, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED' } });
  }

  try {
    if (action === 'items') {
      return sendJsonResponse(res, 200, await getIntelligenceItems(buildParams(req)));
    }
    if (action === 'agent' || action === 'context') {
      return sendJsonResponse(res, 200, await getAgentIntelligenceContext(buildParams(req)));
    }
    if (action === 'events') {
      return sendJsonResponse(res, 200, await getIntelligenceEvents(buildParams(req)));
    }
    if (action === 'sync') {
      if (req.method && req.method !== 'POST') {
        return sendJsonResponse(res, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED' } });
      }
      return sendJsonResponse(res, 200, await syncIntelligenceSnapshot(buildParams(req)));
    }
    if (action === 'stored') {
      return sendJsonResponse(res, 200, await getStoredIntelligenceEvents(buildParams(req)));
    }
    if (action === 'stored-articles') {
      return sendJsonResponse(res, 200, await getStoredIntelligenceArticles(buildParams(req)));
    }
    if (action === 'daily') {
      return sendJsonResponse(res, 200, await getDailyIntelligenceBriefing(buildParams(req)));
    }
    if (action === 'entities') {
      return sendJsonResponse(res, 501, {
        ok: false,
        error: {
          code: 'INTELLIGENCE_ENDPOINT_NOT_READY',
          message: 'This intelligence endpoint is reserved for the next rollout phase.',
        },
      });
    }
    return sendJsonResponse(res, 404, { ok: false, error: { code: 'UNKNOWN_INTELLIGENCE_ENDPOINT' } });
  } catch (error) {
    const dbUnavailable = isDatabaseUnavailable(error);
    const status = dbUnavailable ? 503 : (error?.status && error.status >= 400 && error.status < 600 ? error.status : 503);
    const code = dbUnavailable ? 'DATABASE_UNAVAILABLE' : 'INTELLIGENCE_SOURCE_UNAVAILABLE';
    return sendJsonResponse(res, status, {
      ok: false,
      error: {
        code,
        message: dbUnavailable ? 'Database is unavailable; run migrations after starting Postgres.' : (error?.message || 'Intelligence source unavailable'),
      },
    });
  }
}
