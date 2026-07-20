import { handleProfileRequest } from '../../server/http/profileHandlers.js';

export default async function handler(req, res) {
  const value = req.query?.path;
  const path = Array.isArray(value) ? value : String(value || '').split('/');
  return handleProfileRequest(req, res, { action: path[0] || 'state' });
}
