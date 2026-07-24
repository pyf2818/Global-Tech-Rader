import {
  getAgentIntelligenceContext,
  getDailyIntelligenceBriefing,
  getIntelligenceEntities,
  getIntelligenceEntity,
  getIntelligenceEvents,
  getIntelligenceOpportunities,
  getIntelligenceItems,
  getStoredIntelligenceArticles,
  getStoredIntelligenceEvents,
  getWeeklySectorAnalysis,
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
    storage: queryValue(req, 'storage'),
    interests: queryValue(req, 'interests'),
    follows: queryValue(req, 'follows'),
    specialFollows: queryValue(req, 'specialFollows'),
    sourceTiers: queryValue(req, 'sourceTiers'),
    days: queryValue(req, 'days'),
  };
}

function isDatabaseUnavailable(error) {
  return error?.code === 'DATABASE_UNAVAILABLE'
    || error?.code === 'ECONNREFUSED'
    || error?.code === 'ENOTFOUND'
    || error?.code === 'ETIMEDOUT';
}

export async function handleIntelligenceRequest(req, res, { path = [] } = {}) {
  const [action = 'items', id = ''] = path.filter(Boolean);
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
      return sendJsonResponse(res, 200, id
        ? await getIntelligenceEntity(id, buildParams(req))
        : await getIntelligenceEntities(buildParams(req)));
    }
    if (action === 'opportunities') {
      return sendJsonResponse(res, 200, await getIntelligenceOpportunities(buildParams(req)));
    }
    if (action === 'weekly-sectors') {
      return sendJsonResponse(res, 200, await getWeeklySectorAnalysis(buildParams(req)));
    }
    return sendJsonResponse(res, 404, { ok: false, error: { code: 'UNKNOWN_INTELLIGENCE_ENDPOINT' } });
  } catch (error) {
    const dbUnavailable = isDatabaseUnavailable(error);
    const status = dbUnavailable ? 503 : (error?.status && error.status >= 400 && error.status < 600 ? error.status : 503);
    const code = dbUnavailable ? 'DATABASE_UNAVAILABLE' : (status === 404 ? 'INTELLIGENCE_NOT_FOUND' : 'INTELLIGENCE_SOURCE_UNAVAILABLE');
    return sendJsonResponse(res, status, {
      ok: false,
      error: {
        code,
        message: dbUnavailable ? 'Database is unavailable; run migrations after starting Postgres.' : (error?.message || 'Intelligence source unavailable'),
      },
    });
  }
}
