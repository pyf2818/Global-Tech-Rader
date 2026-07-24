import { handleIntelligenceRequest } from '../../server/http/intelligenceHandlers.js';

export default async function handler(req, res) {
  const value = req.query?.path;
  const path = Array.isArray(value) ? value : String(value || '').split('/');
  return handleIntelligenceRequest(req, res, { path });
}
