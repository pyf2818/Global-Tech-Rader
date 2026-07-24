import { handleIntelligenceRequest } from '../server/http/intelligenceHandlers.js';

export default async function handler(req, res) {
  return handleIntelligenceRequest(req, res, { path: [] });
}
