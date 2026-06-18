import { validateFeedUrl } from '../server/news/services/sourceDiscovery.js';
import { isSafeUrl } from '../server/news/utils/httpUtils.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const url = req.query?.url || '';
  if (!url) {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, message: 'URL is required' }));
    return;
  }
  if (!isSafeUrl(url)) {
    res.statusCode = 403;
    res.end(JSON.stringify({ ok: false, message: 'URL points to a blocked destination' }));
    return;
  }

  const result = await validateFeedUrl(url);
  res.end(JSON.stringify(result));
}
