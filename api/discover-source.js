import { discoverSourceCandidates } from '../server/news/services/sourceDiscovery.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const url = req.query?.url || '';
  if (!url) {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, message: 'URL is required', candidates: [] }));
    return;
  }

  const result = await discoverSourceCandidates(url);
  res.end(JSON.stringify(result));
}
