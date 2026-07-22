import {
  getDashboard,
  getKline,
  getRealtime,
  getSectors,
  getTimeline,
  resolveSecid,
  searchStock,
} from '../../server/news/services/stockService.js';

const PERIODS = new Set(['1', '5', '15', '30', '60', '101', '102', '103']);

function send(res, status, body) {
  res.status(status).json(body);
}

function queryValue(req, key) {
  const value = req.query?.[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED' } });
  const action = queryValue(req, 'action');

  try {
    if (action === 'dashboard') return send(res, 200, await getDashboard());
    if (action === 'sectors') {
      const type = queryValue(req, 'type') === 'concept' ? 'concept' : 'industry';
      return send(res, 200, await getSectors(type));
    }
    if (action === 'search') {
      const keyword = String(queryValue(req, 'keyword') || '').trim().slice(0, 40);
      return send(res, 200, keyword ? await searchStock(keyword) : []);
    }

    if (action === 'realtime' || action === 'kline' || action === 'timeline') {
      const secid = resolveSecid(String(queryValue(req, 'code') || ''));
      if (!secid) return send(res, 400, { ok: false, error: { code: 'INVALID_STOCK_CODE' } });
      if (action === 'realtime') {
        const data = await getRealtime([secid]);
        return data[0]
          ? send(res, 200, data[0])
          : send(res, 503, { ok: false, error: { code: 'MARKET_DATA_UNAVAILABLE' } });
      }
      if (action === 'timeline') {
        const data = await getTimeline(secid);
        return data
          ? send(res, 200, data)
          : send(res, 503, { ok: false, error: { code: 'MARKET_DATA_UNAVAILABLE' } });
      }
      const period = String(queryValue(req, 'period') || '101');
      if (!PERIODS.has(period)) return send(res, 400, { ok: false, error: { code: 'INVALID_KLINE_PERIOD' } });
      const adjust = String(queryValue(req, 'adjust') || '1');
      if (!['0', '1', '2'].includes(adjust)) return send(res, 400, { ok: false, error: { code: 'INVALID_KLINE_ADJUST' } });
      const requestedCount = Number.parseInt(queryValue(req, 'count') || '60', 10);
      const count = Math.min(500, Math.max(20, Number.isFinite(requestedCount) ? requestedCount : 60));
      const data = await getKline(secid, { period, count, adjust });
      return data
        ? send(res, 200, data)
        : send(res, 503, { ok: false, error: { code: 'MARKET_DATA_UNAVAILABLE' } });
    }

    return send(res, 404, { ok: false, error: { code: 'UNKNOWN_STOCK_ACTION' } });
  } catch (error) {
    return send(res, 503, {
      ok: false,
      error: { code: 'MARKET_DATA_UNAVAILABLE', message: error?.message || 'Market data unavailable' },
    });
  }
}
