import { handleCommunityRequest } from '../../server/http/communityHandlers.js';

export default async function handler(req, res) {
  const value = req.query?.path;
  const path = Array.isArray(value) ? value : String(value || '').split('/');
  return handleCommunityRequest(req, res, { path });
}
